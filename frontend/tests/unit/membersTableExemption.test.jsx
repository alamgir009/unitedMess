import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

import MembersTable from '@/modules/dashboard/components/MembersTable/MembersTable';

const store = configureStore({
    reducer: { noop: (state = {}) => state },
});

/**
 * Regression guard: the Exempt badge must come from the SERVER-computed
 * `user.isExempt` only. The client-side join-date heuristic that used to
 * live in this component has been removed — exemption is decided entirely
 * in backend/src/services/billingExemption.service.js.
 */
const baseUser = {
    _id: 'u1',
    name: 'Aman Verma',
    email: 'aman@example.com',
    phone: '9999999999',
    role: 'user',
    userStatus: 'approved',
    isActive: true,
    payment: 'pending',
    gasBill: 'pending',
    paybleAmountforMeal: 1200,
    createdAt: '2026-01-15T00:00:00.000Z',
};

const renderTable = (users) =>
    render(
        <Provider store={store}>
            <MembersTable users={users} isLoading={false} />
        </Provider>
    );

describe('MembersTable — Exempt badge', () => {
    it('renders when the server reports isExempt', () => {
        renderTable([{ ...baseUser, isExempt: true }]);
        expect(screen.getByText('Exempt')).toBeInTheDocument();
    });

    it('exposes the admin reason as the badge title', () => {
        renderTable([{ ...baseUser, isExempt: true, exemptReason: 'Medical leave' }]);
        expect(screen.getByTitle('Medical leave')).toBeInTheDocument();
    });

    it('falls back to the automatic-rule copy when no reason is supplied', () => {
        renderTable([{ ...baseUser, isExempt: true, exemptReason: null }]);
        expect(
            screen.getByTitle('No meals or market purchases this billing period')
        ).toBeInTheDocument();
    });

    it('does NOT render from a mid-period activation date (heuristic removed)', () => {
        // activatedAt is AFTER the billing period started — the old client
        // heuristic (day 1-10 rule) would have badged this member exempt.
        renderTable([
            {
                ...baseUser,
                activatedAt: new Date().toISOString(),
                isExempt: false,
                exemptReason: null,
            },
        ]);
        expect(screen.queryByText('Exempt')).toBeNull();
    });

    it('does NOT render when isExempt is false even with zero payable', () => {
        renderTable([{ ...baseUser, isExempt: false, paybleAmountforMeal: 0 }]);
        expect(screen.queryByText('Exempt')).toBeNull();
    });

    it('does NOT render when the server omitted isExempt entirely', () => {
        renderTable([{ ...baseUser }]);
        expect(screen.queryByText('Exempt')).toBeNull();
    });
});
