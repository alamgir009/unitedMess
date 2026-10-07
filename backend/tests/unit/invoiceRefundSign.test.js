/**
 * Refund-sign regression suite.
 *
 * Payment.amount is validated min: 0 (Payment.model), so every refund record
 * must be stored as a NON-NEGATIVE amount with status:'refunded'. Storing the
 * negative delta/totalPayable directly throws ValidationError and, because
 * finalizeMonth had no per-user isolation, a single credited member used to be
 * able to abort finalization for everyone.
 */
jest.mock('../../src/models/Invoice.model');
jest.mock('../../src/models/Payment.model');
jest.mock('../../src/models/User.model');
jest.mock('../../src/services/email.service');

const Invoice = require('../../src/models/Invoice.model');
const Payment = require('../../src/models/Payment.model');
const User = require('../../src/models/User.model');
const logger = require('../../src/utils/logger');
const { syncInvoiceStatus, finalizeMonth } = require('../../src/services/invoice.service');
const { getBillingPeriod } = require('../../src/utils/helpers/date.helper');

const currentMonthName = getBillingPeriod().monthName;

/** Stubs the two findOne chains syncInvoiceStatus walks before creating a refund. */
function stubRefundLookups(existingRefund, originalPayment) {
    let call = 0;
    Payment.findOne.mockImplementation(() => {
        call += 1;
        if (call === 1) {
            // existing refund lookup: findOne().lean()
            return { lean: jest.fn().mockResolvedValue(existingRefund) };
        }
        // original payment lookup: findOne().sort().lean()
        return {
            sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(originalPayment) }),
        };
    });
}

beforeEach(() => {
    jest.clearAllMocks();
});

describe('syncInvoiceStatus — auto-refund stores non-negative amount', () => {
    it('creates the refund Payment with amount > 0 for negative totalPayable', async () => {
        const invoice = {
            user: 'u1',
            month: 9,
            year: 2026,
            monthName: currentMonthName,
            totalPayable: -232.27,
            paidAmount: 0,
            save: jest.fn().mockResolvedValue(undefined),
        };

        Invoice.findById.mockResolvedValue(invoice);
        Payment.find.mockResolvedValue([]); // calculatePaidAmount → 0
        stubRefundLookups(null, null);
        User.findOne.mockReturnValue({
            select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'admin1' }) }),
        });
        Payment.create.mockResolvedValue({});

        await syncInvoiceStatus('inv1');

        expect(Payment.create).toHaveBeenCalledTimes(1);
        const created = Payment.create.mock.calls[0][0];
        expect(created.amount).toBe(232.27);
        expect(created.amount).toBeGreaterThanOrEqual(0);
        expect(created.status).toBe('refunded');
        expect(created.createdBy).toBe('admin1');
        expect(invoice.save).toHaveBeenCalled();
    });

    it('does not create a refund when totalPayable is not negative', async () => {
        const invoice = {
            user: 'u1',
            month: 9,
            year: 2026,
            monthName: currentMonthName,
            totalPayable: 500,
            paidAmount: 0,
            save: jest.fn().mockResolvedValue(undefined),
        };

        Invoice.findById.mockResolvedValue(invoice);
        Payment.find.mockResolvedValue([]);

        await syncInvoiceStatus('inv2');

        expect(Payment.create).not.toHaveBeenCalled();
        expect(invoice.save).toHaveBeenCalled();
    });

    it('skips creation when a refund for the period already exists (idempotent)', async () => {
        const invoice = {
            user: 'u1',
            month: 9,
            year: 2026,
            monthName: currentMonthName,
            totalPayable: -100,
            paidAmount: 0,
            save: jest.fn().mockResolvedValue(undefined),
        };

        Invoice.findById.mockResolvedValue(invoice);
        Payment.find.mockResolvedValue([]);
        stubRefundLookups({ _id: 'existingRefund' }, null);

        await syncInvoiceStatus('inv3');

        expect(Payment.create).not.toHaveBeenCalled();
        expect(invoice.save).toHaveBeenCalled();
    });
});

describe('finalizeMonth — per-user isolation', () => {
    it('one member failing does not abort finalization for the rest', async () => {
        jest.spyOn(logger, 'error').mockImplementation(() => {});

        const invoiceB = {
            user: 'uB',
            month: 9,
            year: 2026,
            monthName: currentMonthName,
            isFinalized: false,
            paidAmount: 500,
            totalPayable: 500,
            save: jest.fn().mockResolvedValue(undefined),
            toObject() { return this; },
        };
        // getInvoice's strict read-only view of uB's already-closed invoice
        const closedView = {
            user: 'uB',
            month: 9,
            year: 2026,
            monthName: currentMonthName,
            isFinalized: true,
            paidAmount: 500,
            totalPayable: 500,
            toObject() { return this; },
        };

        User.find.mockReturnValue({
            select: jest.fn().mockReturnValue({
                lean: jest.fn().mockResolvedValue([{ _id: 'uA' }, { _id: 'uB' }]),
            }),
        });

        // uA: invoice lookup succeeds, then the user fetch blows up inside
        //     getInvoice → must be skipped without touching uB.
        // uB: 1st findOne = getInvoice (closed → read-only), 2nd = loop body.
        let uBLookups = 0;
        Invoice.findOne.mockImplementation(({ user }) => {
            if (user !== 'uB') return Promise.resolve(null);
            uBLookups += 1;
            return Promise.resolve(uBLookups === 1 ? closedView : invoiceB);
        });
        User.findById.mockImplementation((id) => ({
            lean: () =>
                id === 'uA'
                    ? Promise.reject(new Error('transient db error'))
                    : Promise.resolve({ _id: 'uB' }),
        }));
        Payment.findOne.mockReturnValue({
            sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }),
        });
        Invoice.find.mockResolvedValue([]); // exempt-invoice sweep

        const results = await finalizeMonth(9, 2026, 'admin1');

        expect(results).toHaveLength(1);
        expect(results[0].user).toBe('uB');
        expect(invoiceB.save).toHaveBeenCalledTimes(1);
        expect(invoiceB.isFinalized).toBe(true);
        expect(logger.error).toHaveBeenCalledWith(
            '[FinalizeMonth] Skipping member after error',
            expect.objectContaining({ userId: 'uA' }),
        );

        logger.error.mockRestore();
    });
});
