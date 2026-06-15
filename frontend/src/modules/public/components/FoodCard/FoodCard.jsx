import { memo } from 'react';
import { HiOutlineFire, HiOutlineClock } from 'react-icons/hi2';
import { TbToolsKitchen2 } from 'react-icons/tb';

import FoodImage from '../FoodImage/FoodImage';
import Stars from '../Stars/Stars';
import { CAT_ICONS } from '../FoodConstants/FoodConstants';

const FoodCard = memo(({ food, onSelect }) => (
    <div
        onClick={() => onSelect(food)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(food); } }}
        className="group relative flex flex-col rounded-2xl border border-border bg-card/60 overflow-hidden motion-safe:transition-transform motion-safe:duration-200 motion-safe:hover:-translate-y-1 gpu-layer cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring contain-content"
    >
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted shrink-0">
            <FoodImage
                src={food.image}
                alt={food.name}
                className="w-full h-full motion-safe:transition-transform motion-safe:duration-300 motion-safe:group-hover:scale-105 transform-gpu"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />

            {food.tag && (
                <span className="absolute top-3 left-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/50 text-white text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm border border-white/10 pointer-events-none">
                    {food.tag}
                </span>
            )}

            <span className="absolute top-3 right-3 inline-flex items-center gap-1 px-2 py-1 rounded-full bg-black/40 text-white text-[10px] font-semibold backdrop-blur-sm border border-white/10 pointer-events-none">
                {CAT_ICONS[food.category]}
                {food.category}
            </span>
        </div>

        <div className="p-4 flex flex-col gap-2 flex-1">
            <div className="flex items-start justify-between gap-2">
                <h3 className="font-bold text-foreground text-sm sm:text-base leading-tight">{food.name}</h3>
                <Stars rating={food.rating} />
            </div>

            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed flex-1">
                {food.description}
            </p>

            <div className="flex items-center gap-3 pt-2 border-t border-border/50 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                    <HiOutlineFire className="w-3.5 h-3.5 text-orange-500 dark:text-orange-400" />
                    {food.cal} kcal
                </span>
                <span className="w-px h-3 bg-border" aria-hidden="true" />
                <span className="inline-flex items-center gap-1">
                    <HiOutlineClock className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
                    {food.prep}
                </span>
                <span className="ml-auto text-primary text-xs font-semibold flex items-center gap-0.5 opacity-0 group-hover:opacity-100 motion-safe:transition-opacity motion-safe:duration-150">
                    View <TbToolsKitchen2 className="w-3.5 h-3.5" />
                </span>
            </div>
        </div>
    </div>
));

FoodCard.displayName = 'FoodCard';
export default FoodCard;
