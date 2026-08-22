const express = require('express');
const router = express.Router();
const googleCalendarController = require('../controllers/googleCalendar.controller');
const { protect } = require('../middlewares/auth.middleware');

const authenticated = [protect];

router.get('/auth/google', ...authenticated, googleCalendarController.getAuthUrl);
router.get('/auth/google/callback', googleCalendarController.handleCallback);
router.delete('/auth/google/disconnect', ...authenticated, googleCalendarController.disconnect);

module.exports = router;
