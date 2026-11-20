import { memo } from 'react';
import { HiOutlineFire, HiOutlineClock, HiOutlineXMark } from 'react-icons/hi2';
import { Modal, Button, Badge } from '@/shared/components/ui';

import FoodImage from '../FoodImage/FoodImage';
import Stars from '../Stars/Stars';
import { CAT_ICONS } from '../FoodConstants/FoodConstants';

const FoodModal = memo(({ food, onClose }) => {
  if (!food) return null;

  return (
    <Modal
      isOpen={Boolean(food)}
      onClose={onClose}
      showCloseButton={false}
      accentColor="none"
      size="md"
      mobileSheet
      className="[&_[data-modal-body]]:!p-0"
      footer={
        <Button variant="outline" size="sm" fullWidth onClick={onClose}>
          <HiOutlineXMark className="w-4 h-4" />
          Close
        </Button>
      }
    >
      <div className="flex flex-col w-full">
        {/* Top Hero Image Banner - perfectly responsive and aligned */}
        <div className="relative w-full aspect-[16/10] sm:aspect-[16/9] min-h-[190px] max-h-[270px] overflow-hidden bg-muted">
          <FoodImage
            src={food.image}
            alt={food.name}
            className="w-full h-full object-cover object-center"
          />

          {/* Gradient overlay for text contrast and readability */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage:
                'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.3) 45%, transparent 75%)',
            }}
          />

          {/* Top-right close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 p-2 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white z-10"
            aria-label="Close dialog"
          >
            <HiOutlineXMark className="w-4 h-4" />
          </button>

          {/* Title & Category over image */}
          <div className="absolute bottom-3 left-4 right-4">
            <h2 className="text-xl sm:text-2xl font-bold text-white line-clamp-1 tracking-tight drop-shadow-sm">
              {food.name}
            </h2>
            <span className="inline-flex items-center gap-1.5 truncate text-white/80 text-xs sm:text-sm font-medium">
              {CAT_ICONS[food.category]}
              {food.category}
            </span>
          </div>
        </div>

        {/* Modal Body Content */}
        <div className="p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            {food.tag ? (
              <Badge variant="primary" size="sm">
                {food.tag}
              </Badge>
            ) : (
              <span />
            )}
            <Stars rating={food.rating} />
          </div>

          <p className="text-sm text-muted-foreground leading-relaxed">{food.description}</p>

          <div className="grid grid-cols-2 gap-3">
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
        </div>
      </div>
    </Modal>
  );
});

FoodModal.displayName = 'FoodModal';
export default FoodModal;
