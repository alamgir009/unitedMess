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

function getBillingPeriod() {
    const date = new Date();
    const day = date.getDate();
    let month = date.getMonth() + 1;
    let year = date.getFullYear();
    if (day <= 10) {
        if (month === 1) { month = 12; year--; }
        else { month--; }
    }
    return { month, year };
}

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

    // ── 6. Refresh admin unpaid invoices panel ──
    const bp = getBillingPeriod();
    store.dispatch(fetchAdminUnpaidInvoices({ month: bp.month, year: bp.year }));

    // ── 7. Refresh dashboard data ──
    const state = store.getState();
    if (state.auth.user?.role === 'admin') {
        store.dispatch(fetchAdminDashboardStats());
    } else if (state.auth.user) {
        store.dispatch(fetchUserDashboardStats());
    }

    return result;
};

export default paymentSyncMiddleware;
