import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    HiOutlineCalendarDays,
    HiOutlineCurrencyDollar,
    HiOutlineShoppingCart,
    HiOutlineChatBubbleBottomCenterText,
    HiOutlinePencilSquare,
    HiOutlineTrash,
    HiOutlineUser,
    HiOutlineEnvelope,
    HiOutlineShoppingBag,
} from 'react-icons/hi2';
import { format, isToday, isYesterday, differenceInDays } from 'date-fns';
import { Button } from '@/shared/components/ui';

/* ─── Smart date helper ─── */
const smartDate = (date) => {
    const d = new Date(date);
    if (isToday(d)) return { primary: 'Today', secondary: format(d, 'MMM d') };
    if (isYesterday(d)) return { primary: 'Yesterday', secondary: format(d, 'MMM d') };
    if (differenceInDays(new Date(), d) < 7)
        return { primary: format(d, 'EEEE'), secondary: format(d, 'MMM d') };
    return { primary: format(d, 'MMM d'), secondary: format(d, 'yyyy') };
};

/* ─── Amount color utility ─── */
const amountColor = (amount) => {
    if (amount >= 1000) return 'text-rose-500 dark:text-rose-400';
    if (amount >= 500) return 'text-amber-500 dark:text-amber-400';
    return 'text-emerald-600 dark:text-emerald-400';
};

