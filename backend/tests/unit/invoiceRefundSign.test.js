/**
 * Refund-sign + no-fabrication regression suite.
 *
 * finalizeMonth / syncInvoiceStatus must NEVER fabricate refund Payment
 * records. Auto-created "Auto-refund … credited during finalization"
 * records made fully-unsettled refund-due bills invisible to the
 * Unresolved Bills panel and falsely showed "Refunded" to members who
 * never received money. A payout record only exists once an admin
 * actually resolves the bill on the panel.
 *
 * Sign rules that remain:
 *  - Payment.amount is validated min: 0 → admin refunds store |delta| with
 *    status:'refunded' (controller).
 *  - Invoice.paidAmount is validated min: 0 → controller clamps.
 *  - Negative totalPayable derives status 'refunded' (credit owed).
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

beforeEach(() => {
    jest.clearAllMocks();
});

describe('syncInvoiceStatus — derives status, never fabricates refund records', () => {
    it('marks refunded for negative totalPayable WITHOUT creating any Payment', async () => {
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

        await syncInvoiceStatus('inv1');

        expect(Payment.create).not.toHaveBeenCalled();
        expect(Payment.findOne).not.toHaveBeenCalled();
        expect(invoice.status).toBe('refunded');
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
        expect(invoice.status).toBe('unpaid');
        expect(invoice.save).toHaveBeenCalled();
    });

    it('derives partially_paid from completed payments on a positive bill', async () => {
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
        // calculatePaidAmount queries { status: 'completed', type: 'mess_bill' }
        // — the mock returns what that query would yield.
        Payment.find.mockResolvedValue([{ amount: 200 }, { amount: 100 }]);

        await syncInvoiceStatus('inv3');

        expect(Payment.create).not.toHaveBeenCalled();
        expect(invoice.paidAmount).toBe(300);
        expect(invoice.status).toBe('partially_paid');
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
        // _attachLatestPayment chain: findOne().sort().populate().populate().lean()
        Payment.findOne.mockReturnValue({
            sort: jest.fn().mockReturnValue({
                populate: jest.fn().mockReturnThis(),
                lean: jest.fn().mockResolvedValue(null),
            }),
        });
        Invoice.find.mockResolvedValue([]); // exempt-invoice sweep

        const results = await finalizeMonth(9, 2026);

        expect(results).toHaveLength(1);
        expect(results[0].user).toBe('uB');
        expect(invoiceB.save).toHaveBeenCalledTimes(1);
        expect(invoiceB.isFinalized).toBe(true);
        // No refund bookkeeping during finalization — ever.
        expect(Payment.create).not.toHaveBeenCalled();
        expect(logger.error).toHaveBeenCalledWith(
            '[FinalizeMonth] Skipping member after error',
            expect.objectContaining({ userId: 'uA' }),
        );

        logger.error.mockRestore();
    });
});
