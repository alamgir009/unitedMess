import { memo } from 'react';
import { HiOutlineExclamationTriangle } from 'react-icons/hi2';
import { cn } from '@/core/utils/helpers/string.helper';
import Modal from '../Modal/Modal';
import Button from '../Button/Button';

const iconBgColors = {
  red: 'bg-rose-50 dark:bg-rose-500/10 border-rose-100 dark:border-rose-500/20',
  amber: 'bg-amber-50 dark:bg-amber-500/10 border-amber-100 dark:border-amber-500/20',
  blue: 'bg-blue-50 dark:bg-blue-500/10 border-blue-100 dark:border-blue-500/20',
};

const ConfirmDialog = memo(({
  isOpen,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  description = 'This action cannot be undone.',
  icon: Icon = HiOutlineExclamationTriangle,
  iconColor = 'red',
  itemSummary = null,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isConfirming = false,
  variant = 'danger',
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={isConfirming ? undefined : onClose}
      accentColor="red"
      size="sm"
      role="alertdialog"
      description={description}
      showCloseButton={false}
      closeOnOverlayClick={!isConfirming}
      mobileSheet
    >
      <div className="flex flex-col items-center gap-5">
        <div className="flex justify-center">
          <div className={cn(
            'w-14 h-14 rounded-xl border flex items-center justify-center',
            iconBgColors[iconColor] || iconBgColors.red,
          )}>
            <Icon className="w-6 h-6 text-rose-500" />
          </div>
        </div>

        <div className="text-center space-y-1">
          <h3 className="text-base font-bold tracking-tight text-foreground">
            {title}
          </h3>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            {description}
          </p>
        </div>

        {itemSummary && (
          <div className="w-full">
            {itemSummary}
          </div>
        )}

        <div className="flex flex-col-reverse sm:flex-row gap-2.5 w-full pt-1">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isConfirming}
            className="w-full sm:flex-1"
          >
            {cancelLabel}
          </Button>
          <Button
            variant={variant}
            onClick={onConfirm}
            isLoading={isConfirming}
            className="w-full sm:flex-1"
          >
            {isConfirming ? 'Processing…' : confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
});

ConfirmDialog.displayName = 'ConfirmDialog';
export default ConfirmDialog;
