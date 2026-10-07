/**
 * shared/utils/paymentStatus.js
 *
 * SINGLE SOURCE OF TRUTH for bill settlement status — used by the members
 * page, admin dashboard, edit-member modal, invoice banner and payable
 * widget so a settled refund never renders as "Refund Due" (or vice versa)
 * on one screen but not another.
 *
 * Canonical tokens:
 *   pending    — nothing settled yet (may owe, may be zero-bill)
 *   success    — member paid
 *   failed     — payment attempt failed
 *   refund     — credit exists but the money has NOT been returned yet
 *                ("Refund Due" — action pending)
 *   refunded   — refund payout record exists for the period (settled)
 *
 * Settlement always beats balance: a stored 'refunded' status wins over a
 * negative payableAmount, because the negative balance is exactly WHAT was
 * refunded, not evidence that it is still owed.
 */

/** Fallback for unknown/missing status tokens. */
const normalize = (status) => {
    const s = String(status || '').toLowerCase().trim();
    return s || 'pending';
};

/**
 * Resolve the canonical bill status from a stored status + current balance.
 *
 * @param {{ status?: string, payableAmount?: number }} input
 *   status         — stored/API status token (user.payment, user.gasBill,
 *                    payable paymentStatus, …)
 *   payableAmount  — signed balance (>0 owed, <0 credit). Optional; 0 when
 *                    absent so no credit is inferred without a balance.
 * @returns {'pending'|'success'|'failed'|'refund'|'refunded'}
 */
export function resolveBillStatus({ status, payableAmount } = {}) {
    const s = normalize(status);

    // 1. Settlement recorded → done, regardless of balance.
    if (s === 'refunded') return 'refunded';

    // 2. A refund-pending token from older payloads.
    if (s === 'refund') return 'refund';

    // 3. Credit exists but no payout recorded → refund due.
    const balance = Number(payableAmount);
    if (Number.isFinite(balance) && balance < 0) return 'refund';

    // 4. 'paid' is a legacy alias of 'success'.
    if (s === 'paid') return 'success';

    return s;
}

/** Human labels for canonical tokens (single mapping for every badge). */
export const BILL_STATUS_LABEL = Object.freeze({
    pending: 'Pending',
    success: 'Paid',
    failed: 'Failed',
    refund: 'Refund Due',
    refunded: 'Refunded',
});

/** Badge tone for canonical tokens (component-specific classes map onto these). */
export const BILL_STATUS_TONE = Object.freeze({
    pending: 'warning',
    success: 'success',
    failed: 'danger',
    refund: 'info',
    refunded: 'info',
});

/** True when nothing is outstanding (paid OR refund already returned). */
export function isSettledBill(status) {
    const s = normalize(status);
    return s === 'success' || s === 'paid' || s === 'refunded';
}

/** True when a credit exists but has NOT been paid out yet. */
export function isRefundDueBill(status) {
    return normalize(status) === 'refund';
}

/** True when the refund payout itself has been recorded. */
export function isRefundedBill(status) {
    return normalize(status) === 'refunded';
}
