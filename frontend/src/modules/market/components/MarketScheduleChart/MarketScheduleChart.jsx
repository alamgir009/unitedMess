import { useEffect, useRef, useMemo, useCallback, memo } from 'react';
import { HiOutlineChevronDown, HiOutlineShoppingCart } from 'react-icons/hi2';

const AVATAR_DISPLAY = 4;

const MarketScheduleChart = ({ schedule, isLoading, isCollapsed, onToggle }) => {
    const scrollRef = useRef(null);

    const todayStr = useMemo(() => new Date().toDateString(), []);

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

    const { displayedMembers, remainingCount } = useMemo(() => {
        return {
            displayedMembers: upcomingMembers.slice(0, AVATAR_DISPLAY),
            remainingCount: Math.max(0, upcomingMembers.length - AVATAR_DISPLAY)
        };
    }, [upcomingMembers]);

    if (isLoading) {
        return (
            <div className="mb-6">
                <div
                    className="rounded-xl border border-border/50 bg-card shadow-sm overflow-hidden"
                >
                    <div className="px-4 py-3.5 sm:px-5 sm:py-4 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="p-2 sm:p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 animate-pulse">
                                <HiOutlineShoppingCart className="w-4 h-4 sm:w-5 sm:h-5" />
                            </div>
                            <div>
                                <div className="h-4 w-28 bg-muted/60 rounded animate-pulse" />
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
        <div className="mb-6">
            <div
                className={`
                    rounded-xl
                    border border-border/50
                    bg-card
                    shadow-sm
                    overflow-hidden
                    transition-shadow duration-200
                    ${!isCollapsed ? 'ring-1 ring-emerald-500/15' : ''}
                `}
            >
                <button
                    onClick={onToggle}
                    className="w-full px-4 py-3.5 sm:px-5 sm:py-4 flex items-center justify-between gap-3 text-left group"
                    aria-expanded={!isCollapsed}
                >
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 sm:p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 flex-shrink-0">
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

                    <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0 ml-auto">
                        {isCollapsed && upcomingMembers.length > 0 && (
                            <div className="flex items-center">
                                <div className="flex items-center -space-x-2.5">
                                    {displayedMembers.map((day) => {
                                        const dateObj = new Date(day.date);
                                        const isToday = dateObj.toDateString() === todayStr;
                                        return (
                                            <div
                                                key={day._id || day.date}
                                                className={`
                                                    relative w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden 
                                                    flex items-center justify-center flex-shrink-0
                                                    ring-2 ring-card
                                                    ${isToday
                                                        ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-400/30'
                                                        : 'bg-muted/60 text-muted-foreground border border-border/30'
                                                    }
                                                `}
                                                title={`${day.user.name.split(' ')[0]} - ${dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`}
                                            >
                                                {day.user.image ? (
                                                    <img
                                                        src={day.user.image}
                                                        alt={day.user.name}
                                                        className="w-full h-full object-cover"
                                                        loading="lazy"
                                                    />
                                                ) : (
                                                    <span className="text-[10px] sm:text-xs font-bold uppercase">
                                                        {day.user.name.charAt(0)}
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    })}
                                    {remainingCount > 0 && (
                                        <div 
                                            className="
                                                relative w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden 
                                                flex items-center justify-center flex-shrink-0
                                                ring-2 ring-card
                                                bg-muted/40 border border-border/30
                                                text-[10px] sm:text-xs font-bold text-foreground
                                            "
                                        >
                                            +{remainingCount}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {!isCollapsed && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    scrollToToday();
                                }}
                                className="
                                    flex-shrink-0
                                    px-3 py-1 sm:px-4 sm:py-1.5 rounded-full text-xs font-medium
                                    bg-emerald-500/10 text-emerald-500
                                    border border-emerald-400/25
                                    hover:bg-emerald-500/15
                                    transition-colors
                                "
                            >
                                Today
                            </button>
                        )}

                        <div
                            className="text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0 ml-1 transition-transform duration-200"
                            style={{ transform: isCollapsed ? 'rotate(0deg)' : 'rotate(180deg)' }}
                        >
                            <HiOutlineChevronDown className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                    </div>
                </button>

                <div
                    className="grid transition-all duration-300 ease-out"
                    style={{
                        gridTemplateRows: isCollapsed ? '0fr' : '1fr',
                        transitionTimingFunction: 'cubic-bezier(0.33, 1, 0.68, 1)',
                    }}
                >
                    <div className="overflow-hidden">
                        <div
                            className={`
                                px-4 pb-4 sm:px-5 sm:pb-5
                                transition-all duration-200
                                ${isCollapsed ? 'opacity-0 -translate-y-1' : 'opacity-100 translate-y-0'}
                            `}
                        >
                            <div className="relative">
                                <div
                                    ref={scrollRef}
                                    className="
                                        flex gap-4 overflow-x-auto pb-3
                                        scroll-smooth
                                        [-webkit-overflow-scrolling:touch]
                                        [scrollbar-width:thin]
                                    "
                                    style={{ scrollSnapType: 'x mandatory' }}
                                >
                                    {schedule.map((day) => {
                                        const dateObj = new Date(day.date);
                                        const isToday = dateObj.toDateString() === todayStr;

                                        return (
                                            <div
                                                key={day._id || day.date}
                                                className={`
                                                    relative group min-w-[140px] flex-shrink-0
                                                    rounded-xl p-4 flex flex-col items-center
                                                    border transition-all duration-150
                                                    scroll-snap-align-start
                                                    ${isToday
                                                        ? 'bg-emerald-500/8 dark:bg-emerald-500/10 border-emerald-400/30'
                                                        : 'bg-muted/20 dark:bg-white/[0.03] border-border/30 hover:bg-muted/40 dark:hover:bg-white/[0.06] hover:border-border/50'
                                                    }
                                                `}
                                            >
                                                <p className={`text-[10px] uppercase tracking-wider 
                                                    ${isToday ? 'text-emerald-500' : 'text-muted-foreground'}`}>
                                                    {dateObj.toLocaleDateString(undefined, { weekday: 'short' })}
                                                </p>

                                                <p className={`text-base font-semibold mt-0.5
                                                    ${isToday ? 'text-emerald-500' : 'text-foreground'}`}>
                                                    {dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                </p>

                                                {day.user ? (
                                                    <>
                                                        <div className={`mt-3 w-12 h-12 rounded-full overflow-hidden border flex items-center justify-center text-base font-semibold
                                                            ${isToday ? 'border-emerald-400/30' : 'border-border/30'}`}>
                                                            {day.user.image ? (
                                                                <img
                                                                    src={day.user.image}
                                                                    alt={day.user.name}
                                                                    className="w-full h-full object-cover"
                                                                    loading="lazy"
                                                                />
                                                            ) : (
                                                                day.user.name.charAt(0).toUpperCase()
                                                            )}
                                                        </div>

                                                        <span className="text-xs mt-1.5 truncate max-w-[90px]">
                                                            {day.user.name.split(' ')[0]}
                                                        </span>
                                                    </>
                                                ) : (
                                                    <div className="mt-4 text-xs text-muted-foreground/50">Off</div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default memo(MarketScheduleChart);
