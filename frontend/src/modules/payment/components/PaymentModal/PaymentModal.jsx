import React, { useMemo } from 'react';
import { Modal } from '@/shared/components/ui';
import PaymentForm from '../PaymentForm/PaymentForm';
import { format, parseISO, isValid } from 'date-fns';

const formatTitleDate = (d) => {
  if (!d) return '';
  try {
    const parsed = typeof d === 'string' ? parseISO(d) : d;
    return isValid(parsed) ? format(parsed, 'd MMM yyyy') : '';
  } catch {
    return '';
  }
};

export const PaymentModal = ({
  isOpen,
  onClose,
  title: customTitle,
  mode = 'add', // 'add' | 'edit'
  date,
  initialData,
  onSubmit,
  onSave,
  isAdmin = false,
  currentUser,
  readOnly = false,
  preselectedUserId,
  isSubmitting = false,
  footer,
  children,
  className = '',
}) => {
  const [internalFooter, setInternalFooter] = React.useState(null);

  // Title rule:
  // Add mode: "Record payment"
  // Edit mode: "Edit payment · 21 Nov 2026"
  // View mode: "View payment details"
  const resolvedTitle = useMemo(() => {
    if (customTitle) return customTitle;
    const targetDate = date || initialData?.paymentDate || initialData?.date;
    const dateFormatted = formatTitleDate(targetDate);
    if (readOnly) {
      return dateFormatted ? `View payment details · ${dateFormatted}` : 'View payment details';
    }
    if (mode === 'edit' || (initialData && initialData._id)) {
      return dateFormatted ? `Edit payment · ${dateFormatted}` : 'Edit payment';
    }
    return 'Record payment';
  }, [customTitle, date, initialData, mode, readOnly]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      isBusy={isSubmitting}
      title={resolvedTitle}
      size="md"
      mobileSheet
      accentColor="blue"
      className={className}
      footer={footer || internalFooter}
    >
      {children ? (
        React.isValidElement(children)
          ? React.cloneElement(children, {
              renderFooter: children.props.renderFooter || setInternalFooter,
            })
          : children
      ) : (
        <PaymentForm
          initialData={initialData}
          date={date}
          onSubmit={onSubmit || onSave}
          onCancel={onClose}
          isAdmin={isAdmin}
          currentUser={currentUser}
          readOnly={readOnly}
          preselectedUserId={preselectedUserId}
          isSubmitting={isSubmitting}
          renderFooter={setInternalFooter}
        />
      )}
    </Modal>
  );
};

PaymentModal.displayName = 'PaymentModal';
export default PaymentModal;
