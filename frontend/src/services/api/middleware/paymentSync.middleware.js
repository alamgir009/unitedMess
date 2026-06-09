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
    'meal/createMeal/fulfilled',
    'meal/updateMeal/fulfilled',
    'meal/deleteMeal/fulfilled',
    'meal/bulkCreateMeals/fulfilled',
    'meal/bulkDeleteMeals/fulfilled',
    'meal/adminCreate/fulfilled',
    'meal/voteMealPoll/fulfilled',
];

const MARKET_MUTATIONS = [
    'market/createMarket/fulfilled',
    'market/updateMarket/fulfilled',
    'market/deleteMarket/fulfilled',
    'market/adminCreate/fulfilled',
];

const INVOICE_MUTATIONS = [
    'members/resolveInvoicePayment/fulfilled',
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

    const isMealMutation = MEAL_MUTATIONS.includes(action.type);
    const isMarketMutation = MARKET_MUTATIONS.includes(action.type);
    const isInvoiceMutation = INVOICE_MUTATIONS.includes(action.type);

    if (!isMealMutation && !isMarketMutation && !isInvoiceMutation) {
        return result;
    }

    // ── 1. Payable amounts always need refresh after meal/market changes ──
    if (isMealMutation || isMarketMutation) {
        store.dispatch(fetchPayableAmount());
        store.dispatch(fetchPayableGasBill());
    }

    // ── 2. Refresh member rows so MemberPage shows fresh paybleAmountforMeal ──
    if (isMealMutation || isMarketMutation || isInvoiceMutation) {
        store.dispatch(fetchUsers(DEFAULT_USER_PARAMS));
    }

    // ── 3. Refresh billing stats for stat pills on MemberPage ──
    store.dispatch(fetchBillingMonthStats());

    // ── 4. Refresh payments list so PaymentPage shows up-to-date records ──
    if (isMealMutation || isMarketMutation || isInvoiceMutation) {
        store.dispatch(fetchPayments({ page: 1, limit: 20 }));
    }

    // ── 5. Refresh active invoice so invoice views show correct totals ──
    if (isMealMutation || isMarketMutation || isInvoiceMutation) {
        store.dispatch(fetchActiveInvoice());
    }

    // ── 6. Refresh admin unpaid invoices panel ──
    if (isMealMutation || isMarketMutation || isInvoiceMutation) {
        const bp = getBillingPeriod();
        store.dispatch(fetchAdminUnpaidInvoices({ month: bp.month, year: bp.year }));
    }

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
