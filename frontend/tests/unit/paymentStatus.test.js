import { describe, it, expect } from 'vitest';

import {
    resolveBillStatus,
    BILL_STATUS_LABEL,
    BILL_STATUS_TONE,
    isSettledBill,
    isRefundDueBill,
    isRefundedBill,
} from '@shared/utils/paymentStatus';

describe('resolveBillStatus — settlement beats balance', () => {
    it("returns 'refunded' even when the balance is still negative (Oct 7 regression: Rafij)", () => {
        expect(resolveBillStatus({ status: 'refunded', payableAmount: -232 })).toBe('refunded');
    });

    it("returns 'refund' when a credit exists but no payout was recorded", () => {
        expect(resolveBillStatus({ status: 'pending', payableAmount: -232 })).toBe('refund');
        expect(resolveBillStatus({ status: 'failed', payableAmount: -232 })).toBe('refund');
    });

    it("returns 'refund' for the legacy refund-pending token regardless of balance", () => {
        expect(resolveBillStatus({ status: 'refund', payableAmount: -232 })).toBe('refund');
        expect(resolveBillStatus({ status: 'refund', payableAmount: 0 })).toBe('refund');
    });

    it("maps 'paid' to 'success' and passes canonical tokens through", () => {
        expect(resolveBillStatus({ status: 'paid', payableAmount: 0 })).toBe('success');
        expect(resolveBillStatus({ status: 'success', payableAmount: 500 })).toBe('success');
        expect(resolveBillStatus({ status: 'pending', payableAmount: 500 })).toBe('pending');
        expect(resolveBillStatus({ status: 'failed', payableAmount: 500 })).toBe('failed');
    });

    it('never infers a credit without a balance', () => {
        expect(resolveBillStatus({ status: 'success' })).toBe('success');
        expect(resolveBillStatus({ status: undefined, payableAmount: undefined })).toBe('pending');
        expect(resolveBillStatus()).toBe('pending');
        expect(resolveBillStatus({ status: '', payableAmount: 100 })).toBe('pending');
    });

    it('treats zero and positive balances as non-credits', () => {
        expect(resolveBillStatus({ status: 'pending', payableAmount: 0 })).toBe('pending');
        expect(resolveBillStatus({ status: 'pending', payableAmount: 500 })).toBe('pending');
        expect(resolveBillStatus({ status: 'pending', payableAmount: -0.01 })).toBe('refund');
    });
});

describe('labels and tones', () => {
    it('labels refund vs refunded distinctly (never "Refund Due" for settled)', () => {
        expect(BILL_STATUS_LABEL.refund).toBe('Refund Due');
        expect(BILL_STATUS_LABEL.refunded).toBe('Refunded');
        expect(BILL_STATUS_LABEL.success).toBe('Paid');
    });

    it('tones settled and due refunds for info/violet styling', () => {
        expect(BILL_STATUS_TONE.refund).toBe('info');
        expect(BILL_STATUS_TONE.refunded).toBe('info');
        expect(BILL_STATUS_TONE.success).toBe('success');
        expect(BILL_STATUS_TONE.pending).toBe('warning');
        expect(BILL_STATUS_TONE.failed).toBe('danger');
    });
});

describe('predicates', () => {
    it('isSettledBill covers paid, legacy paid and refunded — never refund', () => {
        expect(isSettledBill('success')).toBe(true);
        expect(isSettledBill('paid')).toBe(true);
        expect(isSettledBill('refunded')).toBe(true);
        expect(isSettledBill('refund')).toBe(false);
        expect(isSettledBill('pending')).toBe(false);
        expect(isSettledBill(undefined)).toBe(false);
    });

    it('isRefundDueBill and isRefundedBill are mutually exclusive', () => {
        expect(isRefundDueBill('refund')).toBe(true);
        expect(isRefundDueBill('refunded')).toBe(false);
        expect(isRefundedBill('refunded')).toBe(true);
        expect(isRefundedBill('refund')).toBe(false);
    });
});
