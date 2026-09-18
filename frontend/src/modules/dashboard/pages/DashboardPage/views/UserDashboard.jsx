import { memo, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchUserDashboardStats, fetchUserRecentActivity } from '../../../store/dashboard.slice';
import PayableWidget from '../../../components/PayableWidget/PayableWidget';
import RecentActivityWidget from '../../../components/RecentActivityWidget/RecentActivityWidget';
import { cn } from '@/core/utils/helpers/string.helper';
import {
    Sunrise,
    Sun,
    Sunset,
    Sparkles,
} from 'lucide-react';
import { HiOutlineMoon } from 'react-icons/hi2';

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
        Icon: HiOutlineMoon,
        iconColorClass: 'text-blue-400 dark:text-blue-400',
        pillClass: 'bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-400',
        cardBorderClass: 'border-blue-500/20 dark:border-blue-500/30',
        bgGradient: 'bg-gradient-to-br from-blue-500/[0.03] to-transparent',
    };
};

/* ─────────────────────────────────────────────────────────────
   Component
   ───────────────────────────────────────────────────────────── */
const UserDashboard = memo(function UserDashboard() {
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
        isMealPayableError,
        isGasBillPayableError,
        lastFetchedAt,
    } = useSelector((state) => state.dashboard);

    const { user } = useSelector((state) => state.auth);

    useEffect(() => {
        const isFresh = userStatsLoaded && lastFetchedAt && (Date.now() - lastFetchedAt < 60000);
        if (!isFresh) {
            dispatch(fetchUserDashboardStats());
            dispatch(fetchUserRecentActivity());
        }
    }, [dispatch, userStatsLoaded, lastFetchedAt]);

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
        <div className="space-y-5 sm:space-y-6">

            {/* ── Greeting Header Card ── */}
            <div
                className={cn(
                    "relative overflow-hidden rounded-2xl p-4 sm:p-6 bg-card border shadow-sm hover:shadow-md transition-[box-shadow] duration-200 ease-out",
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

                <div className="relative">

                    {/* Dynamic Greeting */}
                    <div className="min-w-0 flex-1">
                        {/* Greeting pill */}
                        <div
                            className={cn(
                                "inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full text-[11px] sm:text-xs font-semibold uppercase tracking-wider mb-3 sm:mb-4 border",
                                g.pillClass
                            )}
                        >
                            <GreetIcon className={cn("w-3 h-3 sm:w-3.5 sm:h-3.5", g.iconColorClass)} strokeWidth={2.5} />
                            {g.label}
                        </div>

                        {/* User Name */}
                        <h2 className="flex items-center gap-2 flex-wrap text-xl sm:text-2xl font-bold tracking-tight text-foreground leading-tight">
                            <span>Welcome, {user?.name ?? 'Member'}</span>
                            <Sparkles className={cn("w-4 h-4 sm:w-5 sm:h-5", g.iconColorClass)} strokeWidth={2} />
                        </h2>

                        {/* Greeting Subtext */}
                        <p className="mt-1.5 sm:mt-2 text-sm sm:text-body text-muted-foreground leading-relaxed">
                            {g.sub}
                        </p>
                    </div>

                </div>
            </div>

            {/* ── Widget Grid ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 lg:gap-6">
                <PayableWidget
                    mealPayable={userMealPayable?.payableAmount}
                    gasBillPayable={userGasBillPayable?.payableAmount}
                    mealPaymentStatus={userMealPayable?.paymentStatus ?? null}
                    gasBillStatus={userGasBillPayable?.status ?? null}
                    isLoading={isLoading}
                    isLoaded={userStatsLoaded}
                    isMealError={isMealPayableError}
                    isGasError={isGasBillPayableError}
                />

                <RecentActivityWidget
                    activities={recentActivities}
                    isLoading={isActivitiesLoading}
                />
            </div>
        </div>
    );
});

export default UserDashboard;