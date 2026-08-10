import React from 'react';
import Button from '@/shared/components/ui/Button/Button';
import { RoleBadge } from '@/shared/components/ui';
import {
    HiOutlinePlus,
    HiOutlineSquares2X2,
    HiOutlineListBullet,
    HiOutlineShoppingBag,
} from 'react-icons/hi2';

const MarketHeader = React.memo(({ isAdmin, viewMode, onViewModeChange, onAddClick }) => {
    return (
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="space-y-1">
                <RoleBadge isAdmin={isAdmin} icon={HiOutlineShoppingBag} label="My Markets" />
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
