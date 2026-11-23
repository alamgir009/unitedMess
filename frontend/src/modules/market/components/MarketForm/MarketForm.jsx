import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { format, parseISO, isValid } from 'date-fns';
import {
  HiOutlineUser,
  HiOutlineLockClosed,
  HiOutlineCalendar,
  HiOutlineTrash,
  HiOutlinePencilSquare,
} from 'react-icons/hi2';
import { Loader2 } from 'lucide-react';
import apiClient from '@/services/api/client/apiClient';
import { Button, Avatar, MemberSelect } from '@/shared/components/ui';
import { cn } from '@/core/utils/helpers/string.helper';
import { isPositiveCurrencyAmount } from '@/core/utils/helpers/currency.helper';
import { hasValidMarketItems, MARKET_ITEMS_ERROR } from '../../marketValidation';
import '@/shared/components/ui/RecordForm/record-form.css';

/**
 * Format date string to "23 Nov 2026"
 */
const formatDisplayDate = (dateVal) => {
  if (!dateVal) return '';
  try {
    const d = typeof dateVal === 'string' ? parseISO(dateVal) : dateVal;
    return isValid(d) ? format(d, 'd MMM yyyy') : String(dateVal);
  } catch {
    return String(dateVal);
  }
};

/**
 * Format date string to "yyyy-MM-dd"
 */
