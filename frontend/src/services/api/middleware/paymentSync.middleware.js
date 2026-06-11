import {
    fetchPayableAmount,
    fetchPayableGasBill,
} from '../../../modules/auth/store/auth.slice';
import {
    fetchPayments,
} from '../../../modules/payment/store/payment.slice';
import {
    fetchActiveInvoice,
} from '../../../modules/payment/store/invoice.slice';
import { fetchBillingMonthStats, fetchUsers, fetchAdminUnpaidInvoices } from '../../../modules/members/store/members.slice';
import {
    fetchAdminDashboardStats,
    fetchUserDashboardStats,
} from '../../../modules/dashboard/store/dashboard.slice';

// FIX: Import centralized billing period utilities from shared source of truth.
// Eliminates the duplicated local getBillingPeriod() that drifted from backend logic.
import { getBillingPeriod, getLastFinalizedPeriod } from '@shared/utils/billingPeriod';

const MEAL_MUTATIONS = [
    'meal/create/fulfilled',
    'meal/update/fulfilled',
    'meal/delete/fulfilled',
    'meal/bulkCreate/fulfilled',
    'meal/bulkDelete/fulfilled',
    'meal/adminCreate/fulfilled',
];

const MARKET_MUTATIONS = [
    'market/create/fulfilled',
    'market/update/fulfilled',
    'market/delete/fulfilled',
    'market/adminCreate/fulfilled',
];

const PAYMENT_MUTATIONS = [
    'payment/create/fulfilled',
    'payment/update/fulfilled',
    'payment/delete/fulfilled',
    'payment/createBulk/fulfilled',
];

const INVOICE_MUTATIONS = [
    'members/resolveInvoicePayment/fulfilled',
];

const ALL_MUTATIONS = [
    ...MEAL_MUTATIONS,
    ...MARKET_MUTATIONS,
    ...PAYMENT_MUTATIONS,
    ...INVOICE_MUTATIONS,
];

const DEFAULT_USER_PARAMS = {
    page: 1,
    limit: 100,
    isActive: true,
    userStatus: 'approved',
};

const paymentSyncMiddleware = (store) => (next) => (action) => {
    const result = next(action);

    if (!ALL_MUTATIONS.includes(action.type)) {
        return result;
    }

    // ── 1. Payable amounts ──
    store.dispatch(fetchPayableAmount());
    store.dispatch(fetchPayableGasBill());

    // ── 2. Refresh ALL member rows so every view shows fresh data ──
    store.dispatch(fetchUsers(DEFAULT_USER_PARAMS));

    // ── 3. Refresh billing stats ──
    store.dispatch(fetchBillingMonthStats());

    // ── 4. Refresh payments list ──
    store.dispatch(fetchPayments({ page: 1, limit: 20 }));

    // ── 5. Refresh active invoice ──
    store.dispatch(fetchActiveInvoice());

    // ── 6. Admin-only dispatches ──
    // FIX: Guard admin-only endpoints behind role check so non-admin users
    // don't trigger 403 errors that pollute Redux state.
    const state = store.getState();
    if (state.auth.user?.role === 'admin') {
        // Refresh admin unpaid invoices panel (only the last finalized period).
        // FIX: Dispatch only ONE fetch — for the last finalized period.
        // Previously dispatched BOTH lastFinalized and billingPeriod, causing
        // the billing period (empty, no finalized invoices) to overwrite the
        // last finalized period's data in Redux via the second dispatch.
        const lastFinalized = getLastFinalizedPeriod();
        store.dispatch(fetchAdminUnpaidInvoices({ month: lastFinalized.month, year: lastFinalized.year }));

        // Refresh member list (admin-only endpoint)
        store.dispatch(fetchUsers(DEFAULT_USER_PARAMS));

        // Refresh admin dashboard stats
        store.dispatch(fetchAdminDashboardStats());
    } else if (state.auth.user) {
        store.dispatch(fetchUserDashboardStats());
    }

    return result;
};

export default paymentSyncMiddleware;
