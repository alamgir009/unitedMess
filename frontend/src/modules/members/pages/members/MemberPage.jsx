import React, { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import MainLayout from '@/shared/components/layout/MainLayout/MainLayout';
import MemberTable from '../../components/MemberTable';
import AdminUnpaidPanel from '../../components/AdminUnpaidPanel';
import { fetchUsers, fetchBillingMonthStats } from '../../store/members.slice';
import {
    FileText, RefreshCw, Users, TrendingUp,
    Utensils, Receipt, AlertCircle, ArrowUpRight, CalendarDays
} from 'lucide-react';

/* ─────────────────────────────────────────────
   Stat Card
───────────────────────────────────────────── */
const StatCard = ({ icon: Icon, label, value, subvalue, accent = false, loading = false }) => (
    <div
        className={[
            'relative flex flex-col justify-between min-w-[148px] px-4 py-3.5 rounded-2xl border',
            'transition-all duration-200 hover:-translate-y-0.5',
            accent
                ? 'bg-gradient-to-br from-amber-500 to-orange-500 dark:from-amber-600 dark:to-orange-600 border-amber-400/60 dark:border-amber-500/40 shadow-md shadow-amber-500/25 dark:shadow-amber-700/25'
                : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700',
        ].join(' ')}
    >
        {/* Label */}
        <span className={[
            'inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.08em] mb-2',
            accent ? 'text-amber-100' : 'text-slate-400 dark:text-slate-500',
        ].join(' ')}>
            <Icon size={11} strokeWidth={2.5} />
            {label}
        </span>

        {/* Value */}
        <div className="flex items-baseline gap-1.5 leading-none">
            {loading ? (
                <span className={[
                    'h-5 w-20 rounded-full animate-pulse',
                    accent ? 'bg-amber-400/40' : 'bg-slate-100 dark:bg-slate-800',
                ].join(' ')} />
            ) : (
                <>
                    <span className={[
                        'text-xl font-black tabular-nums',
                        accent ? 'text-white' : 'text-slate-900 dark:text-white',
                    ].join(' ')}>
                        {value}
                    </span>
                    {subvalue && (
                        <span className={[
                            'text-xs font-semibold',
                            accent ? 'text-amber-200' : 'text-slate-400 dark:text-slate-500',
                        ].join(' ')}>
                            {subvalue}
                        </span>
                    )}
                </>
            )}
        </div>

        {/* Decorative corner dot */}
        {accent && (
            <span className="absolute top-3 right-3 w-1.5 h-1.5 rounded-full bg-amber-300/60" />
        )}
    </div>
);

/* ─────────────────────────────────────────────
   Error Banner
───────────────────────────────────────────── */
const ErrorBanner = ({ message, onRetry }) => (
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
            aria-label="Retry loading members"
            className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold
                       bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400
                       hover:bg-rose-200 dark:hover:bg-rose-500/30
                       active:scale-95 transition-all duration-150"
        >
            <RefreshCw size={14} strokeWidth={2.5} />
            Retry
        </button>
    </div>
);

/* ─────────────────────────────────────────────
   MemberPage — Main
───────────────────────────────────────────── */
const MemberPage = () => {
    const dispatch = useDispatch();
    const { users, isLoading, isError, message, billingStats, billingStatsLoading } = useSelector((state) => state.members);
    const { user: currentUser } = useSelector((state) => state.auth);
    const isAdmin = currentUser?.role === 'admin';

    /* Safe array resolution */
    const safeUsers = useMemo(() => {
        if (Array.isArray(users)) return users;
        for (const key of ['users', 'docs', 'data', 'results', 'items']) {
            if (users?.[key] && Array.isArray(users[key])) return users[key];
        }
        return [];
    }, [users]);

    /* Active member count from user list (still fine to use for headcount) */
    const activeCount = useMemo(() =>
        safeUsers.filter(u => u.isActive).length,
        [safeUsers]);

    useEffect(() => {
        dispatch(fetchUsers({ page: 1, limit: 100 }));
        dispatch(fetchBillingMonthStats());
    }, [dispatch]);

    const handleRetry = () => {
        dispatch(fetchUsers({ page: 1, limit: 100 }));
        dispatch(fetchBillingMonthStats());
    };

    return (
        <MainLayout>
            <div className="relative flex flex-col min-h-[calc(100vh-4rem)] w-full bg-slate-50 dark:bg-[#020617] px-4 sm:px-6 lg:px-8 py-6 lg:py-8 overflow-x-hidden">

                {/* ── Ambient background blobs ── */}
                <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
                    <div className="absolute -top-32 -right-32 w-[480px] h-[480px] rounded-full bg-blue-500/[0.06] dark:bg-blue-500/[0.04] blur-3xl" />
                    <div className="absolute top-1/2 -left-24 w-[320px] h-[320px] rounded-full bg-indigo-500/[0.05] dark:bg-indigo-500/[0.03] blur-3xl" />
                </div>

                {/* ════════════════════════════════
                    Header
                ════════════════════════════════ */}
                <header className="relative z-10 mb-8">
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
                                    Manage registered members, review financial statuses, and
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

                        {/* ── Stat cards strip ──
                            Stats now come from the billing-month API endpoint,
                            which aggregates Meal and Market records for the active
                            billing period only (respects the 10th-day cutoff rule).
                        ── */}
                        <div className="flex items-center gap-2.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none flex-shrink-0">
                            <StatCard
                                icon={Users}
                                label="Active Members"
                                value={activeCount}
                                subvalue={`/ ${safeUsers.length}`}
                            />
                            <StatCard
                                icon={Receipt}
                                label="Market Exp."
                                value={`₹\u202F${(billingStats.grandTotalMarket ?? 0).toLocaleString('en-IN')}`}
                                loading={billingStatsLoading}
                            />
                            <StatCard
                                icon={Utensils}
                                label="Total Meals"
                                value={(billingStats.grandTotalMeal ?? 0).toLocaleString('en-IN')}
                                loading={billingStatsLoading}
                            />
                            <StatCard
                                icon={TrendingUp}
                                label="Meal Rate"
                                value={`₹\u202F${(billingStats.mealCharge ?? 0).toFixed(2)}`}
                                loading={billingStatsLoading}
                                accent
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
                    <div className="relative z-10">
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
                    <div className="relative z-10">
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
};

export default MemberPage;