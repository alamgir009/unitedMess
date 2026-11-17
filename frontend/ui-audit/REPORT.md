1. Findings

- React 18/Vite, JSX, Tailwind 3 and CSS variables; no dependency added.
- Theme: ThemeProvider context previously drove Header/Navbar; now only ThemeToggle subscribes to an external store.
- Tokens reused: variables.css, light.css/dark.css, theme.config.js; typography tokens.css exists but is not imported by this entry point.
- Shared controls: Input, PasswordInput, Button, IconSelect, MemberSelect, SearchBar and Pagination/native fields; no dedicated Textarea/Checkbox/Radio/DatePicker component.
- Modal/dialog and form inventory is listed in section 5, including embedded Resolve, invoice-email and notification dialogs.
- Legacy transition-all/shadow utilities now compile to opacity/transform; explicit shadow transitions were removed in affected shared/record surfaces.
- Permanent modal will-change, forced theme layout reads, view-transition snapshots, glass-button/nav blur and large form blur filters were removed.
- Existing domain validation, submit handlers, APIs, routes and business-state shapes were preserved.

2. Root cause of lag

- Provider state/context invalidated both header trees and duplicated theme writes in an effect.
- A synchronous offsetHeight read forced layout; view-transition snapshots introduced a 180ms crossfade.
- Broad color/shadow transitions and blur filters multiplied paint work.
- Before estimate (source-derived, not measured): 180ms visual transition plus React/layout work. After: 0.70ms median / 0.90ms maximum handler; 18.3ms worst sampled frame.

3. File list changed/new

