import { describe, it, expect } from 'vitest';

import {
    signedPaymentAmount,
    sumSettledPayments,
    isRefundPayment,
    summarizePayments,
} from '@shared/utils/paymentAmount';
import { formatSignedRupees } from '@/core/utils/helpers/currency.helper';

describe('signedPaymentAmount', () => {
    it('returns positive amount for completed payments', () => {
        expect(signedPaymentAmount({ amount: 1011, status: 'completed' })).toBe(1011);
    });

    it('negates refunds stored as positive amounts (PaymentForm convention)', () => {
        expect(signedPaymentAmount({ amount: 232, status: 'refunded' })).toBe(-232);
    });

    it('keeps negative refunds negative (legacy convention)', () => {
        expect(signedPaymentAmount({ amount: -490, status: 'refunded' })).toBe(-490);
    });

    it.each(['pending', 'pending_verification', 'failed'])(
        'returns 0 for never-settled status %s',
        (status) => {
            expect(signedPaymentAmount({ amount: 500, status })).toBe(0);
        },
    );

    it('returns 0 for unknown/missing status or malformed input', () => {
        expect(signedPaymentAmount({ amount: 100 })).toBe(0);
        expect(signedPaymentAmount(null)).toBe(0);
        expect(signedPaymentAmount({ amount: NaN, status: 'completed' })).toBe(0);
    });
});

describe('sumSettledPayments — Events Calendar day-cell totals', () => {
    it('nets refunds out: [1011 completed, 232 refunded] === 779 (Oct 7 regression)', () => {
        const entries = [
            { amount: 1011, status: 'completed' },
            { amount: 232, status: 'refunded' },
        ];
        expect(sumSettledPayments(entries)).toBe(779);
    });

    it('handles legacy negative refunds identically', () => {
        const entries = [
            { amount: 1011, status: 'completed' },
            { amount: -232, status: 'refunded' },
        ];
        expect(sumSettledPayments(entries)).toBe(779);
    });

    it('excludes pending/failed money from cash totals', () => {
        const entries = [
            { amount: 500, status: 'pending' },
            { amount: 300, status: 'failed' },
            { amount: 100, status: 'pending_verification' },
        ];
        expect(sumSettledPayments(entries)).toBe(0);
    });

    it('returns 0 for empty or non-array input', () => {
        expect(sumSettledPayments([])).toBe(0);
        expect(sumSettledPayments(undefined)).toBe(0);
    });
});

describe('isRefundPayment', () => {
    it('detects refunds by status and by legacy negative sign', () => {
        expect(isRefundPayment({ amount: 490, status: 'refunded' })).toBe(true);
        expect(isRefundPayment({ amount: -490, status: 'completed' })).toBe(true);
        expect(isRefundPayment({ amount: 490, status: 'completed' })).toBe(false);
        expect(isRefundPayment(null)).toBe(false);
    });
});

describe('summarizePayments — day detail summary header', () => {
    it('produces Net = Paid − Refunded with pending/failed reported separately', () => {
        const summary = summarizePayments([
            { amount: 1011, status: 'completed' },
            { amount: 232, status: 'refunded' },
            { amount: 500, status: 'pending' },
            { amount: 300, status: 'failed' },
        ]);
        expect(summary).toEqual({
            net: 779,
            paid: 1011,
            refunded: 232,
            pending: 500,
            failed: 300,
            count: 4,
        });
    });
});

describe('formatSignedRupees', () => {
    it('renders sign before the ₹ symbol (never "₹-232")', () => {
        expect(formatSignedRupees(779)).toBe('₹779');
        expect(formatSignedRupees(-232)).toBe('-₹232');
        expect(formatSignedRupees(0)).toBe('₹0');
    });

    it('groups thousands in Indian locale', () => {
        expect(formatSignedRupees(1011)).toBe('₹1,011');
        expect(formatSignedRupees(-1011)).toBe('-₹1,011');
    });
});
