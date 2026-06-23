import { configureStore } from '@reduxjs/toolkit';
import authReducer from '@/modules/auth/store/auth.slice';
import mealReducer from '@/modules/meal/store/meal.slice';
import marketReducer from '@/modules/market/store/market.slice';
import paymentReducer from '@/modules/payment/store/payment.slice';
import invoiceReducer from '@/modules/payment/store/invoice.slice';
import dashboardReducer from '@/modules/dashboard/store/dashboard.slice';
import membersReducer from '@/modules/members/store/members.slice';
import notificationReducer from '@/modules/notification/store/notification.slice';
import eventsReducer from '@/modules/events/store/events.slice';
import paymentSyncMiddleware from '@/services/api/middleware/paymentSync.middleware';

export const store = configureStore({
    reducer: {
        auth: authReducer,
        meal: mealReducer,
        market: marketReducer,
        payment: paymentReducer,
        invoice: invoiceReducer,
        dashboard: dashboardReducer,
        members: membersReducer,
        notification: notificationReducer,
        events: eventsReducer,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: {
                ignoredActions: [
                    'auth/updateAvatar/fulfilled',
                    'auth/updateAvatar/pending',
                    'profile/updateAvatar/fulfilled',
                ],
                ignoredPaths: [
                    'profile.avatarFile',
                ],
            },
        }).concat(paymentSyncMiddleware),

})