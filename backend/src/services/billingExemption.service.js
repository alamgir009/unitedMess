/**
 * billingExemption.service.js
 * ─────────────────────────────────────────────────────────────────────
 * SINGLE SOURCE OF TRUTH for mess-bill exemption resolution.
 *
 * Every other service (invoice, user, batch payable) MUST derive its
 * exemption decision from here — never from join/activation dates.
 *
 * Policy (fintech-grade, manual-first):
 *   1. Admin intent always wins.
 *        'force_exempt' → exempt, regardless of activity.
 *        'force_bill'   → billed,  regardless of activity.
 *   2. When the admin has expressed no intent ('none'), the ONLY
 *      automatic rule left is zero-activity:
 *        0 meals AND 0 market spend in the period → exempt.
 *      This is factual (the member used nothing), not a date heuristic.
 *   3. There is deliberately NO automatic exemption derived from
 *      activatedAt / createdAt / billingExemptMonth / billingExemptYear.
 *      Those date heuristics were removed — they produced hidden ₹0
 *      bills that no admin ever approved.
 * ─────────────────────────────────────────────────────────────────────
 */

const OVERRIDE = Object.freeze({
    NONE: 'none',
    FORCE_EXEMPT: 'force_exempt',
    FORCE_BILL: 'force_bill',
});

const OVERRIDES = Object.freeze([OVERRIDE.NONE, OVERRIDE.FORCE_EXEMPT, OVERRIDE.FORCE_BILL]);

const SOURCE = Object.freeze({
    MANUAL: 'manual',
    AUTO_NO_ACTIVITY: 'auto_no_activity',
});

const MANUAL_EXEMPT_REASON = 'Set manually by admin';
const AUTO_NO_ACTIVITY_REASON = 'Member has no meal or market activity in this period';

/**
 * Did this member use the mess during the billing period?
 * Pure predicate — no DB, no dates.
 *
 * @param {Object}  opts
 * @param {number}  [opts.totalMeal=0]         — mealCount incl. guest meals
 * @param {number}  [opts.totalMarketAmount=0] — market spend
 * @returns {boolean}
 */
const hasBillingActivity = ({ totalMeal = 0, totalMarketAmount = 0 } = {}) =>
    (Number(totalMeal) || 0) > 0 || (Number(totalMarketAmount) || 0) > 0;

/**
 * Resolve the effective exemption for a member + billing period.
 *
 * @param {Object}  opts
 * @param {string}  [opts.override='none']       — admin intent (OVERRIDE.*)
 * @param {number}  [opts.totalMeal=0]
 * @param {number}  [opts.totalMarketAmount=0]
 * @param {number}  [opts.paidAmount=0]           — recorded payments for the period
 * @param {string}  [opts.reason]                — admin-supplied reason (force_exempt)
 * @returns {{ isExempt: boolean, exemptSource: string|null, exemptReason: string|null }}
 */
const resolveExemption = ({
    override = OVERRIDE.NONE,
    totalMeal = 0,
    totalMarketAmount = 0,
    paidAmount = 0,
    reason = null,
} = {}) => {
    if (override === OVERRIDE.FORCE_EXEMPT) {
        const trimmed = typeof reason === 'string' ? reason.trim() : '';
        return {
            isExempt: true,
            exemptSource: SOURCE.MANUAL,
            exemptReason: trimmed || MANUAL_EXEMPT_REASON,
        };
    }

    if (override === OVERRIDE.FORCE_BILL) {
        return { isExempt: false, exemptSource: null, exemptReason: null };
    }

    // ── Automatic rule: zero activity AND no money already collected ──
    // A recorded payment is itself proof of admin billing intent. The
    // automatic rule must NEVER silently zero an invoice that money has
    // already been booked against — that would orphan the Payment record.
    // The admin can still exempt it, but only AFTER refunding (409 guard
    // in invoice.service.setInvoiceExemption).
    if (Number(paidAmount) > 0) {
        return { isExempt: false, exemptSource: null, exemptReason: null };
    }

    const active = hasBillingActivity({ totalMeal, totalMarketAmount });
    if (active) {
        return { isExempt: false, exemptSource: null, exemptReason: null };
    }

    return {
        isExempt: true,
        exemptSource: SOURCE.AUTO_NO_ACTIVITY,
        exemptReason: AUTO_NO_ACTIVITY_REASON,
    };
};

/**
 * Normalize an arbitrary stored override value so legacy / corrupted
 * documents can never bypass the resolver.
 * @param {string} value
 * @returns {string}
 */
const normalizeOverride = (value) => (OVERRIDES.includes(value) ? value : OVERRIDE.NONE);

/**
 * Resolve from an existing Invoice document + its period activity.
 * Convenience wrapper used by every read path that already holds both.
 *
 * @param {Object} invoice        — lean or hydrated Invoice (may be null)
 * @param {Object} activity       — { totalMeal, totalMarketAmount }
 * @returns {{ isExempt, exemptSource, exemptReason }}
 */
const resolveFromInvoice = (invoice, activity = {}) => {
    if (invoice) {
        return resolveExemption({
            override: normalizeOverride(invoice.exemptOverride),
            totalMeal: activity.totalMeal ?? invoice.mealCount,
            totalMarketAmount: activity.totalMarketAmount ?? invoice.marketAmountSpent,
            paidAmount: activity.paidAmount ?? invoice.paidAmount,
            reason: invoice.exemptReason,
        });
    }
    return resolveExemption({ override: OVERRIDE.NONE, ...activity });
};

/**
 * Resolve the EFFECTIVE exemption for a member in a period, given an
 * (optional) stored Invoice plus live activity figures.
 *
 * Contract — this is what every list/batch/badge read path must use:
 *   • Invoice present  → its denormalized `isExempt` is AUTHORITATIVE.
 *     It already merges the admin override with the automatic rule, and it
 *     is the same value the invoice payment-status cascade reads. Re-deriving
 *     here would let the badge and the ₹0 amount disagree.
 *   • Invoice absent   → apply the zero-activity rule (no invoice has ever
 *     been generated for this member/period).
 *
 * @param {Object}  opts
 * @param {Object}  [opts.invoice]  — stored Invoice for the period (or null)
 * @param {number}  [opts.totalMeal]
 * @param {number}  [opts.totalMarketAmount]
 * @param {number}  [opts.paidAmount]
 * @returns {{ isExempt: boolean, exemptSource: string|null, exemptReason: string|null }}
 */
const resolveEffective = ({
    invoice = null,
    totalMeal = 0,
    totalMarketAmount = 0,
    paidAmount = 0,
} = {}) => {
    if (invoice) {
        const isExempt = invoice.isExempt === true;
        if (!isExempt) return { isExempt: false, exemptSource: null, exemptReason: null };
        return {
            isExempt: true,
            exemptSource: invoice.exemptSource || SOURCE.AUTO_NO_ACTIVITY,
            exemptReason: invoice.exemptReason || AUTO_NO_ACTIVITY_REASON,
        };
    }

    return resolveExemption({ override: OVERRIDE.NONE, totalMeal, totalMarketAmount, paidAmount });
};

module.exports = {
    OVERRIDE,
    OVERRIDES,
    SOURCE,
    MANUAL_EXEMPT_REASON,
    AUTO_NO_ACTIVITY_REASON,
    hasBillingActivity,
    resolveExemption,
    resolveEffective,
    resolveFromInvoice,
    normalizeOverride,
};
