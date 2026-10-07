/**
 * getPaybleAmountforMeal / getPaybleAmountforGasBill status-token regressions.
 *
 * Canonical tokens (shared/utils/paymentStatus.js):
 *   'refunded' — refund payout record exists for the period → settled
 *   'refund'   — credit exists but money NOT returned → "Refund Due"
 *
 * A settled refund must never surface as 'refund' (that is exactly the bug
 * where Md Rafij's cleared invoice still showed "Refund Due").
 */
jest.mock('../../src/models/User.model');
jest.mock('../../src/models/Payment.model');
jest.mock('../../src/models/Invoice.model');
jest.mock('../../src/models/Meal.model');
jest.mock('../../src/models/Market.model');
jest.mock('../../src/services/email.service');
jest.mock('../../src/services/notification.service');
jest.mock('../../src/services/invoice.service');
jest.mock('../../src/sockets', () => ({ emitToAll: jest.fn() }));

const mongoose = require('mongoose');
const User = require('../../src/models/User.model');
const Payment = require('../../src/models/Payment.model');
const invoiceService = require('../../src/services/invoice.service');
const { getBillingPeriod } = require('../../src/utils/helpers/date.helper');
const { getPaybleAmountforMeal, getPaybleAmountforGasBill } = require('../../src/services/user.service');

const currentMonthName = getBillingPeriod().monthName;
const userId = new mongoose.Types.ObjectId().toString();

const baseInvoice = {
    month: 9,
    year: 2026,
    monthName: currentMonthName,
    mealCount: 0,
    guestMealCount: 0,
    marketAmountSpent: 0,
    fixedCosts: {},
    messCost: 0,
    guestMealRevenue: 0,
    mealRate: 0,
    isExempt: false,
    status: 'unpaid',
};

const baseStats = {
    mealRate: 0,
    totalMarketAmount: 0,
    totalMealCount: 0,
    totalGuestCount: 0,
    guestRevenue: 0,
};

/**
 * Payment.findOne is called once per settlement lookup. Resolve each call
 * from its query filters so Promise.all order does not matter.
 */
function stubPaymentLookups({ messRefund = null, gasRefund = null, gasCompleted = null } = {}) {
    Payment.findOne.mockImplementation((query = {}) => ({
        lean: () => {
            if (query.type === 'mess_bill') {
                return Promise.resolve(query.status === 'refunded' ? messRefund : null);
            }
            if (query.type === 'gas_bill') {
                if (query.status === 'refunded') return Promise.resolve(gasRefund);
                if (query.status === 'completed') return Promise.resolve(gasCompleted);
            }
            return Promise.resolve(null);
        },
    }));
}

/** User.findById must serve both `.lean()` and `.select().lean()` chains. */
function stubUser(fields = {}) {
    const doc = { _id: userId, chargePerGuestMeal: 60, ...fields };
    const query = { lean: () => Promise.resolve(doc) };
    User.findById.mockReturnValue({ ...query, select: () => query });
}

beforeEach(() => {
    jest.clearAllMocks();
    invoiceService.getActiveInvoice.mockResolvedValue({ ...baseInvoice });
    invoiceService.calculateMessStats.mockResolvedValue({ ...baseStats });
    stubUser();
    User.findByIdAndUpdate.mockReturnValue(Promise.resolve({}));
});

describe('getPaybleAmountforMeal — paymentStatus token', () => {
    it("returns 'refunded' when a refund payout record exists (settlement beats invoice status)", async () => {
        stubPaymentLookups({ messRefund: { _id: 'r1', amount: 232.27, status: 'refunded' } });
        invoiceService.getActiveInvoice.mockResolvedValue({ ...baseInvoice, status: 'refunded' });

        const result = await getPaybleAmountforMeal(userId);

        expect(result.paymentStatus).toBe('refunded');
    });

    it("returns 'refund' when invoice status is refunded but NO payout record exists", async () => {
        stubPaymentLookups({ messRefund: null });
        invoiceService.getActiveInvoice.mockResolvedValue({ ...baseInvoice, status: 'refunded' });

        const result = await getPaybleAmountforMeal(userId);

        expect(result.paymentStatus).toBe('refund');
    });

    it("still returns 'refunded' even when invoice status regressed to 'unpaid' — payout is ground truth", async () => {
        stubPaymentLookups({ messRefund: { _id: 'r2', status: 'refunded' } });

        const result = await getPaybleAmountforMeal(userId);

        expect(result.paymentStatus).toBe('refunded');
    });

    it("returns 'success' for a paid invoice with no refund record", async () => {
        stubPaymentLookups();
        invoiceService.getActiveInvoice.mockResolvedValue({ ...baseInvoice, status: 'paid' });

        const result = await getPaybleAmountforMeal(userId);

        expect(result.paymentStatus).toBe('success');
    });

    it("returns 'pending' for an unpaid invoice with no settlements", async () => {
        stubPaymentLookups();

        const result = await getPaybleAmountforMeal(userId);

        expect(result.paymentStatus).toBe('pending');
    });
});

describe('getPaybleAmountforMeal — gasBillStatus token', () => {
    it("returns 'refunded' when a gas refund payout exists — even if also completed", async () => {
        stubPaymentLookups({
            gasRefund: { _id: 'g1', status: 'refunded' },
            gasCompleted: { _id: 'g2', status: 'completed' },
        });

        const result = await getPaybleAmountforMeal(userId);

        expect(result.gasBillStatus).toBe('refunded');
    });

    it("returns 'success' when the gas bill was completed and not refunded", async () => {
        stubPaymentLookups({ gasCompleted: { _id: 'g3', status: 'completed' } });

        const result = await getPaybleAmountforMeal(userId);

        expect(result.gasBillStatus).toBe('success');
    });

    it("returns 'pending' when no gas payment records exist", async () => {
        stubPaymentLookups();

        const result = await getPaybleAmountforMeal(userId);

        expect(result.gasBillStatus).toBe('pending');
    });
});

describe('getPaybleAmountforGasBill — status token', () => {
    it("returns 'refunded' when a gas refund payout exists for the billing month", async () => {
        stubPaymentLookups({ gasRefund: { _id: 'g4', status: 'refunded' }, gasCompleted: { _id: 'g5', status: 'completed' } });
        stubUser({ gasBillCharge: 150, isActive: true });

        const result = await getPaybleAmountforGasBill(userId);

        expect(result.status).toBe('refunded');
        expect(result.monthName).toBe(getBillingPeriod().monthName);
    });

    it("returns 'success' when only a completed gas payment exists", async () => {
        stubPaymentLookups({ gasCompleted: { _id: 'g6', status: 'completed' } });
        stubUser({ gasBillCharge: 150, isActive: true });

        const result = await getPaybleAmountforGasBill(userId);

        expect(result.status).toBe('success');
    });

    it("returns 'pending' when no gas payment records exist", async () => {
        stubPaymentLookups();
        stubUser({ gasBillCharge: 150, isActive: true });

        const result = await getPaybleAmountforGasBill(userId);

        expect(result.status).toBe('pending');
    });
});
