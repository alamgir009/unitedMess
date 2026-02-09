import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Placeholder components for routing
import LoginPage from '@/modules/auth/pages/LoginPage/LoginPage';
import RegisterPage from '@/modules/auth/pages/RegisterPage/RegisterPage';
import DashboardPage from '@/modules/dashboard/pages/DashboardPage/DashboardPage';
import VerifyEmailPage from '@/modules/auth/pages/VerifyEmailPage/VerifyEmailPage';

const HomePage = () => <div className="p-4">Home Page</div>;
// Remove placeholder DashboardPage
const NotFoundPage = () => <div className="p-4">404 Not Found</div>;

const AppRoutes = () => {
    return (
        <Routes>
            {/* Public Routes */}
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/auth/verify-email" element={<VerifyEmailPage />} />

            {/* Private Routes (Protected) */}
            <Route path="/dashboard" element={<DashboardPage />} />

            {/* Catch all */}
            <Route path="*" element={<NotFoundPage />} />
        </Routes>
    );
};

export default AppRoutes;
