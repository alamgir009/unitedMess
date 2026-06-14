import { memo } from 'react';
import { useModalAnimation } from '@/shared/hooks/useModalAnimation';
import { cn } from '@/core/utils/helpers/string.helper';
import { HiOutlineFire, HiOutlineClock, HiOutlineXMark, HiOutlineTag } from 'react-icons/hi2';

import FoodImage from '../FoodImage/FoodImage';
import Stars from '../Stars/Stars';
import { CAT_ICONS } from '../FoodConstants/FoodConstants';

const FoodModal = memo(({ food, onClose }) => {
  const { shouldRender, exiting } = useModalAnimation(Boolean(food), { exitTimeout: 120 });

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
      <div className="absolute inset-0 bg-black/65" />

      <div
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'relative z-10 w-full max-w-md rounded-3xl overflow-hidden',
          'bg-card/80 border border-white/20 shadow-2xl',
          'modal-animate modal-gpu',
          exiting ? 'modal-exit' : 'modal-enter'
        )}
      >
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-muted">
          <FoodImage src={food.image} alt={food.name} className="w-full h-full" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent mix-blend-overlay pointer-events-none" />

          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/50
                       border border-white/20 flex items-center justify-center text-white
                       hover:bg-black/70 transition-colors focus-visible:ring-2 focus-visible:ring-white"
            aria-label="Close"
          >
            <HiOutlineXMark className="w-4 h-4" />
          </button>

          <div className="absolute bottom-4 left-5 right-14">
            <h2 className="text-2xl font-black text-white tracking-tight drop-shadow-md">
              {food.name}
            </h2>
            <span className="inline-flex items-center gap-1 text-white/70 text-sm mt-0.5">
              {CAT_ICONS[food.category]}
              {food.category}
            </span>
          </div>
        </div>

        <div className="p-7">
          <div className="flex items-center justify-between mb-4">
            {food.tag ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full
                               bg-primary/10 border border-primary/20 text-primary
                               text-xs font-semibold uppercase tracking-widest">
                <HiOutlineTag className="w-3 h-3" />
                {food.tag}
              </span>
            ) : (
              <span />
            )}
            <Stars rating={food.rating} />
          </div>

          <p className="text-muted-foreground leading-relaxed mb-6">{food.description}</p>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="rounded-2xl bg-muted/40 border border-white/10 p-4 text-center shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]">
              <HiOutlineFire className="w-6 h-6 text-orange-500 mx-auto mb-1 drop-shadow-md" />
              <p className="text-base font-bold text-foreground drop-shadow-sm">{food.cal} kcal</p>
              <p className="text-xs text-muted-foreground">Calories</p>
            </div>
            <div className="rounded-2xl bg-muted/40 border border-white/10 p-4 text-center shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]">
              <HiOutlineClock className="w-6 h-6 text-blue-500 mx-auto mb-1 drop-shadow-md" />
              <p className="text-base font-bold text-foreground drop-shadow-sm">{food.prep}</p>
              <p className="text-xs text-muted-foreground">Prep Time</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl text-sm font-semibold text-foreground border border-white/10
                       bg-muted/30 hover:bg-muted/50 transition-colors inline-flex items-center justify-center gap-2
                       focus-visible:ring-2 focus-visible:ring-primary/50 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]"
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
