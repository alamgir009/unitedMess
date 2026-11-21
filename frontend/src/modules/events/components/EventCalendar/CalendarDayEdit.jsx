import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Plus, Trash2, X, Check, Minus, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/core/utils/helpers/string.helper';
import { fmt } from '@/core/utils/helpers/currency.helper';
import { MemberSelect, Button, Input, GuestMealField } from '@/shared/components/ui';
import apiClient from '@/services/api/client/apiClient';
import MealForm from '@/modules/meal/components/MealForm/MealForm';
import MarketForm from '@/modules/market/components/MarketForm/MarketForm';
import PaymentForm from '@/modules/payment/components/PaymentForm/PaymentForm';
import SlotIcon from './cells/SlotIcon';
import {
  HiOutlineSun,
  HiOutlineMoon,
  HiOutlineNoSymbol,
  HiOutlineSparkles,
  HiOutlineUserGroup,
  HiOutlineMinus,
  HiOutlinePlus,
} from 'react-icons/hi2';

const mealTypes = [
  { value: 'both', label: 'Both', description: 'Day & Night', icon: HiOutlineSparkles, color: 'border-[var(--brand)]/60 bg-[var(--bg-muted)] text-[var(--slot-both-text)]' },
  { value: 'day', label: 'Day', description: 'Morning only', icon: HiOutlineSun, color: 'border-[var(--brand)]/60 bg-[var(--bg-muted)] text-[var(--slot-day-text)]' },
  { value: 'night', label: 'Night', description: 'Evening only', icon: HiOutlineMoon, color: 'border-[var(--brand)]/60 bg-[var(--bg-muted)] text-[var(--slot-night-text)]' },
  { value: 'off', label: 'Off', description: 'No meals', icon: HiOutlineNoSymbol, color: 'border-[var(--brand)]/60 bg-[var(--bg-muted)] text-[var(--text-secondary)]' },
];

const FintechCheckbox = React.memo(({ checked, indeterminate, onChange, disabled, ariaLabel, ...props }) => {
  const checkboxRef = useRef(null);

  useEffect(() => {
    if (checkboxRef.current) {
      checkboxRef.current.indeterminate = Boolean(indeterminate);
    }
  }, [indeterminate]);

  return (
    <label
      className={cn(
        'relative inline-flex items-center justify-center w-6 h-6 min-h-[40px] sm:min-h-0 shrink-0 cursor-pointer select-none',
        disabled && 'cursor-not-allowed opacity-50'
      )}
    >
      <input
        ref={checkboxRef}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        aria-label={ariaLabel}
        className="sr-only peer"
        {...props}
      />
      <span
        aria-hidden="true"
        className={cn(
          'w-4 h-4 rounded-[4px] border border-[var(--border-contrast)] bg-[var(--bg-elevated)] transition-[background-color,border-color] duration-150 flex items-center justify-center pointer-events-none',
          'peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--focus)] peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-[var(--bg-elevated)]',
          (checked || indeterminate) && 'bg-[var(--brand)] border-[var(--brand)] text-[var(--text-on-brand)]',
          disabled && 'bg-[var(--input-bg-disabled)] border-[var(--border-muted)] text-[var(--text-disabled)]'
        )}
      >
        {indeterminate ? (
          <Minus className="w-3 h-3 stroke-[3]" />
        ) : checked ? (
          <Check className="w-3 h-3 stroke-[3]" />
        ) : null}
      </span>
    </label>
  );
});
FintechCheckbox.displayName = 'FintechCheckbox';

const getEntryUserId = (entry) =>
  typeof entry.user === 'object' ? entry.user?._id : entry.user;

