import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
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

const POLL_OPTIONS = [
    {
        id: 'both',
        label: 'Both',
        icon: HiOutlineSparkles,
        description: 'Full-day meals',
        gradientClass: 'bg-gradient-to-br from-violet-500/15 to-pink-500/15',
        accent: {
            text: 'text-violet-600 dark:text-violet-400',
            bg: 'bg-violet-500/10',
            ring: 'ring-violet-500/30',
            border: 'border-violet-500/25',
            fill: 'bg-violet-500',
        },
    },
    {
        id: 'day',
        label: 'Day',
        icon: HiOutlineSun,
        description: 'Lunch only',
        gradientClass: 'bg-gradient-to-br from-amber-400/15 to-rose-500/15',
        accent: {
            text: 'text-amber-600 dark:text-amber-400',
            bg: 'bg-amber-500/10',
            ring: 'ring-amber-500/30',
            border: 'border-amber-500/25',
            fill: 'bg-amber-500',
        },
    },
    {
        id: 'night',
        label: 'Night',
        icon: HiOutlineMoon,
        description: 'Dinner only',
        gradientClass: 'bg-gradient-to-br from-indigo-500/15 to-cyan-500/15',
        accent: {
            text: 'text-indigo-600 dark:text-indigo-400',
            bg: 'bg-indigo-500/10',
            ring: 'ring-indigo-500/30',
            border: 'border-indigo-500/25',
            fill: 'bg-indigo-500',
        },
    },
    {
        id: 'off',
        label: 'Off',
        icon: HiOutlineNoSymbol,
        description: 'No meals today',
        gradientClass: 'bg-gradient-to-br from-slate-400/15 to-zinc-600/15',
        accent: {
            text: 'text-slate-600 dark:text-slate-400',
            bg: 'bg-slate-500/10',
            ring: 'ring-slate-500/30',
            border: 'border-slate-500/25',
            fill: 'bg-slate-500',
        },
    },
];

const BASE_TOTALS = { total: 0, both: 0, day: 0, night: 0, off: 0 };

const formatDisplayDate = (value) => {
    const parsed = value instanceof Date ? value : parseISO(String(value));
    return isValid(parsed) ? format(parsed, 'EEEE, MMMM do') : 'Selected date';
};

const getUserId = (user) => user?._id || user?.id || null;

