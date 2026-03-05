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
        </Routes>
    );
};

export default AppRoutes;
