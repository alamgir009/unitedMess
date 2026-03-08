import { useState, useMemo, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { TbToolsKitchen2 } from 'react-icons/tb';

import Hero from '../../components/Hero/Hero';
import FoodCard from '../../components/FoodCard/FoodCard';
import FoodModal from '../../components/FoodModal/FoodModal';
import { FOODS } from '../../components/FoodConstants/FoodConstants';

/**
 * FoodGalleryPage
 * Holds all filter/search/selection state and composes child components.
 * No UI logic lives here — only data flow.
 */
const FoodGalleryPage = () => {
    const [activeCategory, setActiveCategory] = useState('All');
    const [selectedFood, setSelectedFood] = useState(null);
    const [search, setSearch] = useState('');

    // Memoised filter — only recalculates when search or category changes
    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        return FOODS.filter((f) => {
            const matchCat = activeCategory === 'All' || f.category === activeCategory;
            const matchSearch = !q ||
                f.name.toLowerCase().includes(q) ||
                f.description.toLowerCase().includes(q);
            return matchCat && matchSearch;
        });
    }, [activeCategory, search]);

    // Stable callbacks — prevent unnecessary child re-renders
    const handleSearchChange = useCallback((v) => setSearch(v), []);
    const handleCategoryChange = useCallback((c) => setActiveCategory(c), []);
    const handleSelect = useCallback((f) => setSelectedFood(f), []);
    const handleClose = useCallback(() => setSelectedFood(null), []);

    return (
        <div className="relative min-h-screen bg-background text-foreground overflow-x-hidden">

            {/* ── Ambient blobs (decorative, pointer-events disabled) ── */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
                <div
                    className="absolute -top-40 -left-32 w-[580px] h-[580px] rounded-full opacity-45 animate-blob mix-blend-multiply dark:mix-blend-screen"
                    style={{ background: 'var(--blob-1)', filter: 'blur(80px)' }}
                />
                <div
                    className="absolute top-[35%] -right-48 w-[640px] h-[640px] rounded-full opacity-35 animate-blob animation-delay-2000 mix-blend-multiply dark:mix-blend-screen"
                    style={{ background: 'var(--blob-2)', filter: 'blur(100px)' }}
                />
                <div
                    className="absolute -bottom-48 left-[20%] w-[700px] h-[700px] rounded-full opacity-25 animate-blob animation-delay-4000 mix-blend-multiply dark:mix-blend-screen"
                    style={{ background: 'var(--blob-3)', filter: 'blur(120px)' }}
                />
            </div>

            {/* ── Hero + category pills ── */}
            <Hero
                totalCount={FOODS.length}
                search={search}
                onSearchChange={handleSearchChange}
                activeCategory={activeCategory}
                onCategoryChange={handleCategoryChange}
            />

            {/* ── Food grid ── */}
            <section className="relative z-10 px-4 sm:px-6 pb-24">
                <div className="max-w-6xl mx-auto">

                    {/* Result count */}
                    <p className="text-xs text-muted-foreground mb-6 font-medium uppercase tracking-widest text-center">
                        {filtered.length} dish{filtered.length !== 1 ? 'es' : ''}
                        {activeCategory !== 'All' && ` in ${activeCategory}`}
                        {search && ` matching "${search}"`}
                    </p>

                    <AnimatePresence mode="popLayout">
                        {filtered.length > 0 ? (
                            <motion.div
                                layout
                                className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5"
                            >
                                {filtered.map((food) => (
                                    <FoodCard
                                        key={food.id}
                                        food={food}
                                        onSelect={handleSelect}
                                    />
                                ))}
                            </motion.div>
                        ) : (
                            <motion.div
                                key="empty"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="text-center py-24"
                            >
                                <TbToolsKitchen2 className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                                <p className="text-muted-foreground font-medium">
                                    No dishes found. Try a different search.
                                </p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </section>

            {/* ── Detail modal ── */}
            <AnimatePresence>
                {selectedFood && (
                    <FoodModal food={selectedFood} onClose={handleClose} />
                )}
            </AnimatePresence>
        </div>
    );
};

export default FoodGalleryPage;