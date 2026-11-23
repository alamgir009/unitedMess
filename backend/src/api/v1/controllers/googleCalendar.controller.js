const { randomBytes } = require('node:crypto');
const jwt = require('jsonwebtoken');
const asyncHandler = require('../../../utils/helpers/asyncHandler');
const { googleCalendarService } = require('../../../services');
const { sendSuccessResponse } = require('../../../utils/helpers/response.helper');
const config = require('../../../config');
const User = require('../../../models/User.model');

const STATE_COOKIE = 'googleCalendarState';
const STATE_TTL_MS = 10 * 60 * 1000;
const stateCookieOptions = {
    httpOnly: true,
    secure: config.app.env === 'production',
    sameSite: 'lax',
    path: '/api/v1/auth/google/callback',
};

const getAuthUrl = asyncHandler(async (req, res) => {
    const state = randomBytes(32).toString('hex');
    const url = googleCalendarService.getAuthUrl(state);
    const proof = jwt.sign({ sub: req.user.id, state, type: STATE_COOKIE }, config.jwt.secret, {
        expiresIn: STATE_TTL_MS / 1000,
    });
    res.set('Cache-Control', 'no-store');
    res.cookie(STATE_COOKIE, proof, { ...stateCookieOptions, maxAge: STATE_TTL_MS });
    sendSuccessResponse(res, 200, 'Google Calendar auth URL generated', { url });
});

const handleCallback = asyncHandler(async (req, res) => {
    const { code, state } = req.query;
    const proof = req.cookies[STATE_COOKIE];
    const returnUrl = `${config.app.frontendUrl}/events?view=markets&gcal=`;

    if (typeof code !== 'string' || !code || typeof state !== 'string' || !proof) {
        return res.redirect(`${returnUrl}error`);
    }

    try {
        const session = jwt.verify(proof, config.jwt.secret, { algorithms: ['HS256'] });
        if (session.type !== STATE_COOKIE || session.state !== state) {
            return res.redirect(`${returnUrl}error`);
        }
        res.clearCookie(STATE_COOKIE, stateCookieOptions);

        const user = await User.findById(session.sub).select('isActive passwordChangedAt');
        if (!user?.isActive || user.changedPasswordAfter(session.iat)) {
            return res.redirect(`${returnUrl}error`);
        }
        await googleCalendarService.handleCallback(user.id, code);
        return res.redirect(`${returnUrl}success`);
    } catch {
        return res.redirect(`${returnUrl}error`);
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
