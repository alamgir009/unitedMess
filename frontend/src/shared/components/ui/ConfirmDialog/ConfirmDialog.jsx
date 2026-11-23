import { memo, useId } from 'react';
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

const actionClassName = 'h-auto min-h-[44px] whitespace-normal px-2 py-2 text-center [overflow-wrap:anywhere] sm:min-h-10';

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
  const titleId = useId();
  const descriptionId = useId();
  const tone = iconToneStyles[iconColor] || iconToneStyles.red;
  const footer = (
    <div className="grid w-full grid-cols-2 gap-2.5">
      <Button
        variant="secondary"
        onClick={onClose}
        disabled={isConfirming}
        className={actionClassName}
      >
        {cancelLabel}
      </Button>
      <Button
        variant={variant}
        onClick={onConfirm}
        isLoading={isConfirming}
        className={actionClassName}
      >
        {isConfirming ? 'Processing…' : confirmLabel}
      </Button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      accentColor={iconColor === 'blue' ? 'blue' : iconColor === 'amber' ? 'amber' : 'red'}
      size="sm"
      role="alertdialog"
      ariaLabelledBy={titleId}
      ariaDescribedBy={descriptionId}
      isBusy={isConfirming}
      showCloseButton={false}
      closeOnOverlayClick={!isConfirming}
      footer={footer}
    >
      <div className="flex flex-col items-center gap-4">
        <div className={cn(
          'flex h-12 w-12 items-center justify-center rounded-xl border',
          tone.bg,
        )}>
          <Icon className={cn('h-6 w-6', tone.icon)} />
        </div>

        <div className="text-center space-y-1">
          <h3 id={titleId} className="text-base font-bold tracking-tight text-foreground">
            {title}
          </h3>
          <p id={descriptionId} className="text-pretty text-xs leading-relaxed text-[var(--text-secondary)]">
            {description}
          </p>
        </div>

        {itemSummary && (
          <div className="w-full">
            {itemSummary}
          </div>
        )}
      </div>
    </Modal>
  );
});

ConfirmDialog.displayName = 'ConfirmDialog';
export default ConfirmDialog;
