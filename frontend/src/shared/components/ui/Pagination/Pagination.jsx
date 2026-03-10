import React from 'react';
import { HiOutlineChevronLeft, HiOutlineChevronRight } from 'react-icons/hi2';
import { motion } from 'framer-motion';

const Pagination = ({ pagination, onPageChange, onLimitChange }) => {
    if (!pagination) return null;

    const { page, limit, total, pages, hasNext, hasPrev, isAll } = pagination;

    // Do not show pagination at all if total items <= 10 and we haven't selected 'all' or a larger limit manually
    if (total <= 10 && limit === 10 && page === 1) return null;

    const limitOptions = [10, 20, 50, 'all'];

    return (
        <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 px-6 mt-6 rounded-2xl border border-white/10 dark:border-white/5 bg-card/40 backdrop-blur-md"
        >
            <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-muted-foreground">Rows per page:</span>
                <div className="relative">
                    <select
                        value={isAll ? 'all' : limit}
                        onChange={(e) => onLimitChange(e.target.value)}
                        className="appearance-none bg-muted/40 hover:bg-muted/60 text-foreground text-sm font-bold py-1.5 pl-3 pr-8 rounded-lg border border-white/10 focus:ring-2 focus:ring-primary/40 focus:outline-none transition-colors cursor-pointer"
                    >
                        {limitOptions.map((opt) => (
                            <option key={opt} value={opt}>
                                {opt === 'all' ? 'All' : opt}
                            </option>
                        ))}
                    </select>
                    <div className="absolute inset-y-0 right-2 flex items-center pointer-events-none text-muted-foreground">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-muted-foreground">
                    {total === 0 ? '0' : isAll ? `All ${total}` : `${(page - 1) * limit + 1}-${Math.min(page * limit, total)} of ${total}`}
                </span>
                
                {!isAll && (
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => onPageChange(page - 1)}
                            disabled={!hasPrev}
                            className={`p-1.5 rounded-lg border transition-all ${
                                !hasPrev
                                    ? 'border-transparent text-muted-foreground/30 cursor-not-allowed'
                                    : 'border-white/10 hover:bg-muted/40 text-foreground active:scale-95'
                            }`}
                        >
                            <HiOutlineChevronLeft className="w-5 h-5" />
                        </button>
                        
                        <div className="hidden sm:flex items-center gap-1 mx-2 text-sm">
                            <span className="font-bold text-foreground">{page}</span>
                            <span className="text-muted-foreground">/</span>
                            <span className="text-muted-foreground font-medium">{pages}</span>
                        </div>

                        <button
                            onClick={() => onPageChange(page + 1)}
                            disabled={!hasNext}
                            className={`p-1.5 rounded-lg border transition-all ${
                                !hasNext
                                    ? 'border-transparent text-muted-foreground/30 cursor-not-allowed'
                                    : 'border-white/10 hover:bg-muted/40 text-foreground active:scale-95'
                            }`}
                        >
                            <HiOutlineChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                )}
            </div>
        </motion.div>
    );
};

export default Pagination;
