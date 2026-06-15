import { memo } from 'react';
import { useModalAnimation } from '@/shared/hooks/useModalAnimation';
import { cn } from '@/core/utils/helpers/string.helper';
import { HiOutlineFire, HiOutlineClock, HiOutlineXMark } from 'react-icons/hi2';

import FoodImage from '../FoodImage/FoodImage';
import Stars from '../Stars/Stars';
import { CAT_ICONS } from '../FoodConstants/FoodConstants';

const FoodModal = memo(({ food, onClose }) => {
  const { shouldRender, exiting } = useModalAnimation(Boolean(food), { exitTimeout: 80 });

  if (!shouldRender || !food) return null;

  return (
    <div
      className={cn(
        'fixed inset-0 z-[200] flex items-center justify-center p-4',
        'modal-animate-backdrop',
        exiting ? 'modal-exit-backdrop' : 'modal-enter'
      )}
      onClick={onClose}
      aria-modal="true"
      role="dialog"
      aria-label={food.name}
    >
      <div className="absolute inset-0 bg-black/60 dark:bg-black/70" />

      <div
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'relative z-10 w-full max-w-md rounded-2xl overflow-hidden',
          'bg-card border border-border shadow-lg',
          'modal-animate modal-gpu',
          exiting ? 'modal-exit' : 'modal-enter'
        )}
      >
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-muted">
          <FoodImage src={food.image} alt={food.name} className="w-full h-full" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent pointer-events-none" />

          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-11 h-11 rounded-full bg-black/50 border border-white/20 flex items-center justify-center text-white hover:bg-black/70 motion-safe:transition-colors motion-safe:duration-150 focus-visible:ring-2 focus-visible:ring-white z-10"
            aria-label="Close modal"
          >
            <HiOutlineXMark className="w-4 h-4" />
          </button>

          <div className="absolute bottom-3 left-4 right-14">
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight drop-shadow-sm">
              {food.name}
            </h2>
            <span className="inline-flex items-center gap-1 text-white/70 text-xs sm:text-sm">
              {CAT_ICONS[food.category]}
              {food.category}
            </span>
          </div>
        </div>

        <div className="p-5">
          <div className="flex items-center justify-between mb-3">
            {food.tag ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-semibold uppercase tracking-widest">
                {food.tag}
              </span>
            ) : (
              <span />
            )}
            <Stars rating={food.rating} />
          </div>

          <p className="text-sm text-muted-foreground leading-relaxed mb-4">{food.description}</p>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="rounded-xl bg-muted/50 border border-border p-3 text-center">
              <HiOutlineFire className="w-5 h-5 text-orange-500 dark:text-orange-400 mx-auto mb-1" />
              <p className="text-sm font-bold text-foreground">{food.cal} kcal</p>
              <p className="text-[10px] text-muted-foreground">Calories</p>
            </div>
            <div className="rounded-xl bg-muted/50 border border-border p-3 text-center">
              <HiOutlineClock className="w-5 h-5 text-blue-500 dark:text-blue-400 mx-auto mb-1" />
              <p className="text-sm font-bold text-foreground">{food.prep}</p>
              <p className="text-[10px] text-muted-foreground">Prep Time</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-foreground border border-border bg-muted/30 hover:bg-muted/50 motion-safe:transition-colors motion-safe:duration-150 inline-flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <HiOutlineXMark className="w-4 h-4" />
            Close
          </button>
        </div>
      </div>
    </div>
  );
});

FoodModal.displayName = 'FoodModal';
export default FoodModal;
