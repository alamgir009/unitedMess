import { configureStore } from '@reduxjs/toolkit';
import authReducer from '@/modules/auth/store/auth.slice';
import mealReducer from '@/modules/meal/store/meal.slice';
import marketReducer from '@/modules/market/store/market.slice'

export const store = configureStore({
    reducer: {
        auth: authReducer,
        meal: mealReducer,
        market: marketReducer,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: false,
        }),
});
