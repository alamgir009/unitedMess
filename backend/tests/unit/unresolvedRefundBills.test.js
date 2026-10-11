/**
 * Unresolved Bills — refund visibility & settlement ground-truth suite.
 *
 * Regression coverage:
 *  1. getAdminUnpaidInvoices returns only ACTIONABLE rows — debt plus
 *     unsettled refund-credit invoices — each annotated with settlement
 *     fields (refundCredit / refundRecorded / refundRemaining). Fully
 *     settled refunds (remaining 0) are EXCLUDED: a resolved bill must
 *     clear from the admin's queue.
 *  2. Settlement is annotated via ONE Payment.find (no N+1, no
 *     Payment.distinct exclusion that used to hide rows invisibly).
 *  3. syncInvoiceAfterPayment keeps refund payouts as ground truth — a
 *     refunded invoice is never resurrected to 'unpaid'.
 */
jest.mock('../../src/models/Invoice.model');
jest.mock('../../src/models/Payment.model');
jest.mock('../../src/models/User.model');
jest.mock('../../src/services/email.service');

const Invoice = require('../../src/models/Invoice.model');
const Payment = require('../../src/models/Payment.model');
const {
    getAdminUnpaidInvoices,
    annotateRefundSettlement,
    SETTLEMENT_TOLERANCE,
} = require('../../src/services/invoice.service');
const { syncInvoiceAfterPayment } = require('../../src/services/payment.service');

/** Builds a mock Invoice.find() query chain: populate().sort().lean() */
function mockInvoiceFindChain(rows) {
    const chain = { populate: jest.fn(), sort: jest.fn(), lean: jest.fn() };
    chain.populate.mockReturnValue(chain);
    chain.sort.mockReturnValue(chain);
    chain.lean.mockResolvedValue(rows);
    return chain;
}

/** Builds a mock Payment.find() query chain: select().lean() */
function mockPaymentFindChain(rows) {
    const chain = { select: jest.fn() };
    chain.select.mockReturnValue({ lean: jest.fn().mockResolvedValue(rows) });
    return chain;
}

beforeEach(() => {
    jest.clearAllMocks();
});

describe('getAdminUnpaidInvoices — refund visibility & settlement annotation', () => {
    const debtRow = {
        _id: 'i1',
        user: { _id: 'u1', name: 'Debt Member' },
        status: 'unpaid',
        totalPayable: 1453.87,
        paidAmount: 0,
        monthName: 'September 2026',
    };
    const refundDueRow = {
        _id: 'i2',
        user: { _id: 'u2', name: 'Refund Member' },
        status: 'refunded',
        totalPayable: -232.27,
        paidAmount: 0,
        monthName: 'September 2026',
    };
    const settledRefundRow = {
        _id: 'i3',
        user: { _id: 'u3', name: 'Settled Member' },
        status: 'refunded',
        totalPayable: -500,
        paidAmount: 0,
        monthName: 'September 2026',
    };

    it('returns debt + UNSETTLED refund rows and excludes fully settled refunds', async () => {
        Invoice.find.mockReturnValue(mockInvoiceFindChain([debtRow, refundDueRow, settledRefundRow]));
        Payment.find.mockReturnValue(mockPaymentFindChain([{ user: 'u3', amount: 500 }]));

        const result = await getAdminUnpaidInvoices(9, 2026);

        // Settled refund (i3) cleared from the queue — only actionable work remains
        expect(result.map((r) => r._id)).toEqual(['i1', 'i2']);

        const [debt, due] = result;
        // Debt row: no refund credit involved
        expect(debt.refundCredit).toBe(0);
        expect(debt.refundRemaining).toBe(0);
        // Unsettled refund: full credit still remaining → actionable "Refund Due"
        expect(due.refundCredit).toBe(232.27);
        expect(due.refundRecorded).toBe(0);
        expect(due.refundRemaining).toBe(232.27);

        // Exactly one Payment.find for the whole period (no N+1)
        expect(Payment.find).toHaveBeenCalledTimes(1);
        expect(Payment.find).toHaveBeenCalledWith({
            month: { $in: ['September 2026'] },
            status: 'refunded',
        });
    });

    it('snaps remaining to 0 within the ₹1 settlement tolerance (→ row excluded)', async () => {
        // Credit 232.27 with a rounded ₹232 payout → considered settled → cleared
        Invoice.find.mockReturnValue(mockInvoiceFindChain([refundDueRow]));
        Payment.find.mockReturnValue(mockPaymentFindChain([{ user: 'u2', amount: 232 }]));

        const result = await getAdminUnpaidInvoices(9, 2026);

        expect(result).toEqual([]);
        expect(SETTLEMENT_TOLERANCE).toBe(1);
    });

    it('keeps a partially topped-up refund with the reduced remaining', async () => {
        const topUpRow = {
            _id: 'i5',
            user: { _id: 'u5', name: 'Top-up Member' },
            status: 'refunded',
            totalPayable: -329.6,
            paidAmount: 0,
            monthName: 'May 2026',
        };
        Invoice.find.mockReturnValue(mockInvoiceFindChain([topUpRow]));
        Payment.find.mockReturnValue(mockPaymentFindChain([
            { user: 'u5', amount: 114 },
            { user: 'u5', amount: 100 },
        ]));

        const result = await getAdminUnpaidInvoices(5, 2026);

        expect(result).toHaveLength(1);
        expect(result[0].refundCredit).toBe(329.6);
        expect(result[0].refundRecorded).toBe(214);
        expect(result[0].refundRemaining).toBe(115.6);
    });

    it('queries debt + refund-credit clauses with no top-level totalPayable wall', async () => {
        Invoice.find.mockReturnValue(mockInvoiceFindChain([]));

        await getAdminUnpaidInvoices(9, 2026);

        expect(Invoice.find).toHaveBeenCalledTimes(1);
        const filter = Invoice.find.mock.calls[0][0];
        expect(filter.month).toBe(9);
        expect(filter.year).toBe(2026);
        expect(filter.isExempt).toEqual({ $ne: true });
        expect(filter.totalPayable).toBeUndefined();
        expect(filter.status).toBeUndefined();
        expect(filter.$or).toEqual([
            { status: { $in: ['unpaid', 'partially_paid'] }, totalPayable: { $gt: 0 } },
            { status: 'refunded' },
            { totalPayable: { $lt: 0 } },
        ]);
    });

    it('short-circuits without a Payment lookup when nothing matches', async () => {
        Invoice.find.mockReturnValue(mockInvoiceFindChain([]));

        const result = await getAdminUnpaidInvoices(9, 2026);

        expect(result).toEqual([]);
        expect(Payment.find).not.toHaveBeenCalled();
    });
});

