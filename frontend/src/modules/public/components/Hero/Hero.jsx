import { memo } from 'react';
import { motion } from 'framer-motion';
import { HiOutlineMagnifyingGlass } from 'react-icons/hi2';
import { TbToolsKitchen2 } from 'react-icons/tb';

import { CAT_ICONS, CATEGORIES } from '../FoodConstants/FoodConstants';

/**
 * Hero
 * Page header with animated title, search input, and category filter pills.
 *
 * Props:
 *   totalCount       {number} — total dishes badge count
 *   search           {string} — current search value
 *   onSearchChange   {fn}     — (value: string) => void
 *   activeCategory   {string} — selected category key
 *   onCategoryChange {fn}     — (category: string) => void
 */
const Hero = memo(({ totalCount, search, onSearchChange, activeCategory, onCategoryChange }) => (
    <>
        {/* ── Hero ── */}
        <section className="relative z-10 pt-36 pb-16 px-4 sm:px-6 text-center">
            <div className="max-w-3xl mx-auto">

                {/* Dish count badge */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-border
                               bg-card/80 backdrop-blur-sm text-xs font-semibold uppercase tracking-widest
                               text-muted-foreground mb-6"
                >
                    <TbToolsKitchen2 className="w-3.5 h-3.5 text-amber-500" />
                    {totalCount} dishes &amp; counting
                </motion.div>

                {/* Heading */}
                <motion.h1
                    initial={{ opacity: 0, y: 32 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, delay: 0.1, ease: [0.23, 1, 0.32, 1] }}
                    className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tighter mb-5"
                >
                    <span className="text-foreground">Mess</span>{' '}
                    <span
                        className="text-transparent bg-clip-text"
                        style={{ backgroundImage: 'var(--gradient-text)' }}
                    >
                        Food Gallery
                    </span>
                </motion.h1>

                {/* Subtitle */}
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.6, delay: 0.25 }}
                    className="text-muted-foreground text-lg mb-8"
                >
                    Every dish crafted with care — from humble breakfasts to festive spreads.
                </motion.p>

                {/* Search input */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.35 }}
                    className="relative max-w-md mx-auto"
                >
                    <HiOutlineMagnifyingGlass
                        className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none"
                    />
                    <input
                        type="search"
                        placeholder="Search dishes…"
                        value={search}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-white/20 dark:border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]
                                   bg-background/40 text-foreground placeholder:text-muted-foreground backdrop-blur-xl text-sm
                                   focus:outline-none focus:ring-2 focus:ring-primary/50 focus:shadow-glow-primary transition-all"
                        aria-label="Search dishes"
                    />
                </motion.div>
            </div>
        </section>

        {/* ── Category pills ── */}
        <section className="relative z-10 px-4 sm:px-6 pb-10">
            <div className="max-w-6xl mx-auto">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.4, delay: 0.4 }}
                    className="flex flex-wrap items-center gap-2 justify-center"
                    role="group"
                    aria-label="Filter by category"
                >
                    {CATEGORIES.map((cat) => {
                        const isActive = activeCategory === cat;
                        return (
                            <button
                                key={cat}
                                onClick={() => onCategoryChange(cat)}
                                aria-pressed={isActive}
                                className="inline-flex items-center gap-1.5 relative px-5 py-2 rounded-full text-sm
                                           font-medium transition-all duration-300 hover:scale-105 active:scale-95
                                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                style={{
                                    color: isActive ? 'hsl(var(--primary-foreground))' : 'hsl(var(--muted-foreground))',
                                    background: isActive ? 'hsl(var(--primary))' : 'hsl(var(--card)/0.4)',
                                    border: isActive ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
                                    backdropFilter: isActive ? 'none' : 'blur(12px)',
                                    boxShadow: isActive ? '0 4px 14px hsl(var(--primary)/0.4)' : '0 2px 8px rgba(0,0,0,0.05)',
                                }}
                            >
                                {CAT_ICONS[cat]}
                                {cat}

                                {/* Animated active indicator */}
                                {isActive && (
                                    <motion.span
                                        layoutId="cat-pill"
                                        className="absolute inset-0 rounded-full -z-10"
                                        style={{ background: 'hsl(var(--primary))' }}
                                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                                    />
                                )}
                            </button>
                        );
                    })}
                </motion.div>
            </div>
        </section>
    </>
));

Hero.displayName = 'Hero';
export default Hero;