const toIsoDateString = (dateVal) => {
  if (!dateVal) return format(new Date(), 'yyyy-MM-dd');
  try {
    const d = typeof dateVal === 'string' ? (dateVal.length === 10 ? parseISO(dateVal) : new Date(dateVal)) : dateVal;
    return isValid(d) ? format(d, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
  } catch {
    return format(new Date(), 'yyyy-MM-dd');
  }
};

/**
 * Accessible Outlined Date Field with "23 Nov 2026" display
 */
const DateField = ({ label, value, onChange, min, max, disabled, error, id }) => {
  const displayStr = useMemo(() => formatDisplayDate(value), [value]);

  return (
    <div className="flex flex-col gap-1 w-full min-w-0">
      <label htmlFor={id} className="text-xs font-medium text-[var(--text-secondary)] select-none">
        {label}
      </label>
      <div
        className={cn(
          'relative flex items-center justify-between h-11 min-h-[44px] px-3 rounded-[8px] border transition-colors',
          'bg-[var(--input-bg)] text-[16px] sm:text-sm text-[var(--text-primary)]',
          error
            ? 'border-[var(--danger)] focus-within:ring-2 focus-within:ring-[var(--danger)]'
            : 'border-[var(--border-contrast)] hover:border-[var(--border-contrast-hover)] focus-within:ring-2 focus-within:ring-[var(--brand)]',
          disabled && 'opacity-60 cursor-not-allowed bg-[var(--input-bg-disabled)]'
        )}
      >
        <span className="tabular-nums font-medium text-sm text-[var(--text-primary)] select-none pointer-events-none">
          {displayStr || 'Select date'}
        </span>
        <HiOutlineCalendar className="w-4 h-4 text-[var(--text-muted)] shrink-0 pointer-events-none" />
        <input
          id={id}
          type="date"
          value={value}
          onChange={onChange}
          min={min}
          max={max}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
        />
      </div>
      {error && (
        <p id={`${id}-error`} className="text-xs text-[var(--danger-text)] font-medium">
          {error}
        </p>
      )}
    </div>
  );
};

export const MarketForm = ({
  initialData = null,
  entries = [],
  mode: initialMode = 'add', // 'add' | 'edit'
  date: defaultDate,
  onSubmit,
  onSave,
  onUpdate,
  onDelete,
  onBulkDelete,
  onCancel,
  isAdmin = false,
  currentUser,
  readOnly = false,
  isSubmitting: submitting,
  renderFooter,
}) => {
  const isEditMode = initialMode === 'edit' || Boolean(initialData);

  // Form State
  const [formData, setFormData] = useState({
    date: toIsoDateString(defaultDate || initialData?.date),
    amount: initialData?.amount ?? '',
    items: initialData?.items || '',
    description: initialData?.description || '',
    userId: typeof initialData?.user === 'object' ? initialData.user?._id : (initialData?.user || currentUser?._id || currentUser?.id || ''),
    userIds: [],
  });

  const [users, setUsers] = useState([]);
  const [isUsersLoading, setIsUsersLoading] = useState(false);
  const [localSubmitting, setIsSubmitting] = useState(false);
  const isSubmitting = submitting ?? localSubmitting;
  const [isBulkActing, setIsBulkActing] = useState(false);

  // Errors state
  const [errors, setErrors] = useState({});

  // Active editing entry (when user selects an entry from the list in edit mode)
  const [activeEditingEntry, setActiveEditingEntry] = useState(initialData || null);

  // Multi-select for bulk delete
  const [selectedEntryIds, setSelectedEntryIds] = useState(new Set());

  // Fetch users for admin
  useEffect(() => {
    if (isAdmin) {
      let isMounted = true;
      setIsUsersLoading(true);
      apiClient
        .get('users?limit=100')
        .then((res) => {
          if (isMounted) {
            setUsers(res.data?.data?.users || res.data?.users || []);
          }
        })
        .catch((err) => {
          console.error('Failed to load users for MarketForm', err);
        })
        .finally(() => {
          if (isMounted) setIsUsersLoading(false);
        });
      return () => {
        isMounted = false;
      };
    }
  }, [isAdmin]);

  // Sync initialData changes
  useEffect(() => {
    if (initialData) {
      setActiveEditingEntry(initialData);
      const targetUserId = typeof initialData.user === 'object' ? initialData.user?._id : initialData.user || '';
      setFormData({
        date: toIsoDateString(initialData.date),
        amount: initialData.amount ?? '',
        items: initialData.items || '',
        description: initialData.description || '',
        userId: targetUserId,
        userIds: targetUserId ? [targetUserId] : [],
      });
    } else {
      setActiveEditingEntry(null);
      setFormData((prev) => ({
        ...prev,
        date: toIsoDateString(defaultDate || prev.date),
        amount: '',
        items: '',
        description: '',
        userId: currentUser?._id || currentUser?.id || '',
        userIds: [],
      }));
    }
  }, [initialData, defaultDate, currentUser]);

  // Validation
  const isValidToSave = useMemo(() => {
    if (readOnly || isSubmitting) return false;
    if (!isPositiveCurrencyAmount(formData.amount)) return false;
    if (!hasValidMarketItems(formData.items)) return false;
    if (!formData.date) return false;
    if (isAdmin && !activeEditingEntry && (!formData.userIds || formData.userIds.length === 0)) return false;
    return true;
  }, [readOnly, isSubmitting, formData.amount, formData.items, formData.date, isAdmin, activeEditingEntry, formData.userIds]);

  // Form submit handler
  const handleFormSubmit = async (e) => {
    if (e) e.preventDefault();
    if (readOnly || isSubmitting) return;
    if (!isValidToSave) {
      const newErrors = {};
      if (!isPositiveCurrencyAmount(formData.amount)) {
        newErrors.amount = 'Amount must be greater than 0 with at most 2 decimal places.';
      }
      if (!hasValidMarketItems(formData.items)) {
        newErrors.items = MARKET_ITEMS_ERROR;
      }
      if (isAdmin && !activeEditingEntry && (!formData.userIds || formData.userIds.length === 0)) {
        newErrors.userIds = 'Please select at least one member.';
      }
      setErrors(newErrors);
      return;
    }

    setErrors({});
    if (submitting === undefined) setIsSubmitting(true);

    try {
      const submitDate = new Date(formData.date).toISOString();
      const numAmount = Number(formData.amount);

      if (activeEditingEntry) {
        // Editing existing entry
        const updatePayload = {
          date: submitDate,
          amount: numAmount,
          items: formData.items.trim(),
          description: formData.description.trim(),
        };

        if (onUpdate) {
          await onUpdate(activeEditingEntry._id, updatePayload);
        } else if (onSubmit || onSave) {
          await (onSubmit || onSave)({ ...updatePayload, _id: activeEditingEntry._id });
        }
        return;
      }

      // New entry create
      const payload = {
        date: submitDate,
        amount: numAmount,
        items: formData.items.trim(),
        description: formData.description.trim(),
        ...(isAdmin ? { userIds: formData.userIds } : { userId: currentUser?._id || currentUser?.id }),
      };

      const targetFn = onSubmit || onSave;
      if (targetFn) await targetFn(payload);
    } finally {
      if (submitting === undefined) setIsSubmitting(false);
    }
  };

  // Bulk actions handlers for Edit mode
  const handleToggleSelectEntry = (id) => {
    setSelectedEntryIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (entries.length === 0) return;
    setSelectedEntryIds((prev) => {
      if (prev.size === entries.length) return new Set();
      return new Set(entries.map((e) => e._id));
    });
  };

  const handleExecuteBulkDelete = async () => {
    if (selectedEntryIds.size === 0 || !onBulkDelete) return;
    setIsBulkActing(true);
    try {
      await onBulkDelete(Array.from(selectedEntryIds));
      setSelectedEntryIds(new Set());
    } finally {
      setIsBulkActing(false);
    }
  };

  // Render external footer if renderFooter prop is passed (e.g. from MarketPage)
  useEffect(() => {
    if (!renderFooter) return;

    const numAmount = parseFloat(formData.amount) || 0;
    const saveLabel = activeEditingEntry
      ? 'Update entry'
      : numAmount > 0
      ? `Save ₹${numAmount.toLocaleString('en-IN')} entry`
      : 'Save market entry';

    renderFooter(
      <div className="record-form-actions">
        <Button
          type="button"
          variant="secondary"
          size="md"
          onClick={onCancel}
          disabled={isSubmitting}
          className="flex-1"
        >
          {readOnly ? 'Close' : 'Cancel'}
        </Button>
        {!readOnly && (
          <Button
            type="submit"
            form="market-form"
            variant="primary"
            size="md"
            disabled={!isValidToSave || isSubmitting}
            isLoading={isSubmitting}
            className="flex-[2]"
          >
            {isSubmitting ? 'Saving…' : saveLabel}
          </Button>
        )}
      </div>
    );
  }, [renderFooter, onCancel, readOnly, isValidToSave, isSubmitting, activeEditingEntry, formData.amount]);

  const numAmount = parseFloat(formData.amount) || 0;

  return (
    <form id="market-form" onSubmit={handleFormSubmit} className="flex flex-col gap-4 w-full" noValidate>
      {/* Read Only Notice */}
      {readOnly && (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-[8px] bg-[var(--warning-bg)] border border-[var(--warning-border)] text-[var(--warning-text)] text-xs font-semibold">
          <HiOutlineLockClosed className="w-4 h-4 shrink-0" />
          <span>View only — administrative privileges required to edit market records.</span>
        </div>
      )}

      {/* ── EDIT MODE: EXISTING ENTRIES LIST ───────────────────────── */}
      {isEditMode && entries.length > 0 && (
        <div className="flex flex-col gap-2 rounded-[8px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
              Entries for this date ({entries.length})
            </span>
            {isAdmin && (
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-primary)] cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={entries.length > 0 && selectedEntryIds.size === entries.length}
                    ref={(el) => {
                      if (el) el.indeterminate = selectedEntryIds.size > 0 && selectedEntryIds.size < entries.length;
                    }}
                    onChange={handleSelectAll}
                    disabled={entries.length === 0 || isBulkActing}
                    className="w-4 h-4 rounded-[4px] border-[var(--border-contrast)] accent-[var(--brand)] cursor-pointer"
                  />
                  <span>Select all ({entries.length})</span>
                </label>
              </div>
            )}
          </div>

          {/* Bulk Action Bar */}
          {selectedEntryIds.size > 0 && (
            <div className="flex items-center justify-between gap-2 p-2 rounded-[8px] border border-[var(--brand)]/30 bg-[var(--accent-subtle)]">
              <span className="text-xs font-semibold text-[var(--brand)] tabular-nums">
                {selectedEntryIds.size} selected
              </span>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleExecuteBulkDelete}
                isLoading={isBulkActing}
                className="h-8 px-2.5 text-xs rounded-[6px]"
              >
                Delete selected
              </Button>
            </div>
          )}

          {/* Entries list items */}
          <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
            {entries.map((entry) => {
              const userName = typeof entry.user === 'object' ? entry.user?.name : entry.userName || 'Member';
              const isSelected = selectedEntryIds.has(entry._id);
              const isCurrentlyEditing = activeEditingEntry?._id === entry._id;

              return (
                <div
                  key={entry._id}
                  className={cn(
                    'flex items-center justify-between gap-2 p-2 rounded-[6px] border transition-colors text-xs',
                    isCurrentlyEditing
                      ? 'border-[var(--brand)] bg-[var(--accent-subtle)] font-medium'
                      : 'border-[var(--border-default)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-muted)]'
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {isAdmin && (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelectEntry(entry._id)}
                        disabled={isBulkActing}
                        className="w-3.5 h-3.5 rounded-[3px] border-[var(--border-contrast)] accent-[var(--brand)] cursor-pointer shrink-0"
                      />
                    )}
                    <span className="font-semibold text-[var(--text-primary)] truncate max-w-[110px] sm:max-w-[140px]">
                      {userName}
                    </span>
                    <span className="px-1.5 py-0.5 rounded-[4px] font-semibold bg-[var(--bg-surface)] border border-[var(--border-default)] text-[var(--text-secondary)] truncate max-w-[120px]">
                      {entry.items || 'Items'}
                    </span>
                    <span className="font-bold text-[var(--brand)] tabular-nums shrink-0">
                      ₹{Number(entry.amount || 0).toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveEditingEntry(entry);
                        setFormData({
                          date: toIsoDateString(entry.date),
                          amount: entry.amount ?? '',
                          items: entry.items || '',
                          description: entry.description || '',
                          userId: typeof entry.user === 'object' ? entry.user?._id : (entry.user || ''),
                          userIds: [],
                        });
                      }}
                      className="p-1 rounded-[6px] text-[var(--text-secondary)] hover:text-[var(--brand)] hover:bg-[var(--bg-muted)]"
                      aria-label={`Edit ${userName}'s entry`}
                    >
                      <HiOutlinePencilSquare className="w-4 h-4" />
                    </button>
                    {onDelete && (
                      <button
                        type="button"
                        onClick={() => onDelete(entry._id)}
                        className="p-1 rounded-[6px] text-[var(--text-secondary)] hover:text-[var(--danger-text)] hover:bg-[var(--danger-bg)]"
                        aria-label={`Delete ${userName}'s entry`}
                      >
                        <HiOutlineTrash className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Visual Separator if entries list exists */}
      {isEditMode && entries.length > 0 && (
        <div className="flex items-center gap-2 pt-1 border-t border-[var(--border-default)]">
          <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
            {activeEditingEntry ? 'Edit Selected Record' : 'Add New Record'}
          </span>
          {activeEditingEntry && (
            <button
              type="button"
              onClick={() => {
                setActiveEditingEntry(null);
                setFormData((p) => ({
                  ...p,
                  amount: '',
                  items: '',
                  description: '',
                  userIds: [],
                }));
              }}
              className="text-xs text-[var(--brand)] hover:underline ml-auto"
            >
              Cancel entry edit
            </button>
          )}
        </div>
      )}

      {/* ── LIVE PURCHASE AMOUNT CARD ──────────────────────────────── */}
      <div className="flex items-center justify-between px-3.5 py-2.5 rounded-[8px] border border-[var(--border-default)] bg-[var(--bg-surface)]">
        <div className="flex flex-col">
          <span className="text-[11px] uppercase tracking-wider text-[var(--text-muted)] font-semibold">
            Purchase Amount
          </span>
          <span className="text-xs text-[var(--text-secondary)] truncate max-w-[200px]">
            {formData.items ? formData.items : 'New market entry'}
          </span>
        </div>
        <div className="flex items-baseline gap-1 shrink-0">
          <span className="text-lg font-bold tabular-nums text-[var(--brand)]">
            ₹{formData.amount === '' ? '0' : Number(formData.amount).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* ── MEMBER SELECT ──────────────────────────────────────────── */}
      <div className="flex flex-col gap-1 w-full min-w-0">
        <label className="text-xs font-medium text-[var(--text-secondary)] select-none">
          {isAdmin ? 'Select members' : 'Member'}
        </label>

        {activeEditingEntry ? (
          <div className="flex items-center gap-2.5 px-3 h-11 min-h-[44px] rounded-[8px] border border-[var(--border-contrast)] bg-[var(--input-bg)]">
            <Avatar
              name={typeof activeEditingEntry.user === 'object' ? activeEditingEntry.user?.name : 'Member'}
              size="xs"
            />
            <span className="text-sm font-semibold text-[var(--text-primary)] truncate">
              {typeof activeEditingEntry.user === 'object' ? activeEditingEntry.user?.name : 'Member'}
            </span>
          </div>
        ) : isAdmin ? (
          <div className="w-full min-w-0">
            <MemberSelect
              variant="default"
              users={users}
              value={formData.userIds}
              onChange={(ids) => {
                setFormData((p) => ({ ...p, userIds: ids }));
                setErrors((p) => ({ ...p, userIds: undefined }));
              }}
              loading={isUsersLoading}
              disabled={readOnly || isSubmitting}
              accentColor="primary"
              placeholder="Select members…"
            />
            {errors.userIds && (
              <p className="text-xs text-[var(--danger-text)] font-medium mt-1">
                {errors.userIds}
              </p>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2.5 px-3 h-11 min-h-[44px] rounded-[8px] border border-[var(--border-contrast)] bg-[var(--input-bg)]">
            <Avatar name={currentUser?.name || 'Member'} size="xs" />
            <span className="text-sm font-semibold text-[var(--text-primary)] truncate">
              {currentUser?.name || 'Member'}
            </span>
          </div>
        )}
      </div>

      {/* ── DATE FIELD ─────────────────────────────────────────────── */}
      <DateField
        id="market-date"
        label="Date"
        value={formData.date}
        onChange={(e) => {
          setFormData((p) => ({ ...p, date: e.target.value }));
          setErrors((p) => ({ ...p, date: undefined }));
        }}
        disabled={isSubmitting || readOnly}
        error={errors.date}
      />

      {/* ── AMOUNT FIELD ───────────────────────────────────────────── */}
      <div className="flex flex-col gap-1 w-full">
        <label htmlFor="market-amount" className="text-xs font-medium text-[var(--text-secondary)] select-none">
          Amount (₹)
        </label>
        <div
          className={cn(
            'relative flex items-center h-11 min-h-[44px] px-3 rounded-[8px] border transition-colors',
            'bg-[var(--input-bg)] text-[16px] sm:text-sm text-[var(--text-primary)]',
            errors.amount
              ? 'border-[var(--danger)] focus-within:ring-2 focus-within:ring-[var(--danger)]'
              : 'border-[var(--border-contrast)] hover:border-[var(--border-contrast-hover)] focus-within:ring-2 focus-within:ring-[var(--brand)]',
            (readOnly || isSubmitting) && 'opacity-60 cursor-not-allowed bg-[var(--input-bg-disabled)]'
          )}
        >
          <span className="text-[var(--text-muted)] font-semibold text-sm mr-2 select-none pointer-events-none">
            ₹
          </span>
          <input
            id="market-amount"
            type="number"
            min="0.01"
            max="999999"
            step="0.01"
            value={formData.amount}
            onBlur={() => {
              if (!readOnly && !isPositiveCurrencyAmount(formData.amount)) {
                setErrors((p) => ({ ...p, amount: 'Amount must be greater than 0 with at most 2 decimal places.' }));
              }
            }}
            onChange={(e) => {
              const val = e.target.value;
              setFormData((p) => ({ ...p, amount: val }));
              setErrors((p) => ({ ...p, amount: undefined }));
            }}
            disabled={readOnly || isSubmitting}
            placeholder="0.00"
            className="w-full h-full bg-transparent border-none outline-none text-[16px] sm:text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] tabular-nums"
          />
        </div>
        {errors.amount && (
          <p className="text-xs text-[var(--danger-text)] font-medium">
            {errors.amount}
          </p>
        )}
      </div>

      {/* ── ITEMS PURCHASED FIELD ──────────────────────────────────── */}
      <div className="flex flex-col gap-1 w-full">
        <label htmlFor="market-items" className="text-xs font-medium text-[var(--text-secondary)] select-none">
          Items purchased
        </label>
        <input
          id="market-items"
          type="text"
          value={formData.items}
          onBlur={() => {
            if (!readOnly && !hasValidMarketItems(formData.items)) setErrors((p) => ({ ...p, items: MARKET_ITEMS_ERROR }));
          }}
          onChange={(e) => {
            const val = e.target.value;
            setFormData((p) => ({ ...p, items: val }));
            setErrors((p) => ({ ...p, items: undefined }));
          }}
          disabled={readOnly || isSubmitting}
          aria-invalid={Boolean(errors.items)}
          aria-describedby={errors.items ? 'market-items-error' : undefined}
          placeholder="e.g. Rice, Vegetables, Oil…"
          className={cn(
            'w-full h-11 min-h-[44px] px-3 rounded-[8px] border transition-colors',
            errors.items
              ? 'border-[var(--danger)] focus:border-[var(--danger)] focus-visible:ring-2 focus-visible:ring-[var(--danger)]'
              : 'border-[var(--border-contrast)] hover:border-[var(--border-contrast-hover)] focus:border-[var(--brand)] focus-visible:ring-2 focus-visible:ring-[var(--brand)]',
            'bg-[var(--input-bg)] text-[16px] sm:text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]',
            'focus-visible:outline-none'
          )}
        />
        {errors.items && (
          <p id="market-items-error" role="alert" className="text-xs text-[var(--danger-text)] font-medium">
            {errors.items}
          </p>
        )}
      </div>

      {/* ── DESCRIPTION FIELD ──────────────────────────────────────── */}
      <div className="flex flex-col gap-1 w-full">
        <label htmlFor="market-description" className="text-xs font-medium text-[var(--text-secondary)] select-none">
          Description (optional)
        </label>
        <input
          id="market-description"
          type="text"
          value={formData.description}
          onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
          disabled={readOnly || isSubmitting}
          placeholder="Add extra notes about this purchase…"
          className={cn(
            'w-full h-11 min-h-[44px] px-3 rounded-[8px] border transition-colors',
            'border-[var(--border-contrast)] hover:border-[var(--border-contrast-hover)] focus:border-[var(--brand)]',
            'bg-[var(--input-bg)] text-[16px] sm:text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]'
          )}
        />
      </div>

      {/* ── INLINE STICKY FOOTER (if renderFooter not used) ─────────── */}
      {!renderFooter && (
        <div className="sticky bottom-0 z-10 flex items-center gap-3 pt-3 mt-2 border-t border-[var(--border-default)] bg-[var(--bg-elevated)] pb-safe">
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            disabled={isSubmitting}
            className="flex-1 min-h-[44px] rounded-[8px]"
          >
            {readOnly ? 'Close' : 'Cancel'}
          </Button>

          {!readOnly && (
            <Button
              type="submit"
              variant="primary"
              disabled={!isValidToSave || isSubmitting}
              isLoading={isSubmitting}
              className="flex-1 min-h-[44px] rounded-[8px]"
            >
              {isSubmitting
                ? 'Saving…'
                : activeEditingEntry
                ? 'Update entry'
                : numAmount > 0
                ? `Save ₹${numAmount.toLocaleString('en-IN')} entry`
                : 'Save market entry'}
            </Button>
          )}
        </div>
      )}
    </form>
  );
};

MarketForm.displayName = 'MarketForm';
export default MarketForm;
