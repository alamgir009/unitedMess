import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Plus, Trash2, X, Check, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/core/utils/helpers/string.helper';
import { fmt } from '@/core/utils/helpers/currency.helper';
import { MemberSelect, Button } from '@/shared/components/ui';
import apiClient from '@/services/api/client/apiClient';
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
  { value: 'both', label: 'Both', description: 'Day & Night', icon: HiOutlineSparkles, color: 'border-[var(--brand)]/60 bg-[var(--bg-muted)] text-violet-500' },
  { value: 'day', label: 'Day', description: 'Morning only', icon: HiOutlineSun, color: 'border-[var(--brand)]/60 bg-[var(--bg-muted)] text-[var(--warning)]' },
  { value: 'night', label: 'Night', description: 'Evening only', icon: HiOutlineMoon, color: 'border-[var(--brand)]/60 bg-[var(--bg-muted)] text-[var(--info)]' },
  { value: 'off', label: 'Off', description: 'No meals', icon: HiOutlineNoSymbol, color: 'border-[var(--brand)]/60 bg-[var(--bg-muted)] text-[var(--text-secondary)]' },
];

const FintechCheckbox = React.memo(({ checked, onChange, indeterminate, ariaLabel, disabled }) => {
  const inputRef = useRef(null);

  useEffect(() => {
    if (inputRef.current) inputRef.current.indeterminate = !!indeterminate;
  }, [indeterminate]);

  return (
    <span className="relative inline-flex items-center justify-center w-4 h-4 shrink-0">
      <input
        ref={inputRef}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="absolute inset-0 cursor-pointer opacity-0 z-10 disabled:cursor-not-allowed"
        aria-label={ariaLabel}
      />
      <span
        className={cn(
          'absolute inset-0 rounded flex items-center justify-center',
          'border-2 transition-all duration-150 ease-out',
          'focus-within:ring-2 focus-within:ring-[var(--accent-primary)]/30 focus-within:ring-offset-1 focus-within:ring-offset-[var(--bg-elevated)]',
          checked || indeterminate
            ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)] shadow-sm'
            : 'bg-[var(--bg-elevated)] border-[var(--border-default)] hover:border-[var(--accent-primary)]/50',
          disabled && 'opacity-50',
        )}
        aria-hidden="true"
      >
        <svg
          className={cn(
            'w-2.5 h-2.5 text-white transition-all duration-150 ease-out',
            checked ? 'opacity-100 scale-100' : 'opacity-0 scale-50',
          )}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 13l4 4L19 7" />
        </svg>
        <svg
          className={cn(
            'absolute w-2.5 h-2.5 text-white transition-all duration-150 ease-out',
            indeterminate && !checked ? 'opacity-100 scale-100' : 'opacity-0 scale-50',
          )}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={3}
          strokeLinecap="round"
        >
          <path d="M5 12h14" />
        </svg>
      </span>
    </span>
  );
});
FintechCheckbox.displayName = 'FintechCheckbox';

const inputBase =
  'w-full px-3 py-2.5 rounded-xl border border-[var(--border-strong)] ' +
  'bg-[var(--bg-subtle)] ' +
  'shadow-[var(--inset-inner),0_1px_2px_rgba(0,0,0,0.08)] ' +
  'focus:ring-2 focus:ring-[var(--brand)]/25 focus:border-[var(--brand)] ' +
  'outline-none transition-all duration-150 ' +
  'text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] ' +
  'hover:border-[var(--input-border-hover)] hover:shadow-[var(--inset-inner),0_2px_6px_rgba(0,0,0,0.12)]';

const getEntryUserId = (entry) =>
  typeof entry.user === 'object' ? entry.user?._id : entry.user;

