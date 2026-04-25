import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

const MarketScheduleChart = ({ schedule, isLoading }) => {
    const scrollRef = useRef(null);

    const todayStr = new Date().toDateString();

    const scrollToToday = () => {
        if (!schedule?.length || !scrollRef.current) return;

        const index = schedule.findIndex(
            d => new Date(d.date).toDateString() === todayStr
        );

        if (index !== -1) {
            const el = scrollRef.current.children[index];
            el?.scrollIntoView({ behavior: 'smooth', inline: 'center' });
        }
    };

    useEffect(() => {
        if (!isLoading) {
            setTimeout(scrollToToday, 250);
        }
    }, [schedule, isLoading]);

    if (isLoading) {
        return (
            <div className="flex gap-4 overflow-hidden mb-10">
                {[...Array(6)].map((_, i) => (
                    <div
                        key={i}
                        className="min-w-[150px] h-44 rounded-3xl 
                        bg-gradient-to-br from-white/5 to-white/10 
                        animate-pulse border border-white/10"
                    />
                ))}
            </div>
        );
    }

    if (!schedule?.length) return null;

    return (
        <div className="relative mb-10">
            {/* Sticky Today Chip */}
            <button
                onClick={scrollToToday}
                className="
                    absolute top-2 right-4 z-20
                    px-4 py-1.5 rounded-full text-xs font-medium
                    bg-emerald-500/10 text-emerald-400
                    border border-emerald-400/30
                    backdrop-blur-md
                    hover:bg-emerald-500/20
                    transition-all shadow-lg
                "
            >
                Today
            </button>

            <div className="
                p-7 rounded-xl
                bg-gradient-to-br 
                from-white/70 via-white/40 to-white/20 
                dark:from-[#0f172a]/80 dark:via-[#0b1220]/60 dark:to-[#020617]/80
                backdrop-blur-2xl
                border border-white/20 dark:border-white/5
                shadow-xl
            ">
                {/* header */}
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-semibold bg-gradient-to-r from-emerald-500 to-teal-400 bg-clip-text text-transparent">
                        Market Schedule
                    </h2>
                </div>

                {/* Scroll Container with Edge Fade Mask */}
                <motion.div
                    ref={scrollRef}
                    drag="x"
                    dragConstraints={{ left: -1000, right: 0 }}
                    dragElastic={0.08}
                    whileTap={{ cursor: "grabbing" }}
                    className="flex gap-5 overflow-x-auto pb-4 pr-6 cursor-grab"
                    style={{
                        // Fintech-grade edge fade: soft transparency at both ends
                        maskImage: 'linear-gradient(90deg, transparent 0%, black 5%, black 95%, transparent 100%)',
                        WebkitMaskImage: 'linear-gradient(90deg, transparent 0%, black 5%, black 95%, transparent 100%)',
                        // Smooth scrolling & mask rendering
                        willChange: 'transform',
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
                                    border transition-all

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
                                            hover:bg-white/60 dark:hover:bg-white/10
                                            hover:border-white/30
                                        `
                                    }
                                `}
                            >
                                {/* date */}
                                <p className={`text-[11px] uppercase tracking-widest 
                                    ${isToday ? 'text-emerald-400' : 'text-muted-foreground'}`}>
                                    {dateObj.toLocaleDateString(undefined, { weekday: 'short' })}
                                </p>

                                <p className={`text-lg font-semibold mt-1 
                                    ${isToday ? 'text-emerald-300' : 'text-foreground'}`}>
                                    {dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                </p>

                                {/* user */}
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

                                        {/* Tooltip */}
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
                </motion.div>
            </div>
        </div>
    );
};

export default MarketScheduleChart;