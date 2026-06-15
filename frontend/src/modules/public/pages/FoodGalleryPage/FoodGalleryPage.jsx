import { useState, useMemo, useCallback } from 'react';
import { TbToolsKitchen2 } from 'react-icons/tb';

import Hero from '../../components/Hero/Hero';
import FoodCard from '../../components/FoodCard/FoodCard';
import FoodModal from '../../components/FoodModal/FoodModal';
import { FOODS } from '../../components/FoodConstants/FoodConstants';

const FoodGalleryPage = () => {
    const [activeCategory, setActiveCategory] = useState('All');
    const [selectedFood, setSelectedFood] = useState(null);
    const [search, setSearch] = useState('');

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

    const handleSearchChange = useCallback((v) => setSearch(v), []);
    const handleCategoryChange = useCallback((c) => setActiveCategory(c), []);
    const handleSelect = useCallback((f) => setSelectedFood(f), []);
    const handleClose = useCallback(() => setSelectedFood(null), []);

    return (
        <div className="relative min-h-screen bg-background text-foreground overflow-x-hidden isolate">

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
            </div>

            <div className="relative z-10">
                <Hero
                    totalCount={FOODS.length}
                    search={search}
                    onSearchChange={handleSearchChange}
                    activeCategory={activeCategory}
                    onCategoryChange={handleCategoryChange}
                />

                <section className="px-4 sm:px-6 pb-12 sm:pb-16">
                    <div className="max-w-[1280px] mx-auto">

                        <p
                            className="text-[11px] sm:text-xs text-muted-foreground mb-4 sm:mb-5 font-medium uppercase tracking-widest text-center"
                            aria-live="polite"
                            aria-atomic="true"
                        >
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
                            <div className="card-base rounded-xl p-8 sm:p-10 text-center">
                                <TbToolsKitchen2 className="w-12 h-12 sm:w-14 sm:h-14 text-muted-foreground/30 mx-auto mb-3" />
                                <p className="text-sm text-muted-foreground font-medium">
                                    No dishes found. Try a different search.
                                </p>
                            </div>
                        )}
                    </div>
                </section>

                {selectedFood && (
                    <FoodModal food={selectedFood} onClose={handleClose} />
                )}
            </div>
        </div>
    );
};

export default FoodGalleryPage;