const SelectAllCheckbox = ({ checked, indeterminate, onChange, count, disabled }) => {
  return (
    <div className="flex items-center gap-2 px-2 py-1.5">
      <FintechCheckbox
        checked={checked}
        indeterminate={indeterminate}
        onChange={onChange}
        disabled={disabled}
        ariaLabel={checked ? 'Deselect all entries' : 'Select all entries'}
      />
      <span className="text-xs font-medium text-[var(--text-secondary)]">
        {checked ? `${count} selected` : `Select all (${count})`}
      </span>
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

      {visibleEntries.length > 0 && onToggleSelect && onSelectAll && (
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-[var(--bg-muted)]/30 border border-[var(--border-default)]">
          <SelectAllCheckbox
            checked={selectedEntryIds?.size === visibleEntries.length}
            indeterminate={selectedEntryIds?.size > 0 && selectedEntryIds?.size < visibleEntries.length}
            onChange={onSelectAll}
            count={selectedEntryIds?.size || 0}
            disabled={isBulkSubmitting || !!isAdding || !!editingId || !!confirmDeleteId}
          />
          <div className="flex-1" />
          {selectedEntryIds?.size > 0 && (
            <span className="text-[11px] font-medium text-[var(--text-muted)]">
              {selectedEntryIds.size} / {visibleEntries.length} selected
            </span>
          )}
        </div>
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

const ModeTab = ({ mode, current, onChange, label }) => (
  <button
    type="button"
    role="tab"
    aria-selected={current === mode}
    onClick={() => onChange(mode)}
    className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all duration-150 ${
      current === mode
        ? 'bg-[var(--brand)] text-[var(--text-on-brand)] shadow-[0_1px_3px_rgba(0,0,0,0.25)]'
        : 'bg-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)]/40'
    }`}
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
            className={`relative flex flex-col items-center gap-1 py-2.5 px-2 sm:py-3 sm:px-3 rounded-lg border-2 transition-all duration-150 text-center
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                ${isActive
                    ? `${color} shadow-[0_2px_8px_rgba(0,0,0,0.12),0_0_0_1px_rgba(0,0,0,0.04)] scale-[1.02]`
                    : 'border-[var(--border-default)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-muted)] hover:border-[var(--border-strong)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] shadow-[0_1px_2px_rgba(0,0,0,0.06)] hover:shadow-[0_3px_8px_rgba(0,0,0,0.1)]'
                }`}
        >
            <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-[10px] sm:text-xs font-bold">{label}</span>
            <span className="text-[9px] sm:text-[10px] text-[var(--text-muted)] leading-tight hidden sm:block">{description}</span>
            {isActive && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[var(--success)] border-2 border-[var(--bg-elevated)]" />
            )}
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
          payload.amount = parseFloat(amount) || 0;
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

      {isAdmin && (
        <MemberSelect
          users={users}
          value={userIds}
          onChange={(ids) => { setUserIds(ids); setErrors((p) => ({ ...p, userIds: undefined })); }}
          loading={isUsersLoading}
          disabled={isSubmitting}
          accentColor="primary"
          placeholder="Select members..."
        />
      )}
      {errors.userIds && <p className="text-xs text-[var(--danger)]">{errors.userIds}</p>}

      {/* Mode toggle — only for meals (markets don't support bulk) */}
      {category === 'meals' && (
        /* shadow-inner creates a recessed well; active tab with shadow-sm rises above it */
        <div role="tablist" aria-label="Date mode" className="flex gap-1 p-1 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-strong)] shadow-[inset_0_1px_2px_rgba(0,0,0,0.08)]">
          <ModeTab mode="single" current={mode} onChange={isSubmitting ? () => {} : setMode} label="Single" />
          <ModeTab mode="range" current={mode} onChange={isSubmitting ? () => {} : setMode} label="Range" />
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
        <div className="grid grid-cols-2 gap-2">
          <div>
            <input
              type="date"
              value={rangeFrom}
              onChange={(e) => { setRangeFrom(e.target.value); setErrors((p) => ({ ...p, rangeFrom: undefined, rangeTo: undefined })); }}
              disabled={isSubmitting}
              className={cn(inputBase, errors.rangeFrom && 'ring-2 ring-[var(--danger)]/50', isSubmitting && 'opacity-60 cursor-not-allowed')}
            />
            {errors.rangeFrom && <p className="text-[10px] text-[var(--danger)] mt-0.5">{errors.rangeFrom}</p>}
          </div>
          <div>
            <input
              type="date"
              value={rangeTo}
              min={rangeFrom}
              onChange={(e) => { setRangeTo(e.target.value); setErrors((p) => ({ ...p, rangeTo: undefined })); }}
              disabled={isSubmitting}
              className={cn(inputBase, errors.rangeTo && 'ring-2 ring-[var(--danger)]/50', isSubmitting && 'opacity-60 cursor-not-allowed')}
            />
            {errors.rangeTo && <p className="text-[10px] text-[var(--danger)] mt-0.5">{errors.rangeTo}</p>}
          </div>
        </div>
      ) : (
        <div>
          <input
            type="date"
            value={date}
            onChange={(e) => { setDate(e.target.value); setErrors((p) => ({ ...p, date: undefined })); }}
            disabled={isSubmitting}
            className={cn(inputBase, errors.date && 'ring-2 ring-[var(--danger)]/50', isSubmitting && 'opacity-60 cursor-not-allowed')}
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
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-[var(--text-muted)]">₹</span>
            <input
              type="number"
              value={amount}
              onChange={(e) => { setAmount(e.target.value); setErrors((p) => ({ ...p, amount: undefined })); }}
              min="0"
              step="0.01"
              placeholder="0.00"
              disabled={isSubmitting}
              className={cn(inputBase, 'pl-6', errors.amount && 'ring-2 ring-[var(--danger)]/50', isSubmitting && 'opacity-60 cursor-not-allowed')}
            />
          </div>
          <input
            type="text"
            value={items}
            onChange={(e) => { setItems(e.target.value); setErrors((p) => ({ ...p, items: undefined })); }}
            placeholder="Items"
            disabled={isSubmitting}
            className={cn(inputBase, 'flex-[2]', errors.items && 'ring-2 ring-[var(--danger)]/50', isSubmitting && 'opacity-60 cursor-not-allowed')}
          />
        </div>
      )}

      {/* Guest Meals — Blinkit-style stepper (meals only) */}
      {category === 'meals' && (
        <div className={cn(
          'flex items-center gap-2 px-2.5 py-2 rounded-lg border transition-colors',
          isGuestMeal
            ? 'border-[var(--info-border)] bg-[var(--info-bg)] shadow-[0_1px_3px_rgba(0,0,0,0.12)]'
            : 'border-[var(--border-default)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-muted)] hover:border-[var(--border-strong)] shadow-[0_1px_2px_rgba(0,0,0,0.06)] hover:shadow-[0_2px_6px_rgba(0,0,0,0.1)]',
          isSubmitting && 'opacity-60 cursor-not-allowed',
        )}>
          <button
            type="button"
            onClick={() => { if (!isSubmitting) { setIsGuestMeal((p) => { if (p) setGuestCount(1); return !p; }); setErrors((p) => ({ ...p, guestCount: undefined })); } }}
            disabled={isSubmitting}
            className="flex items-center gap-1.5 flex-1 min-w-0 text-left"
          >
            <HiOutlineUserGroup className="w-4 h-4 text-[var(--info)] shrink-0" />
            <span className="text-xs font-semibold text-[var(--text-primary)]">Guest Meals</span>
            {isGuestMeal && guestCount > 0 && (
              <span className="text-[10px] font-bold text-[var(--info-text)] bg-[var(--info-bg)] px-1.5 py-0.5 rounded-full">
                +{guestCount}
              </span>
            )}
          </button>

          {isGuestMeal ? (
            <div className="flex items-center shrink-0 rounded-lg border border-[var(--info-border)] overflow-hidden">
              <button
                type="button"
                onClick={() => { if (!isSubmitting) { if (guestCount <= 1) { setIsGuestMeal(false); setGuestCount(1); } else { setGuestCount((c) => c - 1); } setErrors((p) => ({ ...p, guestCount: undefined })); } }}
                disabled={isSubmitting}
                className="w-9 h-9 flex items-center justify-center bg-[var(--info-bg)] text-[var(--info-text)] hover:brightness-110 active:brightness-95 transition-all text-lg font-bold select-none disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Decrease guest count"
              >
                <HiOutlineMinus className="w-4 h-4" />
              </button>
              <div className="w-10 h-9 flex items-center justify-center bg-[var(--info-bg)]/50 text-sm font-bold text-[var(--info-text)] border-x border-[var(--info-border)] tabular-nums select-none">
                {guestCount}
              </div>
              <button
                type="button"
                onClick={() => { if (!isSubmitting) { setGuestCount((c) => Math.min(20, c + 1)); setErrors((p) => ({ ...p, guestCount: undefined })); } }}
                disabled={isSubmitting}
                className="w-9 h-9 flex items-center justify-center bg-[var(--info-bg)] text-[var(--info-text)] hover:brightness-110 active:brightness-95 transition-all text-lg font-bold select-none disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Increase guest count"
              >
                <HiOutlinePlus className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => { if (!isSubmitting) { setIsGuestMeal(true); setGuestCount(1); setErrors((p) => ({ ...p, guestCount: undefined })); } }}
              disabled={isSubmitting}
              className="px-3 h-9 rounded-lg bg-[var(--info-bg)] text-[var(--info-text)] text-xs font-semibold shrink-0 hover:brightness-110 active:brightness-95 transition-all border border-[var(--info-border)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              + Add
            </button>
          )}
        </div>
      )}
      {errors.guestCount && <p className="text-[10px] text-[var(--danger)]">{errors.guestCount}</p>}

      <input
        type="text"
        value={remarks}
        onChange={(e) => setRemarks(e.target.value)}
        placeholder={`${category === 'meals' ? 'Remarks' : 'Description'} (optional)`}
        disabled={isSubmitting}
        className={cn(inputBase, isSubmitting && 'opacity-60 cursor-not-allowed')}
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
      <div className="flex items-center gap-2 pt-2 mt-1 border-t border-[var(--border-default)]">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onCancel}
          disabled={isSubmitting}
          className="flex-1 rounded-lg"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="success"
          size="sm"
          disabled={isSubmitting || (isRangeMode && (rangeInvalid || daysCount === 0))}
          className="flex-[2] rounded-lg"
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
        payload.amount = parseFloat(amount) || 0;
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
      {/* Row 1: Segmented control (meals) or Amount+Items (markets) */}
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
        <div className="flex items-center gap-2">
          <div className="relative w-20">
            <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] text-[var(--text-muted)]">₹</span>
            <input
              type="number"
              value={amount}
              onChange={(e) => { setAmount(e.target.value); setErrors((p) => ({ ...p, amount: undefined })); }}
              min="0"
              step="0.01"
              className={cn(inputBase, 'pl-4 py-1 text-xs', errors.amount && 'ring-2 ring-[var(--danger)]/50')}
            />
          </div>
          <input
            type="text"
            value={items}
            onChange={(e) => setItems(e.target.value)}
            placeholder="Items"
            className={cn(inputBase, 'flex-1 py-1 text-xs')}
          />
        </div>
      )}

      {/* Row 2: Notes input (full width) */}
      <input
        type="text"
        value={remarks}
        onChange={(e) => setRemarks(e.target.value)}
        placeholder="Notes"
        className={cn(inputBase, 'w-full py-1.5 text-xs min-h-[clamp(var(--btn-height-md),calc(36px+0.3vw),var(--btn-height-lg))]',
          '[&:not(:placeholder-shown)]:border-[var(--border-strong)]')}
      />

      {/* Row 3: Guest Meals — Blinkit-style stepper (meals only) */}
      {category === 'meals' && (
        <div className={cn(
          'flex items-center gap-2 px-2.5 py-2 rounded-lg border transition-colors',
          isGuestMeal
            ? 'border-[var(--info-border)] bg-[var(--info-bg)] shadow-[0_1px_3px_rgba(0,0,0,0.12)]'
            : 'border-[var(--border-default)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-muted)] hover:border-[var(--border-strong)] shadow-[0_1px_2px_rgba(0,0,0,0.06)] hover:shadow-[0_2px_6px_rgba(0,0,0,0.1)]',
        )}>
          <button
            type="button"
            onClick={() => { setIsGuestMeal((p) => { if (p) setGuestCount(1); return !p; }); setErrors((p) => ({ ...p, guestCount: undefined })); }}
            className="flex items-center gap-1.5 flex-1 min-w-0 text-left"
          >
            <HiOutlineUserGroup className="w-4 h-4 text-[var(--info)] shrink-0" />
            <span className="text-xs font-semibold text-[var(--text-primary)]">Guest Meals</span>
            {isGuestMeal && guestCount > 0 && (
              <span className="text-[10px] font-bold text-[var(--info-text)] bg-[var(--info-bg)] px-1.5 py-0.5 rounded-full">
                +{guestCount}
              </span>
            )}
          </button>

          {isGuestMeal ? (
            <div className="flex items-center shrink-0 rounded-lg border border-[var(--info-border)] overflow-hidden">
              <button
                type="button"
                onClick={() => { if (guestCount <= 1) { setIsGuestMeal(false); setGuestCount(1); } else { setGuestCount((c) => c - 1); } setErrors((p) => ({ ...p, guestCount: undefined })); }}
                className="w-9 h-9 flex items-center justify-center bg-[var(--info-bg)] text-[var(--info-text)] hover:brightness-110 active:brightness-95 transition-all text-lg font-bold select-none"
                aria-label="Decrease guest count"
              >
                <HiOutlineMinus className="w-4 h-4" />
              </button>
              <div className="w-10 h-9 flex items-center justify-center bg-[var(--info-bg)]/50 text-sm font-bold text-[var(--info-text)] border-x border-[var(--info-border)] tabular-nums select-none">
                {guestCount}
              </div>
              <button
                type="button"
                onClick={() => { setGuestCount((c) => Math.min(20, c + 1)); setErrors((p) => ({ ...p, guestCount: undefined })); }}
                className="w-9 h-9 flex items-center justify-center bg-[var(--info-bg)] text-[var(--info-text)] hover:brightness-110 active:brightness-95 transition-all text-lg font-bold select-none"
                aria-label="Increase guest count"
              >
                <HiOutlinePlus className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => { setIsGuestMeal(true); setGuestCount(1); setErrors((p) => ({ ...p, guestCount: undefined })); }}
              className="px-3 h-9 rounded-lg bg-[var(--info-bg)] text-[var(--info-text)] text-xs font-semibold shrink-0 hover:brightness-110 active:brightness-95 transition-all border border-[var(--info-border)]"
            >
              + Add
            </button>
          )}
        </div>
      )}
      {errors.guestCount && <p className="text-[10px] text-[var(--danger)]">{errors.guestCount}</p>}

      {/* ─── Fintech Footer: Cancel + Save ─── */}
      <div className={cn(
        'flex items-center gap-2 pt-2 mt-1 border-t border-[var(--border-default)]',
      )}>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onCancel}
          className="flex-1 rounded-lg"
          aria-label="Cancel edit"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="success"
          size="sm"
          className="flex-[2] rounded-lg"
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
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-[var(--text-muted)]">₹</span>
            <input
              type="number"
              value={amount}
              onChange={(e) => { setAmount(e.target.value); setErrors((p) => ({ ...p, amount: undefined, empty: undefined })); }}
              min="0"
              step="0.01"
              placeholder="Amount"
              className={cn(inputBase, 'pl-6', errors.amount && 'ring-2 ring-[var(--danger)]/50')}
            />
          </div>
          <input
            type="text"
            value={items}
            onChange={(e) => setItems(e.target.value)}
            placeholder="Items"
            className={cn(inputBase, 'flex-[2]')}
          />
        </div>
      )}

      <input
        type="text"
        value={remarks}
        onChange={(e) => setRemarks(e.target.value)}
        placeholder={`${category === 'meals' ? 'Remarks' : 'Description'} (optional)`}
        className={inputBase}
      />

      {(errors.type || errors.amount || errors.empty) && (
        <p className="text-xs text-[var(--danger)]">{errors.type || errors.amount || errors.empty}</p>
      )}

      <div className="flex gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onCancel}
          disabled={!!isBulkSubmitting}
          className="flex-1 rounded-lg"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="success"
          size="sm"
          disabled={!!isBulkSubmitting}
          className="flex-[2] rounded-lg"
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
