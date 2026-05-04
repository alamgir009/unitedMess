import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    HiOutlineSun,
    HiOutlineMoon,
    HiOutlineNoSymbol,
    HiOutlineSparkles,
    HiOutlineUserGroup,
    HiOutlineCalendarDays,
    HiOutlineChatBubbleBottomCenterText,
    HiOutlinePencilSquare,
    HiOutlineTrash,
    HiOutlineUser,
    HiOutlineEnvelope,
    HiOutlineSquares2X2,
} from 'react-icons/hi2';
import { format, isToday, isYesterday, differenceInDays } from 'date-fns';
import { Button } from '@/shared/components/ui';// ← adjust to your Button path

/* ═══════════════════════════════════════════
   TYPE CONFIG
═══════════════════════════════════════════ */
const TYPE = {
    day: {
        Icon: HiOutlineSun,
        label: 'Day',
        pill: 'bg-amber-50 dark:bg-amber-400/10 text-amber-600 dark:text-amber-400 ring-1 ring-amber-300/60 dark:ring-amber-400/20',
        bar: 'bg-amber-400',
        glow: 'hover:shadow-amber-500/[0.08]',
    },
    night: {
        Icon: HiOutlineMoon,
        label: 'Night',
        pill: 'bg-violet-50 dark:bg-violet-400/10 text-violet-600 dark:text-violet-400 ring-1 ring-violet-300/60 dark:ring-violet-400/20',
        bar: 'bg-violet-400',
        glow: 'hover:shadow-violet-500/[0.08]',
    },
    both: {
        Icon: HiOutlineSparkles,
        label: 'Both',
        pill: 'bg-sky-50 dark:bg-sky-400/10 text-sky-600 dark:text-sky-400 ring-1 ring-sky-300/60 dark:ring-sky-400/20',
        bar: 'bg-sky-400',
        glow: 'hover:shadow-sky-500/[0.08]',
    },
    off: {
        Icon: HiOutlineNoSymbol,
        label: 'Off',
        pill: 'bg-rose-50 dark:bg-rose-400/10 text-rose-600 dark:text-rose-400 ring-1 ring-rose-300/60 dark:ring-rose-400/20',
        bar: 'bg-rose-400',
        glow: 'hover:shadow-rose-500/[0.08]',
    },
};

/* ═══════════════════════════════════════════
   SMART DATE
═══════════════════════════════════════════ */
const smartDate = (date) => {
    const d = new Date(date);
    if (isToday(d)) return { primary: 'Today', secondary: format(d, 'MMM d') };
    if (isYesterday(d)) return { primary: 'Yesterday', secondary: format(d, 'MMM d') };
    if (differenceInDays(new Date(), d) < 7)
        return { primary: format(d, 'EEEE'), secondary: format(d, 'MMM d') };
    return { primary: format(d, 'MMM d'), secondary: format(d, 'yyyy') };
};

