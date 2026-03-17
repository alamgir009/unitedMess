import apiClient from '@/services/api/client/apiClient';
import mealService from '../../meal/services/meal.service';
import marketService from '../../market/services/market.service';

const API_URL = 'users';

const getAdminStats = async () => {
    const response = await apiClient.get(`${API_URL}/stats`);
    return response.data;
};

const getMarketGrandTotal = async () => {
    const response = await apiClient.get(`${API_URL}/stats/market-grand-total`);
    return response.data;
};

const getMealGrandTotal = async () => {
    const response = await apiClient.get(`${API_URL}/stats/meal-grand-total`);
    return response.data;
};

const getMealCharge = async () => {
    const response = await apiClient.get(`${API_URL}/stats/meal-charge`);
    return response.data;
};

const getUserMealPayable = async () => {
    const response = await apiClient.get(`${API_URL}/me/payable`);
    return response.data;
};

const getUserGasBillPayable = async () => {
    const response = await apiClient.get(`${API_URL}/me/payable/gasbill`);
    return response.data;
};

/**
 * Fetches the user's recent activity by combining meals and markets,
 * sorted by date descending.
 */
const getUserRecentActivity = async () => {
    const [mealsRes, marketsRes] = await Promise.allSettled([
        mealService.getMeals({ limit: 3, page: 1 }),
        marketService.getMarkets({ limit: 3, page: 1 }),
    ]);

    const extractArray = (res, key) => {
        if (res.status !== 'fulfilled' || !res.value) return [];
        const val = res.value;
        // Search deeply for the array
        if (val.data && Array.isArray(val.data[key])) return val.data[key];
        if (val.data && Array.isArray(val.data.data)) return val.data.data;
        if (val.data && val.data.data && Array.isArray(val.data.data[key])) return val.data.data[key];
        if (Array.isArray(val[key])) return val[key];
        if (val.data && Array.isArray(val.data)) return val.data;
        if (Array.isArray(val)) return val;
        
        // Handle paginated responses where data might be under 'docs', 'results', etc.
        const possibleKeys = ['data', 'docs', 'results', 'meals', 'markets', key];
        for (const k of possibleKeys) {
            if (val[k] && Array.isArray(val[k])) return val[k];
            if (val.data && val.data[k] && Array.isArray(val.data[k])) return val.data[k];
        }
        
        return [];
    };

    const meals = extractArray(mealsRes, 'meals').map(m => {
        const typeStr = m.type ? m.type.charAt(0).toUpperCase() + m.type.slice(1) : 'Standard';
        const desc = [];
        if (m.mealCount > 0) desc.push(`Type: ${typeStr}`);
        if (m.guestCount > 0) desc.push(`Guests: ${m.guestCount}`);
        if (m.remarks) desc.push(`Note: ${m.remarks}`);

        return {
            id: m._id,
            type: 'meal',
            title: `Meal Entry`,
            description: desc.join(' · ') || 'Regular meal entry',
            amount: `${m.mealCount || 0} Meal${m.mealCount > 1 || m.mealCount === 0 ? 's' : ''}${m.guestCount ? ` + ${m.guestCount} Guest` : ''}`,
            datetime: m.date || m.createdAt,
            raw: m,
        };
    });

    const markets = extractArray(marketsRes, 'markets').map(mk => ({
        id: mk._id,
        type: 'market',
        title: `Market Purchase`,
        description: mk.items || mk.description || 'Grocery purchase',
        amount: `₹${mk.amount || 0}`,
        datetime: mk.date || mk.createdAt,
        raw: mk,
    }));

    // Merge 3 meals and 3 markets and sort by most recent
    const combined = [...meals.slice(0, 3), ...markets.slice(0, 3)].sort((a, b) =>
        new Date(b.datetime) - new Date(a.datetime)
    );

    return combined;
};

const dashboardService = {
    getAdminStats,
    getMarketGrandTotal,
    getMealGrandTotal,
    getMealCharge,
    getUserMealPayable,
    getUserGasBillPayable,
    getUserRecentActivity,
};

export default dashboardService;
