import React from 'react';
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
import { Button } from '@/shared/components/ui';
import { formatSmartDate } from '@/core/utils/helpers/date.helper';

/* Amount color utility */
const amountColor = (amount) => {
    if (amount >= 1000) return 'text-rose-500 dark:text-rose-400';
    if (amount >= 500) return 'text-amber-500 dark:text-amber-400';
    return 'text-emerald-600 dark:text-emerald-400';
};

/* MARKET CARD -- grid view */
const MarketCard = React.memo(React.forwardRef(({ market, onEdit, onDelete, isAdmin }, ref) => {
    const date = formatSmartDate(market.date);
    const formattedAmount = Number(market.amount).toLocaleString('en-IN');
    const amtColor = amountColor(market.amount);

    return (
        <article
            ref={ref}
            className="group relative flex flex-col rounded-xl bg-card dark:bg-card border border-border/50 dark:border-white/10 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden"
        >
            {/* Header */}
            <div className="flex items-start justify-between px-4 pt-3.5">
                <span className="inline-flex items-center gap-1 px-2 py-[3px] rounded-md text-[10px] font-bold uppercase tracking-widest bg-emerald-50 dark:bg-emerald-400/10 text-emerald-600 dark:text-emerald-400">
                    <HiOutlineShoppingBag className="w-2.5 h-2.5" />
                    Market
                </span>
                <div className="text-right leading-none">
                    <p className="text-[11px] font-semibold text-foreground">{date.primary}</p>
                    <p className="text-[10px] text-muted-foreground/70 mt-0.5">{date.secondary}</p>
                </div>
            </div>

            {/* Admin user block */}
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

            {/* Amount chip */}
            <div className="flex items-center gap-1.5 px-4 mt-3 flex-wrap">
                <div className="flex items-baseline gap-0.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-500/10">
                    <span className="text-xs font-bold text-emerald-500">₹</span>
                    <span className={`text-sm font-black tabular-nums leading-none ${amtColor}`}>
                        {formattedAmount}
                    </span>
                </div>
            </div>

            {/* Items */}
            <div className="flex items-start gap-1.5 mx-4 mt-2 min-w-0">
                <HiOutlineShoppingCart className="w-3 h-3 mt-[2px] text-muted-foreground/50 flex-shrink-0" />
                <p className="text-[11px] font-medium text-foreground/80 leading-relaxed line-clamp-2">
                    {market.items}
                </p>
            </div>

            {/* Description */}
            {market.description && (
                <div className="flex items-start gap-1.5 mx-4 mt-1.5 min-w-0">
                    <HiOutlineChatBubbleBottomCenterText className="w-3 h-3 mt-[1px] text-muted-foreground/50 flex-shrink-0" />
                    <p className="text-[11px] italic text-muted-foreground/60 leading-relaxed line-clamp-2">
                        &quot;{market.description}&quot;
                    </p>
                </div>
            )}

            {/* Spacer */}
            <div className="flex-1 min-h-[10px]" />

            {/* Divider */}
            <div className="mx-4 mt-3 h-px bg-border/40" />

            {/* Action row */}
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
                    onClick={() => onDelete(market)}
                    aria-label="Delete market entry"
                >
                    <HiOutlineTrash className="w-4 h-4" />
                </Button>
            </div>
        </article>
    );
}));
MarketCard.displayName = 'MarketCard';

