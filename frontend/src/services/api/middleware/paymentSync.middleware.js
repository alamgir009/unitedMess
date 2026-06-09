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
];

const MARKET_MUTATIONS = [
    'market/createMarket/fulfilled',
    'market/updateMarket/fulfilled',
    'market/deleteMarket/fulfilled',
    'market/adminCreateMarket/fulfilled',
];

const paymentSyncMiddleware = (store) => (next) => (action) => {
    const result = next(action);

    const isMealMutation = MEAL_MUTATIONS.includes(action.type);
    const isMarketMutation = MARKET_MUTATIONS.includes(action.type);

    if (isMealMutation || isMarketMutation) {
        store.dispatch(fetchPayableAmount());
        store.dispatch(fetchPayableGasBill());
        store.dispatch(fetchBillingMonthStats());
    }

    return result;
};

export default paymentSyncMiddleware;
