import { memo } from 'react';
import { HiOutlineMagnifyingGlass } from 'react-icons/hi2';
import { TbToolsKitchen2 } from 'react-icons/tb';
import { CAT_ICONS, CATEGORIES } from '../FoodConstants/FoodConstants';

const Hero = memo(({ totalCount, search, onSearchChange, activeCategory, onCategoryChange }) => (
    <header className="relative z-10 pt-12 md:pt-16 pb-8 md:pb-10 px-4 sm:px-6 text-center">
        <div className="max-w-3xl mx-auto flex flex-col items-center gap-4 animate-fade-in-up">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-border bg-card/80 backdrop-blur-sm text-xs font-semibold uppercase tracking-widest text-muted-foreground shadow-sm">
                <TbToolsKitchen2 className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                {totalCount} dishes &amp; counting
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight">
                <span className="text-foreground">Mess</span>{' '}
                <span className="text-gradient">Food Gallery</span>
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground max-w-xl leading-relaxed">
                Every dish crafted with care — from humble breakfasts to festive spreads.
            </p>
            <div className="w-full max-w-md rounded-xl p-1.5 bg-muted/50 dark:bg-muted/30 border border-border/60 dark:border-border/40 shadow-[var(--inset-inner)] focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background motion-safe:transition-shadow motion-safe:duration-150">
                <div className="relative flex items-center rounded-lg bg-card border border-border">
                    <HiOutlineMagnifyingGlass className="absolute left-3 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <input
                        type="search"
                        placeholder="Search"
                        value={search}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-transparent text-foreground placeholder:text-muted-foreground text-sm focus:outline-none motion-safe:transition-colors motion-safe:duration-150"
                        aria-label="Search dishes"
                    />
                </div>
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
