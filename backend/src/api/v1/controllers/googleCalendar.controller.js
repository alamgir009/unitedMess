const asyncHandler = require('../../../utils/helpers/asyncHandler');
const { googleCalendarService } = require('../../../services');
const { sendSuccessResponse } = require('../../../utils/helpers/response.helper');
const config = require('../../../config');

const getAuthUrl = asyncHandler(async (req, res) => {
    const url = googleCalendarService.getAuthUrl(req.user.id);
    sendSuccessResponse(res, 200, 'Google Calendar auth URL generated', { url });
});

const handleCallback = asyncHandler(async (req, res) => {
    const { code, state: userId } = req.query;

    if (!code || !userId) {
        return res.redirect(`${config.app.frontendUrl}/events?view=markets&gcal=error`);
    }

    try {
        await googleCalendarService.handleCallback(userId, code);
        res.redirect(`${config.app.frontendUrl}/events?view=markets&gcal=success`);
    } catch (err) {
        res.redirect(`${config.app.frontendUrl}/events?view=markets&gcal=error`);
    }
});

const disconnect = asyncHandler(async (req, res) => {
    await googleCalendarService.disconnectCalendar(req.user.id);
    sendSuccessResponse(res, 200, 'Google Calendar disconnected successfully');
});

const syncSchedule = asyncHandler(async (req, res) => {
    const { scheduleIds } = req.body;

    if (!scheduleIds || !Array.isArray(scheduleIds) || scheduleIds.length === 0) {
        return sendSuccessResponse(res, 400, 'At least one schedule ID is required');
    }

    const MarketSchedule = require('../../../models/MarketSchedule.model');
    const schedules = await MarketSchedule.find({
        _id: { $in: scheduleIds },
        user: req.user.id,
    }).lean();

    if (schedules.length === 0) {
        return sendSuccessResponse(res, 404, 'No schedules found');
    }

    const results = await googleCalendarService.syncDatesToCalendar(req.user.id, schedules);
    sendSuccessResponse(res, 200, 'Sync completed', results);
});

const getStatus = asyncHandler(async (req, res) => {
    const status = await googleCalendarService.isConnected(req.user.id);
    sendSuccessResponse(res, 200, 'Google Calendar status retrieved', status);
});

module.exports = {
    getAuthUrl,
    handleCallback,
    disconnect,
    syncSchedule,
    getStatus,
};
