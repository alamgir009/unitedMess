/**
 * updateInvoicePayment — amount-aware refund guard suite.
 *
 * The refund path must:
 *  - allow legitimate TOP-UPS of partially recorded refunds
 *    (e.g. only ₹114 of ₹329.60 recorded → the remaining ₹215.60
 *    can still be paid out); the old existence-based 409 blocked this
 *    forever;
 *  - reject OVER-REFUNDS (delta > remaining credit) with 409 and the
 *    remaining amount in the message;
 *  - reject refunds when the credit is already settled within the ₹1
 *    tolerance ("already been processed");
 *  - measure credit on the PRE-refund invoice state (the body's
 *    paidAmount is already original + delta);
 *  - return the invoice annotated with refundCredit/refundRecorded/
 *    refundRemaining so the panel row flips state without a refetch.
 */
jest.mock('../../src/models/Invoice.model');
jest.mock('../../src/models/Payment.model');
jest.mock('../../src/models/User.model');
jest.mock('../../src/services/email.service');
jest.mock('../../src/services/pdf.service');
jest.mock('../../src/services/payment.service');
jest.mock('../../src/services/notification.service');
jest.mock('../../src/sockets');

const Invoice = require('../../src/models/Invoice.model');
const Payment = require('../../src/models/Payment.model');
const User = require('../../src/models/User.model');
const paymentService = require('../../src/services/payment.service');
const notificationService = require('../../src/services/notification.service');
const { updateInvoicePayment } = require('../../src/api/v1/controllers/invoice.controller');

/** asyncHandler does not return its promise — flush the microtask queue. */
const flush = () => new Promise((resolve) => setImmediate(resolve));

const makeRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

/**
 * Mock Payment.find: first call = controller guard, second = response
 * annotation. Uses mockImplementation (NOT mockReturnValueOnce — the
 * once-queue survives jest.clearAllMocks() and leaks across tests).
 */
function stubPaymentFind(guardRows, annotateRows) {
    const chainFor = (rows) => {
        const chain = { select: jest.fn() };
        chain.select.mockReturnValue({ lean: jest.fn().mockResolvedValue(rows) });
        return chain;
    };
    const chains = [chainFor(guardRows), chainFor(annotateRows)];
    let call = 0;
    Payment.find.mockImplementation(() => {
        const chain = chains[Math.min(call, chains.length - 1)];
        call += 1;
        return chain;
    });
}

function stubCommon() {
    Payment.create.mockResolvedValue({ _id: 'pay1' });
    User.findById.mockReturnValue({
        select: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue({ name: 'Member', email: 'm@example.com' }),
        }),
    });
    paymentService.syncUserPaymentStatus.mockResolvedValue(undefined);
    paymentService.sendPaymentConfirmationWithInvoice.mockResolvedValue(undefined);
    notificationService.createAndSend.mockResolvedValue({});
}

/**
 * The controller annotates the response on BOTH paths via the REAL
 * invoiceService.annotateRefundSettlement, which queries
 * Payment.find({ month: {$in}, status: 'refunded' }). Stub it so the
 * automock's undefined chain cannot crash the test.
 */
function stubAnnotateFind(refundRows = []) {
    const chain = { select: jest.fn() };
    chain.select.mockReturnValue({ lean: jest.fn().mockResolvedValue(refundRows) });
    Payment.find.mockImplementation(() => chain);
}

const makeInvoice = (overrides = {}) => ({
    _id: 'inv1',
    user: 'u1',
    month: 5,
    year: 2026,
    monthName: 'May 2026',
    totalPayable: -329.6,
    paidAmount: 0,
    status: 'refunded',
    save: jest.fn().mockResolvedValue(undefined),
    toObject() { return this; },
    ...overrides,
});

beforeEach(() => {
    jest.clearAllMocks();
});

