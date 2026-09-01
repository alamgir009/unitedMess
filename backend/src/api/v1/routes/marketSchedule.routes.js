const express = require('express');
const router = express.Router();
const marketScheduleController = require('../controllers/marketSchedule.controller');
const googleCalendarController = require('../controllers/googleCalendar.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');

const authenticated = [protect];
const adminOnly = [protect, authorize('admin')];

router.get('/month/:year/:month', ...authenticated, marketScheduleController.getMonthSchedule);
router.get('/available/:year/:month', ...authenticated, marketScheduleController.getAvailableDates);
router.get('/my', ...authenticated, marketScheduleController.getMyScheduledDates);
router.post('/select', ...authenticated, marketScheduleController.selectDates);
router.delete('/:scheduleId', ...authenticated, marketScheduleController.removeScheduledDate);
router.post('/restore/:year/:month', ...adminOnly, marketScheduleController.restoreMonthSchedules);
router.post('/sync-google', ...authenticated, googleCalendarController.syncSchedule);
router.get('/google-status', ...authenticated, googleCalendarController.getStatus);

module.exports = router;