/* MARKET ROW -- list view */
const MarketRow = React.memo(React.forwardRef(({ market, onEdit, onDelete, isAdmin }, ref) => {
    const date = formatSmartDate(market.date);
    const formattedAmount = Number(market.amount).toLocaleString('en-IN');
    const amtColor = amountColor(market.amount);

    return (
        <div
            ref={ref}
            className="group relative flex items-center gap-3 px-3 py-2.5 rounded-xl bg-card dark:bg-card border border-border/50 dark:border-white/10 hover:bg-muted/20 dark:hover:bg-white/[0.03] hover:border-border/70 dark:hover:border-white/15 transition-colors duration-200 shadow-sm overflow-hidden"
        >
            {/* Icon pill */}
            <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-50 dark:bg-emerald-400/10 text-emerald-600 dark:text-emerald-400">
                <HiOutlineShoppingBag className="w-3.5 h-3.5" />
            </div>

            {/* Info */}
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
                {/* Date . amount . items */}
                <div className="flex items-center gap-1.5 flex-wrap text-xs">
                    <div className="flex items-center gap-1">
                        <HiOutlineCalendarDays className="w-3 h-3 text-muted-foreground/60" />
                        <span className="font-medium text-foreground">{date.primary}</span>
                        <span className="text-muted-foreground/50 hidden sm:inline">. {date.secondary}</span>
                    </div>
                    <span className="text-muted-foreground/25">.</span>
                    <div className="flex items-center gap-1">
                        <HiOutlineCurrencyDollar className="w-3 h-3 text-emerald-500" />
                        <span className={`font-black tabular-nums ${amtColor}`}>
                            ₹{formattedAmount}
                        </span>
                    </div>
                    <span className="text-muted-foreground/25">.</span>
                    <div className="flex items-center gap-1 min-w-0">
                        <HiOutlineShoppingCart className="w-3 h-3 text-muted-foreground/60 flex-shrink-0" />
                        <span className="text-foreground/80 truncate max-w-[140px] sm:max-w-[220px]">{market.items}</span>
                    </div>
                    {market.description && (
                        <>
                            <span className="text-muted-foreground/25 hidden sm:inline">.</span>
                            <div className="hidden sm:flex items-center gap-1 min-w-0">
                                <HiOutlineChatBubbleBottomCenterText className="w-3 h-3 text-muted-foreground/40 flex-shrink-0" />
                                <span className="text-[11px] italic text-muted-foreground/50 truncate max-w-[160px]">
                                    &quot;{market.description}&quot;
                                </span>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Amount badge -- md+ only */}
            <span className="hidden md:inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-2 py-[3px] rounded-md flex-shrink-0 bg-emerald-50 dark:bg-emerald-400/10 text-emerald-600 dark:text-emerald-400">
                ₹{formattedAmount}
            </span>

            {/* Actions -- hover reveal */}
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-150 flex-shrink-0 pl-1">
                <Button variant="icon" size="sm" iconOnly onClick={() => onEdit(market)} title="Edit">
                    <HiOutlinePencilSquare className="w-4 h-4" />
                </Button>
                <Button variant="danger" size="sm" iconOnly onClick={() => onDelete(market)} title="Delete">
                    <HiOutlineTrash className="w-4 h-4" />
                </Button>
            </div>
        </div>
    );
}));
MarketRow.displayName = 'MarketRow';

/* EMPTY STATE */
const EmptyState = React.memo(() => (
    <div className="col-span-full flex flex-col items-center gap-3 py-16 select-none">
        <div className="w-12 h-12 rounded-xl bg-muted/60 dark:bg-white/[0.04] border border-border/50 flex items-center justify-center">
            <HiOutlineShoppingBag className="w-5 h-5 text-muted-foreground/30" />
        </div>
        <div className="text-center">
            <p className="text-sm font-semibold text-foreground">No market entries found</p>
            <p className="text-xs text-muted-foreground mt-0.5 max-w-[200px] mx-auto leading-relaxed">
                Adjust your filters or add a new market entry.
            </p>
        </div>
    </div>
));
EmptyState.displayName = 'EmptyState';

/* MAIN EXPORT */
const MarketList = React.memo(({ markets = [], onEdit, onDelete, isAdmin = false, viewMode = 'grid' }) => {
    if (markets.length === 0) {
        return <EmptyState />;
    }

    if (viewMode === 'list') {
        return (
            <div className="flex flex-col gap-2">
                {markets.map((market) => (
                    <MarketRow
                        key={market._id}
                        market={market}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        isAdmin={isAdmin}
                    />
                ))}
            </div>
        );
    }

    return (
        <div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3"
        >
            {markets.map((market) => (
                <MarketCard
                    key={market._id}
                    market={market}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    isAdmin={isAdmin}
                />
            ))}
        </div>
    );
});
MarketList.displayName = 'MarketList';

export default MarketList;
