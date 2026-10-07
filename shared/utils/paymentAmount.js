/**
 * shared/utils/paymentAmount.js
 *
 * SINGLE SOURCE OF TRUTH for payment money-flow arithmetic.
 *
 * Two refund storage conventions coexist in production data:
 *   - legacy records:  amount < 0,  status: 'refunded'  (pre-2026-09-16)
 *   - form records:    amount > 0,  status: 'refunded'  (model enforces min: 0)
 * Every total MUST go through these helpers so both conventions net out
 * identically and never-settled records (pending/failed) cannot inflate
 * cash totals.
 */

/** Number coercion that never yields NaN. */
const toAmount = (value) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
};

/**
 * Signed, settled cash-flow value of a payment record.
 *  - completed            → +amount (money in)
 *  - refunded             → −|amount| (money out; covers both conventions)
 *  - pending / pending_verification / failed / unknown → 0 (never settled;
 *    failed money never arrived, pending money is not yet real)
 *
 * @param {{ amount?: number, status?: string }} payment
 * @returns {number}
 */
export function signedPaymentAmount(payment) {
    const amount = toAmount(payment?.amount);
    switch (payment?.status) {
        case 'completed':
            return amount;
        case 'refunded':
            return -Math.abs(amount);
        default:
            return 0;
    }
}

/**
 * Net settled total of a list of payment records.
 * Net of [1011 completed, 232 refunded] === 779.
 *
 * @param {Array<{ amount?: number, status?: string }>} payments
 * @returns {number}
 */
export function sumSettledPayments(payments) {
    if (!Array.isArray(payments)) return 0;
    return payments.reduce((sum, p) => sum + signedPaymentAmount(p), 0);
}

/**
 * True when a record represents a refund — by status OR by stored sign,
 * so legacy negative-amount records are never rendered/summed as inflow.
 *
 * @param {{ amount?: number, status?: string }} payment
 * @returns {boolean}
 */
export function isRefundPayment(payment) {
    if (!payment) return false;
    return payment.status === 'refunded' || toAmount(payment.amount) < 0;
}

/**
 * Breakdown of a payment list for summary UIs.
 * All buckets derive from the same signed semantics:
 *   net = paid − refunded
 *
 * @param {Array<{ amount?: number, status?: string }>} payments
 * @returns {{ net: number, paid: number, refunded: number, pending: number, failed: number, count: number }}
 */
export function summarizePayments(paymentsIn) {
    const payments = Array.isArray(paymentsIn) ? paymentsIn : [];
    let paid = 0;
    let refunded = 0;
    let pending = 0;
    let failed = 0;

    for (const p of payments) {
        const amount = toAmount(p?.amount);
        switch (p?.status) {
            case 'completed':
                paid += amount;
                break;
            case 'refunded':
                refunded += Math.abs(amount);
                break;
            case 'pending':
            case 'pending_verification':
                pending += amount;
                break;
            case 'failed':
                failed += amount;
                break;
            default:
                break;
        }
    }

    return {
        net: paid - refunded,
        paid,
        refunded,
        pending,
        failed,
        count: payments.length,
    };
}