/* ═══════════════════════════════════════════
   MEAL CARD  ── grid view
═══════════════════════════════════════════ */
const MealCard = React.forwardRef(({ meal, onEdit, onDelete, isAdmin, index }, ref) => {
    const cfg = TYPE[meal.type] || TYPE.both;
    const { Icon } = cfg;
    const date = smartDate(meal.date);

    return (
        <motion.article
            ref={ref}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.2, delay: Math.min(index * 0.03, 0.3) }}
            className={`group relative flex flex-col rounded-[18px] bg-white/95 dark:bg-slate-900/95 md:bg-white/60 md:dark:bg-slate-900/40 md:backdrop-blur-md border border-black/5 dark:border-white/10 overflow-hidden shadow-sm hover:shadow-xl dark:shadow-black/40 ${cfg.glow} transition-all duration-300 hover:-translate-y-1 before:absolute before:inset-x-12 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/60 dark:before:via-white/20 before:to-transparent after:absolute after:inset-x-12 after:bottom-0 after:h-px after:bg-gradient-to-r after:from-transparent after:via-black/20 dark:after:via-black/60 after:to-transparent`}
        >
            {/* ── Header: type pill ←→ date ── */}
            <div className="flex items-start justify-between px-4 pt-3.5">
                <span className={`inline-flex items-center gap-1 px-2 py-[3px] rounded-[7px] text-[10px] font-bold uppercase tracking-widest ${cfg.pill}`}>
                    <Icon className="w-2.5 h-2.5" />
                    {cfg.label}
                </span>
                <div className="text-right leading-none">
                    <p className="text-[11px] font-semibold text-foreground">{date.primary}</p>
                    <p className="text-[10px] text-muted-foreground/70 mt-0.5">{date.secondary}</p>
                </div>
            </div>

            {/* ── Admin user block ── */}
            {isAdmin && meal.user && (
                <div className="mx-4 mt-3 rounded-xl bg-muted/50 dark:bg-white/[0.03] border border-border/50 px-3 py-2 flex flex-col gap-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                        <HiOutlineUser className="w-3 h-3 text-muted-foreground/70 flex-shrink-0" />
                        <span className="text-xs font-semibold text-foreground truncate">{meal.user.name}</span>
                    </div>
                    {meal.user.email && (
                        <div className="flex items-center gap-2 min-w-0">
                            <HiOutlineEnvelope className="w-3 h-3 text-muted-foreground/60 flex-shrink-0" />
                            <span className="text-[11px] text-muted-foreground truncate">{meal.user.email}</span>
                        </div>
                    )}
                </div>
            )}

            {/* ── Stat chips ── */}
            <div className="flex items-center gap-1.5 px-4 mt-3 flex-wrap">
                {/* Meal count */}
                <div className="flex items-baseline gap-1 px-2.5 py-1 rounded-lg bg-muted/60 dark:bg-white/[0.04] ring-1 ring-border/60">
                    <span className="text-sm font-black tabular-nums text-foreground leading-none">{meal.mealCount}</span>
                    <span className="text-[10px] font-medium text-muted-foreground">
                        {meal.mealCount !== 1 ? 'meals' : 'meal'}
                    </span>
                </div>
                {/* Guest chip */}
                {meal.isGuestMeal && meal.guestCount > 0 && (
                    <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-500/10 ring-1 ring-amber-200 dark:ring-amber-500/20">
                        <HiOutlineUserGroup className="w-3 h-3 text-amber-500" />
                        <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 tabular-nums">+{meal.guestCount}</span>
                        <span className="text-[10px] text-amber-500/80">guest</span>
                    </div>
                )}
            </div>

            {/* ── Remarks ── */}
            {meal.remarks && (
                <div className="flex items-start gap-1.5 mx-4 mt-2 min-w-0">
                    <HiOutlineChatBubbleBottomCenterText className="w-3 h-3 mt-[1px] text-muted-foreground/50 flex-shrink-0" />
                    <p className="text-[11px] italic text-muted-foreground/60 leading-relaxed line-clamp-2">
                        "{meal.remarks}"
                    </p>
                </div>
            )}

            {/* Spacer */}
            <div className="flex-1 min-h-[10px]" />

            {/* ── Divider ── */}
            <div className="mx-4 mt-3 h-px bg-border/40" />

            {/* ── Action row ── */}
            <div className="flex items-center gap-2 px-4 py-3">
                <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onEdit(meal)}
                    className="flex-1 font-bold text-xs"
                >
                    <HiOutlinePencilSquare className="w-4 h-4" />
                    Edit
                </Button>
                <Button
                    variant="danger"
                    size="sm"
                    iconOnly
                    onClick={() => onDelete(meal._id)}
                    aria-label="Delete meal"
                >
                    <HiOutlineTrash className="w-4 h-4" />
                </Button>
            </div>
        </motion.article>
    );
});
MealCard.displayName = 'MealCard';

