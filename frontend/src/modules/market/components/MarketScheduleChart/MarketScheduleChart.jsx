import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';

const MarketScheduleChart = ({ schedule, isLoading }) => {
    const scrollRef = useRef(null);
    const containerRef = useRef(null);
    const isDragging = useRef(false);
    const startX = useRef(0);
    const scrollLeft = useRef(0);
    const velocity = useRef(0);
    const lastX = useRef(0);
    const lastTime = useRef(0);
    const rafId = useRef(null);
    const isPointerDown = useRef(false);

    const todayStr = new Date().toDateString();

    // ─── Momentum / inertia scroll ───────────────────────────────────────────
    const applyMomentum = useCallback(() => {
        const el = scrollRef.current;
        if (!el) return;

        velocity.current *= 0.92; // friction coefficient — tune 0.88–0.96

        if (Math.abs(velocity.current) > 0.5) {
            el.scrollLeft += velocity.current;
            rafId.current = requestAnimationFrame(applyMomentum);
        } else {
            velocity.current = 0;
        }
    }, []);

    // ─── Pointer (mouse + touch unified) events ──────────────────────────────
    const onPointerDown = useCallback((e) => {
        const el = scrollRef.current;
        if (!el) return;

        isPointerDown.current = true;
        isDragging.current = false;

        startX.current = e.type === 'touchstart'
            ? e.touches[0].clientX
            : e.clientX;
        scrollLeft.current = el.scrollLeft;
        lastX.current = startX.current;
        lastTime.current = Date.now();
        velocity.current = 0;

        if (rafId.current) cancelAnimationFrame(rafId.current);

        el.style.scrollSnapType = 'none';
    }, []);

    const onPointerMove = useCallback((e) => {
        if (!isPointerDown.current) return;
        const el = scrollRef.current;
        if (!el) return;

        const clientX = e.type === 'touchmove'
            ? e.touches[0].clientX
            : e.clientX;

        const dx = clientX - startX.current;

        if (Math.abs(dx) > 4) {
            isDragging.current = true;
            // Prevent page scroll on touch when dragging horizontally
            if (e.type === 'touchmove') e.preventDefault();
        }

        if (!isDragging.current) return;

        // Track velocity
        const now = Date.now();
        const dt = now - lastTime.current;
        if (dt > 0) {
            velocity.current = (clientX - lastX.current) / dt * 16; // normalize to ~60fps
        }
        lastX.current = clientX;
        lastTime.current = now;

        el.scrollLeft = scrollLeft.current - dx;
    }, []);

    const onPointerUp = useCallback(() => {
        if (!isPointerDown.current) return;
        isPointerDown.current = false;

        const el = scrollRef.current;
        if (!el) return;

        el.style.scrollSnapType = '';

        if (isDragging.current && Math.abs(velocity.current) > 1) {
            velocity.current *= -1; // invert: drag left = scroll right
            rafId.current = requestAnimationFrame(applyMomentum);
        }

        isDragging.current = false;
    }, [applyMomentum]);

    // ─── Attach events ────────────────────────────────────────────────────────
    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;

        // Mouse
        el.addEventListener('mousedown', onPointerDown);
        window.addEventListener('mousemove', onPointerMove);
        window.addEventListener('mouseup', onPointerUp);

        // Touch — passive:false so we can preventDefault on horizontal drag
        el.addEventListener('touchstart', onPointerDown, { passive: true });
        el.addEventListener('touchmove', onPointerMove, { passive: false });
        el.addEventListener('touchend', onPointerUp);

        return () => {
            el.removeEventListener('mousedown', onPointerDown);
            window.removeEventListener('mousemove', onPointerMove);
            window.removeEventListener('mouseup', onPointerUp);
            el.removeEventListener('touchstart', onPointerDown);
            el.removeEventListener('touchmove', onPointerMove);
            el.removeEventListener('touchend', onPointerUp);
            if (rafId.current) cancelAnimationFrame(rafId.current);
        };
    }, [onPointerDown, onPointerMove, onPointerUp]);

    // ─── Scroll to today ──────────────────────────────────────────────────────
    const scrollToToday = useCallback(() => {
        if (!schedule?.length || !scrollRef.current) return;
        const index = schedule.findIndex(
            d => new Date(d.date).toDateString() === todayStr
        );
        if (index !== -1) {
            const children = scrollRef.current.children;
            if (children[index]) {
                children[index].scrollIntoView({
                    behavior: 'smooth',
                    inline: 'center',
                    block: 'nearest',
                });
            }
        }
    }, [schedule, todayStr]);

    useEffect(() => {
        if (!isLoading) {
            const t = setTimeout(scrollToToday, 250);
            return () => clearTimeout(t);
        }
    }, [schedule, isLoading, scrollToToday]);

    // ─── Loading skeleton ─────────────────────────────────────────────────────
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
        <div className="relative mb-10" ref={containerRef}>
            {/* Today chip */}
            <button
                onClick={scrollToToday}
                className="
                    absolute top-2 right-4 z-20
                    px-4 py-1.5 rounded-full text-xs font-medium
                    bg-emerald-500/10 text-emerald-400
                    border border-emerald-400/30
                    backdrop-blur-md
                    hover:bg-emerald-500/20
                    active:scale-95
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
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-semibold bg-gradient-to-r from-emerald-500 to-teal-400 bg-clip-text text-transparent">
                        Market Schedule
                    </h2>
                </div>

                {/* 
                    Scroll container:
                    - overflow-x: scroll with native momentum on iOS (-webkit-overflow-scrolling: touch)
                    - user-select: none to prevent text selection while dragging
                    - cursor changes on drag state
                    - mask fades on edges
                    - NO framer-motion drag here — we handle it manually for full control
                */}
                <div
                    ref={scrollRef}
                    className="
                        flex gap-5 overflow-x-auto pb-4 pr-6
                        select-none
                        [&::-webkit-scrollbar]:h-1.5
                        [&::-webkit-scrollbar-track]:rounded-full
                        [&::-webkit-scrollbar-track]:bg-gray-200/50
                        [&::-webkit-scrollbar-thumb]:rounded-full
                        [&::-webkit-scrollbar-thumb]:bg-gray-400/70
                        [&::-webkit-scrollbar-thumb]:hover:bg-gray-500/80
                        dark:[&::-webkit-scrollbar-track]:bg-gray-800/50
                        dark:[&::-webkit-scrollbar-thumb]:bg-gray-600/70
                        dark:[&::-webkit-scrollbar-thumb]:hover:bg-gray-500/80
                    "
                    style={{
                        WebkitOverflowScrolling: 'touch', // iOS native momentum
                        overscrollBehaviorX: 'contain',   // prevent page nav swipe
                        scrollBehavior: 'auto',            // we control smoothness via RAF
                        maskImage: 'linear-gradient(90deg, transparent 0%, black 4%, black 96%, transparent 100%)',
                        WebkitMaskImage: 'linear-gradient(90deg, transparent 0%, black 4%, black 96%, transparent 100%)',
                        cursor: isDragging.current ? 'grabbing' : 'grab',
                        willChange: 'scroll-position',
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
                                transition={{ delay: i * 0.03, ease: 'easeOut' }}
                                className={`
                                    relative group min-w-[150px] flex-shrink-0
                                    rounded-3xl p-5 flex flex-col items-center
                                    border transition-all duration-200
                                    pointer-events-none
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
                                {/* Date label */}
                                <p className={`text-[11px] uppercase tracking-widest
                                    ${isToday ? 'text-emerald-400' : 'text-muted-foreground'}`}>
                                    {dateObj.toLocaleDateString(undefined, { weekday: 'short' })}
                                </p>

                                <p className={`text-lg font-semibold mt-1
                                    ${isToday ? 'text-emerald-300' : 'text-foreground'}`}>
                                    {dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                </p>

                                {/* User avatar */}
                                {day.user ? (
                                    <>
                                        <div className="mt-4 w-14 h-14 rounded-full overflow-hidden border flex items-center justify-center text-lg font-semibold">
                                            {day.user.image ? (
                                                <img
                                                    src={day.user.image}
                                                    alt={day.user.name}
                                                    className="w-full h-full object-cover"
                                                    draggable={false}
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
                                            whitespace-nowrap z-30
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
    );
};

export default MarketScheduleChart;