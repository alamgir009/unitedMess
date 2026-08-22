# Market Schedule Date Selection - Implementation Plan

## Overview
Add a feature allowing members to manually select 3 market duty dates per month from the Events Calendar. Member-selected dates take priority over auto-generated round-robin schedule. Includes Google Calendar OAuth integration for event sync with reminders. All changes follow existing code patterns (optimistic updates, IST date handling, React.memo, fintech-grade UX).

---

## Phase 1: Backend - Data Model & API

### 1.1 New Model: `MarketSchedule`
**File:** `backend/src/models/MarketSchedule.model.js`

```javascript
{
  date:       { type: Date, required: true },
  user:       { type: ObjectId, ref: 'User', required: true },
  month:      { type: Number, required: true, min: 1, max: 12 },
  year:       { type: Number, required: true },
  isManuallySelected: { type: Boolean, default: true },
  googleCalendarEventId: { type: String, default: null },
}
// Indexes: { date: 1, user: 1 } UNIQUE, { month: 1, year: 1 }, { user: 1, month: 1, year: 1 }
```

### 1.2 Extend User Model
**File:** `backend/src/models/User.model.js`
- Add `googleCalendarToken`, `googleCalendarRefreshToken` (encrypted), `googleCalendarSyncEnabled` (Boolean)

### 1.3 New Service: `marketSchedule.service.js`
**File:** `backend/src/services/marketSchedule.service.js`

Functions:
- `getScheduledDates(year, month)` - Get all manual + auto schedules for month
- `getAvailableDates(year, month)` - Dates not taken by any member
- `selectDates(userId, dates[], year, month)` - Member selects up to 3 dates (validates max 3, no conflicts)
- `removeScheduledDate(scheduleId, userId)` - Remove a scheduled date
- `getMonthSchedule(year, month)` - Combined: manual selections + round-robin fill
- `syncToGoogleCalendar(userId, dates[])` - Create Google Calendar events with reminders
- `removeFromGoogleCalendar(userId, eventId)` - Delete calendar event

