const {
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
} = require('../../src/services/billingExemption.service');

describe('billingExemption.service — policy invariants', () => {
    it('exposes exactly three overrides', () => {
        expect(OVERRIDES).toEqual(['none', 'force_exempt', 'force_bill']);
        expect(OVERRIDE.FORCE_EXEMPT).toBe('force_exempt');
        expect(OVERRIDE.FORCE_BILL).toBe('force_bill');
    });
});

describe('hasBillingActivity', () => {
    it.each([
        [0, 0, false],
        [1, 0, true],
        [0, 0.01, true],
        [12, 500, true],
        [undefined, undefined, false],
        [null, null, false],
    ])('meal=%s market=%s -> %s', (totalMeal, totalMarketAmount, expected) => {
        expect(hasBillingActivity({ totalMeal, totalMarketAmount })).toBe(expected);
    });
});

describe('normalizeOverride', () => {
    it('passes through valid values', () => {
        expect(normalizeOverride('none')).toBe('none');
        expect(normalizeOverride('force_exempt')).toBe('force_exempt');
        expect(normalizeOverride('force_bill')).toBe('force_bill');
    });

    it('falls back to none for unknown / missing values', () => {
        expect(normalizeOverride(undefined)).toBe('none');
        expect(normalizeOverride(null)).toBe('none');
        expect(normalizeOverride('')).toBe('none');
        expect(normalizeOverride('EXEMPT')).toBe('none');
        expect(normalizeOverride({ $ne: null })).toBe('none');
        expect(normalizeOverride(1)).toBe('none');
    });
});

describe('resolveExemption — admin intent wins', () => {
    it('force_exempt exempts regardless of activity', () => {
        const r = resolveExemption({ override: OVERRIDE.FORCE_EXEMPT, totalMeal: 42, totalMarketAmount: 999 });
        expect(r).toEqual({
            isExempt: true,
            exemptSource: SOURCE.MANUAL,
            exemptReason: MANUAL_EXEMPT_REASON,
        });
    });

    it('force_exempt uses the admin reason when supplied', () => {
        const r = resolveExemption({ override: OVERRIDE.FORCE_EXEMPT, reason: '  Medical leave  ' });
        expect(r.isExempt).toBe(true);
        expect(r.exemptSource).toBe(SOURCE.MANUAL);
        expect(r.exemptReason).toBe('Medical leave');
    });

    it('force_bill always bills, even with zero activity', () => {
        const r = resolveExemption({ override: OVERRIDE.FORCE_BILL, totalMeal: 0, totalMarketAmount: 0 });
        expect(r).toEqual({ isExempt: false, exemptSource: null, exemptReason: null });
    });

    it('force_bill wins over an already-recorded payment', () => {
        const r = resolveExemption({ override: OVERRIDE.FORCE_BILL, paidAmount: 1200 });
        expect(r.isExempt).toBe(false);
    });
});

describe('resolveExemption — automatic zero-activity rule', () => {
    it('exempts when there are no meals and no market spend', () => {
        const r = resolveExemption({ override: OVERRIDE.NONE, totalMeal: 0, totalMarketAmount: 0 });
        expect(r).toEqual({
            isExempt: true,
            exemptSource: SOURCE.AUTO_NO_ACTIVITY,
            exemptReason: AUTO_NO_ACTIVITY_REASON,
        });
    });

    it('bills when there are meals', () => {
        expect(resolveExemption({ totalMeal: 1 }).isExempt).toBe(false);
    });

    it('bills when there is market spend only', () => {
        expect(resolveExemption({ totalMarketAmount: 10 }).isExempt).toBe(false);
    });

    it('never auto-exempts an invoice that money was already recorded against', () => {
        const r = resolveExemption({ totalMeal: 0, totalMarketAmount: 0, paidAmount: 500 });
        expect(r).toEqual({ isExempt: false, exemptSource: null, exemptReason: null });
    });

    it('is NOT derived from join / activation dates', () => {
        // Date-only payloads must not be able to produce an exemption —
        // the only inputs the resolver reads are activity and money.
        const r = resolveExemption({
            totalMeal: 30,
            totalMarketAmount: 4000,
            activatedAt: '2026-10-05T00:00:00.000Z', // activated mid-period
            createdAt: '2026-10-05T00:00:00.000Z',
            billingExemptMonth: 10,
            billingExemptYear: 2026,
        });
        expect(r.isExempt).toBe(false);
    });

    it('returns a stable shape regardless of input', () => {
        const shapes = [
            resolveExemption(),
            resolveExemption({}),
            resolveExemption({ totalMeal: 5 }),
            resolveExemption({ override: 'garbage' }),
        ].map(r => Object.keys(r).sort().join(','));
        expect(new Set(shapes)).toEqual(new Set(['exemptReason,exemptSource,isExempt']));
    });
});

