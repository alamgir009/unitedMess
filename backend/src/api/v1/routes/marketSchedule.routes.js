const express = require('express');
const router = express.Router();
const marketScheduleController = require('../controllers/marketSchedule.controller');
const googleCalendarController = require('../controllers/googleCalendar.controller');
const { protect } = require('../middlewares/auth.middleware');

const authenticated = [protect];

router.get('/month/:year/:month', ...authenticated, marketScheduleController.getMonthSchedule);
router.get('/available/:year/:month', ...authenticated, marketScheduleController.getAvailableDates);
router.get('/my', ...authenticated, marketScheduleController.getMyScheduledDates);
router.post('/select', ...authenticated, marketScheduleController.selectDates);
router.delete('/:scheduleId', ...authenticated, marketScheduleController.removeScheduledDate);
router.post('/sync-google', ...authenticated, googleCalendarController.syncSchedule);
router.get('/google-status', ...authenticated, googleCalendarController.getStatus);

module.exports = router;
