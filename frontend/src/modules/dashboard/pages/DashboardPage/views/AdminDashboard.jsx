import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { fetchAdminDashboardStats } from '../../../store/dashboard.slice';
import { fetchUsers, searchUsers } from '../../../../members/store/members.slice';
import StatOverview from '../../../components/StatOverview/StatOverview';
import MembersTable from '../../../components/MembersTable/MembersTable';
import SendNotificationModal from '@/modules/notification/components/SendNotificationModal/SendNotificationModal';
import {
    FiUsers, FiDollarSign, FiPieChart, FiShoppingBag, FiCommand,
    FiAlertCircle, FiCheckSquare, FiCoffee, FiTrendingUp,
    FiRefreshCw, FiSend
} from 'react-icons/fi';


// Summary alert pill
const AlertPill = ({ count, label, color, icon: Icon }) => {
    if (!count || count === 0) return null;
    const colors = {
        amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/10',
        red:   'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/10',
        green: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/10',
    };
    return (
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-bold uppercase tracking-wider ${colors[color] || colors.amber}`}>
            <Icon size={12} strokeWidth={2.5} />
            <span><strong>{count}</strong> {label}</span>
        </div>
    );
};

const AdminDashboard = () => {
    const dispatch  = useDispatch();
    const navigate  = useNavigate();
    const [showNotificationModal, setShowNotificationModal] = useState(false);

    const {
        adminStats,
        marketGrandTotal,
        mealGrandTotal,
        mealCharge,
        isLoading: isDashboardLoading,
    } = useSelector((state) => state.dashboard);

    const {
        users,
        isLoading: isMembersLoading,
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

    // ── Alert counts from visible user list ──────────────────────────────────
    const pendingCount    = users.filter(u => u.userStatus === 'pending').length;
    const deniedCount     = users.filter(u => u.userStatus === 'denied').length;
    const inactiveCount   = users.filter(u => !u.isActive && u.userStatus !== 'pending' && u.userStatus !== 'denied').length;
    const unpaidMealCount = users.filter(u => u.payment !== 'success' && u.isActive).length;
    const unpaidGasCount  = users.filter(u => u.gasBill  !== 'success' && u.isActive).length;
    const activeCount     = users.filter(u => u.isActive).length;

    const hasAlerts = pendingCount > 0 || unpaidMealCount > 0 || unpaidGasCount > 0 || inactiveCount > 0 || deniedCount > 0;
    const allSettled = !hasAlerts && users.length > 0;

    // Stats cards
    const statsData = [
        {
            title: 'Active Members',
            value: adminStats?.activeUsers ?? activeCount ?? 0,
            change: `${users.length} total`,
            changeType: 'increase',
            icon: FiUsers,
        },
        {
            title: 'Market Expenses',
            value: `₹${marketGrandTotal?.grandTotal ?? 0}`,
            icon: FiShoppingBag,
        },
        {
            title: 'Total Meals',
            value: mealGrandTotal?.overallMeal ?? 0,
            icon: FiCoffee,
        },
        {
            title: 'Meal Rate',
            value: `₹${mealCharge?.mealCharge ?? 0}`,
            icon: FiTrendingUp,
        },
    ];

    return (
        <div className="space-y-6">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-1">
                    <h2 className="text-xl sm:text-2xl tracking-tight text-foreground flex items-center gap-3">
                        <div className="p-2.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/10 rounded-xl">
                            <FiCommand size={18} />
                        </div>
                        Command Center
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        Global admin overview and controls
                    </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                        onClick={() => setShowNotificationModal(true)}
                        className="flex items-center gap-1.5 px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-xl border border-primary/20 text-primary bg-primary/10 hover:bg-primary/20 transition-all duration-150 transform-gpu hover:-translate-y-0.5"
                    >
                        <FiSend size={13} />
                        Send Notification
                    </button>
                    <button
                        onClick={handleRefresh}
                        disabled={isDashboardLoading || isMembersLoading}
                        className="flex items-center gap-1.5 px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-150 transform-gpu hover:-translate-y-0.5 disabled:opacity-50"
                    >
                        <FiRefreshCw size={13} className={isDashboardLoading || isMembersLoading ? 'animate-spin' : ''} />
                        Refresh
                    </button>
                </div>

                <SendNotificationModal
                    isOpen={showNotificationModal}
                    onClose={() => setShowNotificationModal(false)}
                />
            </div>

            {/* Stats Cards */}
            <div className={isDashboardLoading ? 'opacity-60 pointer-events-none transition-opacity' : 'transition-opacity'}>
                <StatOverview stats={statsData} />
            </div>

            {/* Alert Banners — only when there ARE alerts ──────────────────── */}
            {hasAlerts && (
                <div className="flex flex-wrap gap-2 items-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mr-1">
                        Alerts:
                      </span>
                    <AlertPill count={pendingCount}    label="pending approval"  color="amber" icon={FiAlertCircle} />
                    <AlertPill count={inactiveCount}   label="inactive members"  color="amber" icon={FiAlertCircle} />
                    <AlertPill count={deniedCount}     label="denied members"    color="red"   icon={FiAlertCircle} />
                    <AlertPill count={unpaidMealCount} label="unpaid meal bills" color="red"   icon={FiDollarSign}  />
                    <AlertPill count={unpaidGasCount}  label="unpaid gas bills"  color="red"   icon={FiPieChart}    />
                </div>
            )}

            {/* All-settled pill — only when all is clear and users are loaded ── */}
            {allSettled && (
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mr-1">
                        Status:
                    </span>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-bold uppercase tracking-wider bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                        <FiCheckSquare size={12} strokeWidth={2.5} />
                        <span><strong>{activeCount}</strong> all settled</span>
                    </div>
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
