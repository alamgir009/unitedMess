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

module.exports = { parseDate };