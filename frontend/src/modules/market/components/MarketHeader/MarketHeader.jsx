import React from 'react';
import Button from '@/shared/components/ui/Button/Button';
import {
    HiOutlinePlus,
    HiOutlineSquares2X2,
    HiOutlineListBullet,
    HiOutlineShoppingBag,
    HiOutlineShieldCheck,
} from 'react-icons/hi2';

const MarketHeader = React.memo(({ isAdmin, viewMode, onViewModeChange, onAddClick }) => {
    return (
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="space-y-1">
                {isAdmin ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 mb-1 rounded-full text-xs font-semibold bg-secondary-400/10 text-secondary-400 border border-secondary-400/20">
                        <HiOutlineShieldCheck className="w-3.5 h-3.5" />
                        Admin View
                    </span>
                ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 mb-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                        <HiOutlineShoppingBag className="w-3.5 h-3.5" />
                        My Markets
                    </span>
                )}
                <h2 className="text-h1">
                    {isAdmin ? 'Market Overview' : 'Market Hub'}
                </h2>
                <p className="text-sm text-muted-foreground">
                    {isAdmin
                        ? 'Monitor and manage all market purchase entries across all members.'
                        : 'Track and manage your daily market purchases and expenses.'}
                </p>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
                <Button
                    variant="primary"
                    size="md"
                    onClick={onAddClick}
                    aria-label="Add market entry"
                >
                    <HiOutlinePlus className="w-4 h-4 flex-shrink-0" />
                    <span>Add Entry</span>
                </Button>

                <div className="flex items-center p-1 rounded-xl bg-muted/30 border border-border/40">
                    <button
                        onClick={() => onViewModeChange('grid')}
                        title="Grid view"
                        aria-label="Grid view"
                        className={`p-2 rounded-lg transition-all duration-150 ${viewMode === 'grid'
                                ? 'bg-card text-foreground shadow-sm'
                                : 'text-muted-foreground hover:text-foreground'
                            }`}
                    >
                        <HiOutlineSquares2X2 className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => onViewModeChange('list')}
                        title="List view"
                        aria-label="List view"
                        className={`p-2 rounded-lg transition-all duration-150 ${viewMode === 'list'
                                ? 'bg-card text-foreground shadow-sm'
                                : 'text-muted-foreground hover:text-foreground'
                            }`}
                    >
                        <HiOutlineListBullet className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
});
MarketHeader.displayName = 'MarketHeader';

export default MarketHeader;