- Edited: [frontend/index.html](<C:/Users/Alamgir Islam/OneDrive/Desktop/unitedMess/frontend/index.html>)
- Edited: [frontend/src/app/providers/ThemeProvider.jsx](<C:/Users/Alamgir Islam/OneDrive/Desktop/unitedMess/frontend/src/app/providers/ThemeProvider.jsx>)
- Edited: [frontend/src/core/config/theme.config.js](<C:/Users/Alamgir Islam/OneDrive/Desktop/unitedMess/frontend/src/core/config/theme.config.js>)
- Edited: [frontend/src/modules/auth/components/LoginForm/LoginForm.jsx](<C:/Users/Alamgir Islam/OneDrive/Desktop/unitedMess/frontend/src/modules/auth/components/LoginForm/LoginForm.jsx>)
- Edited: [frontend/src/modules/auth/components/RegisterForm/RegisterForm.jsx](<C:/Users/Alamgir Islam/OneDrive/Desktop/unitedMess/frontend/src/modules/auth/components/RegisterForm/RegisterForm.jsx>)
- Edited: [frontend/src/modules/auth/pages/ForgotPasswordPage/ForgotPasswordPage.jsx](<C:/Users/Alamgir Islam/OneDrive/Desktop/unitedMess/frontend/src/modules/auth/pages/ForgotPasswordPage/ForgotPasswordPage.jsx>)
- Edited: [frontend/src/modules/auth/pages/LoginPage/LoginPage.jsx](<C:/Users/Alamgir Islam/OneDrive/Desktop/unitedMess/frontend/src/modules/auth/pages/LoginPage/LoginPage.jsx>)
- Edited: [frontend/src/modules/auth/pages/RegisterPage/RegisterPage.jsx](<C:/Users/Alamgir Islam/OneDrive/Desktop/unitedMess/frontend/src/modules/auth/pages/RegisterPage/RegisterPage.jsx>)
- Edited: [frontend/src/modules/auth/pages/ResetPasswordPage/ResetPasswordPage.jsx](<C:/Users/Alamgir Islam/OneDrive/Desktop/unitedMess/frontend/src/modules/auth/pages/ResetPasswordPage/ResetPasswordPage.jsx>)
- Edited: [frontend/src/modules/dashboard/components/MembersTable/UserEditModal.jsx](<C:/Users/Alamgir Islam/OneDrive/Desktop/unitedMess/frontend/src/modules/dashboard/components/MembersTable/UserEditModal.jsx>)
- Edited: [frontend/src/modules/events/components/EventCalendar/CalendarDayEdit.jsx](<C:/Users/Alamgir Islam/OneDrive/Desktop/unitedMess/frontend/src/modules/events/components/EventCalendar/CalendarDayEdit.jsx>)
- Edited: [frontend/src/modules/market/components/MarketForm/MarketForm.jsx](<C:/Users/Alamgir Islam/OneDrive/Desktop/unitedMess/frontend/src/modules/market/components/MarketForm/MarketForm.jsx>)
- Edited: [frontend/src/modules/meal/components/MealForm/MealForm.jsx](<C:/Users/Alamgir Islam/OneDrive/Desktop/unitedMess/frontend/src/modules/meal/components/MealForm/MealForm.jsx>)
- Edited: [frontend/src/modules/meal/components/MealList/MealList.jsx](<C:/Users/Alamgir Islam/OneDrive/Desktop/unitedMess/frontend/src/modules/meal/components/MealList/MealList.jsx>)
- Edited: [frontend/src/modules/members/components/AdminUnpaidPanel.jsx](<C:/Users/Alamgir Islam/OneDrive/Desktop/unitedMess/frontend/src/modules/members/components/AdminUnpaidPanel.jsx>)
- Edited: [frontend/src/modules/members/components/PenaltyControlsModal.jsx](<C:/Users/Alamgir Islam/OneDrive/Desktop/unitedMess/frontend/src/modules/members/components/PenaltyControlsModal.jsx>)
- Edited: [frontend/src/modules/notification/components/NotificationBell/NotificationBell.jsx](<C:/Users/Alamgir Islam/OneDrive/Desktop/unitedMess/frontend/src/modules/notification/components/NotificationBell/NotificationBell.jsx>)
- Edited: [frontend/src/modules/notification/components/SendNotificationModal/SendNotificationModal.jsx](<C:/Users/Alamgir Islam/OneDrive/Desktop/unitedMess/frontend/src/modules/notification/components/SendNotificationModal/SendNotificationModal.jsx>)
- Edited: [frontend/src/modules/notification/pages/NotificationsPage/NotificationsPage.jsx](<C:/Users/Alamgir Islam/OneDrive/Desktop/unitedMess/frontend/src/modules/notification/pages/NotificationsPage/NotificationsPage.jsx>)
- Edited: [frontend/src/modules/payment/components/MessBillInvoice/MessBillInvoice.jsx](<C:/Users/Alamgir Islam/OneDrive/Desktop/unitedMess/frontend/src/modules/payment/components/MessBillInvoice/MessBillInvoice.jsx>)
- Edited: [frontend/src/modules/payment/components/PaymentFlowModal/PaymentFlowModal.jsx](<C:/Users/Alamgir Islam/OneDrive/Desktop/unitedMess/frontend/src/modules/payment/components/PaymentFlowModal/PaymentFlowModal.jsx>)
- Edited: [frontend/src/modules/payment/components/PaymentForm/PaymentForm.jsx](<C:/Users/Alamgir Islam/OneDrive/Desktop/unitedMess/frontend/src/modules/payment/components/PaymentForm/PaymentForm.jsx>)
- Edited: [frontend/src/modules/payment/components/PaymentList/PaymentList.jsx](<C:/Users/Alamgir Islam/OneDrive/Desktop/unitedMess/frontend/src/modules/payment/components/PaymentList/PaymentList.jsx>)
- Edited: [frontend/src/modules/payment/components/UpiVerificationModal/UpiVerificationModal.jsx](<C:/Users/Alamgir Islam/OneDrive/Desktop/unitedMess/frontend/src/modules/payment/components/UpiVerificationModal/UpiVerificationModal.jsx>)
- Edited: [frontend/src/modules/profile/components/EditForm/EditForm.jsx](<C:/Users/Alamgir Islam/OneDrive/Desktop/unitedMess/frontend/src/modules/profile/components/EditForm/EditForm.jsx>)
- Edited: [frontend/src/modules/public/components/FoodModal/FoodModal.jsx](<C:/Users/Alamgir Islam/OneDrive/Desktop/unitedMess/frontend/src/modules/public/components/FoodModal/FoodModal.jsx>)
- Edited: [frontend/src/modules/public/pages/ContactPage/ContactPage.jsx](<C:/Users/Alamgir Islam/OneDrive/Desktop/unitedMess/frontend/src/modules/public/pages/ContactPage/ContactPage.jsx>)
- Edited: [frontend/src/modules/settings/pages/SettingsPage/SettingsPage.jsx](<C:/Users/Alamgir Islam/OneDrive/Desktop/unitedMess/frontend/src/modules/settings/pages/SettingsPage/SettingsPage.jsx>)
- Edited: [frontend/src/shared/components/layout/Header/Header.jsx](<C:/Users/Alamgir Islam/OneDrive/Desktop/unitedMess/frontend/src/shared/components/layout/Header/Header.jsx>)
- Edited: [frontend/src/shared/components/layout/Navbar/Navbar.jsx](<C:/Users/Alamgir Islam/OneDrive/Desktop/unitedMess/frontend/src/shared/components/layout/Navbar/Navbar.jsx>)
- Edited: [frontend/src/shared/components/ui/Button/Button.jsx](<C:/Users/Alamgir Islam/OneDrive/Desktop/unitedMess/frontend/src/shared/components/ui/Button/Button.jsx>)
- Edited: [frontend/src/shared/components/ui/ConfirmDialog/ConfirmDialog.jsx](<C:/Users/Alamgir Islam/OneDrive/Desktop/unitedMess/frontend/src/shared/components/ui/ConfirmDialog/ConfirmDialog.jsx>)
- Edited: [frontend/src/shared/components/ui/IconSelect/IconSelect.jsx](<C:/Users/Alamgir Islam/OneDrive/Desktop/unitedMess/frontend/src/shared/components/ui/IconSelect/IconSelect.jsx>)
- Edited: [frontend/src/shared/components/ui/Input/Input.jsx](<C:/Users/Alamgir Islam/OneDrive/Desktop/unitedMess/frontend/src/shared/components/ui/Input/Input.jsx>)
- Edited: [frontend/src/shared/components/ui/MemberSelect/MemberSelect.jsx](<C:/Users/Alamgir Islam/OneDrive/Desktop/unitedMess/frontend/src/shared/components/ui/MemberSelect/MemberSelect.jsx>)
- Edited: [frontend/src/shared/components/ui/Modal/Modal.jsx](<C:/Users/Alamgir Islam/OneDrive/Desktop/unitedMess/frontend/src/shared/components/ui/Modal/Modal.jsx>)
- Edited: [frontend/src/shared/components/ui/PasswordInput/PasswordInput.jsx](<C:/Users/Alamgir Islam/OneDrive/Desktop/unitedMess/frontend/src/shared/components/ui/PasswordInput/PasswordInput.jsx>)
- Edited: [frontend/src/shared/components/ui/Popover/Popover.jsx](<C:/Users/Alamgir Islam/OneDrive/Desktop/unitedMess/frontend/src/shared/components/ui/Popover/Popover.jsx>)
- Edited: [frontend/src/shared/components/ui/SearchBar/SearchBar.jsx](<C:/Users/Alamgir Islam/OneDrive/Desktop/unitedMess/frontend/src/shared/components/ui/SearchBar/SearchBar.jsx>)
- Edited: [frontend/src/shared/hooks/useBodyScrollLock.js](<C:/Users/Alamgir Islam/OneDrive/Desktop/unitedMess/frontend/src/shared/hooks/useBodyScrollLock.js>)
- Edited: [frontend/src/styles/animations.css](<C:/Users/Alamgir Islam/OneDrive/Desktop/unitedMess/frontend/src/styles/animations.css>)
- Edited: [frontend/src/styles/global.css](<C:/Users/Alamgir Islam/OneDrive/Desktop/unitedMess/frontend/src/styles/global.css>)
- Edited: [frontend/src/styles/themes/dark.css](<C:/Users/Alamgir Islam/OneDrive/Desktop/unitedMess/frontend/src/styles/themes/dark.css>)
- Edited: [frontend/src/styles/themes/light.css](<C:/Users/Alamgir Islam/OneDrive/Desktop/unitedMess/frontend/src/styles/themes/light.css>)
- Edited: [frontend/src/styles/variables.css](<C:/Users/Alamgir Islam/OneDrive/Desktop/unitedMess/frontend/src/styles/variables.css>)
- Edited: [frontend/tailwind.config.js](<C:/Users/Alamgir Islam/OneDrive/Desktop/unitedMess/frontend/tailwind.config.js>)
- Edited: [frontend/tests/unit/userEditModal.test.jsx](<C:/Users/Alamgir Islam/OneDrive/Desktop/unitedMess/frontend/tests/unit/userEditModal.test.jsx>)
- New: [frontend/src/core/theme/themeStore.js](<C:/Users/Alamgir Islam/OneDrive/Desktop/unitedMess/frontend/src/core/theme/themeStore.js>)
- New: [frontend/src/shared/components/ui/Form/Form.jsx](<C:/Users/Alamgir Islam/OneDrive/Desktop/unitedMess/frontend/src/shared/components/ui/Form/Form.jsx>)
- New: [frontend/src/shared/components/ui/ThemeToggle/ThemeToggle.jsx](<C:/Users/Alamgir Islam/OneDrive/Desktop/unitedMess/frontend/src/shared/components/ui/ThemeToggle/ThemeToggle.jsx>)
- New: [frontend/src/styles/controls.css](<C:/Users/Alamgir Islam/OneDrive/Desktop/unitedMess/frontend/src/styles/controls.css>)
- New: [frontend/tests/unit/themeControls.test.jsx](<C:/Users/Alamgir Islam/OneDrive/Desktop/unitedMess/frontend/tests/unit/themeControls.test.jsx>)

