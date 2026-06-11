import { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchUserDashboardStats, fetchUserRecentActivity } from '../../../store/dashboard.slice';
import PayableWidget from '../../../components/PayableWidget/PayableWidget';
import RecentActivityWidget from '../../../components/RecentActivityWidget/RecentActivityWidget';
import { cn } from '@/core/utils/helpers/string.helper';
import {
    Sunrise,
    Sun,
    Sunset,
    Moon,
    ShieldCheck,
    Sparkles,
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────
   IST-aware greeting  (UTC + 5:30)
   Returns Tailwind classes for hardware-friendly rendering.
   No raw dynamic inline strings.
   ───────────────────────────────────────────────────────────── */
const getISTGreeting = () => {
    const nowIST = new Date(
        new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })
    );
    const h = nowIST.getHours();

    if (h >= 5 && h < 12) return {
        label: 'Good Morning',
        sub: 'Rise & shine — your finances await.',
        Icon: Sunrise,
        iconColorClass: 'text-amber-500 dark:text-amber-400',
        pillClass: 'bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400',
        cardBorderClass: 'border-amber-500/20 dark:border-amber-500/30',
        bgGradient: 'bg-gradient-to-br from-amber-500/[0.03] to-transparent',
    };

    if (h >= 12 && h < 17) return {
        label: 'Good Afternoon',
        sub: 'Keep tracking — every rupee counts.',
        Icon: Sun,
        iconColorClass: 'text-orange-500 dark:text-orange-400',
        pillClass: 'bg-orange-500/10 border-orange-500/20 text-orange-700 dark:text-orange-400',
        cardBorderClass: 'border-orange-500/20 dark:border-orange-500/30',
        bgGradient: 'bg-gradient-to-br from-orange-500/[0.03] to-transparent',
    };

    if (h >= 17 && h < 21) return {
        label: 'Good Evening',
        sub: "Wind down — review today's activity.",
        Icon: Sunset,
        iconColorClass: 'text-purple-500 dark:text-purple-400',
        pillClass: 'bg-purple-500/10 border-purple-500/20 text-purple-700 dark:text-purple-400',
        cardBorderClass: 'border-purple-500/20 dark:border-purple-500/30',
        bgGradient: 'bg-gradient-to-br from-purple-500/[0.03] to-transparent',
    };

    return {
        label: 'Good Night',
        sub: 'Rest well — accounts are secure.',
        Icon: Moon,
        iconColorClass: 'text-blue-500 dark:text-blue-400',
        pillClass: 'bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-400',
        cardBorderClass: 'border-blue-500/20 dark:border-blue-500/30',
        bgGradient: 'bg-gradient-to-br from-blue-500/[0.03] to-transparent',
    };
};

/* ─────────────────────────────────────────────────────────────
   Component
   ───────────────────────────────────────────────────────────── */
const UserDashboard = () => {
    const dispatch = useDispatch();
    const g = useMemo(() => getISTGreeting(), []);
    const GreetIcon = g.Icon;

    const {
        userMealPayable,
        userGasBillPayable,
        recentActivities,
        isLoading,
        isActivitiesLoading,
        userStatsLoaded,
        isUserStatsError,
    } = useSelector((state) => state.dashboard);

    const { user } = useSelector((state) => state.auth);

    useEffect(() => {
        dispatch(fetchUserDashboardStats());
        dispatch(fetchUserRecentActivity());
    }, [dispatch]);

    /* ── visibility / focus — re-fetch when user returns to this tab ── */
    useEffect(() => {
        const onVisible = () => {
            if (document.visibilityState === 'visible') {
                dispatch(fetchUserDashboardStats());
                dispatch(fetchUserRecentActivity());
            }
        };
        document.addEventListener('visibilitychange', onVisible);
        window.addEventListener('focus', onVisible);
        return () => {
            document.removeEventListener('visibilitychange', onVisible);
            window.removeEventListener('focus', onVisible);
        };
    }, [dispatch]);

    return (
        <div className="space-y-6">

            {/* ── Greeting Header Card ── */}
            <div
                className={cn(
                    "relative overflow-hidden rounded-2xl p-6 sm:p-8 bg-card border shadow-sm transition-all duration-200",
                    g.cardBorderClass
                )}
            >
                {/* inner tint overlay */}
                <div
                    className={cn(
                        "pointer-events-none absolute inset-0 rounded-2xl",
                        g.bgGradient
                    )}
                />

                <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
                    
                    {/* Left Side: Dynamic Greeting */}
                    <div className="min-w-0 flex-1">
                        {/* Greeting pill */}
                        <div
                            className={cn(
                                "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-4 border",
                                g.pillClass
                            )}
                        >
                            <GreetIcon className={cn("w-3.5 h-3.5", g.iconColorClass)} strokeWidth={2.5} />
                            {g.label}
                        </div>

                        {/* User Name */}
                        <h2 className="flex items-center gap-2.5 flex-wrap text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground leading-tight">
                            <span>Welcome, {user?.name ?? 'Member'}</span>
                            <Sparkles className={cn("w-5 h-5 animate-pulse", g.iconColorClass)} strokeWidth={2} />
                        </h2>

                        {/* Greeting Subtext */}
                        <p className="mt-2 text-sm sm:text-base text-muted-foreground font-medium leading-relaxed">
                            {g.sub}
                        </p>
                    </div>

                    {/* Right Side: Account Summary Badge */}
                    <div className="flex flex-wrap items-center justify-between md:justify-start gap-4 shrink-0 pt-4 border-t border-border/10 md:border-t-0 md:pt-0">
                        <div className="flex flex-col text-left md:text-right min-w-0 flex-1 md:flex-initial">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Account Status</span>
                            <span className="text-xs text-foreground font-semibold mt-0.5 truncate max-w-[180px] sm:max-w-none" title={user?.email}>
                                {user?.email}
                            </span>
                        </div>
                        <div className="h-8 w-px bg-border/60 hidden md:block" />
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 rounded-xl text-[11px] font-bold uppercase tracking-wider shadow-sm select-none shrink-0">
                            <ShieldCheck size={14} strokeWidth={2.5} />
                            <span>Active</span>
                        </div>
                    </div>

                </div>
            </div>

            {/* ── Widget Grid ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
                <PayableWidget
                    mealPayable={userMealPayable?.payableAmount}
                    gasBillPayable={userGasBillPayable?.payableAmount}
                    mealPaymentStatus={userMealPayable?.paymentStatus ?? null}
                    gasBillStatus={userGasBillPayable?.status ?? null}
                    isLoading={isLoading}
                    isLoaded={userStatsLoaded}
                    isError={isUserStatsError}
                />

                <RecentActivityWidget
                    activities={recentActivities}
                    isLoading={isActivitiesLoading}
                />
            </div>
        </div>
    );
};

export default UserDashboard;