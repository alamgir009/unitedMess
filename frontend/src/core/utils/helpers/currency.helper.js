/**
 * Format a number in Indian locale (en-IN) with 0-2 decimal places.
 * @param {number|string} n
 * @param {number} minFraction
 * @param {number} maxFraction
 * @returns {string}
 */
export const fmt = (n, minFraction = 0, maxFraction = 2) =>
    Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: minFraction, maximumFractionDigits: maxFraction });

/**
 * Currency label with the sign BEFORE the ₹ symbol (fintech convention):
 *   formatSignedRupees(779)   → "₹779"
 *   formatSignedRupees(-232)  → "-₹232"
 *   formatSignedRupees(0)     → "₹0"
 * Never renders the invalid "₹-232".
 * @param {number} n
 * @returns {string}
 */
export const formatSignedRupees = (n) => {
    const v = Number(n) || 0;
    return v < 0 ? `-₹${fmt(-v)}` : `₹${fmt(v)}`;
};