/* ═══════════════════════════════════════════
   MARKET CARD — grid view
═══════════════════════════════════════════ */
const MarketCard = ({ market, onEdit, onDelete, isAdmin, index }) => {
    const date = smartDate(market.date);

    return (
        <motion.article
            layoutId={`card-${market._id}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.22, delay: index * 0.035, ease: [0.22, 1, 0.36, 1] }}
            className="group relative flex flex-col rounded-[18px] bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl border border-black/5 dark:border-white/10 overflow-hidden shadow-lg hover:shadow-xl dark:shadow-black/40 hover:shadow-emerald-500/[0.06] transition-all duration-300 hover:-translate-y-1 before:absolute before:inset-x-12 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/60 dark:before:via-white/20 before:to-transparent after:absolute after:inset-x-12 after:bottom-0 after:h-px after:bg-gradient-to-r after:from-transparent after:via-black/20 dark:after:via-black/60 after:to-transparent"
        >
            {/* ── Header ── */}
            <div className="flex items-start justify-between px-4 pt-3.5">
                <span className="inline-flex items-center gap-1 px-2 py-[3px] rounded-[7px] text-[10px] font-bold uppercase tracking-widest bg-emerald-50 dark:bg-emerald-400/10 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-300/60 dark:ring-emerald-400/20">
                    <HiOutlineShoppingBag className="w-2.5 h-2.5" />
                    Market
                </span>
                <div className="text-right leading-none">
                    <p className="text-[11px] font-semibold text-foreground">{date.primary}</p>
                    <p className="text-[10px] text-muted-foreground/70 mt-0.5">{date.secondary}</p>
                </div>
            </div>

            {/* ── Admin user block ── */}
            {isAdmin && market.user && (
                <div className="mx-4 mt-3 rounded-xl bg-muted/50 dark:bg-white/[0.03] border border-border/50 px-3 py-2 flex flex-col gap-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                        <HiOutlineUser className="w-3 h-3 text-muted-foreground/70 flex-shrink-0" />
                        <span className="text-xs font-semibold text-foreground truncate">{market.user.name}</span>
                    </div>
                    {market.user.email && (
                        <div className="flex items-center gap-2 min-w-0">
                            <HiOutlineEnvelope className="w-3 h-3 text-muted-foreground/60 flex-shrink-0" />
                            <span className="text-[11px] text-muted-foreground truncate">{market.user.email}</span>
                        </div>
                    )}
                </div>
            )}

            {/* ── Amount chip ── */}
            <div className="flex items-center gap-1.5 px-4 mt-3 flex-wrap">
                <div className="flex items-baseline gap-0.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 ring-1 ring-emerald-200 dark:ring-emerald-500/20">
                    <span className="text-xs font-bold text-emerald-500">₹</span>
                    <span className={`text-sm font-black tabular-nums leading-none ${amountColor(market.amount)}`}>
                        {Number(market.amount).toLocaleString('en-IN')}
                    </span>
                </div>
            </div>

            {/* ── Items ── */}
            <div className="flex items-start gap-1.5 mx-4 mt-2 min-w-0">
                <HiOutlineShoppingCart className="w-3 h-3 mt-[2px] text-muted-foreground/50 flex-shrink-0" />
                <p className="text-[11px] font-medium text-foreground/80 leading-relaxed line-clamp-2">
                    {market.items}
                </p>
            </div>

            {/* ── Description ── */}
            {market.description && (
                <div className="flex items-start gap-1.5 mx-4 mt-1.5 min-w-0">
                    <HiOutlineChatBubbleBottomCenterText className="w-3 h-3 mt-[1px] text-muted-foreground/50 flex-shrink-0" />
                    <p className="text-[11px] italic text-muted-foreground/60 leading-relaxed line-clamp-2">
                        "{market.description}"
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
                    onClick={() => onEdit(market)}
                    className="flex-1 font-bold text-xs"
                >
                    <HiOutlinePencilSquare className="w-4 h-4" />
                    Edit
                </Button>
                <Button
                    variant="danger"
                    size="sm"
                    iconOnly
                    onClick={() => onDelete(market._id)}
                    aria-label="Delete market entry"
                >
                    <HiOutlineTrash className="w-4 h-4" />
                </Button>
            </div>
        </motion.article>
    );
};

/* ═══════════════════════════════════════════
   MARKET ROW — list view
═══════════════════════════════════════════ */
const MarketRow = ({ market, onEdit, onDelete, isAdmin, index }) => {
    const date = smartDate(market.date);

    return (
        <motion.div
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 6 }}
            transition={{ duration: 0.16, delay: index * 0.025 }}
            className="group relative flex items-center gap-3 px-3 py-2.5 rounded-[14px] bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl border border-black/5 dark:border-white/10 hover:bg-white/80 dark:hover:bg-slate-800/50 hover:border-black/10 dark:hover:border-white/20 transition-all duration-200 shadow-sm hover:shadow-md overflow-hidden before:absolute before:inset-x-8 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/60 dark:before:via-white/20 before:to-transparent after:absolute after:inset-x-8 after:bottom-0 after:h-px after:bg-gradient-to-r after:from-transparent after:via-black/10 dark:after:via-black/40 after:to-transparent"
        >
            {/* Icon pill */}
            <div className="flex-shrink-0 w-8 h-8 rounded-[10px] flex items-center justify-center bg-emerald-50 dark:bg-emerald-400/10 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-300/60 dark:ring-emerald-400/20">
                <HiOutlineShoppingBag className="w-3.5 h-3.5" />
            </div>

            {/* ── Info ── */}
            <div className="flex-1 min-w-0 flex flex-col gap-[3px]">
                {/* Admin: name + email */}
                {isAdmin && market.user && (
                    <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-1">
                            <HiOutlineUser className="w-2.5 h-2.5 text-muted-foreground/60" />
                            <span className="text-xs font-semibold text-foreground">{market.user.name}</span>
                        </div>
                        {market.user.email && (
                            <span className="text-[11px] text-muted-foreground/60 truncate hidden sm:block">
                                {market.user.email}
                            </span>
                        )}
                    </div>
                )}
                {/* Date · amount · items */}
                <div className="flex items-center gap-1.5 flex-wrap text-xs">
                    <div className="flex items-center gap-1">
                        <HiOutlineCalendarDays className="w-3 h-3 text-muted-foreground/60" />
                        <span className="font-medium text-foreground">{date.primary}</span>
                        <span className="text-muted-foreground/50 hidden sm:inline">· {date.secondary}</span>
                    </div>
                    <span className="text-muted-foreground/25">·</span>
                    <div className="flex items-center gap-1">
                        <HiOutlineCurrencyDollar className="w-3 h-3 text-emerald-500" />
                        <span className={`font-black tabular-nums ${amountColor(market.amount)}`}>
                            ₹{Number(market.amount).toLocaleString('en-IN')}
                        </span>
                    </div>
                    <span className="text-muted-foreground/25">·</span>
                    <div className="flex items-center gap-1 min-w-0">
                        <HiOutlineShoppingCart className="w-3 h-3 text-muted-foreground/60 flex-shrink-0" />
                        <span className="text-foreground/80 truncate max-w-[140px] sm:max-w-[220px]">{market.items}</span>
                    </div>
                    {market.description && (
                        <>
                            <span className="text-muted-foreground/25 hidden sm:inline">·</span>
                            <div className="hidden sm:flex items-center gap-1 min-w-0">
                                <HiOutlineChatBubbleBottomCenterText className="w-3 h-3 text-muted-foreground/40 flex-shrink-0" />
                                <span className="text-[11px] italic text-muted-foreground/50 truncate max-w-[160px]">
                                    "{market.description}"
                                </span>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Amount badge — md+ only */}
            <span className="hidden md:inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-2 py-[3px] rounded-[7px] flex-shrink-0 bg-emerald-50 dark:bg-emerald-400/10 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-300/60 dark:ring-emerald-400/20">
                ₹{Number(market.amount).toLocaleString('en-IN')}
            </span>

            {/* Actions — hover reveal */}
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-150 flex-shrink-0 pl-1">
                <Button variant="secondary" size="sm" iconOnly onClick={() => onEdit(market)} title="Edit">
                    <HiOutlinePencilSquare className="w-4 h-4" />
                </Button>
                <Button variant="danger" size="sm" iconOnly onClick={() => onDelete(market._id)} title="Delete">
                    <HiOutlineTrash className="w-4 h-4" />
                </Button>
            </div>
        </motion.div>
    );
};

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
            <HiOutlineShoppingBag className="w-5 h-5 text-muted-foreground/30" />
        </div>
        <div className="text-center">
            <p className="text-sm font-semibold text-foreground">No market entries found</p>
            <p className="text-xs text-muted-foreground mt-0.5 max-w-[200px] mx-auto leading-relaxed">
                Adjust your filters or add a new market entry.
            </p>
        </div>
    </motion.div>
);

/* ═══════════════════════════════════════════
   MAIN EXPORT
═══════════════════════════════════════════ */
const MarketList = ({ markets = [], onEdit, onDelete, isAdmin = false, viewMode = 'grid' }) => {
    if (markets.length === 0) {
        return <EmptyState />;
    }

    if (viewMode === 'list') {
        return (
            <div className="flex flex-col gap-1.5">
                <AnimatePresence mode="popLayout">
                    {markets.map((market, i) => (
                        <MarketRow
                            key={market._id}
                            market={market}
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
                {markets.map((market, i) => (
                    <MarketCard
                        key={market._id}
                        market={market}
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

export default MarketList;
