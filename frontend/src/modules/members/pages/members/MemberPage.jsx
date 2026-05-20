import React, { useEffect, useMemo, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import MainLayout from '@/shared/components/layout/MainLayout/MainLayout';
import MemberTable from '../../components/MemberTable';
import AdminUnpaidPanel from '../../components/AdminUnpaidPanel';
import { fetchUsers, fetchBillingMonthStats } from '../../store/members.slice';
import {
    FileText, RefreshCw, Users, TrendingUp,
    Utensils, Receipt, AlertCircle, ArrowUpRight, CalendarDays,
} from 'lucide-react';
import { IoFastFoodOutline } from "react-icons/io5";
import { LuReceiptIndianRupee } from "react-icons/lu";

/* ─────────────────────────────────────────────
   Stat Card — memoized, CSS-only animation for speed
───────────────────────────────────────────── */
const StatCard = React.memo(({ icon: Icon, label, value, subvalue, accent = false, loading = false, delay = 0 }) => {
    return (
        <div
            style={{ animationDelay: `${delay}s` }}
            className={[
                'group relative overflow-hidden rounded-2xl border p-3.5 text-left',
                'transition-colors duration-200',
                'min-h-[110px] sm:min-h-[120px] sm:p-4',
                'backdrop-blur-md',
                'animate-[fadeSlideUp_0.35s_cubic-bezier(0.22,1,0.36,1)_both]',
                accent 
                    ? 'border-transparent bg-white/95 shadow-[0_12px_32px_-8px_rgba(245,158,11,0.40)] ring-1 ring-amber-500/30 dark:bg-slate-900/90'
                    : 'border-black/[0.06] bg-white/65 hover:bg-white/90 dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/[0.07]'
            ].join(' ')}
        >
            {accent && (
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-amber-400/20 via-orange-500/20 to-rose-500/20" />
            )}

            <div className="relative z-10 flex h-full flex-col justify-between gap-3">
                {/* top row: icon + label */}
                <div className="flex items-start gap-2.5">
                    <div
                        className={[
                            'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
                            'transition-colors duration-200 sm:h-10 sm:w-10',
                            accent ? 'bg-amber-500/10' : 'bg-black/[0.05] dark:bg-white/10',
                        ].join(' ')}
                    >
                        <Icon
                        size={20}
                        className={
                            accent
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-foreground/65'
                        }
                    />
                    </div>
                    <div className="min-w-0 mt-0.5">
                        <h4 className="truncate text-[13px] font-semibold tracking-tight text-foreground sm:text-sm">
                            {label}
                        </h4>
                    </div>
                </div>

                {/* bottom row: value */}
                <div>
                    {loading ? (
                        <div className={`h-6 w-20 rounded-full animate-pulse ${accent ? 'bg-amber-500/30' : 'bg-black/[0.06] dark:bg-white/10'}`} />
                    ) : (
                        <div className="flex items-baseline gap-1">
                            <span className="text-2xl sm:text-3xl font-black tabular-nums text-foreground tracking-tight">
                                {value}
                            </span>
                            {subvalue && (
                                <span className="text-xs font-semibold text-muted-foreground tabular-nums">
                                    {subvalue}
                                </span>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
});
StatCard.displayName = 'StatCard';

/* ─────────────────────────────────────────────
   Error Banner
───────────────────────────────────────────── */
const ErrorBanner = React.memo(({ message, onRetry }) => (
    <div
        role="alert"
        className="mb-6 flex items-center justify-between gap-4 px-5 py-4
                   bg-rose-50 dark:bg-rose-500/10
                   border border-rose-200 dark:border-rose-500/25
                   rounded-2xl shadow-sm"
    >
        <div className="flex items-start gap-3">
            <AlertCircle
                size={18}
                strokeWidth={2}
                className="shrink-0 mt-0.5 text-rose-500 dark:text-rose-400"
            />
            <div>
                <p className="text-sm font-bold text-rose-700 dark:text-rose-400 leading-tight">
                    Failed to load members
                </p>
                <p className="text-xs font-medium text-rose-500 dark:text-rose-500 mt-0.5">
                    {message || 'Please check your network connection and try again.'}
                </p>
            </div>
        </div>
        <button
            onClick={onRetry}
            aria-label="retry loading members"
            className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold
                       bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400
                       hover:bg-rose-200 dark:hover:bg-rose-500/30
                       active:scale-95 transition-all duration-150"
        >
            <RefreshCw size={14} strokeWidth={2.5} />
            Retry
        </button>
    </div>
));
ErrorBanner.displayName = 'ErrorBanner';

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

    /* Stat count — now simply safeUsers.length since it's already filtered */
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

    const handleRetry = useCallback(() => {
        dispatch(fetchUsers({ 
            page: 1, 
            limit: 100, 
            isActive: true, 
            userStatus: 'approved' 
        }));
        dispatch(fetchBillingMonthStats());
    }, [dispatch]);

    const formattedMarketExp = useMemo(() => `₹\u202F${(billingStats.grandTotalMarket ?? 0).toLocaleString('en-IN')}`, [billingStats.grandTotalMarket]);
    const formattedTotalMeals = useMemo(() => (billingStats.grandTotalMeal ?? 0).toLocaleString('en-IN'), [billingStats.grandTotalMeal]);
    const formattedMealRate = useMemo(() => `₹\u202F${(billingStats.mealCharge ?? 0).toFixed(2)}`, [billingStats.mealCharge]);

    return (
        <MainLayout>
            <div className="relative flex flex-col min-h-[calc(100vh-4rem)] w-full bg-slate-50 dark:bg-[#020617] py-6 lg:py-8 overflow-x-hidden">

                {/* ── Ambient background blobs ── */}
                <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
                    <div className="absolute -top-32 -right-32 w-[480px] h-[480px] rounded-full bg-blue-500/[0.06] dark:bg-blue-500/[0.04] blur-3xl" />
                    <div className="absolute top-1/2 -left-24 w-[320px] h-[320px] rounded-full bg-indigo-500/[0.05] dark:bg-indigo-500/[0.03] blur-3xl" />
                </div>

                {/* ════════════════════════════════
                    Header
                ════════════════════════════════ */}
                <header className="relative z-10 mb-8 px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">

                        {/* ── Title block ── */}
                        <div className="flex items-start gap-4">
                            <div className="shrink-0 p-3 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/25 dark:shadow-blue-700/25">
                                <FileText size={24} strokeWidth={1.75} className="text-white" />
                            </div>

                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <h1 className="text-2xl lg:text-3xl font-black tracking-tight text-slate-900 dark:text-white leading-none">
                                        Directory &amp; Invoices
                                    </h1>
                                    <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5
                                                       rounded-md text-[10px] font-bold uppercase tracking-widest
                                                       bg-blue-50 dark:bg-blue-500/15
                                                       text-blue-600 dark:text-blue-400
                                                       border border-blue-200 dark:border-blue-500/30">
                                        <ArrowUpRight size={10} strokeWidth={2.5} />
                                        Live
                                    </span>
                                </div>
                                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 max-w-md leading-relaxed">
                                    Review financial statuses, &
                                    expand rows for a comprehensive invoice breakdown.
                                </p>

                                {/* ── Billing month badge ── */}
                                {billingStats.billingMonth && (
                                    <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5
                                                    rounded-xl bg-indigo-50 dark:bg-indigo-500/10
                                                    border border-indigo-200 dark:border-indigo-500/25">
                                        <CalendarDays size={12} className="text-indigo-500 dark:text-indigo-400" />
                                        <span className="text-[11.5px] font-bold text-indigo-600 dark:text-indigo-400">
                                            Billing Period: {billingStats.billingMonth}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* ── Stat cards strip ── */}
                        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4 w-full lg:w-auto mt-4 lg:mt-0 flex-shrink-0">
                            <StatCard
                                icon={Users}
                                label="Active Members"
                                value={activeCount}
                                subvalue="Approved"
                                delay={0}
                            />
                            <StatCard
                                icon={LuReceiptIndianRupee}
                                label="Market Exp."
                                value={formattedMarketExp}
                                loading={billingStatsLoading}
                                delay={0.1}
                            />
                            <StatCard
                                icon={IoFastFoodOutline}
                                label="Total Meals"
                                value={formattedTotalMeals}
                                loading={billingStatsLoading}
                                delay={0.2}
                            />
                            <StatCard
                                icon={TrendingUp}
                                label="Meal Rate"
                                value={formattedMealRate}
                                loading={billingStatsLoading}
                                accent
                                delay={0.3}
                            />
                        </div>
                    </div>

                    {/* ── Subtle divider ── */}
                    <div className="mt-6 h-px bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-800 to-transparent" />
                </header>

                {/* ════════════════════════════════
                    Error banner
                ════════════════════════════════ */}
                {isError && (
                    <div className="relative z-10 px-4 sm:px-6 lg:px-8">
                        <ErrorBanner message={message} onRetry={handleRetry} />
                    </div>
                )}

                {/* ════════════════════════════════
                    Member table
                ════════════════════════════════ */}
                <main
                    className="relative z-10 flex-1 animate-[fadeSlideUp_0.45s_cubic-bezier(0.22,1,0.36,1)_both]"
                    style={{ '--animation-delay': '80ms' }}
                >
                    <MemberTable
                        users={safeUsers}
                        isLoading={isLoading && safeUsers.length === 0}
                    />
                </main>

                {/* ════════════════════════════════
                    Admin — Unresolved Bills Panel
                    Visible ONLY to admins.
                    Shows previous months' finalized invoices
                    that are still unpaid or partially paid.
                ════════════════════════════════ */}
                {isAdmin && (
                    <div className="relative z-10 px-4 sm:px-6 lg:px-8">
                        <AdminUnpaidPanel />
                    </div>
                )}
            </div>

            {/* ── Global keyframe ── */}
            <style>{`
                @keyframes fadeSlideUp {
                    from { opacity: 0; transform: translateY(12px); }
                    to   { opacity: 1; transform: translateY(0);  }
                }
                .scrollbar-none::-webkit-scrollbar { display: none; }
                .scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </MainLayout>
    );
});
MemberPage.displayName = 'MemberPage';

export default MemberPage;
