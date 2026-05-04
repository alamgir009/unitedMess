import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
    HiOutlineSun,
    HiOutlineMoon,
    HiOutlineNoSymbol,
    HiOutlineSparkles,
    HiOutlineCheckCircle,
    HiOutlineClock,
    HiOutlineUserGroup,
    HiOutlineChartBarSquare,
} from 'react-icons/hi2';
import { format, isValid, parseISO } from 'date-fns';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';

import { fetchPollStatus, voteMealPoll } from '../../store/meal.slice';

/* ─────────────────────────── constants ─────────────────────────── */

const POLL_OPTIONS = [
    {
        id: 'both',
        label: 'Both',
        icon: HiOutlineSparkles,
        description: 'Full-day meals',
        gradientClass: 'bg-gradient-to-br from-violet-500/20 via-fuchsia-500/20 to-pink-500/20',
        accent: {
            text: 'text-violet-600 dark:text-violet-400',
            bg: 'bg-violet-500/10',
            ring: 'ring-violet-500/30',
            border: 'border-violet-500/25',
            fill: 'bg-violet-500',
            glow: 'shadow-[0_12px_32px_-8px_rgba(139,92,246,0.40)]',
        },
    },
    {
        id: 'day',
        label: 'Day',
        icon: HiOutlineSun,
        description: 'Lunch only',
        gradientClass: 'bg-gradient-to-br from-amber-400/20 via-orange-500/20 to-rose-500/20',
        accent: {
            text: 'text-amber-600 dark:text-amber-400',
            bg: 'bg-amber-500/10',
            ring: 'ring-amber-500/30',
            border: 'border-amber-500/25',
            fill: 'bg-amber-500',
            glow: 'shadow-[0_12px_32px_-8px_rgba(245,158,11,0.40)]',
        },
    },
    {
        id: 'night',
        label: 'Night',
        icon: HiOutlineMoon,
        description: 'Dinner only',
        gradientClass: 'bg-gradient-to-br from-indigo-500/20 via-blue-500/20 to-cyan-500/20',
        accent: {
            text: 'text-indigo-600 dark:text-indigo-400',
            bg: 'bg-indigo-500/10',
            ring: 'ring-indigo-500/30',
            border: 'border-indigo-500/25',
            fill: 'bg-indigo-500',
            glow: 'shadow-[0_12px_32px_-8px_rgba(99,102,241,0.40)]',
        },
    },
    {
        id: 'off',
        label: 'Off',
        icon: HiOutlineNoSymbol,
        description: 'No meals today',
        gradientClass: 'bg-gradient-to-br from-slate-400/20 via-slate-500/20 to-zinc-600/20',
        accent: {
            text: 'text-slate-600 dark:text-slate-400',
            bg: 'bg-slate-500/10',
            ring: 'ring-slate-500/30',
            border: 'border-slate-500/25',
            fill: 'bg-slate-500',
            glow: 'shadow-[0_12px_32px_-8px_rgba(100,116,139,0.30)]',
        },
    },
];

const BASE_TOTALS = { total: 0, both: 0, day: 0, night: 0, off: 0 };

/* ───────────────────────── pure helpers ─────────────────────────── */

const formatDisplayDate = (value) => {
    const parsed = value instanceof Date ? value : parseISO(String(value));
    return isValid(parsed) ? format(parsed, 'EEEE, MMMM do') : 'Selected date';
};

const getUserId = (user) => user?._id || user?.id || null;

/* ────────────────────────── sub-components ─────────────────────── */

/** Tiny stat badge — no rerender unless props change */
const VoteMetric = React.memo(function VoteMetric({ label, value, icon: Icon }) {
    return (
        <div className="flex items-center gap-2.5 rounded-xl border border-black/[0.06] bg-white/80 px-3 py-2 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.06]">
            <Icon className="h-4 w-4 shrink-0 text-muted-foreground/70" />
            <div className="flex flex-col leading-none">
                <span className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">
                    {label}
                </span>
                <span className="mt-0.5 text-[13px] font-semibold tabular-nums text-foreground">
                    {value}
                </span>
            </div>
        </div>
    );
});

