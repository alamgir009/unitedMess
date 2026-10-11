/**
 * buildInvoiceForPdf — refund annotation contract for the invoice PDF.
 *
 * The REFUND DETAILS block in pdf.service.js renders from:
 *   _refundAmount, _refundAt, _refundMethod, _refundReference?
 *
 * Contract:
 *  - _refundMethod always mirrors the payout Payment.paymentMethod so the
 *    PDF can show "Cash" / "UPI (Manual)" / "Online (Razorpay)".
 *  - _refundReference is attached ONLY for gateway payouts (real txn id).
 *    Panel cash refunds carry no transactionId — the raw Mongo _id is
 *    meaningless to a member and must never surface (regression: Nayan's
 *    Sept 2026 invoice printed "Reference: 6acba14a…").
 */
jest.mock('../../src/models/Invoice.model');
jest.mock('../../src/models/Payment.model');
jest.mock('../../src/models/User.model');
jest.mock('../../src/models/Meal.model');
jest.mock('../../src/models/Market.model');
jest.mock('../../src/models/UpiConfig.model');

const Invoice = require('../../src/models/Invoice.model');
const Payment = require('../../src/models/Payment.model');
const User = require('../../src/models/User.model');
const Meal = require('../../src/models/Meal.model');
const Market = require('../../src/models/Market.model');
const { buildInvoiceForPdf } = require('../../src/services/invoice.service');

const USER_ID = '6a04b088c2f0101284652614';
const SEPT = { month: 9, year: 2026 };

function stubGraph({ invoiceObj, refundPayout, completedPayment = null }) {
    // Finalized invoice — getInvoice returns it verbatim via toObject().
    Invoice.findOne.mockResolvedValue({
        isFinalized: true,
        toObject: () => ({ ...invoiceObj }),
    });

    User.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue({ _id: USER_ID, name: 'Nayan', email: 'n@example.com' }),
    });
    User.find.mockReturnValue({
        select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }),
    });

    Meal.aggregate.mockResolvedValue([]);
    Market.aggregate.mockResolvedValue([]);

    Payment.findOne.mockImplementation((filter) => {
        if (filter && filter.status === 'refunded') {
            return { lean: jest.fn().mockResolvedValue(refundPayout) };
        }
        // _attachLatestPayment chain: .sort().populate().populate().lean()
        const tail = { lean: jest.fn().mockResolvedValue(completedPayment) };
        const p2 = { populate: jest.fn().mockReturnValue(tail) };
        const p1 = { populate: jest.fn().mockReturnValue(p2) };
        return { sort: jest.fn().mockReturnValue(p1) };
    });
}

const baseInvoice = {
    user: USER_ID,
    month: 9,
    year: 2026,
    monthName: 'September 2026',
    totalPayable: -231.84,
    paidAmount: 0,
    status: 'refunded',
    isFinalized: true,
};

describe('buildInvoiceForPdf — refund annotation', () => {
    it('cash payout: attaches method, no reference (regression: no raw Mongo id)', async () => {
        stubGraph({
            invoiceObj: baseInvoice,
            refundPayout: {
                _id: '6acba14a636dbb642e5b3acb',
                amount: 231.84,
                paymentMethod: 'cash',
                status: 'refunded',
                type: 'mess_bill',
                transactionId: undefined,
                paymentDate: new Date('2026-10-11T14:46:00Z'),
            },
        });

        const { invoice } = await buildInvoiceForPdf(USER_ID, SEPT.year, SEPT.month);

        expect(invoice.refundSettled).toBe(true);
        expect(invoice._refundAmount).toBe(231.84);
        expect(invoice._refundMethod).toBe('cash');
        expect(invoice._refundReference).toBeUndefined();
    });

    it('gateway payout: attaches method AND the real transaction id', async () => {
        stubGraph({
            invoiceObj: baseInvoice,
            refundPayout: {
                _id: '6acba14a636dbb642e5b3acc',
                amount: 231.84,
                paymentMethod: 'razorpay',
                status: 'refunded',
                type: 'mess_bill',
                transactionId: 'rfn_NxK9Qp2vLm',
                paymentDate: new Date('2026-10-11T14:46:00Z'),
            },
        });

        const { invoice } = await buildInvoiceForPdf(USER_ID, SEPT.year, SEPT.month);

        expect(invoice._refundMethod).toBe('razorpay');
        expect(invoice._refundReference).toBe('rfn_NxK9Qp2vLm');
    });

    it('no refund payout: refund block fields stay unset', async () => {
        stubGraph({
            invoiceObj: { ...baseInvoice, status: 'paid', totalPayable: 500, paidAmount: 500 },
            refundPayout: null,
        });

        const { invoice } = await buildInvoiceForPdf(USER_ID, SEPT.year, SEPT.month);

        expect(invoice.refundSettled).toBe(false);
        expect(invoice._refundAmount).toBeUndefined();
        expect(invoice._refundMethod).toBeUndefined();
        expect(invoice._refundReference).toBeUndefined();
    });
});
