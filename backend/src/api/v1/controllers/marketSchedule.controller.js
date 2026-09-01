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

    const parts = [];
    if (result.inserted > 0) parts.push(`${result.inserted} date(s) selected`);
    if (result.removed > 0) parts.push(`${result.removed} date(s) removed`);
    if (result.skipped > 0) parts.push(`${result.skipped} date(s) unchanged`);
    const message = parts.length > 0 ? parts.join(', ') : 'No changes made';

    sendSuccessResponse(res, 201, message, result);
});

const removeScheduledDate = asyncHandler(async (req, res) => {
    const { scheduleId } = req.params;
    await marketScheduleService.removeScheduledDate(scheduleId, req.user.id);
    res.status(204).send();
});

const restoreMonthSchedules = asyncHandler(async (req, res) => {
    const { year, month } = req.params;
    const result = await marketScheduleService.restoreMonthSchedules(year, month);
    const message = result.restored > 0
        ? `Restored ${result.restored} schedule(s) for ${result.monthKey}`
        : `No reset schedules found for ${result.monthKey}`;
    sendSuccessResponse(res, 200, message, result);
});

module.exports = {
    getMonthSchedule,
    getAvailableDates,
    getMyScheduledDates,
    selectDates,
    removeScheduledDate,
    restoreMonthSchedules,
};
