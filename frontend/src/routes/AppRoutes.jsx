import { Routes, Route } from 'react-router-dom';

import LoginPage from '@/modules/auth/pages/LoginPage/LoginPage';
import RegisterPage from '@/modules/auth/pages/RegisterPage/RegisterPage';
import DashboardPage from '@/modules/dashboard/pages/DashboardPage/DashboardPage';
import ProfilePage from '@/modules/profile/pages/ProfilePage/ProfilePage';
import VerifyEmailPage from '@/modules/auth/pages/VerifyEmailPage/VerifyEmailPage';
import ForgotPasswordPage from '@/modules/auth/pages/ForgotPasswordPage/ForgotPasswordPage';
import ResetPasswordPage from '@/modules/auth/pages/ResetPasswordPage/ResetPasswordPage';
import PendingApprovalPage from '@/modules/auth/pages/PendingApprovalPage/PendingApprovalPage';

import HomePage from '@/modules/public/pages/HomePage/HomePage';
import AboutPage from '@/modules/public/pages/AboutPage/AboutPage';
import PrivacyPage from '@/modules/public/pages/PrivacyPage/PrivacyPage';
import TermsPage from '@/modules/public/pages/TermsPage/TermsPage';
import ContactPage from '@/modules/public/pages/ContactPage/ContactPage';
import FoodGalleryPage from '@/modules/public/pages/FoodGalleryPage/FoodGalleryPage';
import NotFoundPage from '@/modules/public/pages/NotFoundPage/NotFoundPage';

import PublicLayout from '@/shared/components/layout/PublicLayout/PublicLayout';

import ProtectedRoute from '@/shared/components/routes/ProtectedRoute';
import GuestRoute from '@/shared/components/routes/GuestRoute';
import MealPage from '@/modules/meal/pages/MealPage/MealPage';
import MarketPage from '@/modules/market/pages/MarketPage/MarketPage';
import PaymentPage from '@/modules/payment/pages/PaymentPage/PaymentPage';
import MessagePage from '@/modules/message/pages/MessagePage/MessagePage';
import NotificationsPage from '@/modules/notification/pages/NotificationsPage/NotificationsPage';
import MemberPage from '@/modules/members/pages/members/MemberPage';
import SettingsPage from '@/modules/settings/pages/SettingsPage/SettingsPage';

const AppRoutes = () => {
    return (
        <Routes>
            {/* ── Public Routes (with Navbar) ── */}
            <Route element={<PublicLayout />}>
                <Route path="/" element={
                    <GuestRoute>
                        <HomePage />
                    </GuestRoute>
                } />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/privacy" element={<PrivacyPage />} />
                <Route path="/terms" element={<TermsPage />} />
                <Route path="/contact" element={<ContactPage />} />
                <Route path="/food-gallery" element={<FoodGalleryPage />} />
            </Route>

            {/* ── Auth Routes (no Navbar) ── */}
            <Route path="/login" element={
                <GuestRoute>
                    <LoginPage />
                </GuestRoute>
            } />
            <Route path="/register" element={
                <GuestRoute>
                    <RegisterPage />
                </GuestRoute>
            } />
            <Route path="/auth/verify-email" element={<VerifyEmailPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
            <Route path="/auth/pending-approval" element={<PendingApprovalPage />} />

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
            <Route
                path="/settings"
                element={
                    <ProtectedRoute>
                        <SettingsPage/>
                    </ProtectedRoute>
                }
            />

            {/* ── Catch-all (must be last) ── */}
            <Route path="*" element={<NotFoundPage />} />
        </Routes>
    );
};

export default AppRoutes;