/** Voter pill — avatar + name */
const VotePill = React.memo(function VotePill({ vote }) {
    const initial = vote?.user?.name?.charAt(0)?.toUpperCase() ?? '?';
    return (
        <div className="flex items-center gap-1.5 rounded-full border border-black/[0.06] bg-white/90 py-0.5 pl-0.5 pr-2.5 shadow-sm dark:border-white/10 dark:bg-slate-800/90">
            {vote?.user?.image ? (
                <img
                    src={vote.user.image}
                    alt={vote.user.name ?? 'Member'}
                    className="h-5 w-5 rounded-full object-cover"
                    loading="lazy"
                    decoding="async"
                />
            ) : (
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-foreground/10 text-[9px] font-semibold text-foreground">
                    {initial}
                </div>
            )}
            <span className="max-w-[96px] truncate text-[11px] font-medium text-foreground/75">
                {vote?.user?.name ?? 'Member'}
            </span>
        </div>
    );
});

/* ─────────────────────── animation variants ─────────────────────── */

/**
 * Use will-change only on the progress bar (translated div) so the GPU
 * layer is composited rather than repainted — keeps 60 fps on low-end mobile.
 */
const barVariants = {
    hidden: { scaleX: 0, originX: 0 },
    visible: (pct) => ({
        scaleX: pct / 100,
        originX: 0,
        transition: { type: 'spring', stiffness: 160, damping: 28, mass: 0.6 },
    }),
};

const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.18 } },
    exit: { opacity: 0, transition: { duration: 0.14 } },
};

const checkVariants = {
    hidden: { scale: 0.6, opacity: 0 },
    visible: { scale: 1, opacity: 1, transition: { type: 'spring', stiffness: 300, damping: 20 } },
};

/* ─────────────────────────── main component ─────────────────────── */

