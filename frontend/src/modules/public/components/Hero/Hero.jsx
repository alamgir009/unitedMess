import { memo } from 'react';
import { HiOutlineMagnifyingGlass } from 'react-icons/hi2';
import { TbToolsKitchen2 } from 'react-icons/tb';
import { Input } from '@/shared/components/ui';
import { CAT_ICONS, CATEGORIES } from '../FoodConstants/FoodConstants';

const Hero = memo(({ totalCount, search, onSearchChange, activeCategory, onCategoryChange }) => (
    <header className="relative z-10 pt-6 md:pt-8 pb-8 md:pb-10 px-4 sm:px-6 text-center">
        <div className="max-w-3xl mx-auto flex flex-col items-center gap-4 animate-fade-in-up">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/80 px-3 py-1.5 text-caption font-semibold uppercase tracking-[0.22em] text-muted-foreground sm:px-4 shadow-sm motion-safe:transition-colors motion-safe:duration-150">
                <TbToolsKitchen2 className="w-3.5 h-3.5 text-primary" />
                {totalCount} dishes &amp; counting
            </div>
            <h1 className="max-w-2xl text-display font-bold leading-[1.06] tracking-tight">
                <span className="text-foreground">Mess</span>{' '}
                <span className="text-gradient">Food Gallery</span>
            </h1>
            <p className="max-w-xl text-body-lg leading-[1.75] text-muted-foreground">
                Every dish crafted with care — from humble breakfasts to festive spreads.
            </p>
            <div className="w-full max-w-md">
                <Input
                    type="search"
                    placeholder="Search"
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                    aria-label="Search dishes"
                    leftIcon={<HiOutlineMagnifyingGlass className="w-4 h-4 text-muted-foreground" />}
                />
            </div>
        </div>

        <div className="max-w-6xl mx-auto mt-6 md:mt-8">
            <div className="flex flex-wrap items-center gap-2 justify-center" role="group" aria-label="Filter by category">
                {CATEGORIES.map((cat) => {
                    const isActive = activeCategory === cat;
                    return (
                        <button
                            key={cat}
                            onClick={() => onCategoryChange(cat)}
                            aria-pressed={isActive}
                            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium motion-safe:transition-all motion-safe:duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transform-gpu ${
                                isActive
                                    ? 'bg-primary text-primary-foreground shadow-sm'
                                    : 'bg-card/60 border border-border text-muted-foreground hover:bg-muted/50'
                            }`}
                        >
                            {CAT_ICONS[cat]}
                            {cat}
                        </button>
                    );
                })}
            </div>
        </div>
    </header>
));

Hero.displayName = 'Hero';
export default Hero;