const SelectAllRow = ({ checked, indeterminate, onChange, count, total, disabled }) => {
  return (
    <div
      className={cn(
        'flex items-center justify-between px-3 py-2 sm:py-1.5 min-h-[40px] sm:min-h-[36px] h-10 sm:h-9 rounded-[8px] border border-[var(--border-muted)] bg-transparent transition-opacity',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <div className="flex items-center gap-2 min-h-[40px] sm:min-h-0">
        <FintechCheckbox
          checked={checked}
          indeterminate={indeterminate}
          onChange={onChange}
          disabled={disabled}
          ariaLabel={checked ? 'Deselect all entries' : 'Select all entries'}
        />
        <span className="text-[13px] font-medium text-[var(--text-primary)] leading-none select-none">
          Select all <span className="font-normal text-[var(--text-muted)]">({count})</span>
        </span>
      </div>

      {count > 0 && total > 0 && (
        <span className="text-xs font-medium text-[var(--text-muted)]">
          {count} / {total} selected
        </span>
      )}
    </div>
  );
};

const CalendarDayEdit = ({ entries = [], category, date: detailDate, isAdmin, currentUser, onSave, onUpdate, onDelete, selectedEntryIds, onToggleSelect, onSelectAll, onBulkDelete, onBulkUpdate, onExitSelectMode, isBulkSubmitting = false, isAdding, setIsAdding, editingId, setEditingId, confirmDeleteId, setConfirmDeleteId }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showBulkUpdateForm, setShowBulkUpdateForm] = useState(false);

  const dateStr = detailDate ? format(new Date(detailDate), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
  const currentUserId = currentUser?._id || currentUser?.id;

  const sorted = useMemo(
    () =>
      [...entries].sort(
        (a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt),
      ),
    [entries],
  );

  // Non-admin users only see and manage their own entries
  const visibleEntries = useMemo(() => {
    if (isAdmin) return sorted;
    return sorted.filter((entry) => getEntryUserId(entry) === currentUserId);
  }, [sorted, isAdmin, currentUserId]);

  const canEdit = (entry) => isAdmin || getEntryUserId(entry) === currentUserId;

  if (category === 'meals') {
    return (
      <MealForm
        entries={entries}
        date={detailDate}
        mode={isAdding ? 'add' : 'edit'}
        initialData={editingId ? entries.find((e) => e._id === editingId) : null}
        isAdmin={isAdmin}
        currentUser={currentUser}
        onSubmit={onSave}
        onSave={onSave}
        onUpdate={onUpdate}
        onDelete={onDelete}
        onBulkDelete={onBulkDelete}
        onBulkUpdate={onBulkUpdate}
        onCancel={() => {
          setIsAdding?.(false);
          setEditingId?.(null);
        }}
      />
    );
  }

  if (category === 'markets') {
    return (
      <MarketForm
        entries={entries}
        date={detailDate}
        mode={isAdding ? 'add' : 'edit'}
        initialData={editingId ? entries.find((e) => e._id === editingId) : null}
        isAdmin={isAdmin}
        currentUser={currentUser}
        onSubmit={onSave}
        onSave={onSave}
        onUpdate={onUpdate}
        onDelete={onDelete}
        onBulkDelete={onBulkDelete}
        onCancel={() => {
          setIsAdding?.(false);
          setEditingId?.(null);
          onDone?.();
        }}
      />
    );
  }

  if (category === 'payments') {
    return (
      <PaymentForm
        date={detailDate}
        initialData={editingId ? entries.find((e) => e._id === editingId) : null}
        isAdmin={isAdmin}
        currentUser={currentUser}
        onSubmit={onSave}
        onSave={onSave}
        onCancel={() => {
          setIsAdding?.(false);
          setEditingId?.(null);
          onDone?.();
        }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
          {visibleEntries.length} {category === 'meals' ? 'meal' : category === 'payments' ? 'payment' : 'market'} entr{visibleEntries.length === 1 ? 'y' : 'ies'}
          {!isAdmin && entries.length > visibleEntries.length && (
            <span className="ml-1 text-[var(--text-muted)]">
              ({entries.length} total)
            </span>
          )}
        </p>
        {!isAdding && !isBulkSubmitting && !(category === 'meals' && !isAdmin && visibleEntries.length > 0) && (
          <button
            onClick={() => setIsAdding(true)}
            disabled={!!editingId || !!confirmDeleteId || selectedEntryIds?.size > 0}
            className={cn(
              'flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              editingId || confirmDeleteId || selectedEntryIds?.size > 0
                ? 'text-[var(--text-muted)] opacity-40 cursor-not-allowed'
                : 'text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/10',
            )}
          >
            <Plus className="w-3.5 h-3.5" />
            Add
          </button>
        )}
      </div>

      {onToggleSelect && onSelectAll && (
        <SelectAllRow
          checked={visibleEntries.length > 0 && selectedEntryIds?.size === visibleEntries.length}
          indeterminate={selectedEntryIds?.size > 0 && selectedEntryIds?.size < visibleEntries.length}
          onChange={onSelectAll}
          count={visibleEntries.length === 0 ? 0 : selectedEntryIds?.size || 0}
          total={visibleEntries.length}
          disabled={visibleEntries.length === 0 || isBulkSubmitting || !!isAdding || !!editingId || !!confirmDeleteId}
        />
      )}

      {isAdding && (
        <EntryForm
          category={category}
          dateStr={dateStr}
          isAdmin={isAdmin}
          currentUser={currentUser}
          onSave={onSave}
          onCancel={() => setIsAdding(false)}
          setIsSubmitting={setIsSubmitting}
          isSubmitting={isSubmitting}
        />
      )}

      <div className="flex flex-col gap-1">
        {visibleEntries.length === 0 && !isAdding && (
          <p className="text-sm text-[var(--text-muted)] py-4 text-center">
            {!isAdmin && entries.length > 0 ? 'No entries for you on this day.' : 'No entries for this day.'}
          </p>
        )}
        {visibleEntries.map((entry) => {
          const isEditing = editingId === entry._id;
          const isConfirming = confirmDeleteId === entry._id;
          const isUnpopulated = entry.user && typeof entry.user === 'string';
          const displayName = entry.user?.name || entry.userName || (isUnpopulated ? currentUser?.name : 'Unknown');
          return (
            <div key={entry._id}>
              {isEditing ? (
                <EntryEditForm
                  entry={entry}
                  category={category}
                  onUpdate={onUpdate}
                  onCancel={() => setEditingId(null)}
                  setIsSubmitting={setIsSubmitting}
                />
              ) : (
                <div
                  className={cn(
                    /* composited: only bg changes on hover */
                    'flex items-center gap-2 px-3 py-2 rounded-lg transition-colors duration-75',
                    'hover:bg-[var(--bg-muted)]',
                    isConfirming && 'bg-[var(--danger-bg)]/20 border border-[var(--danger)]/30',
                  )}
                >
                  {selectedEntryIds && onToggleSelect && (
                    <FintechCheckbox
                      checked={selectedEntryIds.has(entry._id)}
                      onChange={() => onToggleSelect(entry._id)}
                      disabled={isBulkSubmitting || !!isAdding || !!editingId || !!confirmDeleteId}
                      ariaLabel={`Select ${displayName}`}
                    />
                  )}
                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    <span className="text-sm font-medium text-[var(--text-primary)] truncate">
                      {displayName}
                    </span>
                    {category === 'meals' && entry.type && (
                      <SlotIcon slot={entry.type} status={entry.status} size={12} />
                    )}
                    {category === 'meals' && entry.isGuestMeal && entry.guestCount > 0 && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-[var(--info-bg)] text-[var(--info-text)] border border-[var(--info-border)]">
                        <HiOutlineUserGroup className="w-2.5 h-2.5" />
                        +{entry.guestCount}
                      </span>
                    )}
                    {category === 'markets' && (
                      <span className="text-xs font-bold tabular-nums text-[var(--text-primary)]">
                        ₹{fmt(entry.amount)}
                      </span>
                    )}
                  </div>

                  {isConfirming ? (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={async () => {
                          setIsSubmitting(true);
                          try { await onDelete(entry._id); }
                          finally { setConfirmDeleteId(null); setIsSubmitting(false); }
                        }}
                        disabled={isSubmitting || isBulkSubmitting}
                        className={cn(
                          'rounded-lg bg-[var(--danger)] text-[var(--text-on-brand)]',
                          'hover:bg-[var(--danger)]/90 active:bg-[var(--danger)]/80 shadow-xs',
                          'transition-colors duration-100',
                          'min-h-[36px] px-2.5 flex items-center justify-center gap-1 text-[11px] font-semibold',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--bg-elevated)]',
                          'disabled:opacity-50 disabled:cursor-not-allowed',
                        )}
                        aria-label="Confirm delete"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span className="hidden min-[380px]:inline">Delete</span>
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        disabled={isSubmitting || isBulkSubmitting}
                        className={cn(
                          'rounded-lg border border-[var(--border-default)] text-[var(--text-secondary)]',
                          'hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)] hover:border-[var(--border-strong)]',
                          'active:bg-[var(--bg-muted)]/80 transition-colors duration-100',
                          'min-h-[36px] min-w-[36px] p-1.5 flex items-center justify-center',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--bg-elevated)]',
                          'disabled:opacity-50 disabled:cursor-not-allowed',
                        )}
                        aria-label="Cancel delete"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : canEdit(entry) ? (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => setEditingId(entry._id)}
                        disabled={isBulkSubmitting || !!isAdding || !!confirmDeleteId || selectedEntryIds?.size > 0}
                        className={cn(
                          'rounded-lg text-[var(--text-secondary)]',
                          'hover:text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/10',
                          'active:bg-[var(--accent-primary)]/15 transition-colors duration-100',
                          'min-h-[36px] min-w-[36px] p-1.5 flex items-center justify-center',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--bg-elevated)]',
                          'disabled:opacity-40 disabled:cursor-not-allowed',
                        )}
                        aria-label="Edit entry"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(entry._id)}
                        disabled={isBulkSubmitting || !!isAdding || !!editingId || selectedEntryIds?.size > 0}
                        className={cn(
                          'rounded-lg text-[var(--text-secondary)]',
                          'hover:text-[var(--danger)] hover:bg-[var(--danger-bg)]/30',
                          'active:bg-[var(--danger-bg)]/50 transition-colors duration-100',
                          'min-h-[36px] min-w-[36px] p-1.5 flex items-center justify-center',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--bg-elevated)]',
                          'disabled:opacity-40 disabled:cursor-not-allowed',
                        )}
                        aria-label="Delete entry"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {selectedEntryIds?.size > 0 && !showBulkUpdateForm && (
        <div className="flex items-center gap-2 p-2 rounded-lg border border-[var(--accent-primary)]/20 bg-[var(--accent-primary)]/5">
          <span className="text-xs font-semibold text-[var(--accent-primary)]">
            {isBulkSubmitting ? (
              <span className="flex items-center gap-1.5">
                <Loader2 className="w-3 h-3 animate-spin" />
                {isBulkSubmitting === 'deleting' ? 'Deleting…' : 'Updating…'}
              </span>
            ) : (
              `${selectedEntryIds.size} selected`
            )}
          </span>
          <div className="flex-1" />
          <button
            onClick={() => setShowBulkUpdateForm(true)}
            disabled={!!isBulkSubmitting || !!isAdding || !!editingId || !!confirmDeleteId}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isBulkSubmitting === 'updating' ? (
              <span className="flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                Updating…
              </span>
            ) : 'Update'}
          </button>
          <button
            onClick={onBulkDelete}
            disabled={!!isBulkSubmitting || !!isAdding || !!editingId || !!confirmDeleteId}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold text-[var(--danger)] hover:bg-[var(--danger-bg)]/20 border border-[var(--danger)]/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--danger)]/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isBulkSubmitting === 'deleting' ? (
              <span className="flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                Deleting…
              </span>
            ) : 'Delete'}
          </button>
          <button
            onClick={onExitSelectMode}
            disabled={!!isBulkSubmitting || !!isAdding || !!editingId || !!confirmDeleteId}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)] border border-[var(--border-default)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
        </div>
      )}

      {showBulkUpdateForm && (
        <BulkUpdateForm
          category={category}
          selectedCount={selectedEntryIds.size}
          onSubmit={(payload) => { setShowBulkUpdateForm(false); onBulkUpdate(payload); }}
          onCancel={() => setShowBulkUpdateForm(false)}
          isBulkSubmitting={isBulkSubmitting}
        />
      )}

    </div>
  );
};

