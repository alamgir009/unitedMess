import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { fetchUserDashboardStats } from '../../../store/dashboard.slice';
import { fetchPollStatus, voteMealPoll } from '@/modules/meal/store/meal.slice';
import { fetchMarketSchedule, reset as resetMarket } from '@/modules/market/store/market.slice';
import PayableWidget from '../../../components/PayableWidget/PayableWidget';
import { Button } from '@/shared/components/ui';
import { cn } from '@/core/utils/helpers/string.helper';
import {
    HiOutlineMoon,
    HiOutlineSparkles,
    HiOutlineSun,
    HiOutlineNoSymbol,
    HiOutlineCheckCircle,
    HiOutlineClock,
    HiOutlineShoppingCart,
    HiOutlineCalendarDays,
    HiOutlineChevronDown,
    HiOutlineChevronRight,
    HiOutlineListBullet,
} from 'react-icons/hi2';
import { FiShoppingBag, FiArrowRight, FiAlertCircle } from 'react-icons/fi';
import { IoFastFoodOutline } from 'react-icons/io5';
import toast from 'react-hot-toast';
import { format, parseISO } from 'date-fns';

/* ─────────────────────────────────────────────────────────────
   Dining vote options — mirrors MealPolling's POLL_OPTIONS
   (ids come from the backend enum: day | night | both | off)
   ───────────────────────────────────────────────────────────── */
const VOTE_OPTIONS = [
    {
        id: 'both',
        label: 'Both',
        description: 'Full-day meals',
        icon: HiOutlineSparkles,
        accent: {
            border: 'border-violet-600 dark:border-violet-400',
            tint: 'bg-violet-600/10 dark:bg-violet-400/10',
            chip: 'bg-violet-500/15 dark:bg-violet-400/15',
            text: 'text-violet-600 dark:text-violet-400',
        },
    },
    {
        id: 'day',
        label: 'Day',
        description: 'Lunch only',
        icon: HiOutlineSun,
        accent: {
            border: 'border-amber-600 dark:border-amber-400',
            tint: 'bg-amber-600/10 dark:bg-amber-400/10',
            chip: 'bg-amber-500/15 dark:bg-amber-400/15',
            text: 'text-amber-600 dark:text-amber-400',
        },
    },
    {
        id: 'night',
        label: 'Night',
        description: 'Dinner only',
        icon: HiOutlineMoon,
        accent: {
            border: 'border-indigo-600 dark:border-indigo-400',
            tint: 'bg-indigo-600/10 dark:bg-indigo-400/10',
            chip: 'bg-indigo-500/15 dark:bg-indigo-400/15',
            text: 'text-indigo-600 dark:text-indigo-400',
        },
    },
    {
        id: 'off',
        label: 'Off',
        description: 'No meals today',
        icon: HiOutlineNoSymbol,
        accent: {
            border: 'border-slate-600 dark:border-slate-400',
            tint: 'bg-slate-600/10 dark:bg-slate-400/10',
            chip: 'bg-slate-500/15 dark:bg-slate-400/15',
            text: 'text-slate-600 dark:text-slate-400',
        },
    },
];

const VOTE_BASE_TOTALS = { total: 0, both: 0, day: 0, night: 0, off: 0 };

/* Quick links to existing routes only (AppRoutes.jsx / Sidebar.jsx) */
const VIEW_LINKS = [
    {
        to: '/markets',
        icon: HiOutlineShoppingCart,
        title: 'Market Schedule & Purchases',
        sub: 'Month chart, entries and history',
    },
    {
        to: '/events?view=markets',
        icon: HiOutlineCalendarDays,
        title: 'Duty Calendar',
        sub: 'Pick your market dates in Events',
    },
];

