const {
    verifyUpiManualPaymentService,
    createPayment,
    updatePaymentById,
} = require('../../src/services/payment.service');
const { determineInvoiceStatus } = require('../../src/services/invoice.service');
const { getBillingPeriod } = require('../../src/utils/helpers/date.helper');
const Payment = require('../../src/models/Payment.model');
const User = require('../../src/models/User.model');
const Invoice = require('../../src/models/Invoice.model');
const AppError = require('../../src/utils/errors/AppError');

// ── Mongoose chain-query mock helper ──
// Model.findById() returns a Query which exposes .select() -> .lean() chain.
// We must mock the full chain to avoid "select is not a function" errors.
function mockQueryChain(resolvedValue) {
    const query = { lean: jest.fn().mockReturnThis() };
    // .select() returns the same query object (chainable)
    query.select = jest.fn().mockReturnValue(query);
    // .lean() finally resolves to the value
    query.lean.mockResolvedValue(resolvedValue);
    // Support direct .select().lean() chain
    const chain = jest.fn().mockReturnValue(query);
    chain.select = jest.fn().mockReturnValue(query);
    chain.lean = jest.fn().mockResolvedValue(resolvedValue);
    return chain;
}

jest.mock('../../src/models/Payment.model');
jest.mock('../../src/models/User.model');
jest.mock('../../src/models/Invoice.model');
// Real SMTP sends must never fire from unit tests (createPayment emails on
// completed/failed/refunded).
jest.mock('../../src/services/email.service');

