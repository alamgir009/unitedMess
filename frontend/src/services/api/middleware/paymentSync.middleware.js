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
import { getLastFinalizedPeriod } from '@shared/utils/billingPeriod';

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

// Debounce ref — shared across all middleware invocations.
// Coalesces multiple rapid mutations into a single refresh batch.
let debounceTimer = null;

const syncAll = (store) => {
    const state = store.getState();

    // 1. Payable amounts
    store.dispatch(fetchPayableAmount());
    store.dispatch(fetchPayableGasBill());

    // 2. Refresh billing stats
    store.dispatch(fetchBillingMonthStats());

    // 3. Refresh payments list
    store.dispatch(fetchPayments({ page: 1, limit: 20 }));

    // 4. Refresh active invoice
    store.dispatch(fetchActiveInvoice());

    // 5. Admin-only dispatches
    if (state.auth.user?.role === 'admin') {
        const lastFinalized = getLastFinalizedPeriod();
        store.dispatch(fetchAdminUnpaidInvoices({ month: lastFinalized.month, year: lastFinalized.year }));
        store.dispatch(fetchUsers(DEFAULT_USER_PARAMS));
        store.dispatch(fetchAdminDashboardStats());
    } else if (state.auth.user) {
        store.dispatch(fetchUserDashboardStats());
    }
};

const paymentSyncMiddleware = (store) => (next) => (action) => {
    const result = next(action);

    if (!ALL_MUTATIONS.includes(action.type)) {
        return result;
    }

    // Debounce: cancel previous timer, schedule fresh batch in 300ms
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        debounceTimer = null;
        syncAll(store);
    }, 300);

    return result;
};

export default paymentSyncMiddleware;