/* Guide content — only features that exist in this codebase */
const GUIDE_ITEMS = [
    {
        id: 'vote',
        title: 'Dining Vote',
        body: "Choose Both, Day, Night or Off for today on the Meals page. Your preference stands until you change it, and today's meal entry is created automatically from your vote.",
        to: '/meals',
        linkLabel: 'Open Meals',
    },
    {
        id: 'payments',
        title: 'Payments',
        body: 'Check Total Due on this dashboard and tap Pay now to settle meal and gas bills. The Payments page supports UPI payments and shows invoices, refunds and payment history.',
        to: '/payments',
        linkLabel: 'Open Payments',
    },
    {
        id: 'markets',
        title: 'Markets',
        body: 'Log your daily market purchases and track spending on the Markets page. The entries you add feed into your bill for the current period.',
        to: '/markets',
        linkLabel: 'Open Markets',
    },
    {
        id: 'schedules',
        title: 'Market Schedules',
        body: "Pick up to 3 market duty dates for the month in the Events calendar's Markets tab, and see who is on duty in the Market Schedule on the Markets page.",
        to: '/events?view=markets',
        linkLabel: 'Open Duty Calendar',
    },
    {
        id: 'notifications',
        title: 'Notifications',
        body: 'Find updates and alerts behind the bell in the header. The Notifications page lists everything and lets you manage push and email preferences.',
        to: '/notifications',
        linkLabel: 'Open Notifications',
    },
];

/* Shared card chrome — matches PayableWidget (radius, border, shadow, surface) */
const CARD_CLS = 'min-w-0 rounded-2xl bg-card border border-border/50 shadow-sm animate-fade-up p-5 lg:p-6';

/* Google/Meta-style section icon chips: soft ~15% tint + saturated icon.
   -600 (light) / -400 (dark) keeps icon-vs-chip and icon-vs-card contrast
   ≥3:1 per WCAG 1.4.11 in both themes. */
const SECTION_TONES = {
    amber: 'bg-amber-500/15 text-amber-600 dark:bg-amber-400/15 dark:text-amber-400',
    emerald: 'bg-emerald-500/15 text-emerald-600 dark:bg-emerald-400/15 dark:text-emerald-400',
    blue: 'bg-blue-500/15 text-blue-600 dark:bg-blue-400/15 dark:text-blue-400',
    violet: 'bg-violet-500/15 text-violet-600 dark:bg-violet-400/15 dark:text-violet-400',
};

const SectionHead = ({ icon: Icon, title, sub, right, id, tone = 'violet' }) => (
    <header className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
            <span
                aria-hidden="true"
                className={cn('shrink-0 flex items-center justify-center w-9 h-9 rounded-lg', SECTION_TONES[tone] ?? SECTION_TONES.violet)}
            >
                <Icon size={17} strokeWidth={1.9} />
            </span>
            <div className="min-w-0">
                <h3 id={id} className="text-sm font-semibold tracking-tight text-foreground truncate">{title}</h3>
                <p className="text-xs text-muted-foreground truncate mt-0.5">{sub}</p>
            </div>
        </div>
        {right}
    </header>
);

const ErrorPanel = ({ message, onRetry, minHeight }) => (
    <div
        className="mt-4 rounded-xl border border-destructive/20 bg-destructive/5 p-4 flex flex-col items-center justify-center text-center gap-2"
        style={{ minHeight }}
        role="alert"
    >
        <FiAlertCircle size={18} className="text-destructive" aria-hidden="true" />
        <p className="text-sm font-medium text-foreground">{message}</p>
        <Button variant="outline" size="sm" onClick={onRetry}>Retry</Button>
    </div>
);

/* ─────────────────────────────────────────────────────────────
   Component
   ───────────────────────────────────────────────────────────── */