describe('annotateRefundSettlement — settlement math', () => {
    it('sums multiple refund records and computes remaining', async () => {
        Payment.find.mockReturnValue(mockPaymentFindChain([
            { user: 'u5', amount: 114 },
            { user: 'u5', amount: 100 },
        ]));

        const rows = await annotateRefundSettlement([
            { _id: 'i5', user: { _id: 'u5' }, totalPayable: -329.6, paidAmount: 0, monthName: 'May 2026' },
        ]);

        expect(rows[0].refundCredit).toBe(329.6);
        expect(rows[0].refundRecorded).toBe(214);
        expect(rows[0].refundRemaining).toBe(115.6);
    });

    it('snaps remaining to 0 when the shortfall is within tolerance', async () => {
        Payment.find.mockReturnValue(mockPaymentFindChain([{ user: 'u2', amount: 232 }]));

        const rows = await annotateRefundSettlement([
            { _id: 'i2', user: { _id: 'u2' }, totalPayable: -232.27, paidAmount: 0, monthName: 'September 2026' },
        ]);

        expect(rows[0].refundCredit).toBe(232.27);
        expect(rows[0].refundRecorded).toBe(232);
        expect(rows[0].refundRemaining).toBe(0);
    });

    it('treats legacy negative paidAmount as zero when computing credit', async () => {
        Payment.find.mockReturnValue(mockPaymentFindChain([]));

        const rows = await annotateRefundSettlement([
            { _id: 'i9', user: { _id: 'u9' }, totalPayable: -580, paidAmount: -580, monthName: 'May 2026' },
        ]);

        // credit = max(0, −(−580 − max(0, −580))) = 580, not 0
        expect(rows[0].refundCredit).toBe(580);
        expect(rows[0].refundRemaining).toBe(580);
    });
});

describe('syncInvoiceAfterPayment — refund payout is ground truth', () => {
    const baseInvoice = () => ({
        user: 'u1',
        month: 9,
        year: 2026,
        totalPayable: 1453.87,
        paidAmount: 1453.87,
        status: 'paid',
        save: jest.fn().mockResolvedValue(undefined),
    });

    it('promotes the invoice to refunded instead of resurrecting it as unpaid', async () => {
        const invoice = baseInvoice();
        Payment.find.mockResolvedValue([]); // completed mess_bill sum → 0 after refund
        Invoice.findOne.mockResolvedValue(invoice);
        Payment.exists.mockResolvedValue({ _id: 'p1' });

        await syncInvoiceAfterPayment('u1', 'September 2026');

        expect(Payment.exists).toHaveBeenCalledWith({
            user: 'u1',
            month: 'September 2026',
            status: 'refunded',
        });
        expect(invoice.status).toBe('refunded');
        expect(invoice.paidAmount).toBe(0);
        expect(invoice.save).toHaveBeenCalled();
    });

    it('still derives unpaid normally when no refund payout exists', async () => {
        const invoice = baseInvoice();
        Payment.find.mockResolvedValue([]);
        Invoice.findOne.mockResolvedValue(invoice);
        Payment.exists.mockResolvedValue(null);

        await syncInvoiceAfterPayment('u1', 'September 2026');

        expect(invoice.status).toBe('unpaid');
        expect(invoice.save).toHaveBeenCalled();
    });

    it('never touches an already-refunded invoice (terminal state)', async () => {
        const invoice = baseInvoice();
        invoice.status = 'refunded';
        Payment.find.mockResolvedValue([]);
        Invoice.findOne.mockResolvedValue(invoice);

        await syncInvoiceAfterPayment('u1', 'September 2026');

        expect(invoice.status).toBe('refunded');
        expect(Payment.exists).not.toHaveBeenCalled();
        expect(invoice.save).toHaveBeenCalled();
    });
});
