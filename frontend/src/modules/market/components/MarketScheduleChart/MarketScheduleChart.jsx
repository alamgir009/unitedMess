import { useEffect, useRef, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { HiOutlineChevronDown, HiOutlineShoppingCart } from 'react-icons/hi2';

const AVATAR_DISPLAY = 4;

const MarketScheduleChart = ({ schedule, isLoading, isCollapsed, onToggle }) => {
    const scrollRef = useRef(null);

    const todayStr = new Date().toDateString();

    const scrollToToday = useCallback(() => {
        if (!schedule?.length || !scrollRef.current) return;

        const index = schedule.findIndex(
            (d) => new Date(d.date).toDateString() === todayStr
        );

        if (index !== -1) {
            const el = scrollRef.current.children[index];
            el?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        }
    }, [schedule, todayStr]);

    useEffect(() => {
        if (!isLoading && !isCollapsed) {
            setTimeout(scrollToToday, 250);
        }
    }, [schedule, isLoading, isCollapsed, scrollToToday]);

    const todayMember = useMemo(
        () => schedule?.find((d) => new Date(d.date).toDateString() === todayStr)?.user || null,
        [schedule, todayStr]
    );

    const upcomingMembers = useMemo(() => {
        if (!schedule?.length) return [];
        return schedule.filter((d) => d.user && new Date(d.date) >= new Date(todayStr));
    }, [schedule, todayStr]);

    const displayedMembers = upcomingMembers.slice(0, AVATAR_DISPLAY);
    const remainingCount = Math.max(0, upcomingMembers.length - AVATAR_DISPLAY);

    if (isLoading) {
        return (
            <div className="mb-8">
                <div
                    className="rounded-2xl sm:rounded-[20px] border border-border/60 dark:border-white/10
                    bg-card dark:bg-card shadow-sm md:shadow-lg overflow-hidden"
                >
                    <div className="px-4 py-4 sm:px-5 sm:py-5 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="p-2 sm:p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 animate-pulse">
                                <HiOutlineShoppingCart className="w-4 h-4 sm:w-5 sm:h-5" />
                            </div>
                            <div>
                                <div className="h-4 w-28 bg-muted/60 rounded-lg animate-pulse" />
                                <div className="h-3 w-20 bg-muted/40 rounded mt-1.5 animate-pulse" />
                            </div>
                        </div>
                        <div className="h-5 w-5 bg-muted/40 rounded animate-pulse" />
                    </div>
                </div>
            </div>
        );
    }

    if (!schedule?.length) return null;

    return (
        <div className="mb-8">
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
                className={`
                    rounded-2xl sm:rounded-[20px]
                    border border-border/60 dark:border-white/10
                    bg-card dark:bg-card
                    shadow-sm md:shadow-lg
                    overflow-hidden
                    transition-shadow duration-300
                    ${!isCollapsed ? 'ring-1 ring-emerald-500/20 shadow-emerald-500/5' : ''}
                `}
            >
                {/* ── Header Toggle ── */}
                <button
                    onClick={onToggle}
                    className="w-full px-4 py-4 sm:px-5 sm:py-5 flex items-center justify-between gap-3 text-left group"
                    aria-expanded={!isCollapsed}
                >
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 sm:p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 flex-shrink-0">
                            <HiOutlineShoppingCart className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-sm sm:text-base font-semibold text-foreground tracking-tight">
                                Market Schedule
                            </h3>
                            <p className="text-xs text-muted-foreground truncate">
                                {isCollapsed
                                    ? todayMember
                                        ? `Today: ${todayMember.name.split(' ')[0]}`
                                        : 'Tap to view schedule'
                                    : 'Viewing market schedule'}
                            </p>
                        </div>
                    </div>

                    {/* Collapsed member strip */}
                    {isCollapsed && upcomingMembers.length > 0 && (
                        <div className="hidden sm:flex items-center gap-1.5 flex-shrink-0 mr-2">
                            <div className="relative">
                                <div className="flex items-center gap-1.5 pr-2">
                                    {displayedMembers.map((day, i) => {
                                        const dateObj = new Date(day.date);
                                        const isToday = dateObj.toDateString() === todayStr;
                                        return (
                                            <div
                                                key={i}
                                                className={`
                                                    flex items-center gap-1.5 px-2 py-1 rounded-full
                                                    border transition-all duration-200
                                                    ${isToday
                                                        ? 'bg-emerald-500/10 border-emerald-400/30'
                                                        : 'bg-muted/30 border-white/10 group-hover:border-white/20'
                                                    }
                                                `}
                                            >
                                                <div
                                                    className={`
                                                        w-6 h-6 rounded-full overflow-hidden border flex items-center justify-center text-[10px] font-semibold flex-shrink-0
                                                        ${isToday
                                                            ? 'border-emerald-400/50 bg-emerald-500/20 text-emerald-300'
                                                            : 'border-white/20 bg-white/5 text-muted-foreground'
                                                        }
                                                    `}
                                                >
                                                    {day.user.image ? (
                                                        <img
                                                            src={day.user.image}
                                                            alt={day.user.name}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        day.user.name.charAt(0).toUpperCase()
                                                    )}
                                                </div>
                                                <span className="text-[11px] font-medium text-muted-foreground truncate max-w-[50px]">
                                                    {day.user.name.split(' ')[0]}
                                                </span>
                                            </div>
                                        );
                                    })}
                                    {remainingCount > 0 && (
                                        <div className="px-2 py-1 rounded-full bg-muted/30 border border-white/10 text-[11px] font-medium text-muted-foreground">
                                            +{remainingCount}
                                        </div>
                                    )}
                                </div>
                                {/* Right edge fade */}
                                <div className="absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-card dark:from-card to-transparent pointer-events-none rounded-r-full" />
                            </div>
                        </div>
                    )}

                    {/* Expanded: Today chip */}
                    {!isCollapsed && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                scrollToToday();
                            }}
                            className="
                                flex-shrink-0
                                px-3 py-1 rounded-full text-xs font-medium
                                bg-emerald-500/10 text-emerald-400
                                border border-emerald-400/30
                                backdrop-blur-md
                                hover:bg-emerald-500/20
                                transition-all shadow-sm
                            "
                        >
                            Today
                        </button>
                    )}

                    {/* Chevron */}
                    <motion.div
                        animate={{ rotate: isCollapsed ? 0 : 180 }}
                        transition={{ duration: 0.2, ease: 'easeInOut' }}
                        className="text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0"
                    >
                        <HiOutlineChevronDown className="w-4 h-4 sm:w-5 sm:h-5" />
                    </motion.div>
                </button>

                {/* ── Collapsible Body ── */}
                <div
                    className="grid transition-all duration-400 ease-out will-change-[grid-template-rows]"
                    style={{
                        gridTemplateRows: isCollapsed ? '0fr' : '1fr',
                        transitionTimingFunction: 'cubic-bezier(0.33, 1, 0.68, 1)',
                    }}
                >
                    <div className="overflow-hidden">
                        <div
                            className={`
                                px-4 pb-4 sm:px-5 sm:pb-5
                                transition-all duration-400 ease-out
                                ${isCollapsed ? 'opacity-0 -translate-y-1.5' : 'opacity-100 translate-y-0 delay-100'}
                            `}
                        >
                            <div className="relative">
                                {/* Horizontal scroll container */}
                                <div
                                    ref={scrollRef}
                                    className="
                                        flex gap-5 overflow-x-auto pb-4
                                        cursor-grab active:cursor-grabbing
                                        scroll-smooth
                                        [-webkit-overflow-scrolling:touch]
                                        scrollbar-thin scrollbar-track-gray-200/50 scrollbar-thumb-gray-400/70
                                        dark:scrollbar-track-gray-800/50 dark:scrollbar-thumb-gray-600/70
                                        hover:scrollbar-thumb-gray-500/80
                                        [scrollbar-width:thin]
                                    "
                                    style={{
                                        maskImage: 'linear-gradient(90deg, transparent 0%, black 5%, black 95%, transparent 100%)',
                                        WebkitMaskImage: 'linear-gradient(90deg, transparent 0%, black 5%, black 95%, transparent 100%)',
                                        scrollSnapType: 'x mandatory',
                                    }}
                                >
                                    {schedule.map((day, i) => {
                                        const dateObj = new Date(day.date);
                                        const isToday = dateObj.toDateString() === todayStr;

                                        return (
                                            <motion.div
                                                key={i}
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: i * 0.03 }}
                                                className={`
                                                    relative group min-w-[150px] flex-shrink-0
                                                    rounded-3xl p-5 flex flex-col items-center
                                                    border transition-all duration-200
                                                    scroll-snap-align-start
                                                    ${isToday
                                                        ? `
                                                            bg-gradient-to-b from-emerald-500/20 to-emerald-900/10
                                                            border-emerald-400/40
                                                            shadow-[0_0_40px_rgba(16,185,129,0.25)]
                                                            scale-[1.05]
                                                        `
                                                        : `
                                                            bg-white/40 dark:bg-white/5
                                                            border-white/10
                                                            hover:bg-white/80 dark:hover:bg-white/10
                                                            hover:border-white/40
                                                            hover:shadow-md
                                                            hover:scale-[1.02]
                                                        `
                                                    }
                                                `}
                                            >
                                                <p className={`text-[11px] uppercase tracking-widest 
                                                    ${isToday ? 'text-emerald-400' : 'text-muted-foreground'}`}>
                                                    {dateObj.toLocaleDateString(undefined, { weekday: 'short' })}
                                                </p>

                                                <p className={`text-lg font-semibold mt-1 
                                                    ${isToday ? 'text-emerald-300' : 'text-foreground'}`}>
                                                    {dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                </p>

                                                {day.user ? (
                                                    <>
                                                        <div className="mt-4 w-14 h-14 rounded-full overflow-hidden border flex items-center justify-center text-lg font-semibold">
                                                            {day.user.image ? (
                                                                <img
                                                                    src={day.user.image}
                                                                    alt={day.user.name}
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            ) : (
                                                                day.user.name.charAt(0).toUpperCase()
                                                            )}
                                                        </div>

                                                        <span className="text-xs mt-2 truncate max-w-[100px]">
                                                            {day.user.name.split(' ')[0]}
                                                        </span>

                                                        <div className="
                                                            absolute bottom-full mb-3
                                                            px-3 py-2 rounded-lg text-xs
                                                            bg-black/80 text-white
                                                            opacity-0 group-hover:opacity-100
                                                            translate-y-2 group-hover:translate-y-0
                                                            transition-all pointer-events-none
                                                            whitespace-nowrap
                                                        ">
                                                            <div className="font-medium">{day.user.name}</div>
                                                            <div className="text-[10px] opacity-70">
                                                                {dateObj.toDateString()}
                                                            </div>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div className="mt-6 text-xs opacity-50">Off</div>
                                                )}
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default MarketScheduleChart;