describe('updateInvoicePayment — refund guard', () => {
    it('allows a top-up of a partially recorded refund and annotates the response', async () => {
        const invoice = makeInvoice();
        Invoice.findById.mockResolvedValue(invoice);
        // ₹114 already recorded; this payout tops up ₹215.60 (of ₹329.60 credit)
        stubPaymentFind(
            [{ amount: 114 }],
            [{ user: 'u1', amount: 114 }, { user: 'u1', amount: 215.6 }]
        );
        stubCommon();

        const req = {
            params: { id: 'inv1' },
            body: { paidAmount: 0, delta: -215.6 },
            user: { id: 'admin1' },
        };
        const res = makeRes();
        const next = jest.fn();

        updateInvoicePayment(req, res, next);
        await flush();

        expect(next).not.toHaveBeenCalled();
        expect(Payment.create).toHaveBeenCalledTimes(1);
        expect(Payment.create.mock.calls[0][0]).toMatchObject({
            amount: 215.6,
            status: 'refunded',
            month: 'May 2026',
            // Invoice refunds ALWAYS settle the mess bill — never sniff the
            // member's latest completed payment (often a gas bill) for type.
            type: 'mess_bill',
        });
        expect(Payment.findOne).not.toHaveBeenCalled();
        expect(paymentService.syncUserPaymentStatus).toHaveBeenCalledWith(
            'u1', 'mess_bill', 'refunded', 'May 2026'
        );
        expect(invoice.status).toBe('refunded');
        expect(invoice.save).toHaveBeenCalled();

        const payload = res.json.mock.calls[0][0].data;
        expect(payload.refundCredit).toBe(329.6);
        expect(payload.refundRecorded).toBe(329.6);
        expect(payload.refundRemaining).toBe(0);
    });

    it('rejects an over-refund with 409 and the remaining refundable in the message', async () => {
        const invoice = makeInvoice();
        Invoice.findById.mockResolvedValue(invoice);
        stubPaymentFind([{ amount: 114 }], []);
        stubCommon();

        const req = {
            params: { id: 'inv1' },
            body: { paidAmount: 0, delta: -300 }, // remaining is only 215.60
            user: { id: 'admin1' },
        };
        const res = makeRes();
        const next = jest.fn();

        updateInvoicePayment(req, res, next);
        await flush();

        expect(Payment.create).not.toHaveBeenCalled();
        expect(invoice.save).not.toHaveBeenCalled();
        expect(next).toHaveBeenCalledTimes(1);
        const err = next.mock.calls[0][0];
        expect(err.statusCode).toBe(409);
        expect(err.message).toMatch(/exceeds the remaining refundable/);
        expect(err.message).toMatch(/215\.6/);
    });

    it('rejects a refund when the credit is already settled within tolerance', async () => {
        const invoice = makeInvoice({ totalPayable: -231.84 });
        Invoice.findById.mockResolvedValue(invoice);
        // ₹232 recorded against ₹231.84 credit → settled (within ₹1)
        stubPaymentFind([{ amount: 232 }], []);
        stubCommon();

        const req = {
            params: { id: 'inv1' },
            body: { paidAmount: 0, delta: -100 },
            user: { id: 'admin1' },
        };
        const res = makeRes();
        const next = jest.fn();

        updateInvoicePayment(req, res, next);
        await flush();

        expect(Payment.create).not.toHaveBeenCalled();
        expect(next).toHaveBeenCalledTimes(1);
        const err = next.mock.calls[0][0];
        expect(err.statusCode).toBe(409);
        expect(err.message).toMatch(/already been processed/);
    });

    it('measures credit on the PRE-refund state (debt-overpay refund still allowed)', async () => {
        // Member paid ₹500 on a ₹400 bill → ₹100 credit owed back.
        // Body paidAmount is already original + delta (400); the guard must
        // credit off the original ₹500, not the post-refund value.
        const invoice = makeInvoice({
            totalPayable: 400,
            paidAmount: 500,
            status: 'partially_paid',
            monthName: 'September 2026',
            month: 9,
        });
        Invoice.findById.mockResolvedValue(invoice);
        stubPaymentFind([], [{ user: 'u1', amount: 100 }]);
        stubCommon();

        const req = {
            params: { id: 'inv1' },
            body: { paidAmount: 400, delta: -100 },
            user: { id: 'admin1' },
        };
        const res = makeRes();
        const next = jest.fn();

        updateInvoicePayment(req, res, next);
        await flush();

        expect(next).not.toHaveBeenCalled();
        expect(Payment.create).toHaveBeenCalledTimes(1);
        expect(Payment.create.mock.calls[0][0]).toMatchObject({
            amount: 100,
            status: 'refunded',
            type: 'mess_bill',
        });
        expect(invoice.status).toBe('refunded');
        expect(invoice.paidAmount).toBe(400);

        const payload = res.json.mock.calls[0][0].data;
        expect(payload.refundCredit).toBe(0);
        expect(payload.refundRemaining).toBe(0);
    });
});

