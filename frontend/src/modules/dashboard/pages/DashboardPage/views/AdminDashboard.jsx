import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { fetchAdminDashboardStats } from '../../../store/dashboard.slice';
import { fetchUsers, searchUsers } from '../../../../members/store/members.slice';
import StatOverview from '../../../components/StatOverview/StatOverview';
import MembersTable from '../../../components/MembersTable/MembersTable';
import {
    FiUsers, FiDollarSign, FiPieChart, FiShoppingBag, FiCommand,
    FiAlertCircle, FiCheckSquare, FiCoffee, FiCreditCard, FiTrendingUp,
    FiArrowRight, FiRefreshCw
} from 'react-icons/fi';



// Summary alert pill
const AlertPill = ({ count, label, color, icon: Icon }) => {
    if (!count || count === 0) return null;
    const colors = {
        amber: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/40 text-amber-700 dark:text-amber-400',
        red: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/40 text-red-700 dark:text-red-400',
        green: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800/40 text-green-700 dark:text-green-400',
    };
    return (
        <div className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl border text-xs font-semibold ${colors[color] || colors.amber}`}>
            <Icon size={14} />
            <span><strong>{count}</strong> {label}</span>
        </div>
    );
};

const AdminDashboard = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const {
        adminStats,
        marketGrandTotal,
        mealGrandTotal,
        mealCharge,
        isLoading: isDashboardLoading
    } = useSelector((state) => state.dashboard);

    const {
        users,
        isLoading: isMembersLoading
    } = useSelector((state) => state.members);

    useEffect(() => {
        dispatch(fetchAdminDashboardStats());
        dispatch(fetchUsers({ page: 1, limit: 100 }));
    }, [dispatch]);

    const handleSearch = (query) => {
        if (query.trim()) {
            dispatch(searchUsers({ search: query }));
        } else {
            dispatch(fetchUsers({ page: 1, limit: 100 }));
        }
    };

    const handleRefresh = () => {
        dispatch(fetchAdminDashboardStats());
        dispatch(fetchUsers({ page: 1, limit: 100 }));
    };

    // Computed summary alerts from user list
    const pendingCount = users.filter(u => u.status === 'pending').length;
    const unpaidMealCount = users.filter(u => u.paymentStatus !== 'paid' && u.status === 'active').length;
    const unpaidGasCount = users.filter(u => u.gasBillStatus !== 'paid' && u.status === 'active').length;
    const activeCount = users.filter(u => u.status === 'active').length;

    // Stats cards
    const statsData = [
        {
            title: 'Active Members',
            value: adminStats?.activeUsers || activeCount || 0,
            change: `${users.length} total`,
            changeType: 'increase',
            icon: FiUsers,
            colorClass: 'bg-gradient-to-br from-blue-500 to-indigo-600',
            gradientClass: 'bg-blue-500',
        },
        {
            title: 'Market Expenses',
            value: `₹${marketGrandTotal?.grandTotal || 0}`,
            icon: FiShoppingBag,
            colorClass: 'bg-gradient-to-br from-rose-500 to-pink-600',
            gradientClass: 'bg-rose-500',
        },
        {
            title: 'Total Meals',
            value: mealGrandTotal?.overallMeal || 0,
            icon: FiCoffee,
            colorClass: 'bg-gradient-to-br from-emerald-500 to-teal-600',
            gradientClass: 'bg-emerald-500',
        },
        {
            title: 'Meal Rate',
            value: `₹${mealCharge?.mealCharge || 0}`,
            icon: FiTrendingUp,
            colorClass: 'bg-gradient-to-br from-amber-500 to-orange-600',
            gradientClass: 'bg-amber-500',
        },
    ];



    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">

            {/* Header */}
            <div className="flex items-start justify-between flex-wrap gap-4">
                <div>
                    <h2 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white flex items-center gap-3">
                        <div className="p-2.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
                            <FiCommand size={22} />
                        </div>
                        Command Center
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 font-medium mt-1">
                        Global admin overview and controls
                    </p>
                </div>
                <button
                    onClick={handleRefresh}
                    disabled={isDashboardLoading || isMembersLoading}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
                >
                    <FiRefreshCw size={14} className={isDashboardLoading || isMembersLoading ? 'animate-spin' : ''} />
                    Refresh
                </button>
            </div>

            {/* Stats Cards */}
            <div className={isDashboardLoading ? 'opacity-60 pointer-events-none transition-opacity' : 'transition-opacity'}>
                <StatOverview stats={statsData} />
            </div>



            {/* Alert Banners */}
            {(pendingCount > 0 || unpaidMealCount > 0 || unpaidGasCount > 0) && (
                <div className="flex flex-wrap gap-2 items-center">
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mr-1">
                        Alerts:
                    </span>
                    <AlertPill count={pendingCount} label="pending approval" color="amber" icon={FiAlertCircle} />
                    <AlertPill count={unpaidMealCount} label="unpaid meal bills" color="red" icon={FiDollarSign} />
                    <AlertPill count={unpaidGasCount} label="unpaid gas bills" color="red" icon={FiPieChart} />
                    {pendingCount === 0 && unpaidMealCount === 0 && unpaidGasCount === 0 && (
                        <AlertPill count={activeCount} label="all settled" color="green" icon={FiCheckSquare} />
                    )}
                </div>
            )}

            {/* Members Table */}
            <div>
                <MembersTable
                    users={users}
                    isLoading={isMembersLoading}
                    onSearch={handleSearch}
                />
            </div>
        </div>
    );
};

export default AdminDashboard;