// ─── Inline Add Form ───────────────────────────────────────────

const MAX_RANGE_DAYS = 31;
const typeCountMap = { both: 2, day: 1, night: 1, off: 0 };

const modalInputClass =
  'h-11 sm:h-10 min-h-[44px] sm:min-h-[40px] px-3 rounded-[8px] border-[var(--border-contrast)] hover:border-[var(--border-contrast-hover)] focus:border-[var(--focus)] text-[16px] sm:text-sm bg-[var(--bg-elevated)]';

const ModeTab = ({ mode, current, onChange, label }) => (
  <button
    type="button"
    role="tab"
    aria-selected={current === mode}
    onClick={() => onChange(mode)}
    className={cn(
      'flex-1 h-8 sm:h-8 min-h-[32px] sm:min-h-[32px] max-sm:h-9 max-sm:min-h-[36px] flex items-center justify-center text-xs font-semibold rounded-[6px] transition-[background-color,color,box-shadow] duration-150 motion-reduce:transition-none',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--bg-elevated)]',
      current === mode
        ? 'bg-[var(--brand)] text-[var(--text-on-brand)] shadow-xs'
        : 'bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)]'
    )}
  >
    {label}
  </button>
);

const TypeBtn = ({ value, current, onClick, icon: Icon, label, description, color, disabled }) => {
  const isActive = current === value;
  return (
    <button
      type="button"
      onClick={() => !disabled && onClick(value)}
      disabled={disabled}
      aria-pressed={isActive}
      className={cn(
        'relative flex flex-col items-center justify-center gap-1 py-2 px-2 sm:py-2.5 sm:px-3 rounded-[10px] border transition-[background-color,border-color,opacity] duration-150 motion-reduce:transition-none text-center',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-elevated)]',
        disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer',
        isActive
          ? `${color} border-2 font-semibold shadow-xs`
          : 'border-[var(--border-contrast)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-muted)] hover:border-[var(--border-contrast-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
      )}
    >
      <Icon className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
      <span className="text-xs font-bold leading-tight">{label}</span>
      <span className="text-[10px] text-[var(--text-muted)] leading-tight hidden sm:block">{description}</span>
    </button>
  );
};

