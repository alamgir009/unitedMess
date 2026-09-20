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
} from 'lucide-react';
import { HiOutlineMoon } from 'react-icons/hi2';

/* ─────────────────────────────────────────────────────────────
   IST-aware greeting  (UTC + 5:30)
   Returns Tailwind classes — no raw dynamic inline strings.
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
        iconColor: 'text-amber-500 dark:text-amber-400',
        gradient: 'from-amber-500/[0.06] via-transparent to-transparent',
    };

    if (h >= 12 && h < 17) return {
        label: 'Good Afternoon',
        sub: 'Keep tracking — every rupee counts.',
        Icon: Sun,
        iconColor: 'text-orange-500 dark:text-orange-400',
        gradient: 'from-orange-500/[0.06] via-transparent to-transparent',
    };

    if (h >= 17 && h < 21) return {
        label: 'Good Evening',
        sub: "Wind down — review today's activity.",
        Icon: Sunset,
        iconColor: 'text-purple-500 dark:text-purple-400',
        gradient: 'from-purple-500/[0.06] via-transparent to-transparent',
    };

    return {
        label: 'Good Night',
        sub: 'Rest well — accounts are secure.',
        Icon: HiOutlineMoon,
        iconColor: 'text-blue-400 dark:text-blue-300',
        gradient: 'from-blue-500/[0.06] via-transparent to-transparent',
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
        <div className="space-y-3 sm:space-y-4">

            {/* ── Compact Greeting Bar ── */}
            <div
                className={cn(
                    "relative overflow-hidden rounded-lg px-4 py-3.5 sm:px-5 sm:py-4 bg-card border border-border/40 shadow-sm animate-hero-card"
                )}
            >
                {/* Subtle single-stop gradient */}
                <div
                    className={cn(
                        "pointer-events-none absolute inset-0 rounded-lg bg-gradient-to-br",
                        g.gradient
                    )}
                />

                <div className="relative z-10 flex items-center gap-3">
                    {/* Time-of-day icon */}
                    <div className={cn("shrink-0", g.iconColor)}>
                        <GreetIcon size={20} strokeWidth={2} />
                    </div>

                    <div className="min-w-0 flex-1">
                        <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground leading-tight truncate">
                            {g.label}, {user?.name ?? 'Member'}
                        </h2>
                        <p className="text-[11px] sm:text-caption text-muted-foreground leading-snug truncate">
                            {g.sub}
                        </p>
                    </div>
                </div>
            </div>

            {/* ── Payables Section ── */}
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

            {/* ── Recent Activity Section ── */}
            <RecentActivityWidget
                activities={recentActivities}
                isLoading={isActivitiesLoading}
            />
        </div>
    );
});

export default UserDashboard;
