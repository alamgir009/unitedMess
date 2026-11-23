import { useRef } from 'react';
import { HiOutlineTrash } from 'react-icons/hi2';
import { formatSignedRupees } from '@/core/utils/helpers/currency.helper';
import { formatInIST } from '@/core/utils/helpers/date.helper';
import ConfirmDialog from './ConfirmDialog';

const RECORD_NAMES = {
  meals: { single: 'meal record', plural: 'meal records' },
  markets: { single: 'market entry', plural: 'market entries' },
  payments: { single: 'payment record', plural: 'payment records' },
};

const MEAL_TYPES = { both: 'Day and night meals', day: 'Day meal', night: 'Night meal', off: 'Meal off' };
const PAYMENT_TYPES = { mess_bill: 'Mess Bill', gas_bill: 'Gas Bill', other: 'Other payment' };
const PAYMENT_STATUSES = {
  completed: 'Paid', pending: 'Pending', pending_verification: 'Pending verification', failed: 'Failed', refunded: 'Refunded',
};

const RecordDeleteDialog = ({
  category,
  isOpen,
  record,
  count = 1,
  rangeLabel,
  onConfirm,
  onClose,
  isDeleting = false,
  isStacked = false,
  error,
}) => {
  const requestInProgress = useRef(false);
  const names = RECORD_NAMES[category];
  if (!names) return null;
  const { single, plural } = names;
  const multiple = count > 1;
  const recordLabel = multiple ? rangeLabel : {
    meals: MEAL_TYPES[record?.type] || 'Meal record',
    markets: record?.items?.trim() || 'Market entry',
    payments: PAYMENT_TYPES[record?.type] || 'Payment record',
  }[category];
  const date = record?.date || record?.paymentDate;
  const detail = [
    record?.user?.name || record?.userName,
    date && formatInIST(date, 'd MMM yyyy'),
    category === 'payments' && record?.month,
    category === 'payments' && PAYMENT_STATUSES[record?.status],
  ].filter(Boolean).join(' · ');
  const amount = category !== 'meals' && record?.amount != null ? formatSignedRupees(record.amount) : null;

  const confirmDelete = async () => {
    if (requestInProgress.current || isDeleting) return;
    requestInProgress.current = true;
    try {
      await onConfirm();
    } finally {
      requestInProgress.current = false;
    }
  };

  return (
    <ConfirmDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={confirmDelete}
      title={multiple ? `Delete ${count} ${plural}?` : `Delete ${single}?`}
      description={multiple
        ? 'This permanently deletes the selected records.'
        : 'This permanently deletes the record.'}
      confirmLabel="Confirm delete"
      icon={HiOutlineTrash}
      appearance="record-delete"
      isConfirming={isDeleting}
      isStacked={isStacked}
      error={error}
      itemSummary={(record || rangeLabel) && (
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 rounded-xl border border-border bg-[var(--bg-surface)] px-3.5 py-3">
          <div className="min-w-0 flex-1">
            <p className="break-words text-sm font-semibold text-foreground">{recordLabel}</p>
            {detail && <p className="mt-1 break-words text-xs leading-relaxed text-[var(--text-secondary)]">{detail}</p>}
          </div>
          {amount && <p className="text-sm font-semibold tabular-nums text-foreground">{amount}</p>}
        </div>
      )}
    />
  );
};

export default RecordDeleteDialog;