- Verification artifacts: REPORT.md, changed-files.txt, changes.patch, new-files.txt, results.json, build.log and six theme/viewport/form PNGs under frontend/ui-audit.

4. Diffs for edited files; full content for new files

- [Complete patch, including new source files](<C:/Users/Alamgir Islam/OneDrive/Desktop/unitedMess/frontend/ui-audit/changes.patch>)
- [Full contents of all five new source/test files](<C:/Users/Alamgir Islam/OneDrive/Desktop/unitedMess/frontend/ui-audit/new-files.txt>)

5. Modal/form audit table

| Component | Issue | Fix |
|---|---|---|
| Modal | Duplicate label IDs; unstable focus effects; 92dvh cap; separate scroll counter | Unique IDs; stable focus trap/return; shared nested lock; 400/560/720px caps; 90dvh; fixed chrome and body scroll |
| ConfirmDialog | Untitled alertdialog lacked an accessible name; unsafe initial action focus | Explicit dialog name and described message; initial Cancel focus; shared bounds |
| MealModal | Inherited inconsistent spacing and sheet sizing | Shared padding, safe areas, control scale, body scroll and 160ms entrance |
| MarketModal | Inherited inconsistent spacing and sheet sizing | Shared padding, safe areas, control scale, body scroll and 160ms entrance |
| PaymentModal | Inherited inconsistent spacing and sheet sizing | Shared padding, safe areas, control scale, body scroll and 160ms entrance |
| EditModal | Inherited narrow width and inconsistent controls | 560px cap; shared focus, field and spacing rules |
| FoodModal | Dialog had no accessible name; image/header could overpaint corners | Food name labels dialog; clipped 16px shell; shared footer and sheet bounds |
| UserEditModal | Wide layout relied on a class; duplicated IDs and focus reset inherited | 720px token cap; stable focus; native label/error enhancement; responsive fields |
| PenaltyControlsModal | Custom overlay lacked modal keyboard/focus behavior and internal scrolling | Shared Modal; unchanged waiver/rate handlers; normalized fields and inline native errors |
| ResolveModal (AdminUnpaidPanel) | Custom Resolve/Refund overlay lacked dialog semantics and focus management | Shared Modal; unchanged refund/payment handlers; normalized controls and native feedback |
| SendNotificationModal | Independent field styles and shadow transitions; unassociated native labels | Shared native tokens and Form feedback/labels; transform/opacity transitions |
| UpiVerificationModal | Remarks label was unassociated; textarea styling differed | Stable remarks ID/label; common textarea tokens; shared focus and footer |
| MonthlyInvoiceModal | Legacy 2xl size and inherited focus/scroll limitations | 720px maximum; bounded body; persistent header/footer and nested scroll lock |
| PaymentFlowModal / AdminUpiForm | Mixed field styles and 12px section gaps | Shared controls and Form feedback; existing submit/loading/domain behavior preserved |
| MarketScheduleModal | Inherited dialog width, title clipping and focus behavior | 720px token cap; wrapping title; shared body scroll and focus handling |
| DayDetailDialog | Inherited sheet height transition and focus reset during updates | Instant drag sizing; stable drag listeners; focus retained; safe-area sheet bounds |
| DeleteMealDialog | Inherited unlabelled confirmation and inconsistent sizing | ConfirmDialog accessible name, Cancel focus and shared bounds |
| DeleteMarketDialog | Inherited unlabelled confirmation and inconsistent sizing | ConfirmDialog accessible name, Cancel focus and shared bounds |
| PaymentDeleteDialog | Inherited unlabelled confirmation and inconsistent sizing | ConfirmDialog accessible name, Cancel focus and shared bounds |
| NotificationBell panel | Custom dialog used separate Escape/scroll logic and spring timing | Shared labelled Modal/sheet with focus trap, return focus and bounded scrolling |
| Email Invoice to All (MessBillInvoice) | Custom portal lacked focus trap/return; body scroll lock could conflict | Shared Modal; preserved send/disabled handlers; native select tokens |
| Popover | Nonmodal popover incorrectly announced aria-modal | Removed modal claim; supplied accessible name; existing dismissal retained |
| LoginForm | Independent field sizing; password visibility skipped keyboard tab order | Shared Form feedback, field tokens and keyboard-accessible password toggle |
| RegisterForm | Custom submit validation with mixed native control presentation | Shared labels/native constraint feedback and control tokens; registration validation unchanged |
| ForgotPasswordPage form | Native errors had no inline descriptions; heavy ambient blur | Form feedback; tokenized card padding/shadow; gradient ambient background |
| ResetPasswordPage form | Native errors had no inline descriptions; mixed card padding | Form feedback and shared card/control tokens; existing password rules unchanged |
| EditForm | Raw controls differed from shared Input | Native token normalization and Form label/error enhancement |
| MealForm | Mixed field heights, 12px gaps and narrow two-column grouping | Shared controls; 16px field gap; one column below 768px; native feedback |
| MarketForm | Mixed field heights, 12px gaps and narrow two-column grouping | Shared controls; 16px field gap; one column below 768px; native feedback |
| PaymentForm | Mixed date, amount and notes controls; native errors were browser-only | Shared control/state tokens and Form feedback; existing payment logic unchanged |
| PenaltyControlsModal waiver form | Label/input links and native error descriptions missing | Shared Form links labels and reports native errors on blur/change |
| PenaltyControlsModal rate form | Label/input links and native error descriptions missing | Shared Form links labels and reports native errors on blur/change |
| ResolveModal form | Custom amount input and missing label association | Shared Form links labels; tokenized amount control; handler preserved |
| NotificationsPage composer | Raw title/message controls had independent presentation | Common native control tokens and Form validation feedback |
| SendNotificationModal form | Labels were not connected to native fields or custom selects | Shared Form associates labels; error descriptions and control tokens |
| CalendarDayEdit EntryForm | Independent native fields, gaps and custom checkbox target | Shared Form and tokens; 44px checkbox target with visible parent focus |
| CalendarDayEdit EntryEditForm | Independent native fields and error presentation | Shared Form label/native-error handling and mobile grid rules |
| CalendarDayEdit BulkUpdateForm | Independent native fields and error presentation | Shared Form label/native-error handling and mobile grid rules |
| UserEditModal form | Missing links on some native controls; inconsistent disabled/readonly styles | Shared Form association and state tokens; existing exemption validation unchanged |
| ContactPage form | Fields clipped at 320px; large blur filters; independent form card | Shared grid min-width rule; common form surface; gradient ambient background |
| SettingsPage form | Native control presentation differed from shared fields | Shared tokens and native feedback wrapper; settings submit behavior unchanged |
| Input / PasswordInput | Random field IDs; lost describedBy; animated shadow; small clear/toggle targets | useId; composed error/helper/success IDs; tokenized states; 44px actions |
| IconSelect / MemberSelect / SearchBar / native selects and dates | Mixed radii, heights, text size and boundary contrast | Shared control/state tokens; disabled select triggers; explicit transition properties |
| Checkbox / Radio / Switch | Uneven native sizing and undersized switch targets | Shared native accent/focus and 44px label/switch targets; 20px choice visuals |

