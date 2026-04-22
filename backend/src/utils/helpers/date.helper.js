const DATE_REGEX = /^(\d{2})\/(\d{2})\/(\d{4})$/;
const AppError = require('../errors/AppError');

const parseDate = (dateInput) => {
    if (dateInput instanceof Date) return dateInput;
    if (typeof dateInput !== 'string') {
        throw new AppError('Date must be a string or Date object', 400);
    }

    // 1. Check DD/MM/YYYY first (Priority)
    const match = dateInput.match(DATE_REGEX);
    if (match) {
        const [, day, month, year] = match;
        // Use Date.UTC to ensure it stays exactly on that day regardless of server timezone
        return new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day)));
    }

    // 2. ISO format fallback (for YYYY-MM-DD)
    const iso = Date.parse(dateInput);
    if (!isNaN(iso)) {
        return new Date(iso);
    }

    throw new AppError('Invalid date format. Use DD/MM/YYYY or YYYY-MM-DD', 400);
};

/**
 * Calculates the active billing month and year based on the 10th-day rule.
 * Days 1-10: Previous month is active.
 * Days 11+: Current month is active.
 */
const getBillingPeriod = (date = new Date()) => {
    const day = date.getDate();
    let month = date.getMonth() + 1; // 1-indexed
    let year = date.getFullYear();

    if (day <= 10) {
        if (month === 1) {
            month = 12;
            year--;
        } else {
            month--;
        }
    }

    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
    const monthName = new Date(year, month - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' });

    return { month, year, start, end, monthName };
};

/**
 * Calculates the dynamic system-wide start date constraint for active view based on the 10th-day rule. 
 */
const getVisibleBillingStartDate = () => {
    const { start } = getBillingPeriod();
    return start;
};

module.exports = { parseDate, getVisibleBillingStartDate, getBillingPeriod };