describe('resolveFromInvoice', () => {
    it('honours a stored force_exempt override', () => {
        const r = resolveFromInvoice({ exemptOverride: 'force_exempt', mealCount: 12 });
        expect(r.isExempt).toBe(true);
        expect(r.exemptSource).toBe(SOURCE.MANUAL);
    });

    it('honours a stored force_bill override over zero activity', () => {
        const r = resolveFromInvoice({ exemptOverride: 'force_bill', mealCount: 0, marketAmountSpent: 0 });
        expect(r.isExempt).toBe(false);
    });

    it('falls back to the zero-activity rule for a stored override of none', () => {
        const r = resolveFromInvoice({ exemptOverride: 'none', mealCount: 0, marketAmountSpent: 0 });
        expect(r.isExempt).toBe(true);
        expect(r.exemptSource).toBe(SOURCE.AUTO_NO_ACTIVITY);
    });

    it('treats a corrupt override value as none', () => {
        const r = resolveFromInvoice({ exemptOverride: 'always_exempt', mealCount: 0, marketAmountSpent: 0 });
        expect(r.exemptSource).toBe(SOURCE.AUTO_NO_ACTIVITY);
    });

    it('applies the zero-activity rule when no invoice exists yet', () => {
        expect(resolveFromInvoice(null, { totalMeal: 0, totalMarketAmount: 0 }).isExempt).toBe(true);
        expect(resolveFromInvoice(null, { totalMeal: 3, totalMarketAmount: 0 }).isExempt).toBe(false);
    });
});

describe('resolveEffective — badge/amount read path', () => {
    it('trusts the stored invoice flag when it is exempt', () => {
        const r = resolveEffective({
            invoice: { isExempt: true, exemptSource: 'manual', exemptReason: 'On leave' },
            totalMeal: 0,
            totalMarketAmount: 0,
        });
        expect(r).toEqual({ isExempt: true, exemptSource: 'manual', exemptReason: 'On leave' });
    });

    it('trusts the stored invoice flag even when the activity looks exempt', () => {
        // The invoice already merged the admin override — re-deriving here
        // is what used to make the badge and the amount disagree.
        const r = resolveEffective({
            invoice: { isExempt: false, exemptOverride: 'force_bill' },
            totalMeal: 0,
            totalMarketAmount: 0,
        });
        expect(r).toEqual({ isExempt: false, exemptSource: null, exemptReason: null });
    });

    it('backfills a missing reason when the stored flag has none', () => {
        const r = resolveEffective({ invoice: { isExempt: true } });
        expect(r.exemptSource).toBe(SOURCE.AUTO_NO_ACTIVITY);
        expect(r.exemptReason).toBe(AUTO_NO_ACTIVITY_REASON);
    });

    it('uses the zero-activity rule when there is no invoice at all', () => {
        expect(resolveEffective({ totalMeal: 0, totalMarketAmount: 0 }).isExempt).toBe(true);
        expect(resolveEffective({ totalMeal: 7, totalMarketAmount: 0 }).isExempt).toBe(false);
    });

    it('does not auto-exempt an invoice-less period that already has money', () => {
        expect(resolveEffective({ totalMeal: 0, totalMarketAmount: 0, paidAmount: 900 }).isExempt).toBe(false);
    });
});
