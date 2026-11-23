import { Pencil, Plus, Calendar, CreditCard } from 'lucide-react';
import { Modal, Button } from '@/shared/components/ui';

export const EntryEditActions = ({ formId, onCancel, isSubmitting }) => (
  <div className="flex w-full items-center gap-2">
    <Button
      type="button"
      variant="secondary"
      onClick={onCancel}
      disabled={isSubmitting}
      className="flex-1 h-11 sm:h-10 min-h-[44px] sm:min-h-[40px] px-3 rounded-[8px] text-sm font-medium border border-[var(--border-contrast)] hover:border-[var(--border-contrast-hover)] bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:bg-[var(--bg-muted)] transition-colors focus-visible:ring-2 focus-visible:ring-[var(--focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-elevated)]"
      aria-label="Cancel edit"
    >
      Cancel
    </Button>
    <Button
      type="submit"
      form={formId}
      variant="primary"
      isLoading={isSubmitting}
      className="flex-1 h-11 sm:h-10 min-h-[44px] sm:min-h-[40px] px-3 rounded-[8px] text-sm font-semibold !bg-[var(--btn-primary-border)] !bg-[linear-gradient(var(--btn-primary-to),var(--btn-primary-border))] hover:!bg-none text-[var(--text-on-brand)] shadow-xs transition-colors focus-visible:ring-2 focus-visible:ring-[var(--focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-elevated)]"
    >
      Save Updates
    </Button>
  </div>
);

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
  onManageEntries,
  mealActionLabel = 'Add Meal',
  isAdding = false,
  editingId = null,
  isSubmitting = false,
  editFooter,
  showEditInstructions,
}) => {
  const showMealActions = category === 'meals' && !isEditMode && onMealAdd;
  const showMarketActions = category === 'markets' && !isEditMode && onEditToggle && onScheduleClick;
  const showPaymentActions = category === 'payments' && !isEditMode && onPaymentAdd;
  const anyActionActive = isAdding || !!editingId;
  const manageAction = onManageEntries && (
    <Button variant="secondary" size="sm" onClick={onManageEntries}>
      Manage entries
    </Button>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="lg"
      mobileSheet
      accentColor="blue"
      showCloseButton={!isSubmitting}
      closeOnOverlayClick={!isSubmitting}
      isBusy={isSubmitting}
      footer={editFooter || (!isEditMode && showEditInstructions && (
        <p className="w-full break-words text-sm leading-relaxed text-[var(--text-secondary)]">
          Select an editable row, make changes, then choose Save Updates. Members can edit their own
          {category === 'payments' ? ' unverified, unsettled payments.' : ' entries.'}
        </p>
      ))}
    >
      {!isEditMode && (onEditToggle || manageAction) && !showMealActions && !showMarketActions && !showPaymentActions && (
        <div className="flex items-center gap-2 py-2 border-b border-border bg-muted/20 mb-4 -mx-5 px-5 sm:-mx-6 sm:px-6">
          {manageAction || <Button
            variant="ghost"
            size="sm"
            iconOnly
            onClick={onEditToggle}
            disabled={anyActionActive}
            aria-label="Edit entries"
          >
            <Pencil className="w-4 h-4" />
          </Button>}
        </div>
      )}

      {showMealActions && (
        <div className="flex flex-wrap items-center gap-2 py-2 border-b border-border bg-muted/20 mb-4 -mx-5 px-5 sm:-mx-6 sm:px-6">
          <Button
            variant="primary"
            size="sm"
            onClick={onMealAdd}
            aria-label={mealActionLabel}
          >
            {mealActionLabel}
          </Button>
          {manageAction}
        </div>
      )}

      {showMarketActions && (
        <div className="flex flex-wrap items-center gap-2 py-2 border-b border-border bg-muted/20 mb-4 -mx-5 px-5 sm:-mx-6 sm:px-6">
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
            variant="secondary"
            size="sm"
            onClick={onScheduleClick}
            aria-label="Schedule market dates"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Book Date</span>
          </Button>
          {manageAction}
        </div>
      )}

      {showPaymentActions && (
        <div className="flex flex-wrap items-center gap-2 py-2 border-b border-border bg-muted/20 mb-4 -mx-5 px-5 sm:-mx-6 sm:px-6">
          <Button
            variant="primary"
            size="sm"
            onClick={onPaymentAdd}
            aria-label="Add payment"
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Add Payment</span>
          </Button>
          {manageAction}
        </div>
      )}

      {children}
    </Modal>
  );
};

DayDetailDialog.displayName = 'DayDetailDialog';
export default DayDetailDialog;
