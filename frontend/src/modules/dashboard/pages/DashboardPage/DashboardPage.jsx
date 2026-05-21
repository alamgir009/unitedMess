import React from 'react';
import { useSelector } from 'react-redux';
import MainLayout from '@/shared/components/layout/MainLayout/MainLayout';
import AdminDashboard from './views/AdminDashboard';
import UserDashboard from './views/UserDashboard';
import BillingCycleAlert from '../../components/BillingCycleAlert/BillingCycleAlert';

const DashboardPage = () => {
    // Determine the user's role from the auth state
    const { user } = useSelector((state) => state.auth);

    // Default to false to prevent accidental admin access
    const isAdmin = user?.role === 'admin';

    return (
        <MainLayout>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full relative">
                {/* Billing Cycle Reset Alert */}
                <BillingCycleAlert />

                {/* Conditional Rendering Strategy for Role-Based UI */}
                {isAdmin ? <AdminDashboard /> : <UserDashboard />}
            </div>
        </MainLayout>
    );
};

export default DashboardPage;
