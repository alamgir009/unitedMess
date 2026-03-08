import { memo } from 'react';
import { motion } from 'framer-motion';
import { HiOutlineFire, HiOutlineClock, HiOutlineTag } from 'react-icons/hi2';
import { TbToolsKitchen2 } from 'react-icons/tb';

import FoodImage from '../FoodImage/FoodImage';
import Stars from '../Stars/Stars';
import { CAT_ICONS } from '../FoodConstants/FoodConstants';

/**
 * FoodCard
 * Animated grid card. Clicking opens the detail modal.
 *
 * Props:
 *   food     {object} — food item from FOODS
 *   onSelect {fn}     — called with food object on click
 */
const FoodCard = memo(({ food, onSelect }) => (
    <motion.div
        layoutId={`food-card-${food.id}`}
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
        onClick={() => onSelect(food)}
        className="group relative cursor-pointer flex flex-col rounded-2xl border border-white/20 dark:border-white/10 bg-card/60 backdrop-blur-xl overflow-hidden
                   hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-glow-primary dark:hover:shadow-glow-primary
                   transition-[transform,box-shadow] duration-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] will-change-transform"
    >
        {/* ── Photo ── */}
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted shrink-0">
            <FoodImage
                src={food.image}
                alt={food.name}
                className="w-full h-full transition-transform duration-500 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

            {food.tag && (
                <span className="absolute top-3 left-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full
                                 bg-black/50 text-white text-[10px] font-bold uppercase tracking-wider
                                 backdrop-blur-sm border border-white/10">
                    <HiOutlineTag className="w-2.5 h-2.5" />
                    {food.tag}
                </span>
            )}

            <span className="absolute top-3 right-3 inline-flex items-center gap-1 px-2 py-1 rounded-full
                             bg-black/40 text-white text-[10px] font-semibold backdrop-blur-sm border border-white/10">
                {CAT_ICONS[food.category]}
                {food.category}
            </span>
        </div>

        {/* ── Body ── */}
        <div className="p-5 flex flex-col gap-3 flex-1">
            <div className="flex items-start justify-between gap-2">
                <h3 className="font-bold text-foreground text-base leading-tight">{food.name}</h3>
                <Stars rating={food.rating} />
            </div>

            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed flex-1">
                {food.description}
            </p>

            <div className="flex items-center gap-3 pt-2 border-t border-border/50 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                    <HiOutlineFire className="w-3.5 h-3.5 text-orange-500" />
                    {food.cal} kcal
                </span>
                <span className="w-px h-3 bg-border" />
                <span className="inline-flex items-center gap-1">
                    <HiOutlineClock className="w-3.5 h-3.5 text-blue-500" />
                    {food.prep}
                </span>
                <span className="ml-auto text-primary text-xs font-semibold opacity-0 group-hover:opacity-100
                                 transition-opacity duration-200 flex items-center gap-0.5">
                    View <TbToolsKitchen2 className="w-3.5 h-3.5" />
                </span>
            </div>
        </div>

        {/* Hover radial glow */}
        <div
            className="absolute inset-0 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-500"
            style={{ background: 'radial-gradient(ellipse at 50% 0%, hsl(var(--primary)/0.06), transparent 70%)' }}
        />
    </motion.div>
));

FoodCard.displayName = 'FoodCard';
export default FoodCard;