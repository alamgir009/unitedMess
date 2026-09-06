import { memo } from 'react';
import { HiOutlineFire, HiOutlineClock, HiOutlineXMark } from 'react-icons/hi2';
import { Modal, Button, Badge } from '@/shared/components/ui';

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
      headerContent={
        <div
          className="relative w-full overflow-hidden bg-muted -mt-[18px]"
          style={{ borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0' }}
        >
          <img
            src={food.image}
            alt={food.name}
            className="w-full object-cover"
            style={{ height: 'clamp(180px, 32vh, 280px)' }}
          />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage:
                'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 50%)',
            }}
          />
          <div className="absolute bottom-3 left-3 right-3">
            <h2 className="text-xl sm:text-2xl font-bold text-white line-clamp-1 tracking-tight drop-shadow-sm">
              {food.name}
            </h2>
            <span className="inline-flex items-center gap-1 truncate text-white/70 text-xs sm:text-sm">
              {CAT_ICONS[food.category]}
              {food.category}
            </span>
          </div>
        </div>
      }
      footer={
        <Button variant="outline" size="sm" fullWidth onClick={onClose}>
          <HiOutlineXMark className="w-4 h-4" />
          Close
        </Button>
      }
    >
      <div className="mx-auto max-w-2xl pt-5">
        <div className="flex items-center justify-between mb-3">
          {food.tag ? (
            <Badge variant="primary" size="sm">
              {food.tag}
            </Badge>
          ) : (
            <span />
          )}
          <Stars rating={food.rating} />
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed mb-4">{food.description}</p>

        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-3 mb-4">
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
    </Modal>
  );
});

FoodModal.displayName = 'FoodModal';
export default FoodModal;
