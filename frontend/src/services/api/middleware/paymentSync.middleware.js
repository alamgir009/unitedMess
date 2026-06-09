import {
    fetchPayableAmount,
    fetchPayableGasBill,
} from '../../../modules/auth/store/auth.slice';
import { fetchBillingMonthStats } from '../../../modules/members/store/members.slice';

const MEAL_MUTATIONS = [
    'meal/createMeal/fulfilled',
    'meal/updateMeal/fulfilled',
    'meal/deleteMeal/fulfilled',
    'meal/bulkCreateMeals/fulfilled',
    'meal/bulkDeleteMeals/fulfilled',
    'meal/adminCreateMeal/fulfilled',
    'meal/voteMealPoll/fulfilled',
];

const MARKET_MUTATIONS = [
    'market/createMarket/fulfilled',
    'market/updateMarket/fulfilled',
    'market/deleteMarket/fulfilled',
    'market/adminCreateMarket/fulfilled',
];

const INVOICE_MUTATIONS = [
    'members/resolveInvoicePayment/fulfilled',
];

let debounceTimer = null;
const DEBOUNCE_MS = 300;

const paymentSyncMiddleware = (store) => (next) => (action) => {
    const result = next(action);

    const isMealMutation = MEAL_MUTATIONS.includes(action.type);
    const isMarketMutation = MARKET_MUTATIONS.includes(action.type);
    const isInvoiceMutation = INVOICE_MUTATIONS.includes(action.type);

    if (!isMealMutation && !isMarketMutation && !isInvoiceMutation) {
        return result;
    }

    if (debounceTimer) {
        clearTimeout(debounceTimer);
    }

    debounceTimer = setTimeout(() => {
        debounceTimer = null;

        if (isMealMutation || isMarketMutation) {
            store.dispatch(fetchPayableAmount());
            store.dispatch(fetchPayableGasBill());
        }

        store.dispatch(fetchBillingMonthStats());
    }, DEBOUNCE_MS);

    return result;
};

export default paymentSyncMiddleware;
