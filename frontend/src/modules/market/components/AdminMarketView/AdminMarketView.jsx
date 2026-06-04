import React, { useState, useMemo, useCallback } from 'react';
import {
    HiOutlineChevronDown,
    HiOutlineShoppingBag,
    HiOutlineCurrencyRupee,
} from 'react-icons/hi2';
import { format } from 'date-fns';
import MarketList from '../MarketList/MarketList';

const getInitials = (name) => {
    if (!name) return '?';
    return name
        .split(' ')
        .filter(Boolean)
        .map((p) => p[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
};

const getMemberColor = (id) => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
        hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    return `hsl(${Math.abs(hash) % 360}, 48%, 48%)`;
};

const formatDateRange = (markets) => {
    if (!markets || markets.length === 0) return '';
    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < markets.length; i++) {
        const t = new Date(markets[i].date).getTime();
        if (t < min) min = t;
        if (t > max) max = t;
    }
    if (min === Infinity) return '';
    return `${format(new Date(min), 'MMM d')} – ${format(new Date(max), 'MMM d')}`;
};

const SkeletonRow = React.memo(() => (
    <div className="rounded-xl border border-border/50 bg-card animate-pulse">
        <div className="flex items-center gap-3 px-4 py-3.5 sm:px-5 sm:py-4">
            <div className="w-10 h-10 rounded-full bg-muted/60 shrink-0" />
            <div className="flex-1 min-w-0 space-y-2">
                <div className="h-4 w-36 bg-muted/40 rounded" />
                <div className="h-3 w-52 bg-muted/30 rounded" />
            </div>
            <div className="h-4 w-20 bg-muted/40 rounded" />
        </div>
    </div>
));
SkeletonRow.displayName = 'SkeletonRow';

const EmptyState = React.memo(() => (
    <div className="flex flex-col items-center gap-3 py-16 select-none">
        <div className="w-12 h-12 rounded-xl bg-muted/60 border border-border/50 flex items-center justify-center">
            <HiOutlineShoppingBag className="w-5 h-5 text-muted-foreground/30" />
        </div>
        <div className="text-center">
            <p className="text-sm font-semibold text-foreground">No market entries found</p>
            <p className="text-xs text-muted-foreground mt-0.5 max-w-[240px] mx-auto leading-relaxed">
                No members have market records matching your filters.
            </p>
        </div>
    </div>
));
EmptyState.displayName = 'EmptyState';

const MemberRow = React.memo(({
    member, markets, isExpanded, onToggle,
    onEdit, onDelete, isAdmin, viewMode,
}) => {
    const color = getMemberColor(member._id);
    const initials = getInitials(member.name);
    const recordsCount = markets.length;
    let totalAmount = 0;
    for (let i = 0; i < markets.length; i++) {
        totalAmount += markets[i].amount || 0;
    }
    const dateRange = formatDateRange(markets);

    return (
        <div className="rounded-xl border border-border/50 bg-card overflow-hidden transition-shadow duration-150">
            <button
                onClick={() => onToggle(member._id)}
                className="w-full px-4 py-3.5 sm:px-5 sm:py-4 flex items-center gap-3 text-left group hover:bg-muted/20 transition-colors duration-150"
                aria-expanded={isExpanded}
                aria-label={`Toggle ${member.name || 'member'} markets`}
                type="button"
            >
                <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0 select-none"
                    style={{ backgroundColor: color }}
                    aria-hidden="true"
                >
                    {initials}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-foreground truncate">
                            {member.name || 'Unknown Member'}
                        </span>
                        <span className="hidden sm:inline text-xs text-muted-foreground truncate">
                            {member.email}
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground flex-wrap">
                        <span className="font-medium tabular-nums">{recordsCount}</span>
                        <span>{recordsCount === 1 ? 'record' : 'records'}</span>
                        <span className="text-muted-foreground/30">·</span>
                        <span className="flex items-center gap-0.5">
                            <HiOutlineCurrencyRupee className="w-3 h-3 text-emerald-500" />
                            <span className="font-medium tabular-nums">{totalAmount.toLocaleString('en-IN')}</span>
                        </span>
                        <span>total</span>
                        {dateRange && (
                            <>
                                <span className="text-muted-foreground/30 hidden sm:inline">·</span>
                                <span className="hidden sm:inline text-muted-foreground/70 tabular-nums">{dateRange}</span>
                            </>
                        )}
                    </div>
                </div>

                <div
                    className="text-muted-foreground group-hover:text-foreground transition-transform duration-200 shrink-0"
                    style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
                >
                    <HiOutlineChevronDown className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
            </button>

            <div
                className="grid transition-all duration-300 ease-out"
                style={{
                    gridTemplateRows: isExpanded ? '1fr' : '0fr',
                    transitionTimingFunction: 'cubic-bezier(0.33, 1, 0.68, 1)',
                }}
            >
                <div className="overflow-hidden">
                    <div
                        className={`px-4 pb-4 sm:px-5 sm:pb-5 transition-all duration-300 ease-out ${
                            isExpanded ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1'
                        }`}
                    >
                        <div className="pt-3 border-t border-border/40">
                            {markets.length > 0 ? (
                                <MarketList
                                    markets={markets}
                                    viewMode={viewMode}
                                    onEdit={onEdit}
                                    onDelete={onDelete}
                                    isAdmin={isAdmin}
                                />
                            ) : (
                                <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
                                    <HiOutlineShoppingBag className="w-4 h-4" />
                                    No market records for this period.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
});
MemberRow.displayName = 'MemberRow';

const AdminMarketView = ({
    markets = [],
    isLoading = false,
    viewMode = 'grid',
    onEdit,
    onDelete,
    isAdmin = true,
}) => {
    const [expandedIds, setExpandedIds] = useState(() => new Set());

    const toggleMember = useCallback((userId) => {
        setExpandedIds((prev) => {
            const next = new Set(prev);
            if (next.has(userId)) next.delete(userId);
            else next.add(userId);
            return next;
        });
    }, []);

    const grouped = useMemo(() => {
        const map = new Map();
        for (let i = 0; i < markets.length; i++) {
            const m = markets[i];
            const user = m.user;
            if (!user || !user._id) continue;
            if (!map.has(user._id)) {
                map.set(user._id, { user, markets: [] });
            }
            map.get(user._id).markets.push(m);
        }
        return Array.from(map.values()).sort((a, b) =>
            (a.user?.name || '').localeCompare(b.user?.name || ''),
        );
    }, [markets]);

    if (isLoading && markets.length === 0) {
        return (
            <div className="space-y-2.5">
                {[1, 2, 3, 4, 5].map((n) => (
                    <SkeletonRow key={n} />
                ))}
            </div>
        );
    }

    if (grouped.length === 0) {
        return <EmptyState />;
    }

    return (
        <div className="space-y-2.5">
            {grouped.map(({ user, markets: memberMarkets }) => (
                <MemberRow
                    key={user._id}
                    member={user}
                    markets={memberMarkets}
                    isExpanded={expandedIds.has(user._id)}
                    onToggle={toggleMember}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    isAdmin={isAdmin}
                    viewMode={viewMode}
                />
            ))}
        </div>
    );
};

export default AdminMarketView;