6. Verification notes

- Production build and ESLint over changed JS/JSX passed; build retains existing mixed static/dynamic-import warnings.
- Full unit suite: 167 passed; after the final drag fix, all 31 modal/theme/control regression tests passed; the final spacing change passed all 10 theme/control tests.
- 330 token-pair checks passed in both themes: body minimum 13.36:1; secondary/muted 5.93:1; tested UI boundaries 4.40:1; button labels 7.29:1. No threshold failures.
- Widths 320/375/768/1024/1440/1920: 48 centered/sheet dialog cases and 48 public-form/theme cases passed overflow, clipping and footer checks.
- Ten rapid toggles: zero content-tree renders, no tasks >50ms, no stuck suppression; 20 style recalculations (65.59ms total) and 3.58ms total browser layout, with no synchronous layout reads in the toggle.
- Final shared 16px spacing: 48 additional public-form/theme/width cases passed; native blur errors and aria-describedby verified; nested Escape, focus return, unique IDs and dropdown scroll locking covered by unit tests; sheet drag 675px → 555px then dismiss; reduced-motion animation=none.
- Visual captures inspected: light/dark at 375/1440; stored/system boot logic runs before React and persistence/storage sync uses guarded storage access.
- Scope review and git diff --check passed; no backend/API/routing/business-handler changes; no new runtime logs, dependencies or !important declarations.
- Headless desktop Chrome evidence only: real-device Safari/Android performance, authenticated data flows and universal 60fps are not certified; custom domain validation timing is preserved.
