import React, { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
import { format } from 'date-fns';
import { useDispatch, useSelector } from 'react-redux';
import { voteMealPoll, fetchPollStatus } from '../../store/meal.slice';
import toast from 'react-hot-toast';

const pollOptions = [
    {
        id: 'both',
        label: 'Both',
        icon: HiOutlineSparkles,
        theme: 'violet',
        gradient: 'from-violet-500/20 via-fuchsia-500/20 to-pink-500/20',
        activeBorder: 'border-violet-500/50',
        text: 'text-violet-600 dark:text-violet-400',
        bg: 'bg-violet-500/10',
        description: 'Full-day meals',
    },
    {
        id: 'day',
        label: 'Day',
        icon: HiOutlineSun,
        theme: 'amber',
        gradient: 'from-amber-400/20 via-orange-500/20 to-rose-500/20',
        activeBorder: 'border-amber-500/50',
        text: 'text-amber-600 dark:text-amber-400',
        bg: 'bg-amber-500/10',
        description: 'Lunch-time only',
    },
    {
        id: 'night',
        label: 'Night',
        icon: HiOutlineMoon,
        theme: 'indigo',
        gradient: 'from-indigo-500/20 via-blue-500/20 to-cyan-500/20',
        activeBorder: 'border-indigo-500/50',
        text: 'text-indigo-600 dark:text-indigo-400',
        bg: 'bg-indigo-500/10',
        description: 'Dinner-time only',
    },
    {
        id: 'off',
        label: 'Off',
        icon: HiOutlineNoSymbol,
        theme: 'slate',
        gradient: 'from-slate-400/20 via-slate-500/20 to-zinc-600/20',
        activeBorder: 'border-slate-500/50',
        text: 'text-slate-600 dark:text-slate-400',
        bg: 'bg-slate-500/10',
        description: 'No meals today',
    },
];

const VoteMetric = ({ label, value, icon: Icon }) => (
    <div className="flex items-center gap-3 rounded-2xl border border-black/5 bg-white/40 px-3 py-2.5 backdrop-blur-md dark:border-white/5 dark:bg-white/5">
        <Icon className="h-4 w-4 text-muted-foreground opacity-70" />
        <div className="flex flex-col">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
            <span className="text-sm font-semibold tabular-nums leading-none text-foreground">{value}</span>
        </div>
    </div>
);

const MealPolling = ({ selectedDate = new Date().toISOString() }) => {
    const dispatch = useDispatch();
    const { pollStatus, isLoading } = useSelector((state) => state.meal);
    const { user } = useSelector((state) => state.auth);

    const [isVoting, setIsVoting] = useState(false);
    const dateStr = format(new Date(selectedDate), 'yyyy-MM-dd');

    useEffect(() => {
        dispatch(fetchPollStatus(dateStr));
    }, [dispatch, dateStr]);

    const votes = pollStatus?.votes || [];
    const stats = pollStatus?.stats || {};

    const totals = useMemo(() => {
        return pollOptions.reduce((acc, opt) => {
            const count = Number(stats?.[opt.id] ?? votes.filter((v) => v.type === opt.id).length ?? 0);
            acc[opt.id] = Number.isFinite(count) ? count : 0;
            acc.total += acc[opt.id];
            return acc;
        }, { total: 0, both: 0, day: 0, night: 0, off: 0 });
    }, [stats, votes]);

    const myVote = votes.find(
        (v) => v.user?._id === user?._id || v.user?.id === user?.id
    )?.type;

    const handleVote = async (type) => {
        if (isVoting) return;
        setIsVoting(true);
        try {
            await dispatch(voteMealPoll({ type, date: dateStr })).unwrap();
            await dispatch(fetchPollStatus(dateStr));
            toast.success(`Voted for ${type.charAt(0).toUpperCase() + type.slice(1)}`, {
                style: { borderRadius: '16px', background: '#333', color: '#fff' }
            });
        } catch (error) {
            toast.error(error || 'Failed to vote');
        } finally {
            setIsVoting(false);
        }
    };

    return (
        <div className="relative w-full overflow-hidden rounded-[2.5rem] border border-white/20 bg-white/95 p-1 shadow-sm md:shadow-[0_32px_64px_-12px_rgba(0,0,0,0.08)] md:bg-white/40 md:backdrop-blur-md dark:border-white/10 dark:bg-slate-950/95 md:dark:bg-slate-950/40 md:dark:shadow-[0_32px_64px_-12px_rgba(0,0,0,0.4)]">
            {/* Liquid Ambient Background */}
            <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,rgba(120,119,198,0.15),transparent_50%),radial-gradient(ellipse_at_bottom_left,rgba(244,114,182,0.15),transparent_50%)] dark:bg-[radial-gradient(ellipse_at_top_right,rgba(120,119,198,0.2),transparent_50%),radial-gradient(ellipse_at_bottom_left,rgba(244,114,182,0.2),transparent_50%)]" />

            <div className="relative rounded-[2.25rem] bg-white/95 p-5 sm:p-8 dark:bg-slate-900/95 md:bg-white/60 md:dark:bg-slate-900/40">
                {/* Header Section */}
                <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between mb-8">
                    <div className="space-y-3">
                        <div className="inline-flex items-center gap-2 rounded-full border border-black/5 bg-white/50 px-3 py-1.5 backdrop-blur-md dark:border-white/10 dark:bg-black/50">
                            <span className="relative flex h-2 w-2">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
                            </span>
                            <span className="text-[10px] font-semibold uppercase tracking-widest text-foreground/80">Live Poll</span>
                        </div>

                        <div>
                            <h3 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
                                Dining Roster
                            </h3>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Preferences for <span className="font-medium text-foreground">{format(new Date(selectedDate), 'EEEE, MMMM do')}</span>
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <VoteMetric label="Total Cast" value={totals.total} icon={HiOutlineChartBarSquare} />
                        <VoteMetric label="Your Status" value={myVote ? 'Recorded' : 'Pending'} icon={HiOutlineClock} />
                    </div>
                </div>

                {/* Grid Options */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {pollOptions.map((option) => {
                        const count = totals?.[option.id] || 0;
                        const percent = totals.total > 0 ? Math.round((count / totals.total) * 100) : 0;
                        const isActive = myVote === option.id;

                        return (
                            <motion.button
                                key={option.id}
                                type="button"
                                onClick={() => handleVote(option.id)}
                                disabled={isVoting || isLoading}
                                whileHover={{ scale: 1.01, y: -2 }}
                                whileTap={{ scale: 0.98 }}
                                className={`group relative flex flex-col justify-between overflow-hidden rounded-[24px] border p-5 text-left transition-all duration-500 ease-out min-h-[140px]
                                    ${isActive 
                                        ? `bg-white/80 dark:bg-slate-800/80 shadow-lg shadow-${option.theme}-500/10 ${option.activeBorder}` 
                                        : 'border-black/5 bg-white/40 hover:bg-white/60 dark:border-white/5 dark:bg-white/5 dark:hover:bg-white/10'
                                    } 
                                    md:backdrop-blur-md ${(isVoting || isLoading) ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
                            >
                                {/* Active State Gradient Overlay */}
                                <AnimatePresence>
                                    {isActive && (
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className={`absolute inset-0 bg-gradient-to-br ${option.gradient} pointer-events-none`}
                                        />
                                    )}
                                </AnimatePresence>

                                <div className="relative z-10 flex items-start justify-between w-full">
                                    <div className="flex items-center gap-4">
                                        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl transition-colors duration-300 ${isActive ? option.bg : 'bg-black/5 dark:bg-white/10'}`}>
                                            <option.icon className={`h-6 w-6 ${isActive ? option.text : 'text-foreground/70'}`} />
                                        </div>
                                        <div>
                                            <h4 className="text-base font-semibold tracking-tight text-foreground">
                                                {option.label}
                                            </h4>
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                {option.description}
                                            </p>
                                        </div>
                                    </div>
                                    
                                    {isActive && (
                                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className={`rounded-full p-1 ${option.bg} ${option.text}`}>
                                            <HiOutlineCheckCircle className="h-5 w-5" />
                                        </motion.div>
                                    )}
                                </div>

                                <div className="relative z-10 mt-6 flex items-end justify-between w-full">
                                    <div className="w-full max-w-[60%]">
                                        <div className="mb-2 flex items-center justify-between text-xs font-medium">
                                            <span className="text-muted-foreground">{percent}%</span>
                                        </div>
                                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${percent}%` }}
                                                transition={{ type: 'spring', bounce: 0, duration: 1 }}
                                                className={`h-full rounded-full ${isActive ? `bg-${option.theme}-500` : 'bg-foreground/30'}`}
                                            />
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className={`text-2xl font-semibold tracking-tight ${isActive ? option.text : 'text-foreground'}`}>
                                            {count}
                                        </span>
                                    </div>
                                </div>
                            </motion.button>
                        );
                    })}
                </div>

                {/* Clean Voter Standings */}
                <div className="mt-6 rounded-[24px] border border-black/5 bg-white/95 p-1 md:backdrop-blur-md md:bg-white/40 dark:border-white/5 dark:bg-slate-900/95 md:dark:bg-white/5">
                    <div className="rounded-[20px] bg-white/50 px-4 py-3 dark:bg-slate-900/50">
                        <div className="mb-4 flex items-center justify-between">
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Current Standings</h4>
                            <span className="text-[10px] font-medium text-muted-foreground opacity-60">Updated Live</span>
                        </div>

                        <div className="space-y-4">
                            {pollOptions.map((opt) => {
                                const votersForType = votes.filter((v) => v.type === opt.id);
                                if (votersForType.length === 0) return null;

                                return (
                                    <div key={opt.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl p-3 bg-black/5 dark:bg-white/5 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${opt.bg} ${opt.text}`}>
                                                <opt.icon className="h-4 w-4" />
                                            </div>
                                            <span className="text-sm font-medium text-foreground w-16">{opt.label}</span>
                                        </div>
                                        
                                        <div className="flex flex-wrap gap-2 flex-1 sm:justify-end">
                                            {votersForType.map((vote) => {
                                                const voteKey = vote.user?._id || vote.user?.id || `${vote.type}-${vote.user?.name}`;
                                                return (
                                                    <div
                                                        key={voteKey}
                                                        className="group flex items-center gap-2 rounded-full border border-black/5 bg-white/80 py-1 pl-1 pr-3 text-xs shadow-sm transition-all hover:shadow-md dark:border-white/10 dark:bg-slate-800"
                                                    >
                                                        {vote.user?.image ? (
                                                            <img src={vote.user.image} alt={vote.user.name} className="h-6 w-6 rounded-full object-cover" />
                                                        ) : (
                                                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-foreground/10 text-[10px] font-medium text-foreground">
                                                                {vote.user?.name?.charAt(0)?.toUpperCase() || '?'}
                                                            </div>
                                                        )}
                                                        <span className="max-w-[100px] truncate font-medium text-foreground/80">
                                                            {vote.user?.name || 'Member'}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}

                            {(!votes || votes.length === 0) && (
                                <div className="flex flex-col items-center justify-center py-10 opacity-60">
                                    <HiOutlineUserGroup className="h-8 w-8 text-muted-foreground mb-3" />
                                    <p className="text-sm font-medium text-foreground">No selections recorded yet.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MealPolling;