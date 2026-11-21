import React from 'react';
import { Modal } from '@/shared/components/ui';
import MealForm from '../MealForm/MealForm';
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

export const MealModal = ({
  isOpen,
  onClose,
  title: customTitle,
  mode = 'add', // 'add' | 'edit'
  date,
  initialData,
  entries = [],
  onSubmit,
  onSave,
  onUpdate,
  onDelete,
  onBulkDelete,
  onBulkUpdate,
  isAdmin = false,
  currentUser,
  readOnly = false,
  footer,
  children,
  className = '',
}) => {
  const [internalFooter, setInternalFooter] = React.useState(null);

  // Title rule:
  // Add mode: "Add meal record"
  // Edit mode: "Edit meals · 20 Nov 2026"
  const resolvedTitle = React.useMemo(() => {
    if (customTitle) return customTitle;
    const targetDate = date || initialData?.date || (entries[0]?.date);
    const dateFormatted = formatTitleDate(targetDate);
    if (mode === 'edit' || initialData) {
      return dateFormatted ? `Edit meals · ${dateFormatted}` : 'Edit meals';
    }
    return 'Add meal record';
  }, [customTitle, date, initialData, entries, mode]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={resolvedTitle}
      size="md"
      mobileSheet
      accentColor="blue"
      className={className}
      footer={footer || internalFooter}
    >
      {children ? (
        children
      ) : (
        <MealForm
          initialData={initialData}
          entries={entries}
          mode={mode}
          date={date}
          onSubmit={onSubmit}
          onSave={onSave}
          onUpdate={onUpdate}
          onDelete={onDelete}
          onBulkDelete={onBulkDelete}
          onBulkUpdate={onBulkUpdate}
          onCancel={onClose}
          isAdmin={isAdmin}
          currentUser={currentUser}
          readOnly={readOnly}
          renderFooter={setInternalFooter}
        />
      )}
    </Modal>
  );
};

MealModal.displayName = 'MealModal';
export default MealModal;