describe('verifyUpiManualPaymentService', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        // Payment.find() must resolve [] so invoice sync does not crash on
        // undefined.reduce (Invoice.findOne automock then returns null).
        Payment.find.mockResolvedValue([]);

        // User.findById(...).select(...).lean() must return a user
        User.findById.mockImplementation(() => {
            const q = { select: jest.fn().mockReturnThis(), lean: jest.fn().mockResolvedValue({ _id: 'user1', name: 'Test', email: 'test@test.com' }) };
            return q;
        });
    });

    /* ── Regression #1: system ref generated on approval ── */
    it('generates a unique system transaction reference on approval (regression: must fail on old code)', async () => {
        const originalUtr = 'RAW12345678';
        const paymentId = '507f1f77bcf86cd799439011';

        Payment.findOneAndUpdate.mockResolvedValue({
            _id: paymentId,
            user: 'user1',
            amount: 1000,
            status: 'completed',
            paymentMethod: 'upi_manual',
            transactionId: 'UMSYSREF-A1B2C3',
            utr: originalUtr,
            month: 'June 2026',
            type: 'mess_bill',
        });

        const result = await verifyUpiManualPaymentService(paymentId, {
            status: 'completed',
            adminRemarks: 'Approved',
            verifiedBy: 'admin1',
        });

        // Assert: transactionId starts with UM (system-generated), NOT the raw UTR
        expect(result.transactionId).not.toBe(originalUtr);
        expect(result.transactionId).toMatch(/^UM/);

        // Assert: the $set passed to findOneAndUpdate includes the new transactionId
        const updateCall = Payment.findOneAndUpdate.mock.calls[0];
        const updateFields = updateCall[1].$set;
        expect(updateFields.transactionId).toMatch(/^UM/);
        expect(updateFields.status).toBe('completed');
    });

    /* ── Test #2: original UTR preserved in utr field ── */
    it('preserves the original UTR in the utr field after approval', async () => {
        const originalUtr = 'RAW12345678';
        const paymentId = '507f1f77bcf86cd799439012';

        Payment.findOneAndUpdate.mockImplementation((filter, update, options) => {
            return {
                _id: paymentId,
                user: 'user1',
                amount: 1000,
                status: 'completed',
                paymentMethod: 'upi_manual',
                transactionId: update.$set.transactionId,
                utr: originalUtr,
                month: 'June 2026',
                type: 'mess_bill',
            };
        });

        const result = await verifyUpiManualPaymentService(paymentId, {
            status: 'completed',
            verifiedBy: 'admin1',
        });

        expect(result.utr).toBe(originalUtr);
        expect(result.utr).not.toBe(result.transactionId);
    });

    /* ── Test #3: no system ref on rejection ── */
    it('does NOT generate a system ref when payment is rejected', async () => {
        const originalUtr = 'RAW12345678';
        const paymentId = '507f1f77bcf86cd799439013';

        Payment.findOneAndUpdate.mockResolvedValue({
            _id: paymentId,
            user: 'user1',
            amount: 1000,
            status: 'failed',
            paymentMethod: 'upi_manual',
            transactionId: originalUtr,
            utr: originalUtr,
            month: 'June 2026',
            type: 'mess_bill',
        });

        const result = await verifyUpiManualPaymentService(paymentId, {
            status: 'failed',
            adminRemarks: 'UTR mismatch',
            verifiedBy: 'admin1',
        });

        expect(result.transactionId).toBe(originalUtr);

        const updateCall = Payment.findOneAndUpdate.mock.calls[0];
        const updateSet = updateCall[1].$set;
        expect(updateSet).not.toHaveProperty('transactionId');
    });

    /* ── Test #4: duplicate UTR idempotency ── */
    it('rejects duplicate UTR submission', async () => {
        const cleanUtr = 'DUP12345678';
        Payment.exists.mockResolvedValue(true);

        const existing = await Payment.exists({
            utr: cleanUtr,
            status: { $in: ['pending_verification', 'completed'] },
        });

        expect(existing).toBe(true);
        expect(Payment.exists).toHaveBeenCalledWith({
            utr: cleanUtr,
            status: { $in: ['pending_verification', 'completed'] },
        });
    });

    /* ── Test #5: concurrent approvals — only one wins ── */
    it('handles concurrent approvals atomically (only one succeeds)', async () => {
        const paymentId = '507f1f77bcf86cd799439014';
        const originalUtr = 'RACE12345678';

        Payment.findOneAndUpdate
            .mockResolvedValueOnce({
                _id: paymentId,
                user: 'user1',
                amount: 1000,
                status: 'completed',
                paymentMethod: 'upi_manual',
                transactionId: `UMSYSREF-A1B2C3`,
                utr: originalUtr,
                month: 'June 2026',
                type: 'mess_bill',
            })
            .mockResolvedValueOnce(null);

        const result1 = await verifyUpiManualPaymentService(paymentId, {
            status: 'completed',
            verifiedBy: 'admin1',
        });
        expect(result1).toBeTruthy();

        Payment.exists.mockResolvedValueOnce(true);
        // For the second call, Payment.findById(...).select(...).lean() must return
        // the existing payment doc (already completed)
        Payment.findById.mockImplementation(() => {
            const q = { select: jest.fn().mockReturnThis(), lean: jest.fn().mockResolvedValue({ _id: paymentId, paymentMethod: 'upi_manual', status: 'completed' }) };
            return q;
        });

        await expect(
            verifyUpiManualPaymentService(paymentId, {
                status: 'completed',
                verifiedBy: 'admin2',
            })
        ).rejects.toThrow(AppError);
    });

    /* ── Test #6: multi-month payments get unique refs ── */
    it('generates unique transaction refs for each month in multi-month payments', async () => {
        const originalUtr = 'MULTI12345678';
        const paymentId1 = '507f1f77bcf86cd799439015';
        const paymentId2 = '507f1f77bcf86cd799439016';

        Payment.findOneAndUpdate
            .mockResolvedValueOnce({
                _id: paymentId1,
                user: 'user1',
                amount: 500,
                status: 'completed',
                paymentMethod: 'upi_manual',
                transactionId: 'UMA1B2C3-A1B2C3',
                utr: originalUtr,
                month: 'June 2026',
                type: 'mess_bill',
            })
            .mockResolvedValueOnce({
                _id: paymentId2,
                user: 'user1',
                amount: 600,
                status: 'completed',
                paymentMethod: 'upi_manual',
                transactionId: 'UMX1Y2Z3-D4E5F6',
                utr: originalUtr,
                month: 'July 2026',
                type: 'mess_bill',
            });

        const r1 = await verifyUpiManualPaymentService(paymentId1, {
            status: 'completed',
            verifiedBy: 'admin1',
        });
        const r2 = await verifyUpiManualPaymentService(paymentId2, {
            status: 'completed',
            verifiedBy: 'admin1',
        });

        expect(r1.utr).toBe(originalUtr);
        expect(r2.utr).toBe(originalUtr);
        expect(r1.transactionId).not.toBe(r2.transactionId);
    });

    /* ── Test #7: legacy payments (no utr field) render correctly ── */
    it('handles legacy approved payments without utr field gracefully', async () => {
        const paymentId = '507f1f77bcf86cd799439017';

        Payment.findOneAndUpdate.mockResolvedValue({
            _id: paymentId,
            user: 'user1',
            amount: 1000,
            status: 'completed',
            paymentMethod: 'upi_manual',
            transactionId: 'LEGACY123456',
            utr: undefined,
            month: 'June 2026',
            type: 'mess_bill',
        });

        const displayCheck = (paymentRecord) => {
            const showSecondaryUtr = paymentRecord.utr && paymentRecord.utr !== paymentRecord.transactionId;
            return {
                primaryRef: paymentRecord.transactionId,
                secondaryUtr: showSecondaryUtr ? paymentRecord.utr : null,
            };
        };

        const payment = await verifyUpiManualPaymentService(paymentId, {
            status: 'completed',
            verifiedBy: 'admin1',
        });
        const display = displayCheck(payment);

        expect(display.primaryRef).toBeTruthy();
        expect(display.secondaryUtr).toBeNull();
    });

    /* ── Validation: rejects invalid status ── */
    it('throws if status is not completed or failed', async () => {
        await expect(
            verifyUpiManualPaymentService('507f1f77bcf86cd799439018', {
                status: 'pending',
                verifiedBy: 'admin1',
            })
        ).rejects.toThrow(AppError);
    });

    /* ── Validation: rejects when payment not found ── */
    it('throws AppError 404 when payment does not exist after atomic update returns null', async () => {
        Payment.findOneAndUpdate.mockResolvedValue(null);
        Payment.exists.mockResolvedValueOnce(false);

        await expect(
            verifyUpiManualPaymentService('000000000000000000000000', {
                status: 'completed',
                verifiedBy: 'admin1',
            })
        ).rejects.toThrow('Payment record not found');
    });
});