const UserDashboard = memo(function UserDashboard() {
    const dispatch = useDispatch();

    const {
        userMealPayable,
        userGasBillPayable,
        isLoading,
        userStatsLoaded,
        isMealPayableError,
        isGasBillPayableError,
        lastFetchedAt,
    } = useSelector((state) => state.dashboard);

    const { user } = useSelector((state) => state.auth);

    /* ── Dining vote data (existing meal slice) ── */
    const pollStatus = useSelector((state) => state.meal.pollStatus);

    /* ── Market schedule data (existing market slice) ── */
    const schedule = useSelector((state) => state.market.schedule);
    const isScheduleLoading = useSelector((state) => state.market.isScheduleLoading);

    useEffect(() => {
        const isFresh = userStatsLoaded && lastFetchedAt && (Date.now() - lastFetchedAt < 60000);
        if (!isFresh) {
            dispatch(fetchUserDashboardStats());
        }
    }, [dispatch, userStatsLoaded, lastFetchedAt]);

    /* ── visibility / focus — re-fetch when user returns to this tab ── */
    useEffect(() => {
        const onVisible = () => {
            if (document.visibilityState === 'visible') {
                dispatch(fetchUserDashboardStats());
            }
        };
        document.addEventListener('visibilitychange', onVisible);
        window.addEventListener('focus', onVisible);
        return () => {
            document.removeEventListener('visibilitychange', onVisible);
            window.removeEventListener('focus', onVisible);
        };
    }, [dispatch]);

    /* ════════════════════════════════════════════════════════
       Dining Vote
       ════════════════════════════════════════════════════════ */
    const dateStr = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);
    const [isPollLoading, setIsPollLoading] = useState(true);
    const [pollError, setPollError] = useState(false);

    const loadPoll = useCallback(() => {
        setPollError(false);
        setIsPollLoading(true);
        dispatch(fetchPollStatus(dateStr))
            .unwrap()
            .catch(() => setPollError(true))
            .finally(() => setIsPollLoading(false));
    }, [dispatch, dateStr]);

    useEffect(() => {
        loadPoll();
    }, [loadPoll]);

    const votes = useMemo(() => pollStatus?.votes ?? [], [pollStatus]);
    const stats = useMemo(() => pollStatus?.stats ?? {}, [pollStatus]);

    const myVote = useMemo(() => {
        const uid = user?._id || user?.id || null;
        if (!uid) return null;
        for (let i = 0; i < votes.length; i++) {
            const voterId = votes[i].user?._id || votes[i].user?.id || null;
            if (voterId && voterId === uid) return votes[i].type;
        }
        return null;
    }, [user, votes]);

    const myIsManualOverride = useMemo(() => {
        const uid = user?._id || user?.id || null;
        if (!uid) return false;
        for (let i = 0; i < votes.length; i++) {
            const voterId = votes[i].user?._id || votes[i].user?.id || null;
            if (voterId && voterId === uid) return !!votes[i].isManualOverride;
        }
        return false;
    }, [user, votes]);

    const totals = useMemo(() => {
        const t = { ...VOTE_BASE_TOTALS };
        for (const { id } of VOTE_OPTIONS) {
            const fromStats = Number(stats?.[id]);
            const counted = votes.reduce((n, v) => n + (v.type === id ? 1 : 0), 0);
            const count = Number.isFinite(fromStats) && fromStats >= 0 ? fromStats : counted;
            t[id] = count;
            t.total += count;
        }
        return t;
    }, [stats, votes]);

    const [pendingSel, setPendingSel] = useState(null);
    const effectiveSel = pendingSel ?? myVote;
    const [isVoting, setIsVoting] = useState(false);
    const isVotingRef = useRef(false);

    /* Clear the pending choice once the server state reflects it */
    useEffect(() => {
        if (pendingSel && myVote === pendingSel) setPendingSel(null);
    }, [pendingSel, myVote]);

    const handleVote = useCallback(async () => {
        const type = pendingSel;
        if (!type || isVotingRef.current) return;
        isVotingRef.current = true;
        setIsVoting(true);
        try {
            await dispatch(voteMealPoll({ type, date: dateStr })).unwrap();
            const label = VOTE_OPTIONS.find((o) => o.id === type)?.label ?? type;
            toast.success(`Voted · ${label}`);
        } catch (err) {
            toast.error(
                typeof err === 'string' ? err : err?.message ?? 'Failed to vote. Try again.'
            );
        } finally {
            isVotingRef.current = false;
            setIsVoting(false);
        }
    }, [dispatch, dateStr, pendingSel]);

    const voteDateLabel = useMemo(() => {
        try {
            return format(parseISO(dateStr), 'EEEE, MMMM do');
        } catch {
            return dateStr;
        }
    }, [dateStr]);

    const currentLabel = useMemo(() => {
        if (!myVote) return 'Not set';
        return VOTE_OPTIONS.find((o) => o.id === myVote)?.label ?? myVote;
    }, [myVote]);

    const hasUnsavedChange = !!pendingSel && pendingSel !== myVote;
    const canSubmit = hasUnsavedChange && !isVoting && !isPollLoading;
    const voteBusy = isVoting || isPollLoading;

    /* ════════════════════════════════════════════════════════
       Market Schedule
       ════════════════════════════════════════════════════════ */
    const { year, month, monthLabel } = useMemo(() => {
        const istNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
        return {
            year: istNow.getFullYear(),
            month: istNow.getMonth() + 1,
            monthLabel: format(istNow, 'MMMM yyyy'),
        };
    }, []);

    const [schedError, setSchedError] = useState(false);
    const [schedAttempted, setSchedAttempted] = useState(false);

    const loadSchedule = useCallback(() => {
        setSchedError(false);
        dispatch(fetchMarketSchedule({ year, month }))
            .unwrap()
            .catch(() => {
                setSchedError(true);
                /* clear the slice's error flags so /markets doesn't show a stale banner */
                dispatch(resetMarket());
            })
            .finally(() => setSchedAttempted(true));
    }, [dispatch, year, month]);

    useEffect(() => {
        loadSchedule();
    }, [loadSchedule]);

    const dayList = useMemo(() => {
        if (!Array.isArray(schedule)) return [];
        return schedule.map((day) => ({
            key: day._id || String(day.date),
            date: new Date(day.date),
            user: day.user ?? null,
        }));
    }, [schedule]);

    const todayStr = useMemo(() => new Date().toDateString(), []);
    const todayTime = useMemo(() => new Date(todayStr).getTime(), [todayStr]);

    const defaultDayKey = useMemo(() => {
        const todayEntry = dayList.find((x) => x.date.toDateString() === todayStr);
        if (todayEntry) return todayEntry.key;
        const upcoming = dayList.find((x) => x.date.getTime() >= todayTime);
        return (upcoming || dayList[0])?.key ?? null;
    }, [dayList, todayStr, todayTime]);

    const [selectedDayKey, setSelectedDayKey] = useState(null);
    const activeDayKey =
        selectedDayKey != null && dayList.some((x) => x.key === selectedDayKey)
            ? selectedDayKey
            : defaultDayKey;

    const selectedDay = useMemo(
        () => dayList.find((x) => x.key === activeDayKey) ?? null,
        [dayList, activeDayKey]
    );

    const isMyDuty = useMemo(() => {
        if (!selectedDay?.user) return false;
        const uid = user?._id || user?.id || null;
        const dutyId = selectedDay.user._id || selectedDay.user.id || null;
        return !!uid && uid === dutyId;
    }, [selectedDay, user]);

    const showSchedSkeleton =
        dayList.length === 0 && (isScheduleLoading || !schedAttempted);
    const showSchedError = schedError && dayList.length === 0;
    const showSchedEmpty =
        schedAttempted && !isScheduleLoading && !schedError && dayList.length === 0;

    /* ════════════════════════════════════════════════════════
       How to Use accordion
       ════════════════════════════════════════════════════════ */
    const [openGuide, setOpenGuide] = useState('vote');
    const toggleGuide = useCallback((id) => {
        setOpenGuide((prev) => (prev === id ? null : id));
    }, []);

    return (
        <div className="grid grid-cols-1 gap-4 min-[700px]:grid-cols-2 min-[1100px]:grid-cols-12">

            {/* ── Total Due (Payables) ── */}
            <div className="min-w-0 min-[700px]:col-span-2 min-[1100px]:col-span-7">
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
            </div>

            {/* ── Dining Vote ── */}
            <section
                aria-labelledby="dining-vote-heading"
                className={cn(CARD_CLS, 'min-[700px]:col-span-2 min-[1100px]:col-span-5 min-[1100px]:row-span-2')}
                style={{ animationDelay: '0.05s' }}
            >
                <SectionHead
                    id="dining-vote-heading"
                    icon={IoFastFoodOutline}
                    tone="amber"
                    title="Dining Vote"
                    sub={`Applies to ${voteDateLabel}`}
                    right={
                        <span
                            className={cn(
                                'shrink-0 inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider',
                                myVote
                                    ? 'bg-success-bg border-success-border text-success-text'
                                    : 'bg-muted/50 border-border/40 text-muted-foreground'
                            )}
                        >
                            {myVote
                                ? <HiOutlineCheckCircle size={12} aria-hidden="true" />
                                : <HiOutlineClock size={12} aria-hidden="true" />}
                            {myVote ? (myIsManualOverride ? 'Manual' : 'Recorded') : 'Pending'}
                        </span>
                    }
                />

                <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
                    Standing preference — your choice stays in effect until you change it.
                </p>

                {/* Loading skeleton — reserves the exact space of options + submit */}
                {isPollLoading && !pollStatus && (
                    <div className="mt-4" aria-hidden="true">
                        <div className="grid grid-cols-2 gap-2.5 animate-pulse">
                            {[0, 1, 2, 3].map((n) => (
                                <div key={n} className="min-h-[52px] rounded-xl border border-border/40 bg-muted/30" />
                            ))}
                        </div>
                        <div className="mt-3 h-11 rounded-xl bg-muted/40 animate-pulse" />
                    </div>
                )}
                <span className="sr-only" role="status">
                    {isPollLoading && !pollStatus ? 'Loading dining vote' : ''}
                </span>

                {/* Error */}
                {pollError && !pollStatus && (
                    <ErrorPanel message="Couldn't load the dining vote." onRetry={loadPoll} minHeight={180} />
                )}
                {pollError && pollStatus && (
                    <p className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px] text-destructive" role="alert">
                        <FiAlertCircle size={12} aria-hidden="true" />
                        Couldn&apos;t refresh — showing the last saved vote.
                        <button
                            type="button"
                            onClick={loadPoll}
                            className="underline underline-offset-1 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                        >
                            Retry
                        </button>
                    </p>
                )}

                {/* Options + submit */}
                {!pollError && (pollStatus || !isPollLoading) && (
                    <>
                        <div
                            className="mt-4 grid grid-cols-2 gap-2.5"
                            role="group"
                            aria-label="Dining options"
                        >
                            {VOTE_OPTIONS.map((option) => {
                                const Icon = option.icon;
                                const isActive = effectiveSel === option.id;
                                return (
                                    <button
                                        key={option.id}
                                        type="button"
                                        onClick={() => setPendingSel(option.id)}
                                        disabled={voteBusy}
                                        aria-pressed={isActive}
                                        aria-label={`Select ${option.label}`}
                                        className={cn(
                                            'flex items-center gap-2 min-h-[52px] rounded-xl border-2 px-3 py-2.5 text-left',
                                            'transition-colors duration-150',
                                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                                            isActive
                                                ? cn(option.accent.border, option.accent.tint)
                                                : 'border-border/50 bg-muted/20 hover:bg-muted/40',
                                            voteBusy ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
                                        )}
                                    >
                                        <span
                                            aria-hidden="true"
                                            className={cn(
                                                'shrink-0 flex items-center justify-center w-8 h-8 rounded-lg',
                                                isActive ? option.accent.chip : 'bg-muted/50'
                                            )}
                                        >
                                            <Icon
                                                size={16}
                                                className={isActive ? option.accent.text : 'text-foreground/65'}
                                            />
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className="block text-xs font-semibold text-foreground">
                                                {option.label}
                                            </span>
                                            <span className="block text-[10px] leading-tight text-muted-foreground truncate">
                                                {option.description}
                                            </span>
                                        </span>
                                        <span className="shrink-0 flex items-center gap-1.5" aria-hidden="true">
                                            <HiOutlineCheckCircle
                                                size={14}
                                                className={cn(
                                                    'transition-all duration-150',
                                                    isActive
                                                        ? cn('scale-100 opacity-100', option.accent.text)
                                                        : 'scale-50 opacity-0'
                                                )}
                                            />
                                            <span className="text-[10px] font-semibold tabular-nums text-muted-foreground">
                                                {totals[option.id]}v
                                            </span>
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        {votes.length === 0 && !isPollLoading && !pollError && (
                            <p className="mt-3 text-[11px] text-muted-foreground">
                                No selections yet — be the first to vote.
                            </p>
                        )}

                        <div className="mt-3 flex items-center justify-between gap-2 text-[11px]">
                            <span className="text-muted-foreground truncate">
                                Current:{' '}
                                <span className="font-semibold text-foreground">{currentLabel}</span>
                            </span>
                            {hasUnsavedChange && (
                                <span className="shrink-0 font-semibold text-primary">Unsaved change</span>
                            )}
                        </div>

                        <Button
                            fullWidth
                            variant="primary"
                            size="md"
                            onClick={handleVote}
                            disabled={!canSubmit}
                            isLoading={isVoting}
                            className="mt-2.5"
                        >
                            {myVote ? 'Update vote' : 'Submit vote'}
                        </Button>

                        <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
                            You can change your vote anytime before the meal entry is finalised.
                        </p>
                    </>
                )}
            </section>

            {/* ── Market Schedule ── */}
            <section
                aria-labelledby="market-schedule-heading"
                className={cn(CARD_CLS, 'min-[700px]:col-span-2 min-[1100px]:col-span-7')}
                style={{ animationDelay: '0.1s' }}
            >
                <SectionHead
                    id="market-schedule-heading"
                    icon={HiOutlineShoppingCart}
                    tone="emerald"
                    title="Market Schedule"
                    sub={monthLabel}
                    right={
                        dayList.length > 0 ? (
                            <span className="shrink-0 inline-flex items-center rounded-full border border-border/40 bg-muted/50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground tabular-nums">
                                {dayList.length} duty {dayList.length === 1 ? 'day' : 'days'}
                            </span>
                        ) : null
                    }
                />

                {/* Loading skeleton — fixed heights, no layout shift */}
                {showSchedSkeleton && (
                    <div className="mt-4 animate-pulse" aria-hidden="true">
                        <div className="flex gap-2 overflow-hidden">
                            {[0, 1, 2, 3, 4, 5].map((n) => (
                                <div key={n} className="shrink-0 h-12 w-14 rounded-xl bg-muted/30 border border-border/40" />
                            ))}
                        </div>
                        <div className="mt-3 h-[76px] rounded-xl bg-muted/30 border border-border/40" />
                    </div>
                )}
                <span className="sr-only" role="status">
                    {showSchedSkeleton ? 'Loading market schedule' : ''}
                </span>

                {showSchedError && (
                    <ErrorPanel
                        message="Couldn't load the market schedule."
                        onRetry={loadSchedule}
                        minHeight={150}
                    />
                )}
                {schedError && dayList.length > 0 && (
                    <p className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px] text-destructive" role="alert">
                        <FiAlertCircle size={12} aria-hidden="true" />
                        Couldn&apos;t refresh — showing the last saved schedule.
                        <button
                            type="button"
                            onClick={loadSchedule}
                            className="underline underline-offset-1 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                        >
                            Retry
                        </button>
                    </p>
                )}

                {showSchedEmpty && (
                    <div
                        className="mt-4 rounded-xl border border-border/50 bg-muted/20 p-4 flex flex-col items-center justify-center text-center gap-2"
                        style={{ minHeight: 150 }}
                    >
                        <HiOutlineCalendarDays size={20} className="text-muted-foreground" aria-hidden="true" />
                        <p className="text-sm font-medium text-foreground">
                            No market duties scheduled for {monthLabel}.
                        </p>
                        <Button asChild variant="outline" size="sm">
                            <Link to="/events?view=markets">Pick your dates</Link>
                        </Button>
                    </div>
                )}

                {/* Day selector + selected-day details */}
                {!showSchedSkeleton && !showSchedError && !showSchedEmpty && (
                    <>
                        <div
                            className="mt-4 flex gap-2 overflow-x-auto pb-1"
                            role="group"
                            aria-label={`Duty days in ${monthLabel}`}
                        >
                            {dayList.map((day) => {
                                const isSelected = day.key === activeDayKey;
                                const isToday = day.date.toDateString() === todayStr;
                                return (
                                    <button
                                        key={day.key}
                                        type="button"
                                        onClick={() => setSelectedDayKey(day.key)}
                                        aria-pressed={isSelected}
                                        aria-label={format(day.date, 'EEEE, MMMM d')}
                                        className={cn(
                                            'shrink-0 min-h-[48px] min-w-[54px] rounded-xl border px-2 py-1.5 text-center',
                                            'transition-colors duration-150',
                                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                                            isSelected
                                                ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                                                : 'border-border/50 bg-muted/20 hover:bg-muted/40'
                                        )}
                                    >
                                        <span
                                            className={cn(
                                                'block text-[10px] uppercase tracking-wider',
                                                isSelected
                                                    ? 'text-primary'
                                                    : isToday
                                                        ? 'text-success-text'
                                                        : 'text-muted-foreground'
                                            )}
                                        >
                                            {format(day.date, 'EEE')}
                                        </span>
                                        <span
                                            className={cn(
                                                'block text-sm font-semibold',
                                                isSelected ? 'text-primary' : 'text-foreground'
                                            )}
                                        >
                                            {format(day.date, 'd')}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        <div className="mt-3 flex items-center gap-3 rounded-xl border border-border/50 bg-muted/30 p-3 min-h-[76px]">
                            {selectedDay?.user ? (
                                <>
                                    <span
                                        aria-hidden="true"
                                        className="shrink-0 w-10 h-10 rounded-full overflow-hidden bg-muted/60 border border-border/40 flex items-center justify-center text-sm font-semibold text-foreground"
                                    >
                                        {selectedDay.user.image ? (
                                            <img
                                                src={selectedDay.user.image}
                                                alt=""
                                                className="w-full h-full object-cover"
                                                loading="lazy"
                                                decoding="async"
                                            />
                                        ) : (
                                            (selectedDay.user.name?.charAt(0) ?? '?').toUpperCase()
                                        )}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-semibold text-foreground truncate">
                                            {selectedDay.user.name}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {format(selectedDay.date, 'EEEE, MMM d, yyyy')}
                                        </p>
                                    </div>
                                    {isMyDuty && (
                                        <span className="shrink-0 inline-flex items-center rounded-full border border-success-border bg-success-bg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-success-text">
                                            You&apos;re on duty
                                        </span>
                                    )}
                                </>
                            ) : (
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-foreground truncate">
                                        No member assigned
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {selectedDay
                                            ? format(selectedDay.date, 'EEEE, MMM d, yyyy')
                                            : monthLabel}
                                    </p>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </section>

            {/* ── View Schedule Markets ── */}
            <section
                aria-labelledby="view-markets-heading"
                className={cn(CARD_CLS, 'min-[1100px]:col-span-6')}
                style={{ animationDelay: '0.15s' }}
            >
                <SectionHead
                    id="view-markets-heading"
                    icon={FiShoppingBag}
                    tone="blue"
                    title="View Schedule Markets"
                    sub="Jump into the full schedule"
                />

                <nav aria-label="Market schedule links" className="mt-4 space-y-2">
                    {VIEW_LINKS.map((link) => {
                        const Icon = link.icon;
                        return (
                            <Link
                                key={link.to}
                                to={link.to}
                                className="group flex items-center gap-3 min-h-[52px] rounded-xl border border-border/50 bg-muted/20 px-3 py-2.5 transition-colors duration-150 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            >
                                <span
                                    aria-hidden="true"
                                    className="shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-muted/50 text-muted-foreground group-hover:text-foreground transition-colors"
                                >
                                    <Icon size={16} />
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="block text-sm font-medium text-foreground truncate">
                                        {link.title}
                                    </span>
                                    <span className="block text-xs text-muted-foreground truncate">
                                        {link.sub}
                                    </span>
                                </span>
                                <HiOutlineChevronRight
                                    size={16}
                                    aria-hidden="true"
                                    className="shrink-0 text-muted-foreground transition-transform duration-150 group-hover:translate-x-0.5"
                                />
                            </Link>
                        );
                    })}
                </nav>

                <div className="mt-3 pt-3 border-t border-border/40">
                    <Button asChild variant="outline" size="md" fullWidth>
                        <Link to="/markets">
                            View all
                            <FiArrowRight size={14} aria-hidden="true" />
                        </Link>
                    </Button>
                </div>
            </section>

            {/* ── How to Use ── */}
            <section
                aria-labelledby="how-to-use-heading"
                className={cn(CARD_CLS, 'min-[1100px]:col-span-6')}
                style={{ animationDelay: '0.2s' }}
            >
                <SectionHead
                    id="how-to-use-heading"
                    icon={HiOutlineListBullet}
                    tone="violet"
                    title="How to Use"
                    sub="A quick guide to the app"
                />

                <div className="mt-4 space-y-1.5">
                    {GUIDE_ITEMS.map((item) => {
                        const isOpen = openGuide === item.id;
                        return (
                            <div key={item.id} className="rounded-xl border border-border/50 bg-muted/20">
                                <button
                                    type="button"
                                    onClick={() => toggleGuide(item.id)}
                                    aria-expanded={isOpen}
                                    aria-controls={isOpen ? `how-to-${item.id}` : undefined}
                                    className="w-full flex items-center gap-2.5 min-h-[48px] px-3 py-2 rounded-xl text-left transition-colors duration-150 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                >
                                    <span className="flex-1 min-w-0 text-sm font-medium text-foreground">
                                        {item.title}
                                    </span>
                                    <HiOutlineChevronDown
                                        size={16}
                                        aria-hidden="true"
                                        className={cn(
                                            'shrink-0 text-muted-foreground transition-transform duration-200',
                                            isOpen && 'rotate-180'
                                        )}
                                    />
                                </button>

                                {isOpen && (
                                    <div id={`how-to-${item.id}`} className="px-3 pb-3">
                                        <p className="text-xs leading-relaxed text-muted-foreground">
                                            {item.body}
                                        </p>
                                        <Link
                                            to={item.to}
                                            className="mt-1 inline-flex items-center gap-1 min-h-[44px] text-xs font-semibold text-primary rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                        >
                                            {item.linkLabel}
                                            <HiOutlineChevronRight size={14} aria-hidden="true" />
                                        </Link>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </section>
        </div>
    );
});

export default UserDashboard;
