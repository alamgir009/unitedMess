import { useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { fetchAdminDashboardStats } from '../../../store/dashboard.slice';
import { fetchUsers, searchUsers } from '../../../../members/store/members.slice';
import StatOverview from '../../../components/StatOverview/StatOverview';
import MembersTable from '../../../components/MembersTable/MembersTable';
import SendNotificationModal from '@/modules/notification/components/SendNotificationModal/SendNotificationModal';
import Button from '@/shared/components/ui/Button/Button';
import {
    FiUsers, FiDollarSign, FiPieChart, FiShoppingBag, FiCommand,
    FiAlertCircle, FiCheckSquare, FiCoffee, FiTrendingUp,
    FiRefreshCw, FiSend
} from 'react-icons/fi';


// Summary alert pill - styled cleanly with HSL border and text values
const AlertPill = ({ count, label, color, icon: Icon }) => {
    if (!count || count === 0) return null;
    const colors = {
        amber: 'bg-warning-bg text-warning-text border-warning-border',
        red:   'bg-danger-bg text-danger-text border-danger-border',
        green: 'bg-success-bg text-success-text border-success-border',
    };
    return (
        <div className={`flex items-center justify-center lg:justify-start gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-bold uppercase tracking-wider w-full lg:w-auto ${colors[color] || colors.amber}`}>
            <Icon size={12} strokeWidth={2.5} className="shrink-0" />
            <span><strong>{count}</strong> {label}</span>
        </div>
    );
};

const AdminDashboard = () => {
    const dispatch  = useDispatch();
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

    const handleSearch = useCallback((query) => {
        if (query.trim()) {
            dispatch(searchUsers({ search: query }));
        } else {
            dispatch(fetchUsers({ page: 1, limit: 100 }));
        }
    }, [dispatch]);

    const handleRefresh = useCallback(() => {
        if (isDashboardLoading || isMembersLoading) return;
        dispatch(fetchAdminDashboardStats());
        dispatch(fetchUsers({ page: 1, limit: 100 }));
    }, [dispatch, isDashboardLoading, isMembersLoading]);

    // ── Alert counts from visible user list ──────────────────────────────────
    const pendingCount    = users.filter(u => u.userStatus === 'pending').length;
    const deniedCount     = users.filter(u => u.userStatus === 'denied').length;
    const inactiveCount   = users.filter(u => !u.isActive && u.userStatus !== 'pending' && u.userStatus !== 'denied').length;
    const unpaidMealCount = users.filter(u => u.payment !== 'success' && u.isActive).length;
    const unpaidGasCount  = users.filter(u => u.gasBill  !== 'success' && u.isActive).length;
    const activeCount     = users.filter(u => u.isActive).length;

    const hasAlerts = pendingCount > 0 || unpaidMealCount > 0 || unpaidGasCount > 0 || inactiveCount > 0 || deniedCount > 0;
    const allSettled = !hasAlerts && users.length > 0;

    // Stats cards configuration
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
            {/* Header / Actions Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-primary/10 text-primary border border-primary/10 rounded-2xl shrink-0 shadow-sm">
                        <FiCommand size={20} />
                    </div>
                    <div className="min-w-0">
                        <h2 className="text-h1">
                            Command Center
                        </h2>
                        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 truncate">
                            Global admin overview and system controls
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                    <Button
                        variant="primary"
                        size="md"
                        onClick={() => setShowNotificationModal(true)}
                    >
                        <FiSend size={13} />
                        Send Notification
                    </Button>
                    <Button
                        variant="neutral"
                        size="md"
                        onClick={handleRefresh}
                        disabled={isDashboardLoading || isMembersLoading}
                    >
                        <FiRefreshCw size={13} className={isDashboardLoading || isMembersLoading ? 'animate-spin' : ''} />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Stats Cards Section */}
            <div className={isDashboardLoading ? 'opacity-60 pointer-events-none transition-opacity duration-200' : 'transition-opacity duration-200'}>
                <StatOverview stats={statsData} />
            </div>

            {/* Action Items Panel (alerts present) */}
            {hasAlerts && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-card border border-border/50 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3"
                >
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <FiAlertCircle size={14} className="text-amber-500" />
                        <span className="text-caption font-bold uppercase tracking-wider">
                            Action Items Required
                        </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap gap-2.5 w-full">
                        <AlertPill count={pendingCount}    label="pending approval"  color="amber" icon={FiAlertCircle} />
                        <AlertPill count={inactiveCount}   label="inactive members"  color="amber" icon={FiAlertCircle} />
                        <AlertPill count={deniedCount}     label="denied members"    color="red"   icon={FiAlertCircle} />
                        <AlertPill count={unpaidMealCount} label="unpaid meal bills" color="red"   icon={FiDollarSign}  />
                        <AlertPill count={unpaidGasCount}  label="unpaid gas bills"  color="red"   icon={FiPieChart}    />
                    </div>
                </motion.div>
            )}

            {/* All-Settled Status Panel (no alerts) */}
            {allSettled && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-card border border-success-border/50 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                    <div className="flex items-start sm:items-center gap-3">
                        <div className="p-2 bg-success-bg text-success-text border border-success-border rounded-xl shrink-0">
                            <FiCheckSquare size={18} strokeWidth={2.5} />
                        </div>
                        <div className="min-w-0">
                            <h4 className="text-sm font-bold text-foreground">All Systems Settled</h4>
                            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                                No pending approvals or unpaid dues for the {activeCount} active members.
                            </p>
                        </div>
                    </div>
                    <div className="self-stretch sm:self-auto flex items-center justify-center px-3 py-1.5 bg-success-bg text-success-text border border-success-border rounded-xl text-caption font-bold uppercase tracking-wider">
                        Clear ✓
                    </div>
                </motion.div>
            )}

            {/* Members List Table Container */}
            <div className="rounded-2xl border border-border/50 bg-card overflow-hidden shadow-sm">
                <MembersTable
                    users={users}
                    isLoading={isMembersLoading}
                    onSearch={handleSearch}
                />
            </div>

            {/* Send Notification Modal Dialog */}
            <SendNotificationModal
                isOpen={showNotificationModal}
                onClose={() => setShowNotificationModal(false)}
            />
        </div>
    );
};

export default AdminDashboard;
