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
            <div className="max-w-7xl mx-auto py-6 w-full relative">
                {/* Decorative global background glow */}
                <div className="fixed top-0 left-1/2 -translate-x-1/2 w-screen h-scren pointer-events-none z-[-1] overflow-hidden hidden dark:block">
                    <div className="absolute top-[-10%] sm:top-[-20%] left-1/4 w-[50vw] h-[50vw] rounded-full bg-indigo-900/10 blur-[120px]" />
                    <div className="absolute top-[20%] right-1/4 w-[40vw] h-[40vw] rounded-full bg-purple-900/10 blur-[100px]" />
                </div>

                {/* Billing Cycle Reset Alert */}
                <BillingCycleAlert />

                {/* Conditional Rendering Strategy for Role-Based UI */}
                {isAdmin ? <AdminDashboard /> : <UserDashboard />}
            </div>
        </MainLayout>
    );
};

export default DashboardPage;
