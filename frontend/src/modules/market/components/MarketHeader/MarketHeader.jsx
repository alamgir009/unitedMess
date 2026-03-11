import React from 'react';
import { motion } from 'framer-motion';
import {
    HiOutlinePlus,
    HiOutlineSquares2X2,
    HiOutlineListBullet,
    HiOutlineShoppingBag,
    HiOutlineShieldCheck,
} from 'react-icons/hi2';

/**
 * MarketHeader
 * Renders the page title, role badge, view-mode toggle (grid/list),
 * and the "Add Entry" button.
 */
const MarketHeader = ({ isAdmin, viewMode, onViewModeChange, onAddClick }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: -14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col sm:flex-row sm:items-start justify-between gap-5"
        >
            {/* ── Left: title block ── */}
            <div className="space-y-1">
                {isAdmin ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 mb-1 rounded-full text-xs font-bold bg-secondary-400/10 text-secondary-400 border border-secondary-400/20">
                        <HiOutlineShieldCheck className="w-3.5 h-3.5" />
                        Admin View
                    </span>
                ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 mb-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                        <HiOutlineShoppingBag className="w-3.5 h-3.5" />
                        My Markets
                    </span>
                )}
                <h2 className="text-3xl sm:text-4xl tracking-tight text-foreground">
                    {isAdmin ? 'Market Overview' : 'Market Hub'}
                </h2>
                <p className="text-sm text-muted-foreground font-medium">
                    {isAdmin
                        ? 'Monitor and manage all market purchase entries across all members.'
                        : 'Track and manage your daily market purchases and expenses.'}
                </p>
            </div>

            {/* ── Right: controls ── */}
            <div className="flex items-center gap-2.5 flex-shrink-0">

                {/* Add Entry button */}
                <motion.button
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={onAddClick}
                    aria-label="Add market entry"
                    className="inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl text-sm font-bold text-white relative overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300
                        before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/40 before:via-white/10 before:to-transparent
                        after:absolute after:top-0 after:inset-x-4 after:h-[1px] after:bg-gradient-to-r after:from-transparent after:via-white/80 after:to-transparent"
                    style={{ background: 'linear-gradient(135deg, hsl(152,76%,46%) 0%, hsl(176,76%,38%) 100%)' }}
                >
                    <HiOutlinePlus className="w-4 h-4 relative flex-shrink-0" />
                    <span className="relative">Add Entry</span>
                </motion.button>

                {/* View toggle — visible on ALL screen sizes */}
                <div className="flex items-center p-1 rounded-xl bg-muted/30 border border-white/10 dark:border-white/5 shadow-lg hover:shadow-xl">
                    <button
                        onClick={() => onViewModeChange('grid')}
                        title="Grid view"
                        aria-label="Grid view"
                        className={`p-2 rounded-lg transition-all duration-200 ${viewMode === 'grid'
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
                        className={`p-2 rounded-lg transition-all duration-200 ${viewMode === 'list'
                                ? 'bg-card text-foreground shadow-sm'
                                : 'text-muted-foreground hover:text-foreground'
                            }`}
                    >
                        <HiOutlineListBullet className="w-4 h-4" />
                    </button>
                </div>

            </div>
        </motion.div>
    );
};

export default MarketHeader;
