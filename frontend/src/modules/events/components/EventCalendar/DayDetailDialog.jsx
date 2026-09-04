import { Pencil, Plus, Calendar, CreditCard } from 'lucide-react';
import { Modal, Button } from '@/shared/components/ui';

const DayDetailDialog = ({
  isOpen,
  onClose,
  title,
  children,
  isEditMode = false,
  onEditToggle,
  category,
  onScheduleClick,
  onPaymentAdd,
  onAddMarket,
  onMealAdd,
  mealActionLabel = 'Add Meal',
  isAdding = false,
  editingId = null,
  confirmDeleteId = null,
}) => {
  const showMealActions = category === 'meals' && !isEditMode && onMealAdd;
  const showMarketActions = category === 'markets' && !isEditMode && onEditToggle && onScheduleClick;
  const showPaymentActions = category === 'payments' && !isEditMode && onPaymentAdd;
  const anyActionActive = isAdding || !!editingId || !!confirmDeleteId;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="lg"
      mobileSheet
      accentColor="blue"
    >
      {!isEditMode && onEditToggle && !showMealActions && !showMarketActions && !showPaymentActions && (
        <div className="flex items-center gap-2 py-2 border-b border-border bg-muted/20 mb-4 -mx-5 px-5 sm:-mx-6 sm:px-6">
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            onClick={onEditToggle}
            disabled={anyActionActive}
            aria-label="Edit entries"
          >
            <Pencil className="w-4 h-4" />
          </Button>
        </div>
      )}

      {showMealActions && (
        <div className="flex items-center gap-2 py-2 border-b border-border bg-muted/20 mb-4 -mx-5 px-5 sm:-mx-6 sm:px-6">
          <Button
            variant="primary"
            size="sm"
            onClick={onMealAdd}
            aria-label={mealActionLabel}
          >
            {mealActionLabel}
          </Button>
        </div>
      )}

      {showMarketActions && (
        <div className="flex items-center gap-2 py-2 border-b border-border bg-muted/20 mb-4 -mx-5 px-5 sm:-mx-6 sm:px-6">
          <Button
            variant="primary"
            size="sm"
            onClick={onAddMarket || onEditToggle}
            aria-label="Add market entry"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Market</span>
          </Button>
          <Button
            variant="success"
            size="sm"
            onClick={onScheduleClick}
            aria-label="Schedule market dates"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Book Date</span>
          </Button>
        </div>
      )}

      {showPaymentActions && (
        <div className="flex items-center gap-2 py-2 border-b border-border bg-muted/20 mb-4 -mx-5 px-5 sm:-mx-6 sm:px-6">
          <Button
            variant="primary"
            size="sm"
            onClick={onPaymentAdd}
            aria-label="Add payment"
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Add Payment</span>
          </Button>
        </div>
      )}

      {children}
    </Modal>
  );
};

DayDetailDialog.displayName = 'DayDetailDialog';
export default DayDetailDialog;