const EntryForm = ({ category, dateStr, isAdmin, currentUser, onSave, onCancel, setIsSubmitting, isSubmitting = false }) => {
  const [mode, setMode] = useState('single');
  const [date, setDate] = useState(dateStr);
  const [rangeFrom, setRangeFrom] = useState(dateStr);
  const [rangeTo, setRangeTo] = useState(dateStr);
  const [type, setType] = useState('day');
  const [amount, setAmount] = useState('');
  const [items, setItems] = useState('');
  const [remarks, setRemarks] = useState('');
  const [userIds, setUserIds] = useState([]);
  const [users, setUsers] = useState([]);
  const [isUsersLoading, setIsUsersLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [isGuestMeal, setIsGuestMeal] = useState(false);
  const [guestCount, setGuestCount] = useState(1);

  const isRangeMode = mode === 'range' && category === 'meals';

  const daysCount = useMemo(() => {
    if (!isRangeMode || !rangeFrom || !rangeTo) return 0;
    try {
      const f = new Date(rangeFrom);
      const t = new Date(rangeTo);
      const diff = Math.floor((t - f) / 86400000) + 1;
      return diff > 0 ? diff : 0;
    } catch { return 0; }
  }, [isRangeMode, rangeFrom, rangeTo]);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    (async () => {
      setIsUsersLoading(true);
      try {
        const res = await apiClient.get('users?limit=100');
        if (!cancelled) setUsers(res.data?.data?.users || res.data?.users || []);
      } finally {
        if (!cancelled) setIsUsersLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isAdmin]);

  const validate = useCallback(() => {
    const errs = {};
    if (isRangeMode) {
      if (!rangeFrom) errs.rangeFrom = 'Start date required';
      if (!rangeTo) errs.rangeTo = 'End date required';
      if (rangeFrom && rangeTo && rangeFrom > rangeTo) errs.rangeTo = 'End must be after start';
      if (daysCount > MAX_RANGE_DAYS) errs.rangeTo = `Max ${MAX_RANGE_DAYS} days`;
    } else {
      if (!date) errs.date = 'Date is required';
    }
    if (category === 'meals' && !type) errs.type = 'Type is required';
    if (category === 'markets' && (!amount || Number(amount) <= 0)) errs.amount = 'Amount must be > 0';
    if (category === 'markets' && !items.trim()) errs.items = 'Items is required';
    if (category === 'meals' && isGuestMeal && (!guestCount || guestCount < 1)) errs.guestCount = 'Guest count must be at least 1';
    if (isAdmin && userIds.length === 0) errs.userIds = 'Select at least one member';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [isRangeMode, rangeFrom, rangeTo, date, daysCount, category, type, amount, items, isAdmin, userIds, isGuestMeal, guestCount]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    if (isAdmin && userIds.length === 0) {
      setErrors((p) => ({ ...p, userIds: 'Select at least one member' }));
      return;
    }
    setIsSubmitting(true);
    try {
      if (isRangeMode) {
        const currentUserId = currentUser?._id || currentUser?.id;
        await onSave({
          startDate: rangeFrom,
          endDate: rangeTo,
          type,
          userIds: isAdmin ? userIds : (currentUserId ? [currentUserId] : []),
          isGuestMeal,
          guestCount: isGuestMeal ? (guestCount || 0) : 0,
          ...(remarks.trim() && { remarks: remarks.trim() }),
        });
      } else {
        const payload = { date: new Date(date).toISOString() };
        if (isAdmin) payload.userIds = userIds;
        if (category === 'meals') {
          payload.type = type;
          payload.isGuestMeal = isGuestMeal;
          payload.guestCount = isGuestMeal ? (guestCount || 0) : 0;
          if (remarks.trim()) payload.remarks = remarks.trim();
        } else {
          payload.amount = Math.round((parseFloat(amount) || 0) * 100) / 100;
          payload.items = items.trim();
          if (remarks.trim()) payload.description = remarks.trim();
        }
        await onSave(payload);
      }
      onCancel();
    } finally {
      setIsSubmitting(false);
    }
  };

  const rangeInvalid = isRangeMode && (daysCount === 0 || daysCount > MAX_RANGE_DAYS);

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 w-full">
      <p className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Add Entry</p>

      {/* ── Amount preview banner (markets) ── */}
      {category === 'markets' && (
        <div className="relative flex items-center justify-center py-3 rounded-xl border border-[var(--brand)]/15 bg-[var(--brand)]/5 overflow-hidden shrink-0">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground leading-none tracking-tight">
              ₹{amount === '' ? '0' : Number(amount).toLocaleString('en-IN')}
            </span>
            <span className="text-xs font-medium text-[var(--text-secondary)]">purchase amount</span>
          </div>
        </div>
      )}

      {isAdmin && (
        <div className="calendar-modal-member-select [&>div>button]:h-11 sm:[&>div>button]:h-10 [&>div>button]:min-h-[44px] sm:[&>div>button]:min-h-[40px] [&>div>button]:rounded-[8px] [&>div>button]:border-[var(--border-contrast)] hover:[&>div>button]:border-[var(--border-contrast-hover)] [&>div>button]:focus-visible:ring-2 [&>div>button]:focus-visible:ring-[var(--focus)] [&>div>button]:focus-visible:ring-offset-2 [&>div>button]:focus-visible:ring-offset-[var(--bg-elevated)] [&>div>button]:px-3 [&>div>button]:text-[16px] sm:[&>div>button]:text-sm [&>div>button]:bg-[var(--bg-elevated)] [&_.record-field-menu]:rounded-[8px] [&_.record-field-menu]:border-[var(--border-contrast)]">
          <MemberSelect
            users={users}
            value={userIds}
            onChange={(ids) => { setUserIds(ids); setErrors((p) => ({ ...p, userIds: undefined })); }}
            loading={isUsersLoading}
            disabled={isSubmitting}
            accentColor={category === 'markets' ? 'emerald' : 'primary'}
            placeholder="Select members…"
          />
          {errors.userIds && <p className="text-xs text-[var(--danger)] mt-1">{errors.userIds}</p>}
        </div>
      )}

      {/* Mode toggle — only for meals (markets don't support bulk) */}
      {category === 'meals' && (
        <div role="tablist" aria-label="Date mode" className="flex items-center gap-1 p-1 h-11 sm:h-10 min-h-[44px] sm:min-h-[40px] rounded-[8px] bg-[var(--bg-subtle)] border border-[var(--border-contrast)]">
          <ModeTab mode="single" current={mode} onChange={isSubmitting ? () => { } : setMode} label="Single Day" />
          <ModeTab mode="range" current={mode} onChange={isSubmitting ? () => { } : setMode} label="Date Range" />
        </div>
      )}

      {/* Preview badge for range mode */}
      {isRangeMode && (
        <div className={cn(
          'flex items-center justify-center gap-1.5 py-1.5 rounded-lg border text-xs font-semibold transition-colors',
          rangeInvalid
            ? 'border-[var(--danger)]/30 bg-[var(--danger-bg)]/15 text-[var(--danger)]'
            : 'border-[var(--accent-primary)]/20 bg-[var(--accent-primary)]/8 text-[var(--accent-primary)]',
        )}>
          {rangeInvalid
            ? <span>{daysCount > MAX_RANGE_DAYS ? `Max ${MAX_RANGE_DAYS} days` : 'Select valid range'}</span>
            : <span>{daysCount} day{daysCount !== 1 ? 's' : ''} · {typeCountMap[type] ?? 0} meal{typeCountMap[type] !== 1 ? 's' : ''}/day{isGuestMeal && guestCount > 0 ? ` +${guestCount} guest` : ''}</span>
          }
        </div>
      )}

      {/* Date inputs */}
      {isRangeMode ? (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Input
              type="date"
              variant="record"
              value={rangeFrom}
              onChange={(e) => { setRangeFrom(e.target.value); setErrors((p) => ({ ...p, rangeFrom: undefined, rangeTo: undefined })); }}
              disabled={isSubmitting}
              isInvalid={!!errors.rangeFrom}
              className={modalInputClass}
              aria-label="Start date"
            />
            {errors.rangeFrom && <p className="text-[10px] text-[var(--danger)] mt-0.5">{errors.rangeFrom}</p>}
          </div>
          <div>
            <Input
              type="date"
              variant="record"
              value={rangeTo}
              min={rangeFrom}
              onChange={(e) => { setRangeTo(e.target.value); setErrors((p) => ({ ...p, rangeTo: undefined })); }}
              disabled={isSubmitting}
              isInvalid={!!errors.rangeTo}
              className={modalInputClass}
              aria-label="End date"
            />
            {errors.rangeTo && <p className="text-[10px] text-[var(--danger)] mt-0.5">{errors.rangeTo}</p>}
          </div>
        </div>
      ) : (
        <div>
          <Input
            type="date"
            variant="record"
            value={date}
            onChange={(e) => { setDate(e.target.value); setErrors((p) => ({ ...p, date: undefined })); }}
            disabled={isSubmitting}
            isInvalid={!!errors.date}
            className={modalInputClass}
            aria-label="Date"
          />
          {errors.date && <p className="text-[10px] text-[var(--danger)] mt-0.5">{errors.date}</p>}
        </div>
      )}

      {category === 'meals' ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {mealTypes.map((t) => (
            <TypeBtn
              key={t.value}
              value={t.value}
              current={type}
              onClick={(v) => { if (!isSubmitting) { setType(v); setErrors((p) => ({ ...p, type: undefined })); } }}
              icon={t.icon}
              label={t.label}
              description={t.description}
              color={t.color}
              disabled={isSubmitting}
            />
          ))}
        </div>
      ) : (
        <>
          <div>
            <Input
              type="number"
              variant="record"
              value={amount}
              onChange={(e) => { setAmount(e.target.value); setErrors((p) => ({ ...p, amount: undefined })); }}
              min="0"
              max="999999"
              step="0.01"
              placeholder="0.00"
              disabled={isSubmitting}
              isInvalid={!!errors.amount}
              className={modalInputClass}
              leftIcon={<span className="text-[var(--success-text)] font-semibold text-sm">₹</span>}
              aria-label="Amount"
            />
            {errors.amount && <p className="text-[10px] text-[var(--danger)] mt-0.5">{errors.amount}</p>}
          </div>

          <div>
            <Input
              type="text"
              variant="record"
              value={items}
              onChange={(e) => { setItems(e.target.value); setErrors((p) => ({ ...p, items: undefined })); }}
              placeholder="e.g. Rice, Vegetables, Oil…"
              disabled={isSubmitting}
              isInvalid={!!errors.items}
              className={modalInputClass}
              aria-label="Items"
            />
            {errors.items && <p className="text-[10px] text-[var(--danger)] mt-0.5">{errors.items}</p>}
          </div>
        </>
      )}

      {/* Guest Meals stepper (meals only) */}
      {category === 'meals' && (
        <GuestMealField
          value={isGuestMeal ? (guestCount || 0) : 0}
          onChange={(gc) => {
            setIsGuestMeal(gc > 0);
            setGuestCount(gc);
            setErrors((p) => ({ ...p, guestCount: undefined }));
          }}
          max={20}
          disabled={isSubmitting}
        />
      )}
      {errors.guestCount && <p className="text-[10px] text-[var(--danger)]">{errors.guestCount}</p>}

      <Input
        type="text"
        variant="record"
        value={remarks}
        onChange={(e) => setRemarks(e.target.value)}
        placeholder={`${category === 'meals' ? 'Remarks' : 'Description'} (optional)`}
        disabled={isSubmitting}
        className={modalInputClass}
        aria-label={category === 'meals' ? 'Remarks' : 'Description'}
      />

      {/* Inline saving spinner */}
      {isSubmitting && (
        <div className="flex items-center gap-2 py-1.5 px-2.5 rounded-lg border border-[var(--accent-primary)]/20 bg-[var(--accent-primary)]/5">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--accent-primary)]" />
          <span className="text-[11px] font-semibold text-[var(--accent-primary)]">
            {isAdmin && userIds.length > 1
              ? `Saving for ${userIds.length} members…`
              : 'Saving…'
            }
          </span>
        </div>
      )}

      {/* ─── Fintech Footer: Cancel + Save ─── */}
      <div className="flex items-center gap-2 pt-3 mt-1 border-t border-[var(--border-contrast)]">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={isSubmitting}
          className="flex-1 h-11 sm:h-10 min-h-[44px] sm:min-h-[40px] px-3 rounded-[8px] text-sm font-medium border border-[var(--border-contrast)] hover:border-[var(--border-contrast-hover)] bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:bg-[var(--bg-muted)] transition-colors focus-visible:ring-2 focus-visible:ring-[var(--focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-elevated)]"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          disabled={isSubmitting || (isRangeMode && (rangeInvalid || daysCount === 0))}
          className="flex-1 h-11 sm:h-10 min-h-[44px] sm:min-h-[40px] px-3 rounded-[8px] text-sm font-semibold bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-[var(--text-on-brand)] border border-transparent shadow-xs transition-colors focus-visible:ring-2 focus-visible:ring-[var(--focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-elevated)]"
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-1.5">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Saving…
            </span>
          ) : isRangeMode ? (
            `Save ${daysCount > 0 ? daysCount : ''} day${daysCount !== 1 ? 's' : ''}`
          ) : 'Save'}
        </Button>
      </div>
    </form>
  );
};

