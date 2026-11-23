// common.validator.js
const validator = require('validator');
const { parsePhoneNumberFromString } = require('libphonenumber-js');

const commonWeakPasswords = new Set([
    'password', '123456', '123456789', 'qwerty', 'abc123', 'password1'
]);

function validatePassword(value) {
    if (typeof value !== 'string' || value.length < 10) {
        return { isValid: false, message: 'Password must be at least 10 characters' };
    }
    if (commonWeakPasswords.has(value.toLowerCase())) {
        return { isValid: false, message: 'Password is too common' };
    }
    if (!/[a-z]/.test(value)) {
        return { isValid: false, message: 'Password must contain at least one lowercase letter' };
    }
    if (!/[A-Z]/.test(value)) {
        return { isValid: false, message: 'Password must contain at least one uppercase letter' };
    }
    if (!/\d/.test(value)) {
        return { isValid: false, message: 'Password must contain at least one number' };
    }
    if (!/[^A-Za-z0-9]/.test(value)) {
        return { isValid: false, message: 'Password must contain at least one special character' };
    }
    return { isValid: true };
}

function isValidPhoneNumber(value) {
    if (!value) return true;
    try {
        const pn = parsePhoneNumberFromString(String(value));
        return !!(pn && pn.isValid());
    } catch (err) {
        return false;
    }
}

function isPositiveCurrencyAmount(value) {
    if (typeof value !== 'number' && typeof value !== 'string') return false;
    const amount = Number(value);
    return /^(?:\d+(?:\.\d{1,2})?|\.\d{1,2})$/.test(String(value).trim()) &&
        amount > 0 && Number.isSafeInteger(Math.round(amount * 100));
}

module.exports = {
    validatePassword,
    isValidPhoneNumber,
    isPositiveCurrencyAmount,
    isEmail: validator.isEmail,
    isURL: validator.isURL
};