### 1.4 New Controller: `marketSchedule.controller.js`
**File:** `backend/src/api/v1/controllers/marketSchedule.controller.js`

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/markets/schedule/month/:year/:month` | GET | Auth | Full month schedule |
| `/markets/schedule/available/:year/:month` | GET | Auth | Available dates |
| `/markets/schedule/select` | POST | Auth | Select dates |
| `/markets/schedule/:scheduleId` | DELETE | Auth | Remove scheduled date |
| `/markets/schedule/my` | GET | Auth | User's scheduled dates |

### 1.5 New Routes: `marketSchedule.routes.js`
**File:** `backend/src/api/v1/routes/marketSchedule.routes.js`

### 1.6 Google Calendar OAuth
**File:** `backend/src/services/googleCalendar.service.js`
- OAuth 2.0 with `googleapis`
- Encrypted token storage
- Create events: "Market Duty", reminders (1 day + 1 hour before)
- Auto token refresh

**File:** `backend/src/api/v1/controllers/googleCalendar.controller.js`
- `GET /auth/google` - Initiate OAuth
- `GET /auth/google/callback` - Handle callback
- `DELETE /auth/google/disconnect` - Revoke tokens
- `POST /markets/schedule/sync-google` - Sync to Google Calendar

### 1.7 Daily Reminder Cron
**File:** `backend/src/jobs/cron/marketReminderCron.js`
- Runs daily 8 PM IST
- Sends notification for tomorrow's duty
- Uses existing notificationService.createAndSend

---

## Phase 2: Frontend - Calendar Integration

### 2.1 Market Schedule Redux Slice
**File:** `frontend/src/modules/events/store/marketSchedule.slice.js`

```javascript
{
  scheduledDates: {},      // { "2026-08": [{ date, user, isManuallySelected }] }
  availableDates: {},      // { "2026-08": ["2026-08-01", ...] }
  mySelectedDates: [],
  isLoading: false,
  googleCalendarConnected: false,
}
```

### 2.2 New Service: `marketSchedule.service.js`
**File:** `frontend/src/modules/events/services/marketSchedule.service.js`

### 2.3 New Component: `MarketScheduleModal`
**File:** `frontend/src/modules/events/components/EventCalendar/MarketScheduleModal.jsx`

- Month grid with date selection
- Shows taken dates (disabled, assignee avatar)
- Shows user's selected dates (accent highlight)
- Selection counter "X/3 dates selected"
- Confirm when exactly 3 selected
- Modal (desktop) / BottomSheet (mobile)

### 2.4 Modified Components:
- **DayDetailModal/DayDetailSheet**: Two action buttons for markets: "+Add your markets" and "+ Schedule your market date"
- **DayDetailContent**: Show "Market Duty" section for scheduled member
- **MarketCellContent**: Duty indicator (colored badge/avatar)
- **EventCalendar**: Fetch schedule data, manage MarketScheduleModal state

### 2.5 Google Calendar Connection UI
**File:** `frontend/src/modules/settings/components/GoogleCalendarSettings.jsx`
- Connect/Disconnect buttons
- Sync status
- Manual sync button

---

## Phase 3: Integration & Polish

### Date Conflict Prevention
- Backend unique index + validation
- Frontend real-time "Taken" indicators
- Optimistic locking with rollback

### Calendar Visual Indicators
- Scheduled duty: colored border/badge on calendar cells
- Member's own dates: highlighted border
- Aria-labels for accessibility

### Responsive Design
- All new components follow existing responsive patterns
- `useMediaQuery`, Tailwind breakpoints, touch-friendly targets

### Performance
- React.memo, useMemo, AbortController
- Optimistic updates with rollback

---

## Test Cases:
1. Select 3 dates → appear in calendar, Google Calendar event created
2. Try 4th date → disabled, toast "Maximum 3 dates allowed"
3. Date taken → shows other member's avatar, disabled
4. Remove own date → freed, Google Calendar event deleted
5. Two members same date → backend rejects, conflict error
6. Month navigation → schedule refreshes
7. Google disconnect → events remain but no sync
8. Daily reminder → notification at 8 PM
9. Mobile bottom sheet → works correctly
10. Admin visibility → sees all scheduled dates
11. Non-admin privacy → only own selections
12. Round-robin fill → unfilled dates auto-assigned
13. Concurrent selections → handled gracefully
14. Token refresh → automatic
15. Offline → optimistic UI with rollback

---

## Files Summary

### New (Backend):
- `backend/src/models/MarketSchedule.model.js`
- `backend/src/services/marketSchedule.service.js`
- `backend/src/services/googleCalendar.service.js`
- `backend/src/api/v1/controllers/marketSchedule.controller.js`
- `backend/src/api/v1/controllers/googleCalendar.controller.js`
- `backend/src/api/v1/routes/marketSchedule.routes.js`
- `backend/src/jobs/cron/marketReminderCron.js`

### New (Frontend):
- `frontend/src/modules/events/store/marketSchedule.slice.js`
- `frontend/src/modules/events/services/marketSchedule.service.js`
- `frontend/src/modules/events/components/EventCalendar/MarketScheduleModal.jsx`

### Modified (Backend):
- `backend/src/models/User.model.js`
- `backend/src/api/v1/routes/index.js`
- `backend/src/services/index.js`

### Modified (Frontend):
- `frontend/src/modules/events/components/EventCalendar/EventCalendar.jsx`
- `frontend/src/modules/events/components/EventCalendar/DayDetailModal.jsx`
- `frontend/src/modules/events/components/EventCalendar/DayDetailSheet.jsx`
- `frontend/src/modules/events/components/EventCalendar/DayDetailContent.jsx`
- `frontend/src/modules/events/components/EventCalendar/MarketCellContent.jsx`
- `frontend/src/store/index.js`