// ─────────────────────────────────────────────────────────────
// Regression suite: manual payment creation → status sync
// (refunded sync, duplicate guard, pending non-declaration)
// Month is always the ACTIVE billing period so the day-1-10 rule
// keeps these tests timezone/date-independent.
// ─────────────────────────────────────────────────────────────

describe('createPayment — status sync & duplicate guard', () => {
    const M = getBillingPeriod().monthName;
    const student = { _id: 'user1', name: 'Test', email: 'test@test.com', payment: 'pending', gasBill: 'pending' };

    const makePaymentDoc = (over = {}) => ({
        _id: 'pay1',
        user: 'user1',
        type: 'mess_bill',
        month: M,
        status: 'completed',
        amount: 500,
        statusHistory: [],
        save: jest.fn().mockResolvedValue(undefined),
        ...over,
    });

    beforeEach(() => {
        jest.clearAllMocks();

        // Thenable query: supports both `await findById().select(...)` (createPayment)
        // and `findById().select(...).lean(...)` (updatePaymentById).
        const chain = {
            select: jest.fn().mockReturnThis(),
            lean: jest.fn().mockResolvedValue(student),
            then: (onF, onR) => Promise.resolve(student).then(onF, onR),
        };
        User.findById.mockImplementation(() => chain);

        Payment.find.mockResolvedValue([]);       // invoice sync: no payments
        Invoice.findOne.mockResolvedValue(null);  // invoice sync: no invoice
        Payment.create.mockResolvedValue(makePaymentDoc());
        Payment.findOne.mockResolvedValue(null);  // duplicate guard: none
    });

    it('syncs user.payment for a refunded manual payment (regression: was completed-only)', async () => {
        Payment.create.mockResolvedValue(makePaymentDoc({ status: 'refunded', amount: 232 }));

        await createPayment({
            user: 'user1',
            month: M,
            type: 'mess_bill',
            status: 'refunded',
            amount: 232,
            createdBy: 'admin1',
        });

        expect(User.findByIdAndUpdate).toHaveBeenCalledWith('user1', { payment: 'refunded' });
    });

    it('syncs user.payment for a completed manual payment', async () => {
        await createPayment({
            user: 'user1',
            month: M,
            type: 'mess_bill',
            status: 'completed',
            amount: 500,
            createdBy: 'admin1',
        });

        expect(User.findByIdAndUpdate).toHaveBeenCalledWith('user1', { payment: 'success' });
    });

    it('does not declare period status for a pending payment (syncs on verification)', async () => {
        Payment.create.mockResolvedValue(makePaymentDoc({ status: 'pending' }));

        await createPayment({
            user: 'user1',
            month: M,
            type: 'mess_bill',
            status: 'pending',
            amount: 100,
            createdBy: 'admin1',
        });

        expect(User.findByIdAndUpdate).not.toHaveBeenCalled();
        expect(Payment.create).toHaveBeenCalled();
    });

    it('allows a second installment within the invoice payable (regression: was flat-blocked)', async () => {
        // Cap guard sees only the prior installment; invoice sync sees both
        // (the ₹400 record is persisted by the time sync runs)
        Payment.find
            .mockResolvedValueOnce([{ amount: 500 }])
            .mockResolvedValueOnce([{ amount: 500 }, { amount: 400 }]);
        const invoice = {
            user: 'user1', totalPayable: 1000, paidAmount: 500,
            status: 'partially_paid', save: jest.fn().mockResolvedValue(undefined),
        };
        Invoice.findOne.mockResolvedValue(invoice);

        await createPayment({
            user: 'user1',
            month: M,
            type: 'mess_bill',
            status: 'completed',
            amount: 400,
            createdBy: 'admin1',
        });

        expect(Payment.create).toHaveBeenCalled();
        expect(invoice.paidAmount).toBe(900);
        expect(invoice.status).toBe('partially_paid');
        expect(invoice.save).toHaveBeenCalled();
    });

    it('blocks an installment that would exceed the invoice payable', async () => {
        Payment.find.mockResolvedValue([{ amount: 900 }]);
        Invoice.findOne.mockResolvedValue({ totalPayable: 1000 });

        await expect(
            createPayment({
                user: 'user1',
                month: M,
                type: 'mess_bill',
                status: 'completed',
                amount: 200,
                createdBy: 'admin1',
            })
        ).rejects.toThrow('exceeds the remaining payable');

        expect(Payment.create).not.toHaveBeenCalled();
    });

    it('blocks a duplicate when no invoice exists to cap against (fail closed)', async () => {
        Payment.find.mockResolvedValue([{ amount: 500 }]);
        Invoice.findOne.mockResolvedValue(null);

        await expect(
            createPayment({
                user: 'user1',
                month: M,
                type: 'mess_bill',
                status: 'completed',
                amount: 500,
                createdBy: 'admin1',
            })
        ).rejects.toThrow('already exists');

        expect(Payment.create).not.toHaveBeenCalled();
    });

    it('still blocks a second completed gas bill (fixed bills never install)', async () => {
        Payment.find.mockResolvedValue([{ amount: 200 }]);

        await expect(
            createPayment({
                user: 'user1',
                month: M,
                type: 'gas_bill',
                status: 'completed',
                amount: 200,
                createdBy: 'admin1',
            })
        ).rejects.toThrow('already exists');

        expect(Payment.create).not.toHaveBeenCalled();
        // Non-mess types short-circuit before any invoice lookup
        expect(Invoice.findOne).not.toHaveBeenCalled();
    });

    it('allows a refund alongside an existing completed payment (regression: was blocked)', async () => {
        Payment.findOne.mockResolvedValue({ _id: 'existing' });
        Payment.create.mockResolvedValue(makePaymentDoc({ status: 'refunded', amount: 100 }));

        await createPayment({
            user: 'user1',
            month: M,
            type: 'mess_bill',
            status: 'refunded',
            amount: 100,
            createdBy: 'admin1',
        });

        expect(Payment.findOne).not.toHaveBeenCalled();
        expect(Payment.create).toHaveBeenCalled();
        expect(User.findByIdAndUpdate).toHaveBeenCalledWith('user1', { payment: 'refunded' });
    });
});

