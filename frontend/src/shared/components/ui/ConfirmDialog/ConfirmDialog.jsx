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
  appearance,
  isStacked = false,
  error,
}) => {
  const titleId = useId();
  const descriptionId = useId();
  const summaryId = useId();
  const tone = iconToneStyles[iconColor] || iconToneStyles.red;
  const isRecordDelete = appearance === 'record-delete';
  const actionClasses = isRecordDelete ? 'h-auto min-h-11 min-w-0 whitespace-normal px-2 py-2 text-center [overflow-wrap:anywhere] sm:min-h-11' : actionClassName;
  const footer = (
    <div className={cn(
      'grid w-full grid-cols-2 gap-2.5',
      isRecordDelete && 'bg-[var(--bg-surface)] px-5 py-4 sm:px-6',
    )}>
      <Button
        variant="secondary"
        onClick={onClose}
        disabled={isConfirming}
        className={actionClasses}
      >
        {cancelLabel}
      </Button>
      <Button
        variant={variant}
        onClick={onConfirm}
        isLoading={isConfirming}
        aria-label={isRecordDelete && isConfirming ? 'Deleting…' : undefined}
        className={actionClasses}
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
      ariaDescribedBy={isRecordDelete && itemSummary ? `${descriptionId} ${summaryId}` : descriptionId}
      isBusy={isConfirming}
      isStacked={isStacked}
      showCloseButton={false}
      closeOnOverlayClick={!isRecordDelete && !isConfirming}
      className={isRecordDelete ? 'max-w-[26rem] [&>[data-modal-body]]:p-0 [&>[data-modal-footer]]:p-0' : undefined}
      footer={footer}
    >
      <div className={cn('flex flex-col gap-4', isRecordDelete ? 'px-5 py-5 sm:px-6 sm:py-6' : 'items-center')}>
        <div className={cn('flex', isRecordDelete ? 'items-start gap-3.5' : 'flex-col items-center gap-4')}>
          <div className={cn(
            'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border',
            tone.bg,
          )}>
            <Icon aria-hidden="true" className={cn(isRecordDelete ? 'h-5 w-5' : 'h-6 w-6', tone.icon)} />
          </div>

          <div className={cn('min-w-0 space-y-1', !isRecordDelete && 'text-center')}>
            <h3 id={titleId} className={cn(
              'break-words font-bold tracking-tight text-foreground',
              isRecordDelete ? 'text-lg leading-snug' : 'text-base',
            )}>
              {title}
            </h3>
            <p id={descriptionId} className={cn(
              'text-pretty leading-relaxed text-[var(--text-secondary)]',
              isRecordDelete ? 'text-sm' : 'text-xs',
            )}>
              {description}
            </p>
          </div>
        </div>

        {itemSummary && (
          <div id={isRecordDelete ? summaryId : undefined} className="w-full">
            {itemSummary}
          </div>
        )}
        {error && <p role="alert" className="break-words rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger-text">{error}</p>}
      </div>
    </Modal>
  );
});

ConfirmDialog.displayName = 'ConfirmDialog';
export default ConfirmDialog;
