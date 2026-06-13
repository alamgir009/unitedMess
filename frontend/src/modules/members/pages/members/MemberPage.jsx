import React, { useEffect, useMemo, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AnimatePresence, motion } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import {
    HiOutlineUserGroup,
    HiOutlineCurrencyRupee,
    HiOutlineArrowTrendingUp,
    HiOutlineCalendarDays,
    HiOutlineShieldCheck,
    HiOutlineXMark,
} from 'react-icons/hi2';
import { IoFastFoodOutline } from 'react-icons/io5';

import MainLayout from '@/shared/components/layout/MainLayout/MainLayout';
import MemberTable from '../../components/MemberTable';
import StatPill from '@/shared/components/ui/StatPill/StatPill';
import { fetchUsers, fetchBillingMonthStats, reset } from '../../store/members.slice';

/* ─────────────────────────────────────────────
   MemberPage — Main
 ───────────────────────────────────────────── */
const MemberPage = React.memo(() => {
    const dispatch = useDispatch();
    const { users, isLoading, isError, message, billingStats, billingStatsLoading } = useSelector((state) => state.members);
    const { user: currentUser } = useSelector((state) => state.auth);
    const isAdmin = currentUser?.role === 'admin';

    /* 
     * Member Directory List
     * Optimized: Filters for isActive & approved status as a secondary defense.
     */
    const safeUsers = useMemo(() => {
        let list = [];
        const rawUsers = users?.users || users?.docs || (Array.isArray(users) ? users : []);
        
        if (Array.isArray(rawUsers)) {
            list = rawUsers;
        }

        // Secondary defense: ensure only active & approved members are shown
        return list.filter(u => u.isActive && u.userStatus === 'approved');
    }, [users]);

    /* Stat count — safeUsers.length since it's already filtered */
    const activeCount = safeUsers.length;

    useEffect(() => {
        // PRODUCTION READY: Explicitly filter for active/approved members in the directory
        dispatch(fetchUsers({ 
            page: 1, 
            limit: 100, 
            isActive: true, 
            userStatus: 'approved' 
        }));
        dispatch(fetchBillingMonthStats());
    }, [dispatch]);

    /* ── visibility / focus — re-fetch when user returns to this tab ── */
    useEffect(() => {
        const onVisible = () => {
            if (document.visibilityState === 'visible') {
                dispatch(fetchUsers({ 
                    page: 1, 
                    limit: 100, 
                    isActive: true, 
                    userStatus: 'approved' 
                }));
                dispatch(fetchBillingMonthStats());
            }
        };
        document.addEventListener('visibilitychange', onVisible);
        window.addEventListener('focus', onVisible);
        return () => {
            document.removeEventListener('visibilitychange', onVisible);
            window.removeEventListener('focus', onVisible);
        };
    }, [dispatch]);

    const handleRetry = useCallback(() => {
        dispatch(fetchUsers({ 
            page: 1, 
            limit: 100, 
            isActive: true, 
            userStatus: 'approved' 
        }));
        dispatch(fetchBillingMonthStats());
    }, [dispatch]);

    const dismissError = useCallback(() => {
        dispatch(reset());
    }, [dispatch]);

    const formattedMarketExp = useMemo(() => `₹${(billingStats.grandTotalMarket ?? 0).toLocaleString('en-IN')}`, [billingStats.grandTotalMarket]);
    const formattedTotalMeals = useMemo(() => (billingStats.grandTotalMeal ?? 0).toLocaleString('en-IN'), [billingStats.grandTotalMeal]);
    const formattedMealRate = useMemo(() => `₹${(billingStats.mealCharge ?? 0).toFixed(2)}`, [billingStats.mealCharge]);

    const stats = useMemo(() => {
        return [
            {
                icon: HiOutlineUserGroup,
                label: 'Active Members',
                value: activeCount,
                color: 'bg-secondary-500/10 border-secondary-500/20 text-secondary-600 dark:text-secondary-400',
            },
            {
                icon: HiOutlineCurrencyRupee,
                label: 'Market Exp.',
                value: billingStatsLoading ? '...' : formattedMarketExp,
                color: 'bg-primary/10 border-primary/20 text-primary',
            },
            {
                icon: IoFastFoodOutline,
                label: 'Total Meals',
                value: billingStatsLoading ? '...' : formattedTotalMeals,
                color: 'bg-accent/10 border-accent/20 text-accent',
            },
            {
                icon: HiOutlineArrowTrendingUp,
                label: 'Meal Rate',
                value: billingStatsLoading ? '...' : formattedMealRate,
                color: 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400',
            },
        ];
    }, [activeCount, billingStatsLoading, formattedMarketExp, formattedTotalMeals, formattedMealRate]);

    return (
        <MainLayout>
            <div className="relative min-h-[80vh] max-w-7xl mx-auto space-y-6">

                {/* ════════════════════════════════
                    Header
                ════════════════════════════════ */}
                <header className="relative z-10 animate-fade-in">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        
                        {/* Title block */}
                        <div className="space-y-1">
                            {isAdmin ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 mb-1 rounded-full text-xs font-semibold bg-secondary-400/10 text-secondary-400 border border-secondary-400/20">
                                    <HiOutlineShieldCheck className="w-3.5 h-3.5" /> Admin View
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 mb-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                                    <HiOutlineUserGroup className="w-3.5 h-3.5" /> Directory
                                </span>
                            )}
                            <h2 className="text-xl sm:text-2xl tracking-tight text-foreground font-semibold leading-tight">
                                {isAdmin ? 'Members & Finalized Bills' : 'Members Directory'}
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                Review financial statuses, expand rows for a comprehensive invoice breakdown.
                            </p>
                        </div>

                        {/* Billing month badge */}
                        {billingStats.billingMonth && (
                            <div className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-700 dark:text-indigo-400 shadow-sm self-start">
                                <HiOutlineCalendarDays className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                                <div className="leading-none text-left">
                                    <p className="text-[9px] uppercase font-bold tracking-widest opacity-70">Billing Period</p>
                                    <p className="text-sm font-bold mt-0.5">{billingStats.billingMonth}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </header>

                {/* ════════════════════════════════
                    Stat pills grid
                ════════════════════════════════ */}
                <div className="relative z-10 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 animate-fade-in-up">
                    {stats.map((s) => (
                        <div key={s.label} className="col-span-1">
                            <StatPill {...s} />
                        </div>
                    ))}
                </div>

                {/* ════════════════════════════════
                    Error banner
                ════════════════════════════════ */}
                <AnimatePresence>
                    {isError && (
                        <motion.div
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.15 }}
                            className="relative z-10 flex items-start gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive"
                        >
                                <span className="w-2 h-2 rounded-full bg-destructive mt-1.5 flex-shrink-0 animate-pulse" />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold leading-tight text-destructive">
                                    Failed to load members
                                </p>
                                <p className="text-xs font-medium mt-0.5 opacity-80 truncate text-destructive/80">
                                    {message || 'Please check your network connection and try again.'}
                                </p>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <button
                                    onClick={handleRetry}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold
                                               bg-destructive/20 text-destructive
                                               hover:bg-destructive/30 active:scale-95 transition-all duration-150"
                                    aria-label="Retry loading members"
                                >
                                    <RefreshCw className="w-3.5 h-3.5" />
                                    Retry
                                </button>
                                <button
                                    onClick={dismissError}
                                    className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors"
                                    title="Dismiss"
                                    aria-label="Dismiss error"
                                >
                                    <HiOutlineXMark className="w-4 h-4" />
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ════════════════════════════════
                    Member table
                ════════════════════════════════ */}
                <main className="relative z-10 flex-1 animate-fade-in-up">
                    <MemberTable
                        users={safeUsers}
                        isLoading={isLoading && safeUsers.length === 0}
                    />
                </main>

            </div>
        </MainLayout>
    );
});

MemberPage.displayName = 'MemberPage';

export default MemberPage;