const MealPolling = ({ selectedDate = new Date().toISOString() }) => {
    const dispatch = useDispatch();
    const { pollStatus, isLoading } = useSelector((s) => s.meal);
    const { user } = useSelector((s) => s.auth);

    const [isVoting, setIsVoting] = useState(false);

    /* Stable ISO date string — recalculated only when selectedDate changes */
    const dateStr = useMemo(() => {
        const parsed = selectedDate instanceof Date ? selectedDate : new Date(selectedDate);
        return isValid(parsed)
            ? format(parsed, 'yyyy-MM-dd')
            : format(new Date(), 'yyyy-MM-dd');
    }, [selectedDate]);

    useEffect(() => {
        dispatch(fetchPollStatus(dateStr));
    }, [dispatch, dateStr]);

    const votes = pollStatus?.votes ?? [];
    const stats = pollStatus?.stats ?? {};

    const totals = useMemo(() => {
        const t = { ...BASE_TOTALS };
        for (const { id } of POLL_OPTIONS) {
            const fromStats = Number(stats?.[id]);
            const fromVotes = votes.filter((v) => v.type === id).length;
            const count = Number.isFinite(fromStats) && fromStats >= 0 ? fromStats : fromVotes;
            t[id] = count;
            t.total += count;
        }
        return t;
    }, [stats, votes]);

    const myVote = useMemo(() => {
        const uid = getUserId(user);
        return votes.find((v) => getUserId(v.user) === uid)?.type ?? null;
    }, [user, votes]);

    const handleVote = useCallback(
        async (type) => {
            if (isVoting || isLoading) return;
            setIsVoting(true);
            try {
                await dispatch(voteMealPoll({ type, date: dateStr })).unwrap();
                await dispatch(fetchPollStatus(dateStr));
                toast.success(`Voted · ${type.charAt(0).toUpperCase()}${type.slice(1)}`);
            } catch (err) {
                toast.error(
                    typeof err === 'string' ? err : err?.message ?? 'Failed to vote. Try again.'
                );
            } finally {
                setIsVoting(false);
            }
        },
        [dispatch, dateStr, isLoading, isVoting]
    );

    const displayDate = useMemo(() => formatDisplayDate(selectedDate), [selectedDate]);
    const disabled = isVoting || isLoading;

    /* ── render ── */
    return (
        <section className="w-full">
            {/*
        Outer shell:
        - Mobile / sm  → edge-to-edge, no border/shadow/padding-x
        - md+          → card with rounded corners + glass effect
      */}
            <div
                className={[
                    'relative w-full overflow-hidden',
                    'md:rounded-[2rem]',
                    'md:border md:border-white/20 dark:md:border-white/10',
                    'md:bg-white/60 dark:md:bg-slate-950/50',
                    'md:shadow-[0_24px_56px_-10px_rgba(15,23,42,0.10)] dark:md:shadow-[0_24px_56px_-10px_rgba(0,0,0,0.42)]',
                    'md:backdrop-blur-xl',
                    'md:p-1',
                ].join(' ')}
            >
                {/* decorative radial mesh — pointer-events-none, no layout impact */}
                <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,rgba(129,140,248,0.13),transparent_40%),radial-gradient(circle_at_bottom_left,rgba(244,114,182,0.10),transparent_38%)]"
                />

                {/*
          Inner card:
          - Mobile      → full-bleed, px-4 py-5
          - sm          → px-5 py-6
          - md+         → rounded inner card, px-7 py-7
        */}

                <div
                    className={[
                        'relative',
                        'px-0 py-3 sm:px-0 sm:py-5',
                        'md:rounded-[1.75rem] md:px-6 md:py-6',
                        'bg-white/98 dark:bg-slate-950/98',
                        'md:bg-white/70 dark:md:bg-slate-950/45',
                    ].join(' ')}
                >
                    {/* ── HEADER ── */}
                    <header className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
                        {/* title block */}
                        <div className="space-y-2">
                            {/* live badge */}
                            <div className="inline-flex items-center gap-1.5 rounded-full border border-black/[0.06] bg-white/70 px-2.5 py-1 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-black/40">
                                <span className="relative flex h-1.5 w-1.5">
                                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                </span>
                                <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-foreground/75">
                                    Live Poll
                                </span>
                            </div>

                            <div>
                                <h3 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                                    Dining Roster
                                </h3>
                                <p className="mt-0.5 text-[13px] text-muted-foreground">
                                    Preferences for{' '}
                                    <span className="font-medium text-foreground">{displayDate}</span>
                                </p>
                            </div>
                        </div>

                        {/* metrics row — scrollable on very narrow screens */}
                        <div className="flex gap-2 overflow-x-auto pb-0.5 sm:overflow-visible sm:pb-0">
                            <VoteMetric label="Total Cast" value={totals.total} icon={HiOutlineChartBarSquare} />
                            <VoteMetric
                                label="Your Status"
                                value={myVote ? 'Recorded' : 'Pending'}
                                icon={HiOutlineClock}
                            />
                        </div>
                    </header>

                    {/* ── POLL CARDS ── */}
                    {/*
            2-column grid on mobile (cards are compact),
            4-column on xl (each card side-by-side).
            This prevents a single-column stacked layout that feels cramped on mobile.
          */}
                    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                        {POLL_OPTIONS.map((option) => {
                            const count = totals[option.id] || 0;
                            const pct = totals.total > 0 ? Math.round((count / totals.total) * 100) : 0;
                            const isActive = myVote === option.id;
                            const Icon = option.icon;

                            return (
                                <motion.button
                                    key={option.id}
                                    type="button"
                                    onClick={() => handleVote(option.id)}
                                    disabled={disabled}
                                    /* GPU-composited transform only — no layout thrash */
                                    whileHover={!disabled ? { y: -2 } : undefined}
                                    whileTap={!disabled ? { scale: 0.97 } : undefined}
                                    aria-pressed={isActive}
                                    style={{ willChange: 'transform' }}
                                    className={[
                                        'group relative overflow-hidden rounded-2xl border p-3.5 text-left',
                                        'transition-colors duration-200',
                                        'min-h-[130px] sm:min-h-[140px] sm:p-4',
                                        'backdrop-blur-md',
                                        isActive
                                            ? `border-transparent bg-white/95 ${option.accent.glow} ring-1 ${option.accent.ring} dark:bg-slate-900/90`
                                            : 'border-black/[0.06] bg-white/65 hover:bg-white/90 dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/[0.07]',
                                        disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
                                    ].join(' ')}
                                >
                                    {/* gradient overlay (active only) */}
                                    <AnimatePresence>
                                        {isActive && (
                                            <motion.div
                                                variants={overlayVariants}
                                                initial="hidden"
                                                animate="visible"
                                                exit="exit"
                                                className={`pointer-events-none absolute inset-0 ${option.gradientClass}`}
                                            />
                                        )}
                                    </AnimatePresence>

                                    <div className="relative z-10 flex h-full flex-col justify-between gap-3">
                                        {/* top row: icon + label + check */}
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex items-center gap-2.5">
                                                <div
                                                    className={[
                                                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
                                                        'transition-colors duration-200',
                                                        'sm:h-10 sm:w-10',
                                                        isActive ? option.accent.bg : 'bg-black/[0.05] dark:bg-white/10',
                                                    ].join(' ')}
                                                >
                                                    <Icon
                                                        className={[
                                                            'h-4 w-4 sm:h-5 sm:w-5',
                                                            isActive ? option.accent.text : 'text-foreground/65',
                                                        ].join(' ')}
                                                    />
                                                </div>

                                                <div className="min-w-0">
                                                    <h4 className="truncate text-[13px] font-semibold tracking-tight text-foreground sm:text-sm">
                                                        {option.label}
                                                    </h4>
                                                    <p className="mt-0.5 text-[10px] leading-tight text-muted-foreground sm:text-xs">
                                                        {option.description}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* animated check badge */}
                                            <AnimatePresence>
                                                {isActive && (
                                                    <motion.div
                                                        variants={checkVariants}
                                                        initial="hidden"
                                                        animate="visible"
                                                        exit="hidden"
                                                        className={`rounded-full p-1 ${option.accent.bg} ${option.accent.text}`}
                                                    >
                                                        <HiOutlineCheckCircle className="h-4 w-4" />
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>

                                        {/* bottom: progress bar */}
                                        <div className="space-y-1.5">
                                            <div className="flex items-center justify-between text-[10px] font-semibold">
                                                <span className="text-muted-foreground">{pct}%</span>
                                                <span className="tabular-nums text-foreground/60">{count}v</span>
                                            </div>

                                            <div className="h-1 w-full overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/10">
                                                <motion.div
                                                    custom={pct}
                                                    variants={barVariants}
                                                    initial="hidden"
                                                    animate="visible"
                                                    style={{ willChange: 'transform' }}
                                                    className={`h-full rounded-full ${isActive ? option.accent.fill : 'bg-foreground/30'}`}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </motion.button>
                            );
                        })}
                    </div>

                    {/* ── STANDINGS SECTION ── */}
                    <div className="mt-5 rounded-2xl border border-black/[0.05] bg-white/90 p-0.5 shadow-sm dark:border-white/10 dark:bg-slate-950/85 sm:mt-6">
                        <div className="rounded-[0.85rem] bg-white/70 p-3.5 sm:p-4 dark:bg-slate-900/50">
                            {/* section header */}
                            <div className="mb-3 flex items-center justify-between border-b border-black/[0.05] pb-2.5 dark:border-white/10">
                                <div className="flex items-center gap-2">
                                    <HiOutlineUserGroup className="h-3.5 w-3.5 text-muted-foreground" />
                                    <h4 className="text-[10px] font-bold uppercase tracking-[0.18em] text-foreground">
                                        Current Standings
                                    </h4>
                                </div>
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.16em] text-emerald-600 dark:text-emerald-400">
                                    <span className="h-1 w-1 animate-pulse rounded-full bg-emerald-500" />
                                    Live
                                </span>
                            </div>

                            {/* standings rows */}
                            <div className="space-y-2">
                                {POLL_OPTIONS.map((option) => {
                                    const votersForType = votes.filter((v) => v.type === option.id);
                                    if (votersForType.length === 0) return null;
                                    const Icon = option.icon;

                                    return (
                                        <div
                                            key={option.id}
                                            className="flex flex-col gap-2.5 rounded-xl border border-black/[0.03] bg-black/[0.018] p-3 sm:flex-row sm:items-center sm:justify-between dark:border-white/[0.04] dark:bg-white/[0.03]"
                                        >
                                            {/* option label */}
                                            <div className="flex items-center gap-2.5">
                                                <div
                                                    className={[
                                                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                                                        option.accent.bg,
                                                        option.accent.text,
                                                    ].join(' ')}
                                                >
                                                    <Icon className="h-4 w-4" />
                                                </div>
                                                <div>
                                                    <div className="text-[13px] font-bold text-foreground">
                                                        {option.label}
                                                    </div>
                                                    <div className="text-[10px] text-muted-foreground">
                                                        {votersForType.length} member{votersForType.length > 1 ? 's' : ''}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* voter pills — wrap nicely on any screen */}
                                            <div className="flex flex-wrap gap-1.5 sm:justify-end">
                                                {votersForType.map((vote) => {
                                                    const key =
                                                        getUserId(vote.user) ??
                                                        `${vote.type}-${vote.user?.name ?? 'member'}`;
                                                    return <VotePill key={key} vote={vote} />;
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}

                                {votes.length === 0 && (
                                    <div className="flex flex-col items-center justify-center py-8 text-center opacity-60">
                                        <HiOutlineUserGroup className="mb-2 h-7 w-7 text-muted-foreground" />
                                        <p className="text-[13px] font-medium text-foreground">
                                            No selections yet.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default MealPolling;