describe('updatePaymentById — month repair re-sync', () => {
    const BP = getBillingPeriod();
    // Guaranteed to differ from the active period regardless of run date
    const wrongMonth = BP.month === 9 ? 'October 2026' : 'September 2026';

    beforeEach(() => {
        jest.clearAllMocks();
        const student = { _id: 'user1', name: 'Test', email: 'test@test.com' };
        const chain = {
            select: jest.fn().mockReturnThis(),
            lean: jest.fn().mockResolvedValue(student),
            then: (onF, onR) => Promise.resolve(student).then(onF, onR),
        };
        User.findById.mockImplementation(() => chain);
        Payment.find.mockResolvedValue([]);
        Invoice.findOne.mockResolvedValue(null);
        Payment.findById.mockResolvedValue({
            _id: 'pay1',
            user: 'user1',
            type: 'mess_bill',
            month: wrongMonth,
            status: 'completed',
            amount: 1011,
            statusHistory: [],
            save: jest.fn().mockResolvedValue(undefined),
        });
    });

    it('re-syncs user.payment when month is corrected (regression: sync only ran on status change)', async () => {
        await updatePaymentById('pay1', { month: BP.monthName });

        expect(User.findByIdAndUpdate).toHaveBeenCalledWith('user1', { payment: 'success' });
        // New month's invoice AND old month's invoice both re-synced
        expect(Invoice.findOne).toHaveBeenCalledTimes(2);
        expect(Invoice.findOne).toHaveBeenCalledWith(
            expect.objectContaining({ month: BP.month, year: BP.year })
        );
    });

    it('allows pending→completed when installments stay within the payable', async () => {
        Payment.findById.mockResolvedValue({
            _id: 'pay1',
            user: 'user1',
            type: 'mess_bill',
            month: BP.monthName,
            status: 'pending',
            amount: 300,
            statusHistory: [],
            save: jest.fn().mockResolvedValue(undefined),
        });
        // Existing completed installment of ₹500; 500 + 300 ≤ 1000 + tolerance
        Payment.find.mockResolvedValue([{ amount: 500 }]);
        Invoice.findOne.mockResolvedValue({
            user: 'user1', totalPayable: 1000, paidAmount: 500, status: 'partially_paid',
            save: jest.fn().mockResolvedValue(undefined),
        });

        await updatePaymentById('pay1', { status: 'completed' });

        expect(User.findByIdAndUpdate).toHaveBeenCalledWith('user1', { payment: 'success' });
    });

    it('blocks pending→completed when it would exceed the payable', async () => {
        Payment.findById.mockResolvedValue({
            _id: 'pay1',
            user: 'user1',
            type: 'mess_bill',
            month: BP.monthName,
            status: 'pending',
            amount: 600,
            statusHistory: [],
            save: jest.fn().mockResolvedValue(undefined),
        });
        Payment.find.mockResolvedValue([{ amount: 500 }]);
        Invoice.findOne.mockResolvedValue({ user: 'user1', totalPayable: 1000 });

        await expect(
            updatePaymentById('pay1', { status: 'completed' })
        ).rejects.toThrow('exceeds the remaining payable');

        // Guard fires before any mutation — nothing saved or synced
        expect(User.findByIdAndUpdate).not.toHaveBeenCalled();
    });
});

describe('determineInvoiceStatus — settlement tolerance', () => {
    it('settles a full payment within ₹1 of the invoice (whole-rupee UI suggestions)', () => {
        expect(determineInvoiceStatus(1011, 1011.29)).toBe('paid');
    });

    it('keeps a genuine shortfall partially_paid', () => {
        expect(determineInvoiceStatus(1010, 1011.29)).toBe('partially_paid');
    });

    it('derives refunded for credit balances and negative payments', () => {
        expect(determineInvoiceStatus(0, -232.27)).toBe('refunded');
        expect(determineInvoiceStatus(-133, 41)).toBe('refunded');
    });

    it('handles zero and untouched invoices', () => {
        expect(determineInvoiceStatus(0, 0)).toBe('paid');
        expect(determineInvoiceStatus(0, 500)).toBe('unpaid');
    });
});