// ─── Inline Edit Form ──────────────────────────────────────────

const EntryEditForm = ({ entry, category, onUpdate, onCancel, setIsSubmitting }) => {
  const [type, setType] = useState(entry.type || 'day');
  const [amount, setAmount] = useState(entry.amount ?? '');
  const [items, setItems] = useState(entry.items || '');
  const [remarks, setRemarks] = useState(entry.remarks || entry.description || '');
  const [isGuestMeal, setIsGuestMeal] = useState(entry.isGuestMeal || false);
  const [guestCount, setGuestCount] = useState(entry.guestCount || 1);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const errs = {};
    if (category === 'meals' && !type) errs.type = 'Type is required';
    if (category === 'markets' && (!amount || Number(amount) <= 0)) errs.amount = 'Amount must be > 0';
    if (category === 'markets' && !items.trim()) errs.items = 'Items is required';
    if (category === 'meals' && isGuestMeal && (!guestCount || guestCount < 1)) errs.guestCount = 'Guest count must be at least 1';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      const payload = {};
      if (category === 'meals') {
        payload.type = type;
        payload.isGuestMeal = isGuestMeal;
        payload.guestCount = isGuestMeal ? (guestCount || 0) : 0;
        payload.remarks = remarks.trim() || '';
      } else {
        payload.amount = Math.round((parseFloat(amount) || 0) * 100) / 100;
        if (items.trim()) payload.items = items.trim();
        payload.description = remarks.trim() || '';
      }
      await onUpdate(entry._id, payload);
      onCancel();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 w-full">
      {/* ── Amount preview banner (markets) ── */}
      {category === 'markets' && (
        <div className="relative flex items-center justify-center py-3 rounded-xl border border-[var(--brand)]/15 bg-[var(--brand)]/5 overflow-hidden shrink-0">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground leading-none tracking-tight">
              ₹{amount === '' ? '0' : Number(amount).toLocaleString('en-IN')}
            </span>
            <span className="text-xs font-medium text-[var(--text-secondary)]">purchase amount</span>
          </div>
        </div>
      )}

      {/* Row 1: Segmented control (meals) or Amount + Items (markets) */}
      {category === 'meals' ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {mealTypes.map((t) => (
            <TypeBtn
              key={t.value}
              value={t.value}
              current={type}
              onClick={(v) => { setType(v); setErrors((p) => ({ ...p, type: undefined })); }}
              icon={t.icon}
              label={t.label}
              description={t.description}
              color={t.color}
            />
          ))}
        </div>
      ) : (
        <>
          <div>
            <Input
              type="number"
              variant="record"
              value={amount}
              onChange={(e) => { setAmount(e.target.value); setErrors((p) => ({ ...p, amount: undefined })); }}
              min="0"
              max="999999"
              step="0.01"
              placeholder="0.00"
              isInvalid={!!errors.amount}
              className={modalInputClass}
              leftIcon={<span className="text-[var(--success-text)] font-semibold text-sm">₹</span>}
              aria-label="Amount"
            />
            {errors.amount && <p className="text-[10px] text-[var(--danger)] mt-0.5">{errors.amount}</p>}
          </div>

          <div>
            <Input
              type="text"
              variant="record"
              value={items}
              onChange={(e) => { setItems(e.target.value); setErrors((p) => ({ ...p, items: undefined })); }}
              placeholder="e.g. Rice, Vegetables, Oil…"
              isInvalid={!!errors.items}
              className={modalInputClass}
              aria-label="Items"
            />
            {errors.items && <p className="text-[10px] text-[var(--danger)] mt-0.5">{errors.items}</p>}
          </div>
        </>
      )}

      {/* Row 2: Notes / Description input (full width) */}
      <Input
        type="text"
        variant="record"
        value={remarks}
        onChange={(e) => setRemarks(e.target.value)}
        placeholder={category === 'meals' ? 'Notes' : 'Description (optional)'}
        className={modalInputClass}
        aria-label={category === 'meals' ? 'Notes' : 'Description'}
      />

      {/* Row 3: Guest Meals stepper (meals only) */}
      {category === 'meals' && (
        <GuestMealsRow
          isGuestMeal={isGuestMeal}
          guestCount={guestCount}
          onChange={({ isGuestMeal: igm, guestCount: gc }) => {
            setIsGuestMeal(igm);
            setGuestCount(gc);
            setErrors((p) => ({ ...p, guestCount: undefined }));
          }}
          disabled={false}
        />
      )}
      {errors.guestCount && <p className="text-[10px] text-[var(--danger)]">{errors.guestCount}</p>}

      {/* ─── Fintech Footer: Cancel + Save ─── */}
      <div className="flex items-center gap-2 pt-3 mt-1 border-t border-[var(--border-contrast)]">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          className="flex-1 h-11 sm:h-10 min-h-[44px] sm:min-h-[40px] px-3 rounded-[8px] text-sm font-medium border border-[var(--border-contrast)] hover:border-[var(--border-contrast-hover)] bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:bg-[var(--bg-muted)] transition-colors focus-visible:ring-2 focus-visible:ring-[var(--focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-elevated)]"
          aria-label="Cancel edit"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          className="flex-1 h-11 sm:h-10 min-h-[44px] sm:min-h-[40px] px-3 rounded-[8px] text-sm font-semibold bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-[var(--text-on-brand)] border border-transparent shadow-xs transition-colors focus-visible:ring-2 focus-visible:ring-[var(--focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-elevated)]"
          aria-label="Save changes"
        >
          Update
        </Button>
      </div>
    </form>
  );
};

