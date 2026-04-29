import { useState, useMemo, useCallback } from 'react';
import { TbToolsKitchen2 } from 'react-icons/tb';

import Hero from '../../components/Hero/Hero';
import FoodCard from '../../components/FoodCard/FoodCard';
import FoodModal from '../../components/FoodModal/FoodModal';
import { FOODS } from '../../components/FoodConstants/FoodConstants';

/**
 * FoodGalleryPage
 * Zero animation libraries. GPU-optimized static layers.
 * Add `html { scroll-behavior: smooth; }` to your global CSS
 * for buttery native scrolling.
 */
const FoodGalleryPage = () => {
    const [activeCategory, setActiveCategory] = useState('All');
    const [selectedFood, setSelectedFood] = useState(null);
    const [search, setSearch] = useState('');

    // Memoised filter — only recalculates when search or category changes
    const filtered = useMemo(() => {
        const q = search.toLowerCase().trim();
        if (!q && activeCategory === 'All') return FOODS;

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
        <div className="relative min-h-screen bg-background text-foreground overflow-x-hidden isolate">

            {/* ── Static ambient backdrop ──
                 No CSS animations. translate3d forces GPU layer compositing.
                 Sizes & blur are reduced on mobile to eliminate scroll jank. */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
                <div
                    className="absolute -top-20 -left-16 w-[300px] h-[300px] rounded-full sm:w-[580px] sm:h-[580px] sm:-top-40 sm:-left-32"
                    style={{
                        background: 'var(--blob-1)',
                        opacity: 0.2,
                        filter: 'blur(60px)',
                        transform: 'translate3d(0,0,0)',
                    }}
                />
                <div
                    className="absolute top-[30%] -right-16 w-[320px] h-[320px] rounded-full sm:w-[640px] sm:h-[640px] sm:-right-48"
                    style={{
                        background: 'var(--blob-2)',
                        opacity: 0.15,
                        filter: 'blur(80px)',
                        transform: 'translate3d(0,0,0)',
                    }}
                />
                <div
                    className="absolute -bottom-20 left-[10%] w-[350px] h-[350px] rounded-full sm:w-[700px] sm:h-[700px] sm:-bottom-48 sm:left-[20%]"
                    style={{
                        background: 'var(--blob-3)',
                        opacity: 0.1,
                        filter: 'blur(100px)',
                        transform: 'translate3d(0,0,0)',
                    }}
                />
            </div>

            {/* ── Content ── */}
            <div className="relative z-10">
                <Hero
                    totalCount={FOODS.length}
                    search={search}
                    onSearchChange={handleSearchChange}
                    activeCategory={activeCategory}
                    onCategoryChange={handleCategoryChange}
                />

                {/* ── Food grid ── */}
                <section className="px-4 sm:px-6 pb-16 sm:pb-24">
                    <div className="max-w-6xl mx-auto">

                        {/* Result count */}
                        <p className="text-[11px] sm:text-xs text-muted-foreground mb-4 sm:mb-6 font-medium uppercase tracking-widest text-center">
                            {filtered.length} dish{filtered.length !== 1 ? 'es' : ''}
                            {activeCategory !== 'All' && ` in ${activeCategory}`}
                            {search && ` matching "${search}"`}
                        </p>

                        {filtered.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
                                {filtered.map((food) => (
                                    <FoodCard
                                        key={food.id}
                                        food={food}
                                        onSelect={handleSelect}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-20 sm:py-24">
                                <TbToolsKitchen2 className="w-14 h-14 sm:w-16 sm:h-16 text-muted-foreground/30 mx-auto mb-4" />
                                <p className="text-sm sm:text-base text-muted-foreground font-medium">
                                    No dishes found. Try a different search.
                                </p>
                            </div>
                        )}
                    </div>
                </section>

                {/* ── Detail modal ── */}
                {selectedFood && (
                    <FoodModal food={selectedFood} onClose={handleClose} />
                )}
            </div>
        </div>
    );
};

export default FoodGalleryPage;