const VoteMetric = React.memo(function VoteMetric({ label, value, icon: Icon }) {
    return (
        <div className="flex items-center gap-2.5 rounded-xl border border-border/50 bg-muted/30 px-3 py-2">
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

const VotePill = React.memo(function VotePill({ vote }) {
    const initial = vote?.user?.name?.charAt(0)?.toUpperCase() ?? '?';
    return (
        <div className="flex items-center gap-1.5 rounded-full border border-border/40 bg-muted/30 py-0.5 pl-0.5 pr-2.5">
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

const MealPolling = ({ selectedDate = new Date().toISOString() }) => {
    const dispatch = useDispatch();
    const { pollStatus } = useSelector((s) => s.meal);
    const { user } = useSelector((s) => s.auth);

    const [isVoting, setIsVoting] = useState(false);
    const [isPollLoading, setIsPollLoading] = useState(false);
    const isVotingRef = useRef(false);

    const dateStr = useMemo(() => {
        const parsed = selectedDate instanceof Date ? selectedDate : new Date(selectedDate);
        return isValid(parsed)
            ? format(parsed, 'yyyy-MM-dd')
            : format(new Date(), 'yyyy-MM-dd');
    }, [selectedDate]);

    useEffect(() => {
        setIsPollLoading(true);
        dispatch(fetchPollStatus(dateStr)).finally(() => setIsPollLoading(false));
    }, [dispatch, dateStr]);

    const votes = useMemo(() => pollStatus?.votes ?? [], [pollStatus]);
    const stats = useMemo(() => pollStatus?.stats ?? {}, [pollStatus]);

    const groupedVotes = useMemo(() => {
        const g = { both: [], day: [], night: [], off: [] };
        for (let i = 0; i < votes.length; i++) {
            const v = votes[i];
            if (g[v.type]) g[v.type].push(v);
        }
        return g;
    }, [votes]);

    const totals = useMemo(() => {
        const t = { ...BASE_TOTALS };
        for (const { id } of POLL_OPTIONS) {
            const fromStats = Number(stats?.[id]);
            const fromVotes = groupedVotes[id].length;
            const count = Number.isFinite(fromStats) && fromStats >= 0 ? fromStats : fromVotes;
            t[id] = count;
            t.total += count;
        }
        return t;
    }, [stats, groupedVotes]);

    const myVote = useMemo(() => {
        const uid = getUserId(user);
        for (let i = 0; i < votes.length; i++) {
            if (getUserId(votes[i].user) === uid) return votes[i].type;
        }
        return null;
    }, [user, votes]);

    const handleVote = useCallback(
        async (type) => {
            if (isVotingRef.current) return;
            isVotingRef.current = true;
            setIsVoting(true);
            try {
                await dispatch(voteMealPoll({ type, date: dateStr })).unwrap();
                toast.success(`Voted · ${type.charAt(0).toUpperCase()}${type.slice(1)}`);
            } catch (err) {
                toast.error(
                    typeof err === 'string' ? err : err?.message ?? 'Failed to vote. Try again.'
                );
            } finally {
                isVotingRef.current = false;
                setIsVoting(false);
            }
        },
        [dispatch, dateStr]
    );

    const displayDate = useMemo(() => formatDisplayDate(selectedDate), [selectedDate]);
    const disabled = isVoting || isPollLoading;

    if (isPollLoading && !pollStatus) {
        return (
            <section className="w-full animate-pulse">
                <div className="space-y-4 py-4 md:rounded-2xl md:border md:border-border/50 md:bg-muted/20 md:p-6">
                    <div className="flex items-center gap-3">
                        <div className="h-5 w-5 rounded-full bg-muted/60" />
                        <div className="h-4 w-32 rounded-lg bg-muted/60" />
                    </div>
                    <div className="h-7 w-48 rounded-xl bg-muted/50" />
                    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
                        {[1, 2, 3, 4].map(n => (
                            <div key={n} className="h-[130px] rounded-xl bg-muted/40 border border-border/40" />
                        ))}
                    </div>
                    <div className="h-28 rounded-xl bg-muted/30 border border-border/40" />
                </div>
            </section>
        );
    }

    return (
        <section className="w-full">
            <div
                className={clsx(
                    'relative w-full overflow-hidden py-2',
                    'md:rounded-xl',
                    'md:border md:border-border/50',
                    'md:bg-card',
                    'md:shadow-sm',
                    'md:px-5 md:py-5'
                )}
            >
                {/* HEADER */}
                <header className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
                    <div className="space-y-2">
                        <div className="inline-flex items-center gap-1.5 rounded-full border border-border/40 bg-muted/30 px-2.5 py-1">
                            <span className="relative flex h-1.5 w-1.5">
                                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            </span>
                            <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-foreground/75">
                                Live Poll
                            </span>
                        </div>

                        <div>
                            <h3 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
                                Dining Roster
                            </h3>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                                Preferences for{' '}
                                <span className="font-medium text-foreground">{displayDate}</span>
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-2 overflow-x-auto pb-0.5 sm:overflow-visible sm:pb-0">
                        <VoteMetric label="Total Cast" value={totals.total} icon={HiOutlineChartBarSquare} />
                        <VoteMetric
                            label="Your Status"
                            value={myVote ? 'Recorded' : 'Pending'}
                            icon={HiOutlineClock}
                        />
                    </div>
                </header>

                {/* POLL CARDS */}
                <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                    {POLL_OPTIONS.map((option) => {
                        const count = totals[option.id] || 0;
                        const pct = totals.total > 0 ? Math.round((count / totals.total) * 100) : 0;
                        const isActive = myVote === option.id;
                        const Icon = option.icon;

                        return (
                            <button
                                key={option.id}
                                type="button"
                                onClick={() => handleVote(option.id)}
                                disabled={disabled}
                                aria-pressed={isActive}
                                aria-label={`Vote for ${option.label}`}
                                className={clsx(
                                    'group relative overflow-hidden rounded-xl border p-3.5 text-left',
                                    'transition-all duration-150',
                                    'min-h-[130px] sm:min-h-[140px] sm:p-4',
                                    'hover:scale-[1.01] active:scale-[0.98]',
                                    isActive
                                        ? `border-transparent bg-white/95 ring-1 ${option.accent.ring} dark:bg-slate-900/90`
                                        : 'border-border/50 bg-muted/20 hover:bg-muted/30 dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/[0.07]',
                                    disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
                                )}
                            >
                                {/* gradient overlay */}
                                <div
                                    className={clsx(
                                        'pointer-events-none absolute inset-0 transition-opacity duration-150',
                                        option.gradientClass,
                                        isActive ? 'opacity-100' : 'opacity-0'
                                    )}
                                />

                                <div className="relative z-10 flex h-full flex-col justify-between gap-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-center gap-2.5">
                                            <div
                                                className={clsx(
                                                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                                                    'transition-colors duration-150',
                                                    isActive ? option.accent.bg : 'bg-muted/50 dark:bg-white/10'
                                                )}
                                            >
                                                <Icon
                                                    className={clsx(
                                                        'h-4 w-4 sm:h-5 sm:w-5',
                                                        isActive ? option.accent.text : 'text-foreground/65'
                                                    )}
                                                />
                                            </div>

                                            <div className="min-w-0">
                                                <h4 className="truncate text-xs font-semibold tracking-tight text-foreground sm:text-sm">
                                                    {option.label}
                                                </h4>
                                                <p className="mt-0.5 text-[10px] leading-tight text-muted-foreground sm:text-xs">
                                                    {option.description}
                                                </p>
                                            </div>
                                        </div>

                                        <div
                                            className={clsx(
                                                'rounded-full p-1 transition-all duration-150',
                                                option.accent.bg,
                                                option.accent.text,
                                                isActive
                                                    ? 'scale-100 opacity-100'
                                                    : 'scale-60 opacity-0'
                                            )}
                                        >
                                            <HiOutlineCheckCircle className="h-4 w-4" />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between text-[10px] font-semibold">
                                            <span className="text-muted-foreground">{pct}%</span>
                                            <span className="tabular-nums text-foreground/60">{count}v</span>
                                        </div>

                                        <div className="h-1 w-full overflow-hidden rounded-full bg-muted/40 dark:bg-white/10">
                                            <div
                                                className="h-full rounded-full transition-all duration-500 ease-out"
                                                style={{
                                                    width: `${pct}%`,
                                                    backgroundColor: isActive ? undefined : undefined,
                                                }}
                                            >
                                                <div
                                                    className={clsx(
                                                        'h-full rounded-full',
                                                        isActive ? option.accent.fill : 'bg-foreground/30'
                                                    )}
                                                    style={{ width: '100%' }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* STANDINGS SECTION */}
                <div className="relative mt-5 overflow-hidden rounded-xl border border-border/40 bg-muted/20 p-0.5 dark:border-white/10 dark:bg-slate-950/80 sm:mt-6">
                    <div className="overflow-hidden rounded-lg bg-transparent p-3.5 sm:p-4">
                        <div className="mb-3 flex items-center justify-between border-b border-border/40 pb-2.5 dark:border-white/10">
                            <div className="flex items-center gap-2">
                                <HiOutlineUserGroup className="h-3.5 w-3.5 text-muted-foreground" />
                                <h4 className="text-[10px] font-bold uppercase tracking-[0.18em] text-foreground">
                                    Current Standings
                                </h4>
                            </div>
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.16em] text-emerald-600 dark:text-emerald-400">
                                <span className="h-1 w-1 rounded-full bg-emerald-500" />
                                Live
                            </span>
                        </div>

                        <div className="space-y-2">
                            {POLL_OPTIONS.map((option) => {
                                const votersForType = groupedVotes[option.id];
                                if (votersForType.length === 0) return null;
                                const Icon = option.icon;

                                return (
                                    <div
                                        key={option.id}
                                        className="flex flex-col gap-2.5 rounded-xl border border-border/30 bg-muted/20 p-3 sm:flex-row sm:items-center sm:justify-between dark:border-white/[0.04] dark:bg-white/[0.03]"
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <div
                                                className={clsx(
                                                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                                                    option.accent.bg,
                                                    option.accent.text
                                                )}
                                            >
                                                <Icon className="h-4 w-4" />
                                            </div>
                                            <div>
                                                <div className="text-xs font-bold text-foreground">
                                                    {option.label}
                                                </div>
                                                <div className="text-[10px] text-muted-foreground">
                                                    {votersForType.length} member{votersForType.length > 1 ? 's' : ''}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap gap-1.5 sm:justify-end">
                                            {votersForType.map((vote) => {
                                                const key =
                                                    vote._id ??
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
                                    <p className="text-xs font-medium text-foreground">
                                        No selections yet.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default React.memo(MealPolling);
