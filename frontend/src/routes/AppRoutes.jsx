import { Routes, Route } from 'react-router-dom';

import LoginPage from '@/modules/auth/pages/LoginPage/LoginPage';
import RegisterPage from '@/modules/auth/pages/RegisterPage/RegisterPage';
import DashboardPage from '@/modules/dashboard/pages/DashboardPage/DashboardPage';
import ProfilePage from '@/modules/profile/pages/ProfilePage/ProfilePage';
import VerifyEmailPage from '@/modules/auth/pages/VerifyEmailPage/VerifyEmailPage';

import HomePage from '@/modules/public/pages/HomePage/HomePage';
import AboutPage from '@/modules/public/pages/AboutPage/AboutPage';
import FoodGalleryPage from '@/modules/public/pages/FoodGalleryPage/FoodGalleryPage';
import NotFoundPage from '@/modules/public/pages/NotFoundPage/NotFoundPage';

import PublicLayout from '@/shared/components/layout/PublicLayout/PublicLayout';

import ProtectedRoute from '@/shared/components/routes/ProtectedRoute';
import MealPage from '@/modules/meal/pages/MealPage/MealPage';
import MarketPage from '@/modules/market/pages/MarketPage/MarketPage';
import PaymentPage from '@/modules/payment/pages/PaymentPage/PaymentPage';
import MessagePage from '@/modules/message/pages/MessagePage/MessagePage';
import NotificationsPage from '@/modules/notification/pages/NotificationsPage/NotificationsPage';
import MemberPage from '@/modules/members/pages/members/MemberPage';

const AppRoutes = () => {
    return (
        <Routes>
            {/* ── Public Routes (with Navbar) ── */}
            <Route element={<PublicLayout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/food-gallery" element={<FoodGalleryPage />} />
                <Route path="*" element={<NotFoundPage />} />
            </Route>

            {/* ── Auth Routes (no Navbar) ── */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/auth/verify-email" element={<VerifyEmailPage />} />

            {/* ── Private Routes (no Navbar) ── */}
            <Route
                path="/dashboard"
                element={
                    <ProtectedRoute>
                        <DashboardPage />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/profile"
                element={
                    <ProtectedRoute>
                        <ProfilePage />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/meals"
                element={
                    <ProtectedRoute>
                        <MealPage/>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/markets"
                element={
                    <ProtectedRoute>
                        <MarketPage/>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/payments"
                element={
                    <ProtectedRoute>
                        <PaymentPage/>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/members"
                element={
                    <ProtectedRoute>
                        <MemberPage/>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/messages"
                element={
                    <ProtectedRoute>
                        <MessagePage/>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/notifications"
                element={
                    <ProtectedRoute>
                        <NotificationsPage/>
                    </ProtectedRoute>
                }
            />
        </Routes>
    );
};

export default AppRoutes;
