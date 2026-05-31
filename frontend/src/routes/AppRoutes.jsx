import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Spinner } from '@/shared/components/ui';

import ProtectedRoute from '@/shared/components/routes/ProtectedRoute';
import GuestRoute from '@/shared/components/routes/GuestRoute';
import AdminRoute from '@/shared/components/routes/AdminRoute';
import PublicLayout from '@/shared/components/layout/PublicLayout/PublicLayout';

const LoginPage = lazy(() => import('@/modules/auth/pages/LoginPage/LoginPage'));
const RegisterPage = lazy(() => import('@/modules/auth/pages/RegisterPage/RegisterPage'));
const DashboardPage = lazy(() => import('@/modules/dashboard/pages/DashboardPage/DashboardPage'));
const ProfilePage = lazy(() => import('@/modules/profile/pages/ProfilePage/ProfilePage'));
const VerifyEmailPage = lazy(() => import('@/modules/auth/pages/VerifyEmailPage/VerifyEmailPage'));
const ForgotPasswordPage = lazy(() => import('@/modules/auth/pages/ForgotPasswordPage/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('@/modules/auth/pages/ResetPasswordPage/ResetPasswordPage'));
const PendingApprovalPage = lazy(() => import('@/modules/auth/pages/PendingApprovalPage/PendingApprovalPage'));

const HomePage = lazy(() => import('@/modules/public/pages/HomePage/HomePage'));
const AboutPage = lazy(() => import('@/modules/public/pages/AboutPage/AboutPage'));
const PrivacyPage = lazy(() => import('@/modules/public/pages/PrivacyPage/PrivacyPage'));
const TermsPage = lazy(() => import('@/modules/public/pages/TermsPage/TermsPage'));
const ContactPage = lazy(() => import('@/modules/public/pages/ContactPage/ContactPage'));
const FoodGalleryPage = lazy(() => import('@/modules/public/pages/FoodGalleryPage/FoodGalleryPage'));
const NotFoundPage = lazy(() => import('@/modules/public/pages/NotFoundPage/NotFoundPage'));

const MealPage = lazy(() => import('@/modules/meal/pages/MealPage/MealPage'));
const MarketPage = lazy(() => import('@/modules/market/pages/MarketPage/MarketPage'));
const PaymentPage = lazy(() => import('@/modules/payment/pages/PaymentPage/PaymentPage'));
const NotificationsPage = lazy(() => import('@/modules/notification/pages/NotificationsPage/NotificationsPage'));
const MemberPage = lazy(() => import('@/modules/members/pages/members/MemberPage'));
const SettingsPage = lazy(() => import('@/modules/settings/pages/SettingsPage/SettingsPage'));

const PageLoader = () => (
    <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="xl" />
    </div>
);

const SuspenseWrapper = ({ children }) => (
    <Suspense fallback={<PageLoader />}>
        {children}
    </Suspense>
);

const AppRoutes = () => {
    return (
        <Routes>
            <Route element={<PublicLayout />}>
                <Route path="/" element={
                    <SuspenseWrapper>
                        <GuestRoute>
                            <HomePage />
                        </GuestRoute>
                    </SuspenseWrapper>
                } />
                <Route path="/about" element={<SuspenseWrapper><AboutPage /></SuspenseWrapper>} />
                <Route path="/privacy" element={<SuspenseWrapper><PrivacyPage /></SuspenseWrapper>} />
                <Route path="/terms" element={<SuspenseWrapper><TermsPage /></SuspenseWrapper>} />
                <Route path="/contact" element={<SuspenseWrapper><ContactPage /></SuspenseWrapper>} />
                <Route path="/food-gallery" element={<SuspenseWrapper><FoodGalleryPage /></SuspenseWrapper>} />
            </Route>

            <Route path="/login" element={
                <SuspenseWrapper>
                    <GuestRoute>
                        <LoginPage />
                    </GuestRoute>
                </SuspenseWrapper>
            } />
            <Route path="/register" element={
                <SuspenseWrapper>
                    <GuestRoute>
                        <RegisterPage />
                    </GuestRoute>
                </SuspenseWrapper>
            } />
            <Route path="/auth/verify-email" element={<SuspenseWrapper><VerifyEmailPage /></SuspenseWrapper>} />
            <Route path="/forgot-password" element={<SuspenseWrapper><ForgotPasswordPage /></SuspenseWrapper>} />
            <Route path="/reset-password/:token" element={<SuspenseWrapper><ResetPasswordPage /></SuspenseWrapper>} />
            <Route path="/auth/pending-approval" element={<SuspenseWrapper><PendingApprovalPage /></SuspenseWrapper>} />

            <Route
                path="/dashboard"
                element={
                    <SuspenseWrapper>
                        <ProtectedRoute>
                            <DashboardPage />
                        </ProtectedRoute>
                    </SuspenseWrapper>
                }
            />
            <Route
                path="/profile"
                element={
                    <SuspenseWrapper>
                        <ProtectedRoute>
                            <ProfilePage />
                        </ProtectedRoute>
                    </SuspenseWrapper>
                }
            />
            <Route
                path="/meals"
                element={
                    <SuspenseWrapper>
                        <ProtectedRoute>
                            <MealPage/>
                        </ProtectedRoute>
                    </SuspenseWrapper>
                }
            />
            <Route
                path="/markets"
                element={
                    <SuspenseWrapper>
                        <ProtectedRoute>
                            <MarketPage/>
                        </ProtectedRoute>
                    </SuspenseWrapper>
                }
            />
            <Route
                path="/payments"
                element={
                    <SuspenseWrapper>
                        <ProtectedRoute>
                            <PaymentPage/>
                        </ProtectedRoute>
                    </SuspenseWrapper>
                }
            />
            <Route
                path="/members"
                element={
                    <SuspenseWrapper>
                        <ProtectedRoute>
                            <MemberPage/>
                        </ProtectedRoute>
                    </SuspenseWrapper>
                }
            />
            <Route
                path="/notifications"
                element={
                    <SuspenseWrapper>
                        <ProtectedRoute>
                            <NotificationsPage/>
                        </ProtectedRoute>
                    </SuspenseWrapper>
                }
            />
            <Route
                path="/settings"
                element={
                    <SuspenseWrapper>
                        <AdminRoute>
                            <SettingsPage/>
                        </AdminRoute>
                    </SuspenseWrapper>
                }
            />

            <Route path="*" element={<SuspenseWrapper><NotFoundPage /></SuspenseWrapper>} />
        </Routes>
    );
};

export default AppRoutes;
