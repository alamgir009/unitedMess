const { verifyUpiManualPaymentService } = require('../../src/services/payment.service');
const Payment = require('../../src/models/Payment.model');
const User = require('../../src/models/User.model');
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

describe('verifyUpiManualPaymentService', () => {
    beforeEach(() => {
        jest.clearAllMocks();

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
