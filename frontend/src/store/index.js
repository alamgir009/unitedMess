import { configureStore } from '@reduxjs/toolkit';
import authReducer from '@/modules/auth/store/auth.slice';

export const store = configureStore({
    reducer: {
        auth: authReducer,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: false,
        }),
});
