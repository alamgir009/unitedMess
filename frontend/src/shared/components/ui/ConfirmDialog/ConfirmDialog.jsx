import { memo } from 'react';
import { HiOutlineExclamationTriangle } from 'react-icons/hi2';
import { cn } from '@/core/utils/helpers/string.helper';
import Modal from '../Modal/Modal';
import Button from '../Button/Button';

const iconToneStyles = {
  red: {
    bg: 'bg-danger-bg border-danger-border',
    icon: 'text-danger-text',
  },
  amber: {
    bg: 'bg-warning-bg border-warning-border',
    icon: 'text-warning-text',
  },
  blue: {
    bg: 'bg-primary/10 border-primary/20',
    icon: 'text-primary',
  },
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
  const tone = iconToneStyles[iconColor] || iconToneStyles.red;

  return (
    <Modal
      isOpen={isOpen}
      onClose={isConfirming ? undefined : onClose}
      accentColor={iconColor === 'blue' ? 'blue' : iconColor === 'amber' ? 'amber' : 'red'}
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
            tone.bg,
          )}>
            <Icon className={cn('w-6 h-6', tone.icon)} />
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
