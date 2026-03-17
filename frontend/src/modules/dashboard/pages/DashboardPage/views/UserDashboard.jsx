import React, { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchUserDashboardStats, fetchUserRecentActivity } from '../../../store/dashboard.slice';
import PayableWidget from '../../../components/PayableWidget/PayableWidget';
import RecentActivityWidget from '../../../components/RecentActivityWidget/RecentActivityWidget';
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
        iconColor: '#D97706',
        pillBg: 'rgba(251,191,36,0.12)',
        pillBorder: '1px solid rgba(251,191,36,0.32)',
        pillColor: '#B45309',
        gradOverlay: 'linear-gradient(135deg, rgba(251,191,36,0.13) 0%, transparent 60%)',
        cardBorder: '1px solid rgba(251,191,36,0.26)',
    };

    if (h >= 12 && h < 17) return {
        label: 'Good Afternoon',
        sub: 'Keep tracking — every rupee counts.',
        Icon: Sun,
        iconColor: '#EA580C',
        pillBg: 'rgba(249,115,22,0.12)',
        pillBorder: '1px solid rgba(249,115,22,0.32)',
        pillColor: '#C2410C',
        gradOverlay: 'linear-gradient(135deg, rgba(249,115,22,0.13) 0%, transparent 60%)',
        cardBorder: '1px solid rgba(249,115,22,0.26)',
    };

    if (h >= 17 && h < 21) return {
        label: 'Good Evening',
        sub: "Wind down — review today's activity.",
        Icon: Sunset,
        iconColor: '#7C3AED',
        pillBg: 'rgba(167,139,250,0.12)',
        pillBorder: '1px solid rgba(167,139,250,0.32)',
        pillColor: '#6D28D9',
        gradOverlay: 'linear-gradient(135deg, rgba(167,139,250,0.13) 0%, transparent 60%)',
        cardBorder: '1px solid rgba(167,139,250,0.26)',
    };

    return {
        label: 'Good Night',
        sub: 'Rest well — accounts are secure.',
        Icon: Moon,
        iconColor: '#2563EB',
        pillBg: 'rgba(96,165,250,0.12)',
        pillBorder: '1px solid rgba(96,165,250,0.32)',
        pillColor: '#1D4ED8',
        gradOverlay: 'linear-gradient(135deg, rgba(96,165,250,0.13) 0%, transparent 60%)',
        cardBorder: '1px solid rgba(96,165,250,0.26)',
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
    } = useSelector((state) => state.dashboard);

    const { user } = useSelector((state) => state.auth);

    useEffect(() => {
        dispatch(fetchUserDashboardStats());
        dispatch(fetchUserRecentActivity());
    }, [dispatch]);

    return (
        <div className="relative space-y-6">

            {/* ── Greeting Header Card ── */}
            <div
                className="relative overflow-hidden rounded-2xl p-5 sm:p-7 backdrop-blur-xl bg-white/55 dark:bg-white/5 shadow-sm"
                style={{ border: g.cardBorder }}
            >
                {/* inner tint overlay */}
                <div
                    className="pointer-events-none absolute inset-0 rounded-2xl"
                    style={{ background: g.gradOverlay }}
                />

                <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">

                    {/* Left */}
                    <div className="min-w-0">

                        {/* Greeting pill */}
                        <div
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-widest mb-3"
                            style={{ background: g.pillBg, border: g.pillBorder, color: g.pillColor }}
                        >
                            <GreetIcon size={14} color={g.iconColor} strokeWidth={2.2} />
                            {g.label}
                        </div>

                        {/* Name */}
                        <h2 className="flex items-center gap-2 flex-wrap text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white leading-tight">
                            {user?.name ?? 'Member'}
                            <Sparkles size={20} color={g.iconColor} strokeWidth={1.8} />
                        </h2>

                        {/* Sub */}
                        <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
                            {g.sub}
                        </p>
                    </div>

                    {/* Right: badges */}
                    <div className="flex items-center gap-2 shrink-0 flex-wrap">

                        {/* Role */}
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10.5px] font-bold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/25 text-indigo-700 dark:text-indigo-300">
                            <BadgeCheck size={13} strokeWidth={2.2} />
                            <span className="capitalize">{user?.role ?? 'user'}</span>
                        </div>

                        {/* Active / Inactive */}
                        <div
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10.5px] font-bold uppercase tracking-wider border ${
                                user?.isActive
                                    ? 'bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/25 text-green-700 dark:text-green-400'
                                    : 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/25 text-red-700 dark:text-red-400'
                            }`}
                        >
                            <span className={`w-1.5 h-1.5 rounded-full ${user?.isActive ? 'bg-green-500' : 'bg-red-500'}`} />
                            {user?.isActive
                                ? <ShieldCheck size={13} strokeWidth={2.2} />
                                : <ShieldOff   size={13} strokeWidth={2.2} />
                            }
                            {user?.isActive ? 'Active' : 'Inactive'}
                        </div>

                        {/* Portal tag */}
                        <div
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10.5px] font-bold uppercase tracking-wider"
                            style={{ background: g.pillBg, border: g.pillBorder, color: g.pillColor }}
                        >
                            <Building2 size={13} color={g.iconColor} strokeWidth={2.2} />
                            Mess Portal
                        </div>

                    </div>
                </div>
            </div>

            {/* ── Widget Grid ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">

                <PayableWidget
                    mealPayable={userMealPayable?.payableAmount}
                    gasBillPayable={userGasBillPayable?.payableAmount}
                    isLoading={isLoading}
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