const asyncHandler = require('../../../utils/helpers/asyncHandler');
const { marketScheduleService } = require('../../../services');
const { sendSuccessResponse } = require('../../../utils/helpers/response.helper');
const AppError = require('../../../utils/errors/AppError');

const getMonthSchedule = asyncHandler(async (req, res) => {
    const { year, month } = req.params;
    const schedule = await marketScheduleService.getMonthSchedule(year, month);
    sendSuccessResponse(res, 200, 'Market schedule retrieved successfully', schedule);
});

const getAvailableDates = asyncHandler(async (req, res) => {
    const { year, month } = req.params;
    const available = await marketScheduleService.getAvailableDates(year, month);
    sendSuccessResponse(res, 200, 'Available dates retrieved successfully', available);
});

const getMyScheduledDates = asyncHandler(async (req, res) => {
    const { year, month } = req.query;
    const schedules = await marketScheduleService.getMyScheduledDates(req.user.id, year, month);
    sendSuccessResponse(res, 200, 'Your scheduled dates retrieved successfully', schedules);
});

const selectDates = asyncHandler(async (req, res) => {
    const { dates, year, month, source } = req.body;

    if (!dates || !Array.isArray(dates) || dates.length === 0) {
        throw new AppError('At least one date is required', 400);
    }

    const result = await marketScheduleService.selectDates(
        req.user.id,
        dates,
        year,
        month,
        source || 'user'
    );

    const message = result.inserted > 0
        ? `${result.inserted} date(s) selected successfully${result.skipped > 0 ? `, ${result.skipped} skipped` : ''}`
        : 'All dates were already selected';

    sendSuccessResponse(res, 201, message, result);
});

const removeScheduledDate = asyncHandler(async (req, res) => {
    const { scheduleId } = req.params;
    await marketScheduleService.removeScheduledDate(scheduleId, req.user.id);
    res.status(204).send();
});

module.exports = {
    getMonthSchedule,
    getAvailableDates,
    getMyScheduledDates,
    selectDates,
    removeScheduledDate,
};
