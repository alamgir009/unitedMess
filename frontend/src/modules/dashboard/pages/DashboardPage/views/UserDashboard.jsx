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
   Weather-app style: bold gradient per time of day.
   Light mode → light pastel gradient + dark text (AAA ≥7:1)
   Dark mode  → deep rich gradient  + light text (AAA ≥7:1)
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
        gradient: 'linear-gradient(145deg, hsl(38 92% 88%) 0%, hsl(32 85% 80%) 50%, hsl(28 78% 74%) 100%)',
        gradientDark: 'linear-gradient(145deg, hsl(35 75% 24%) 0%, hsl(30 68% 17%) 50%, hsl(25 60% 11%) 100%)',
        iconChip: 'bg-white/30 dark:bg-white/[0.12]',
        iconText: 'text-amber-700 dark:text-amber-300',
        subTextColor: 'text-slate-900 dark:text-slate-300',
    };

    if (h >= 12 && h < 17) return {
        label: 'Good Afternoon',
        sub: 'Keep tracking — every rupee counts.',
        Icon: Sun,
        gradient: 'linear-gradient(145deg, hsl(200 85% 88%) 0%, hsl(205 80% 80%) 50%, hsl(210 75% 74%) 100%)',
        gradientDark: 'linear-gradient(145deg, hsl(215 65% 24%) 0%, hsl(220 58% 17%) 50%, hsl(225 52% 11%) 100%)',
        iconChip: 'bg-white/30 dark:bg-white/[0.12]',
        iconText: 'text-sky-700 dark:text-sky-300',
        subTextColor: 'text-slate-900 dark:text-slate-300',
    };

    if (h >= 17 && h < 21) return {
        label: 'Good Evening',
        sub: "Wind down — review today's activity.",
        Icon: Sunset,
        gradient: 'linear-gradient(145deg, hsl(280 55% 85%) 0%, hsl(310 48% 78%) 50%, hsl(340 42% 73%) 100%)',
        gradientDark: 'linear-gradient(145deg, hsl(285 55% 24%) 0%, hsl(315 50% 17%) 50%, hsl(345 45% 11%) 100%)',
        iconChip: 'bg-white/30 dark:bg-white/[0.12]',
        iconText: 'text-violet-700 dark:text-violet-300',
        subTextColor: 'text-slate-900 dark:text-slate-300',
    };

    return {
        label: 'Good Night',
        sub: 'Rest well — accounts are secure.',
        Icon: HiOutlineMoon,
        gradient: 'linear-gradient(145deg, hsl(230 50% 82%) 0%, hsl(240 45% 75%) 50%, hsl(250 40% 69%) 100%)',
        gradientDark: 'linear-gradient(145deg, hsl(240 60% 24%) 0%, hsl(250 55% 17%) 50%, hsl(260 48% 11%) 100%)',
        iconChip: 'bg-white/30 dark:bg-white/[0.12]',
        iconText: 'text-indigo-700 dark:text-indigo-300',
        subTextColor: 'text-slate-900 dark:text-slate-300',
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

            {/* ── Premium Greeting Card (weather-app style) ── */}
            <div
                className="greeting-card relative overflow-hidden rounded-2xl shadow-md animate-hero-card"
                style={{
                    '--greet-dark': g.gradientDark,
                    backgroundImage: g.gradient,
                }}
            >
                <div className="relative z-10 flex items-center gap-3 px-4 py-4 sm:px-6 sm:py-5">
                    {/* Icon chip — frosted glass */}
                    <div
                        className={cn(
                            "shrink-0 flex items-center justify-center",
                            "w-11 h-11 sm:w-12 sm:h-12 rounded-2xl",
                            "backdrop-blur-sm",
                            g.iconChip
                        )}
                    >
                        <GreetIcon size={22} strokeWidth={1.8} className={g.iconText} />
                    </div>

                    <div className="min-w-0 flex-1">
                        <h2 className="text-[15px] sm:text-base font-bold tracking-tight text-foreground leading-tight truncate">
                            {g.label}, {user?.name ?? 'Member'}
                        </h2>
                        <p className={cn("text-[11px] sm:text-xs leading-snug mt-0.5 truncate", g.subTextColor)}>
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