describe('updateInvoicePayment — payment path creates ground-truth record', () => {
    it('records a completed mess_bill Payment for the collected delta', async () => {
        const invoice = makeInvoice({
            totalPayable: 1453.87,
            paidAmount: 0,
            status: 'unpaid',
            monthName: 'September 2026',
            month: 9,
        });
        Invoice.findById.mockResolvedValue(invoice);
        stubCommon();
        stubAnnotateFind(); // no refunded rows recorded — full credit remaining is irrelevant for a debt

        const req = {
            params: { id: 'inv1' },
            body: { paidAmount: 1453.87, delta: 1453.87 },
            user: { id: 'admin1' },
        };
        const res = makeRes();
        const next = jest.fn();

        updateInvoicePayment(req, res, next);
        await flush();

        expect(next).not.toHaveBeenCalled();
        expect(Payment.create).toHaveBeenCalledTimes(1);
        expect(Payment.create.mock.calls[0][0]).toMatchObject({
            amount: 1453.87,
            month: 'September 2026',
            type: 'mess_bill',
            status: 'completed',
            paymentMethod: 'cash',
            createdBy: 'admin1',
        });
        expect(paymentService.syncUserPaymentStatus).toHaveBeenCalledWith(
            'u1', 'mess_bill', 'completed', 'September 2026'
        );
        // The only Payment.find allowed on the payment path is the
        // response annotation (months $in filter, no user scope). The
        // refund guard's user-scoped query must never run.
        expect(Payment.find).toHaveBeenCalledTimes(1);
        expect(Payment.find.mock.calls[0][0]).toEqual({
            month: { $in: ['September 2026'] },
            status: 'refunded',
        });
        expect(Payment.findOne).not.toHaveBeenCalled();
        expect(invoice.status).toBe('paid');
        expect(invoice.save).toHaveBeenCalled();

        const payload = res.json.mock.calls[0][0].data;
        expect(payload.paidAmount).toBe(1453.87);
        expect(payload.refundCredit).toBe(0);
    });

    it('falls back to the paidAmount jump when delta is absent (legacy callers)', async () => {
        const invoice = makeInvoice({
            totalPayable: 500,
            paidAmount: 0,
            status: 'unpaid',
            monthName: 'September 2026',
            month: 9,
        });
        Invoice.findById.mockResolvedValue(invoice);
        stubCommon();
        stubAnnotateFind();

        const req = {
            params: { id: 'inv1' },
            body: { paidAmount: 500 }, // no delta
            user: { id: 'admin1' },
        };
        const res = makeRes();
        const next = jest.fn();

        updateInvoicePayment(req, res, next);
        await flush();

        expect(Payment.create).toHaveBeenCalledTimes(1);
        expect(Payment.create.mock.calls[0][0]).toMatchObject({
            amount: 500,
            type: 'mess_bill',
            status: 'completed',
        });
        expect(invoice.status).toBe('paid');
    });

    it('creates no record and no sync when nothing is collected', async () => {
        const invoice = makeInvoice({
            totalPayable: 500,
            paidAmount: 0,
            status: 'unpaid',
            monthName: 'September 2026',
            month: 9,
        });
        Invoice.findById.mockResolvedValue(invoice);
        stubCommon();
        stubAnnotateFind();

        const req = {
            params: { id: 'inv1' },
            body: { paidAmount: 0, delta: 0 },
            user: { id: 'admin1' },
        };
        const res = makeRes();
        const next = jest.fn();

        updateInvoicePayment(req, res, next);
        await flush();

        expect(Payment.create).not.toHaveBeenCalled();
        expect(paymentService.syncUserPaymentStatus).not.toHaveBeenCalled();
        expect(invoice.status).toBe('unpaid');
        expect(invoice.save).toHaveBeenCalled();
    });
});
