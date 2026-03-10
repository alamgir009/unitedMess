import { configureStore } from '@reduxjs/toolkit';
import authReducer from '@/modules/auth/store/auth.slice';
import mealReducer from '@/modules/meal/store/meal.slice';

export const store = configureStore({
    reducer: {
        auth: authReducer,
        meal: mealReducer,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: false,
        }),
});
