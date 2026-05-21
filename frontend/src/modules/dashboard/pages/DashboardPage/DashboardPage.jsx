import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import MainLayout from '@/shared/components/layout/MainLayout/MainLayout';
import AdminDashboard from './views/AdminDashboard';
import UserDashboard from './views/UserDashboard';
import BillingCycleAlert from '../../components/BillingCycleAlert/BillingCycleAlert';

const DashboardPage = () => {
    // Determine the user's role from the auth state
    const { user } = useSelector((state) => state.auth);

    // Default to false to prevent accidental admin access
    const isAdmin = user?.role === 'admin';

    // Dynamic SEO Document Title
    useEffect(() => {
        const roleText = isAdmin ? 'Command Center' : 'Member Dashboard';
        document.title = `${roleText} | UnitedMess`;
        return () => {
            document.title = 'UnitedMess - Online Mess Management';
        };
    }, [isAdmin]);

    return (
        <MainLayout>
            <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-4 sm:py-6 w-full relative">
                {/* Accessible Single H1 for SEO */}
                <h1 className="sr-only">
                    {isAdmin ? 'UnitedMess Command Center' : 'UnitedMess Member Dashboard'}
                </h1>

                {/* Billing Cycle Reset Alert */}
                <BillingCycleAlert />

                {/* Conditional Rendering Strategy for Role-Based UI with fluid Framer Motion animations */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={isAdmin ? 'admin' : 'user'}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -15 }}
                        transition={{ duration: 0.25, ease: 'easeOut' }}
                    >
                        {isAdmin ? <AdminDashboard /> : <UserDashboard />}
                    </motion.div>
                </AnimatePresence>
            </div>
        </MainLayout>
    );
};

export default DashboardPage;