// ─── Bulk Update Form ──────────────────────────────────────────

const BulkUpdateForm = ({ category, selectedCount, onSubmit, onCancel, isBulkSubmitting = false }) => {
  const [type, setType] = useState('');
  const [amount, setAmount] = useState('');
  const [items, setItems] = useState('');
  const [remarks, setRemarks] = useState('');
  const [errors, setErrors] = useState({});

  const validate = () => {
    const errs = {};
    if (category === 'meals' && !type) errs.type = 'Select a type';
    if (category === 'markets' && amount !== '' && Number(amount) <= 0) errs.amount = 'Amount must be > 0';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    const payload = {};
    if (category === 'meals' && type) payload.type = type;
    if (category === 'markets') {
      if (amount !== '') payload.amount = parseFloat(amount) || 0;
      if (items.trim()) payload.items = items.trim();
    }
    if (remarks.trim()) {
      if (category === 'meals') payload.remarks = remarks.trim();
      else payload.description = remarks.trim();
    }
    if (Object.keys(payload).length === 0) {
      setErrors({ empty: 'Change at least one field' });
      return;
    }
    onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 p-3 rounded-xl border border-[var(--accent-primary)]/20 bg-[var(--accent-primary)]/5">
      <p className="text-xs font-semibold text-[var(--accent-primary)] uppercase tracking-wider">
        Bulk Update · {selectedCount} entr{selectedCount === 1 ? 'y' : 'ies'}
      </p>

      {category === 'meals' ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {mealTypes.map((t) => (
            <TypeBtn
              key={t.value}
              value={t.value}
              current={type}
              onClick={(v) => { setType(v); setErrors((p) => ({ ...p, type: undefined, empty: undefined })); }}
              icon={t.icon}
              label={t.label}
              description={t.description}
              color={t.color}
            />
          ))}
        </div>
      ) : (
        <>
          <div>
            <Input
              type="number"
              variant="record"
              value={amount}
              onChange={(e) => { setAmount(e.target.value); setErrors((p) => ({ ...p, amount: undefined, empty: undefined })); }}
              min="0"
              max="999999"
              step="0.01"
              placeholder="0.00"
              isInvalid={!!errors.amount}
              className={modalInputClass}
              leftIcon={<span className="text-[var(--success-text)] font-semibold text-sm">₹</span>}
              aria-label="Amount"
            />
            {errors.amount && <p className="text-[10px] text-[var(--danger)] mt-0.5">{errors.amount}</p>}
          </div>
          <div>
            <Input
              type="text"
              variant="record"
              value={items}
              onChange={(e) => setItems(e.target.value)}
              placeholder="e.g. Rice, Vegetables, Oil…"
              className={modalInputClass}
              aria-label="Items"
            />
          </div>
        </>
      )}

      <Input
        type="text"
        variant="record"
        value={remarks}
        onChange={(e) => setRemarks(e.target.value)}
        placeholder={`${category === 'meals' ? 'Remarks' : 'Description'} (optional)`}
        className={modalInputClass}
        aria-label={category === 'meals' ? 'Remarks' : 'Description'}
      />

      {(errors.type || errors.amount || errors.empty) && (
        <p className="text-xs text-[var(--danger)]">{errors.type || errors.amount || errors.empty}</p>
      )}

      <div className="flex gap-2 pt-3 mt-1 border-t border-[var(--border-contrast)]">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={!!isBulkSubmitting}
          className="flex-1 h-11 sm:h-10 min-h-[44px] sm:min-h-[40px] px-3 rounded-[8px] text-sm font-medium border border-[var(--border-contrast)] hover:border-[var(--border-contrast-hover)] bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:bg-[var(--bg-muted)] transition-colors focus-visible:ring-2 focus-visible:ring-[var(--focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-elevated)]"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          disabled={!!isBulkSubmitting}
          className="flex-1 h-11 sm:h-10 min-h-[44px] sm:min-h-[40px] px-3 rounded-[8px] text-sm font-semibold bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-[var(--text-on-brand)] border border-transparent shadow-xs transition-colors focus-visible:ring-2 focus-visible:ring-[var(--focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-elevated)]"
        >
          {isBulkSubmitting === 'updating' ? (
            <span className="flex items-center justify-center gap-1.5">
              <Loader2 className="w-3 h-3 animate-spin" />
              Updating…
            </span>
          ) : (
            `Apply to ${selectedCount}`
          )}
        </Button>
      </div>
    </form>
  );
};

CalendarDayEdit.displayName = 'CalendarDayEdit';
export default CalendarDayEdit;
