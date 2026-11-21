import React, { useMemo } from 'react';
import { Modal } from '@/shared/components/ui';
import MarketForm from '../MarketForm/MarketForm';
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

export const MarketModal = ({
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
  isAdmin = false,
  currentUser,
  readOnly = false,
  footer,
  children,
  className = '',
}) => {
  const [internalFooter, setInternalFooter] = React.useState(null);

  // Title rule:
  // Add mode: "Add market record" (or "Log New Purchase")
  // Edit mode: "Edit markets · 23 Nov 2026"
  const resolvedTitle = useMemo(() => {
    if (customTitle) return customTitle;
    const targetDate = date || initialData?.date || entries[0]?.date;
    const dateFormatted = formatTitleDate(targetDate);
    if (mode === 'edit' || initialData) {
      return dateFormatted ? `Edit markets · ${dateFormatted}` : 'Edit markets';
    }
    return isAdmin ? 'Add market record' : 'Log New Purchase';
  }, [customTitle, date, initialData, entries, mode, isAdmin]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={resolvedTitle}
      size="md"
      mobileSheet
      accentColor="emerald"
      className={className}
      footer={footer || internalFooter}
    >
      {children ? (
        children
      ) : (
        <MarketForm
          initialData={initialData}
          entries={entries}
          mode={mode}
          date={date}
          onSubmit={onSubmit}
          onSave={onSave}
          onUpdate={onUpdate}
          onDelete={onDelete}
          onBulkDelete={onBulkDelete}
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

MarketModal.displayName = 'MarketModal';
export default MarketModal;
