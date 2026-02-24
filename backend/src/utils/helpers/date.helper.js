const DATE_REGEX = /^(\d{2})\/(\d{2})\/(\d{4})$/;
const AppError = require('../errors/AppError')

const parseDate = (dateInput) => {
    if (dateInput instanceof Date) return dateInput;
    if (typeof dateInput !== 'string') {
        throw new AppError('Date must be a string or Date object', 400);
    }

    // ISO format fast path
    const iso = Date.parse(dateInput);
    if (!isNaN(iso)) return new Date(iso);

    // DD/MM/YYYY
    const match = dateInput.match(DATE_REGEX);
    if (!match) {
        throw new AppError('Invalid date format. Use YYYY-MM-DD or DD/MM/YYYY', 400);
    }

    const [, day, month, year] = match;
    return new Date(Date.UTC(year, month - 1, day));
};

module.exports = {parseDate}