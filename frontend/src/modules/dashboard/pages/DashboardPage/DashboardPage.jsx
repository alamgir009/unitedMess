import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import MainLayout from '@/shared/components/layout/MainLayout/MainLayout';
import AdminDashboard from './views/AdminDashboard';
import UserDashboard from './views/UserDashboard';
import BillingCycleAlert from '../../components/BillingCycleAlert/BillingCycleAlert';
import '../../styles/dashboard.css';

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
            <div className="dashboard relative min-h-[80vh] max-w-[1600px] min-w-0 mx-auto">
                {/* Billing Cycle Reset Alert */}
                <BillingCycleAlert />

                {isAdmin ? <AdminDashboard /> : <UserDashboard />}
            </div>
        </MainLayout>
    );
};

export default DashboardPage;