/* ═══════════════════════════════════════════
   MEAL ROW  ── list view
═══════════════════════════════════════════ */
const MealRow = React.forwardRef(({ meal, onEdit, onDelete, isAdmin, index }, ref) => {
    const cfg = TYPE[meal.type] || TYPE.both;
    const { Icon } = cfg;
    const date = smartDate(meal.date);

    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 6 }}
            transition={{ duration: 0.15, delay: Math.min(index * 0.02, 0.2) }}
            className="group relative flex items-center gap-3 px-3 py-2.5 rounded-[14px] bg-white/95 dark:bg-slate-900/95 md:bg-white/60 md:dark:bg-slate-900/40 md:backdrop-blur-md border border-black/5 dark:border-white/10 hover:bg-white dark:hover:bg-slate-800 hover:border-black/10 dark:hover:border-white/20 transition-all duration-200 shadow-sm hover:shadow-md overflow-hidden before:absolute before:inset-x-8 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/60 dark:before:via-white/20 before:to-transparent after:absolute after:inset-x-8 after:bottom-0 after:h-px after:bg-gradient-to-r after:from-transparent after:via-black/10 dark:after:via-black/40 after:to-transparent"
        >
            {/* Icon pill */}
            <div className={`flex-shrink-0 w-8 h-8 rounded-[10px] flex items-center justify-center ${cfg.pill}`}>
                <Icon className="w-3.5 h-3.5" />
            </div>

            {/* ── Info ── */}
            <div className="flex-1 min-w-0 flex flex-col gap-[3px]">
                {/* Admin: name + email */}
                {isAdmin && meal.user && (
                    <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-1">
                            <HiOutlineUser className="w-2.5 h-2.5 text-muted-foreground/60" />
                            <span className="text-xs font-semibold text-foreground">{meal.user.name}</span>
                        </div>
                        {meal.user.email && (
                            <span className="text-[11px] text-muted-foreground/60 truncate hidden sm:block">
                                {meal.user.email}
                            </span>
                        )}
                    </div>
                )}
                {/* Date · meals · guests · remarks */}
                <div className="flex items-center gap-1.5 flex-wrap text-xs">
                    <div className="flex items-center gap-1">
                        <HiOutlineCalendarDays className="w-3 h-3 text-muted-foreground/60" />
                        <span className="font-medium text-foreground">{date.primary}</span>
                        <span className="text-muted-foreground/50 hidden sm:inline">· {date.secondary}</span>
                    </div>
                    <span className="text-muted-foreground/25">·</span>
                    <div className="flex items-center gap-1">
                        <HiOutlineSquares2X2 className="w-3 h-3 text-muted-foreground/60" />
                        <span className="font-bold text-foreground tabular-nums">{meal.mealCount}</span>
                        <span className="text-muted-foreground/70 text-[11px]">{meal.mealCount !== 1 ? 'meals' : 'meal'}</span>
                    </div>
                    {meal.isGuestMeal && meal.guestCount > 0 && (
                        <>
                            <span className="text-muted-foreground/25">·</span>
                            <div className="flex items-center gap-1">
                                <HiOutlineUserGroup className="w-3 h-3 text-amber-500" />
                                <span className="font-semibold text-amber-600 dark:text-amber-400 text-[11px] tabular-nums">+{meal.guestCount}</span>
                            </div>
                        </>
                    )}
                    {meal.remarks && (
                        <>
                            <span className="text-muted-foreground/25 hidden sm:inline">·</span>
                            <div className="hidden sm:flex items-center gap-1 min-w-0">
                                <HiOutlineChatBubbleBottomCenterText className="w-3 h-3 text-muted-foreground/40 flex-shrink-0" />
                                <span className="text-[11px] italic text-muted-foreground/50 truncate max-w-[160px]">
                                    "{meal.remarks}"
                                </span>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Type badge — md+ only */}
            <span className={`hidden md:inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-2 py-[3px] rounded-[7px] flex-shrink-0 ${cfg.pill}`}>
                <Icon className="w-2.5 h-2.5" />
                {cfg.label}
            </span>

            {/* Actions — hover reveal */}
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-150 flex-shrink-0 pl-1">
                <Button
                    variant="secondary"
                    size="sm"
                    iconOnly
                    onClick={() => onEdit(meal)}
                    title="Edit"
                >
                    <HiOutlinePencilSquare className="w-4 h-4" />
                </Button>
                <Button
                    variant="danger"
                    size="sm"
                    iconOnly
                    onClick={() => onDelete(meal._id)}
                    title="Delete"
                >
                    <HiOutlineTrash className="w-4 h-4" />
                </Button>
            </div>
        </motion.div>
    );
});
MealRow.displayName = 'MealRow';

/* ═══════════════════════════════════════════
   EMPTY STATE
═══════════════════════════════════════════ */
const EmptyState = () => (
    <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className="col-span-full flex flex-col items-center gap-3 py-16 select-none"
    >
        <div className="w-12 h-12 rounded-2xl bg-muted/60 dark:bg-white/[0.04] border border-border/50 flex items-center justify-center">
            <HiOutlineSparkles className="w-5 h-5 text-muted-foreground/30" />
        </div>
        <div className="text-center">
            <p className="text-sm font-semibold text-foreground">No meals found</p>
            <p className="text-xs text-muted-foreground mt-0.5 max-w-[200px] mx-auto leading-relaxed">
                Adjust your filters or add a new meal entry.
            </p>
        </div>
    </motion.div>
);

/* ═══════════════════════════════════════════
   MAIN EXPORT
═══════════════════════════════════════════ */
const MealList = ({ meals = [], onEdit, onDelete, isAdmin = false, viewMode = 'grid' }) => {

    if (meals.length === 0) {
        return <EmptyState />;
    }

    if (viewMode === 'list') {
        return (
            <div className="flex flex-col gap-1.5">
                <AnimatePresence mode="popLayout">
                    {meals.map((meal, i) => (
                        <MealRow
                            key={meal._id}
                            meal={meal}
                            index={i}
                            onEdit={onEdit}
                            onDelete={onDelete}
                            isAdmin={isAdmin}
                        />
                    ))}
                </AnimatePresence>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            <AnimatePresence mode="popLayout">
                {meals.map((meal, i) => (
                    <MealCard
                        key={meal._id}
                        meal={meal}
                        index={i}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        isAdmin={isAdmin}
                    />
                ))}
            </AnimatePresence>
        </div>
    );
};

export default MealList;