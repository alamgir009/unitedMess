import React, { useEffect, useMemo } from 'react';
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
    ShieldOff,
    BadgeCheck,
    Sparkles,
    Building2,
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────
   IST-aware greeting  (UTC + 5:30)
   Returns Tailwind classes for hardware-friendly rendering.
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
        iconColorClass: 'text-amber-600 dark:text-amber-400',
        pillClass: 'bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400',
        cardBorderClass: 'border-amber-500/20 dark:border-amber-500/30',
        bgGradient: 'bg-gradient-to-br from-amber-500/[0.04] to-transparent',
    };

    if (h >= 12 && h < 17) return {
        label: 'Good Afternoon',
        sub: 'Keep tracking — every rupee counts.',
        Icon: Sun,
        iconColorClass: 'text-orange-600 dark:text-orange-400',
        pillClass: 'bg-orange-500/10 border-orange-500/20 text-orange-700 dark:text-orange-400',
        cardBorderClass: 'border-orange-500/20 dark:border-orange-500/30',
        bgGradient: 'bg-gradient-to-br from-orange-500/[0.04] to-transparent',
    };

    if (h >= 17 && h < 21) return {
        label: 'Good Evening',
        sub: "Wind down — review today's activity.",
        Icon: Sunset,
        iconColorClass: 'text-purple-600 dark:text-purple-400',
        pillClass: 'bg-purple-500/10 border-purple-500/20 text-purple-700 dark:text-purple-400',
        cardBorderClass: 'border-purple-500/20 dark:border-purple-500/30',
        bgGradient: 'bg-gradient-to-br from-purple-500/[0.04] to-transparent',
    };

    return {
        label: 'Good Night',
        sub: 'Rest well — accounts are secure.',
        Icon: Moon,
        iconColorClass: 'text-blue-600 dark:text-blue-400',
        pillClass: 'bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-400',
        cardBorderClass: 'border-blue-500/20 dark:border-blue-500/30',
        bgGradient: 'bg-gradient-to-br from-blue-500/[0.04] to-transparent',
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
        // Per-section flags added to dashboard.slice
        userStatsLoaded,
        isUserStatsError,
    } = useSelector((state) => state.dashboard);

    const { user } = useSelector((state) => state.auth);

    useEffect(() => {
        dispatch(fetchUserDashboardStats());
        dispatch(fetchUserRecentActivity());
    }, [dispatch]);

    return (
        <div className="relative space-y-6 animate-fade-in-up">

            {/* ── Greeting Header Card ── */}
            <div
                className={cn(
                    "relative overflow-hidden rounded-2xl p-5 sm:p-7 bg-card border shadow-sm",
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

                <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">

                    {/* Left */}
                    <div className="min-w-0">

                        {/* Greeting pill */}
                        <div
                            className={cn(
                                "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mb-3 border",
                                g.pillClass
                            )}
                        >
                            <GreetIcon className={cn("w-3.5 h-3.5", g.iconColorClass)} strokeWidth={2.5} />
                            {g.label}
                        </div>

                        {/* Name */}
                        <h2 className="flex items-center gap-2 flex-wrap text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground leading-tight">
                            {user?.name ?? 'Member'}
                            <Sparkles className={cn("w-5 h-5", g.iconColorClass)} strokeWidth={2} />
                        </h2>

                        {/* Sub */}
                        <p className="mt-1.5 text-sm text-muted-foreground">
                            {g.sub}
                        </p>
                    </div>

                </div>
            </div>

            {/* ── Widget Grid ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">

                <PayableWidget
                    mealPayable={userMealPayable?.payableAmount}
                    gasBillPayable={userGasBillPayable?.payableAmount}
                    // Pass authoritative backend status fields
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