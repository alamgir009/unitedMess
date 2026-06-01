/**
 * Format a number in Indian locale (en-IN) with 0-2 decimal places.
 * @param {number|string} n
 * @param {number} minFraction
 * @param {number} maxFraction
 * @returns {string}
 */
export const fmt = (n, minFraction = 0, maxFraction = 2) =>
    Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: minFraction, maximumFractionDigits: maxFraction });
