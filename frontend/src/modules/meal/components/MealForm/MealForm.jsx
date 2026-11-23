import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { format, parseISO, isValid, differenceInDays } from 'date-fns';
import {
  HiOutlineSun,
  HiOutlineMoon,
  HiOutlineNoSymbol,
  HiOutlineSparkles,
  HiOutlineUserGroup,
  HiOutlineUser,
  HiOutlineLockClosed,
  HiOutlineMinus,
  HiOutlinePlus,
  HiOutlineCheck,
  HiOutlineCalendar,
  HiOutlineTrash,
  HiOutlinePencilSquare,
} from 'react-icons/hi2';
import { Loader2 } from 'lucide-react';
import apiClient from '@/services/api/client/apiClient';
import { Button, Avatar, MemberSelect, GuestMealField } from '@/shared/components/ui';
import { cn } from '@/core/utils/helpers/string.helper';

const MAX_RANGE_DAYS = 31;
const typeCountMap = { both: 2, day: 1, night: 1, off: 0 };

const mealTypes = [
  { value: 'both', label: 'Both', description: 'Day & Night · 2 meals', icon: HiOutlineSparkles },
  { value: 'day', label: 'Day', description: 'Morning only · 1 meal', icon: HiOutlineSun },
  { value: 'night', label: 'Night', description: 'Evening only · 1 meal', icon: HiOutlineMoon },
  { value: 'off', label: 'Off', description: 'No meals · 0 meals', icon: HiOutlineNoSymbol },
];

/**
 * Format date string to "21 Nov 2026"
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
 * Accessible Outlined Date Field with "21 Nov 2026" display
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

export const MealForm = ({
  initialData = null,
  entries = [],
  mode: initialMode = 'add', // 'add' | 'edit'
  date: defaultDate,
  onSubmit,
  onSave,
  onUpdate,
  onDelete,
  onBulkDelete,
  onBulkUpdate,
  onCancel,
  isAdmin = false,
  currentUser,
  readOnly = false,
  isSubmitting: submitting,
  renderFooter,
}) => {
  const isEditMode = initialMode === 'edit' || Boolean(initialData);

  // Mode: single day vs date range
  const [entryMode, setEntryMode] = useState('single');

  // Active entry being edited inline in edit mode
  const [activeEditingEntry, setActiveEditingEntry] = useState(initialData);

  // Form State
  const [formData, setFormData] = useState({
    date: toIsoDateString(defaultDate || initialData?.date),
    type: initialData?.type || 'both',
    isGuestMeal: initialData?.isGuestMeal || (initialData?.guestCount > 0),
    guestCount: initialData?.guestCount || 0,
    remarks: initialData?.remarks || '',
    userId: typeof initialData?.user === 'object' ? initialData.user?._id : (initialData?.user || currentUser?._id || ''),
    userIds: [],
  });

  const [rangeFrom, setRangeFrom] = useState(toIsoDateString(defaultDate || new Date()));
  const [rangeTo, setRangeTo] = useState(toIsoDateString(defaultDate || new Date()));
  const [rangeError, setRangeError] = useState('');

  // Selected entry IDs for bulk actions
  const [selectedEntryIds, setSelectedEntryIds] = useState(new Set());
  const [bulkActionType, setBulkActionType] = useState('');
  const [isBulkActing, setIsBulkActing] = useState(false);

  const [localSubmitting, setIsSubmitting] = useState(false);
  const isSubmitting = submitting ?? localSubmitting;
  const [memberError, setMemberError] = useState('');

  // Users for Admin MemberSelect
  const [users, setUsers] = useState([]);
  const [isUsersLoading, setIsUsersLoading] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    (async () => {
      setIsUsersLoading(true);
      try {
        const res = await apiClient.get('users?limit=100');
        if (!cancelled) setUsers(res.data?.data?.users || res.data?.users || []);
      } catch (err) {
        if (!cancelled) console.error('[MealForm] Failed to fetch users:', err);
      } finally {
        if (!cancelled) setIsUsersLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isAdmin]);

  // Sync initialData changes
  useEffect(() => {
    if (initialData) {
      setActiveEditingEntry(initialData);
      const targetUserId = typeof initialData.user === 'object' ? initialData.user?._id : (initialData.user || '');
      setFormData({
        date: toIsoDateString(initialData.date),
        type: initialData.type || 'both',
        isGuestMeal: Boolean(initialData.isGuestMeal || initialData.guestCount > 0),
        guestCount: initialData.guestCount || 0,
        remarks: initialData.remarks || '',
        userId: targetUserId || currentUser?._id || '',
        userIds: targetUserId ? [targetUserId] : [],
      });
    } else {
      setActiveEditingEntry(null);
      setFormData((prev) => ({
        ...prev,
        date: toIsoDateString(defaultDate || new Date()),
        userId: currentUser?._id || currentUser?.id || '',
        userIds: [],
      }));
    }
  }, [initialData, defaultDate, currentUser]);

  // Range validation
  const validateRange = useCallback((from, to) => {
    if (!from || !to) return 'Both dates are required';
    const f = parseISO(from);
    const t = parseISO(to);
    if (!isValid(f) || !isValid(t)) return 'Invalid date format';
    if (f > t) return 'Start date must be on or before end date';
    const diff = differenceInDays(t, f) + 1;
    if (diff > MAX_RANGE_DAYS) return `Maximum range is ${MAX_RANGE_DAYS} days`;
    return '';
  }, []);

  const daysCount = useMemo(() => {
    if (entryMode === 'single') return formData.date ? 1 : 0;
    if (!rangeFrom || !rangeTo) return 0;
    try {
      const diff = differenceInDays(parseISO(rangeTo), parseISO(rangeFrom)) + 1;
      return diff > 0 ? diff : 0;
    } catch {
      return 0;
    }
  }, [entryMode, formData.date, rangeFrom, rangeTo]);

  const activeRangeError = useMemo(() => {
    if (entryMode !== 'range') return '';
    return rangeError || validateRange(rangeFrom, rangeTo);
  }, [entryMode, rangeError, rangeFrom, rangeTo, validateRange]);

  // Live Summary metrics
  const memberCount = useMemo(() => {
    if (activeEditingEntry) return 1;
    if (isAdmin) return formData.userIds?.length || 0;
    return 1;
  }, [activeEditingEntry, isAdmin, formData.userIds]);

  const mealCountPerDay = useMemo(() => {
    const base = typeCountMap[formData.type] ?? 0;
    const guest = Number(formData.guestCount) || 0;
    return base + guest;
  }, [formData.type, formData.guestCount]);

  const effectiveDaysCount = entryMode === 'range' && activeRangeError ? 0 : daysCount;
  const totalMealsCount = memberCount * mealCountPerDay * effectiveDaysCount;

  // Validation
  const isValidToSave = useMemo(() => {
    if (readOnly || isSubmitting) return false;
    if (isAdmin && !activeEditingEntry && memberCount === 0) return false;
    if (entryMode === 'single' && !formData.date) return false;
    if (entryMode === 'range' && (Boolean(activeRangeError) || effectiveDaysCount === 0)) return false;
    return true;
  }, [readOnly, isSubmitting, isAdmin, activeEditingEntry, memberCount, entryMode, formData.date, activeRangeError, effectiveDaysCount]);

  // Form submit handler
  const handleFormSubmit = async (e) => {
    if (e) e.preventDefault();
    if (readOnly || isSubmitting) return;
    if (!isValidToSave) {
      if (isAdmin && !activeEditingEntry && memberCount === 0) {
        setMemberError('Please select at least one member.');
      }
      return;
    }

    setMemberError('');
    if (submitting === undefined) setIsSubmitting(true);

    try {
      if (activeEditingEntry) {
        // Editing existing entry
        const updatePayload = {
          date: new Date(formData.date).toISOString(),
          type: formData.type,
          isGuestMeal: formData.guestCount > 0,
          guestCount: formData.guestCount,
          remarks: formData.remarks.trim(),
        };

        if (onUpdate) {
          await onUpdate(activeEditingEntry._id, updatePayload);
        } else if (onSubmit || onSave) {
          await (onSubmit || onSave)({ ...updatePayload, _id: activeEditingEntry._id });
        }
        return;
      }

      if (entryMode === 'range') {
        // Date range create
        const rangePayload = {
          startDate: rangeFrom,
          endDate: rangeTo,
          type: formData.type,
          userIds: isAdmin ? formData.userIds : [currentUser?._id || currentUser?.id].filter(Boolean),
          isGuestMeal: formData.guestCount > 0,
          guestCount: formData.guestCount,
          remarks: formData.remarks.trim(),
        };

        const targetFn = onSubmit || onSave;
        if (targetFn) await targetFn(rangePayload);
      } else {
        // Single day create
        const singlePayload = {
          date: new Date(formData.date).toISOString(),
          type: formData.type,
          isGuestMeal: formData.guestCount > 0,
          guestCount: formData.guestCount,
          remarks: formData.remarks.trim(),
          ...(isAdmin ? { userIds: formData.userIds } : { userId: currentUser?._id || currentUser?.id }),
        };

        const targetFn = onSubmit || onSave;
        if (targetFn) await targetFn(singlePayload);
      }
    } finally {
      if (submitting === undefined) setIsSubmitting(false);
    }
  };

  // Keyboard navigation for meal types (radiogroup)
  const handleTypeKeyDown = (e, currentIndex) => {
    let nextIndex = currentIndex;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      nextIndex = (currentIndex + 1) % mealTypes.length;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      nextIndex = (currentIndex - 1 + mealTypes.length) % mealTypes.length;
    } else {
      return;
    }
    e.preventDefault();
    setFormData((prev) => ({ ...prev, type: mealTypes[nextIndex].value }));
  };

  // Keyboard navigation for Mode switch
  const handleModeKeyDown = (e, currentMode) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      setEntryMode(currentMode === 'single' ? 'range' : 'single');
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

  const handleApplyBulkUpdate = async () => {
    if (!bulkActionType || selectedEntryIds.size === 0 || !onBulkUpdate) return;
    setIsBulkActing(true);
    try {
      await onBulkUpdate({
        entryIds: Array.from(selectedEntryIds),
        type: bulkActionType,
      });
      setSelectedEntryIds(new Set());
      setBulkActionType('');
    } finally {
      setIsBulkActing(false);
    }
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

  // Render external footer if renderFooter prop is passed
  useEffect(() => {
    if (!renderFooter) return;
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
          Cancel
        </Button>
        <Button
          type="submit"
          form="meal-form"
          variant="primary"
          size="md"
          disabled={!isValidToSave}
          isLoading={isSubmitting}
          className="flex-[2]"
        >
          {activeEditingEntry ? 'Update meal' : totalMealsCount > 0 ? `Save ${totalMealsCount} meals` : 'Save meals'}
        </Button>
      </div>
    );
  }, [renderFooter, onCancel, isValidToSave, isSubmitting, activeEditingEntry, totalMealsCount]);

  return (
    <form id="meal-form" onSubmit={handleFormSubmit} className="flex flex-col gap-4 w-full" noValidate>
      {/* Read Only Notice */}
      {readOnly && (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-[8px] bg-[var(--warning-bg)] border border-[var(--warning-border)] text-[var(--warning-text)] text-xs font-semibold">
          <HiOutlineLockClosed className="w-4 h-4 shrink-0" />
          <span>View only — administrative privileges required to edit meals.</span>
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
              <div className="flex items-center gap-1.5">
                <select
                  value={bulkActionType}
                  onChange={(e) => setBulkActionType(e.target.value)}
                  className="h-8 px-2 text-xs rounded-[6px] border border-[var(--border-contrast)] bg-[var(--bg-elevated)] text-[var(--text-primary)]"
                >
                  <option value="">Set type…</option>
                  <option value="both">Both (2)</option>
                  <option value="day">Day (1)</option>
                  <option value="night">Night (1)</option>
                  <option value="off">Off (0)</option>
                </select>
                {bulkActionType && (
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={handleApplyBulkUpdate}
                    isLoading={isBulkActing}
                    className="h-8 px-2.5 text-xs rounded-[6px]"
                  >
                    Apply
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleExecuteBulkDelete}
                  isLoading={isBulkActing}
                  className="h-8 px-2.5 text-xs rounded-[6px]"
                >
                  Delete
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedEntryIds(new Set())}
                  className="h-8 px-2 text-xs rounded-[6px]"
                >
                  Deselect
                </Button>
              </div>
            </div>
          )}

          {/* Entry Rows */}
          <div className="flex flex-col gap-1 max-h-48 overflow-y-auto pr-1">
            {entries.map((entry) => {
              const isSelected = selectedEntryIds.has(entry._id);
              const isEditingThis = activeEditingEntry?._id === entry._id;
              const userName = typeof entry.user === 'object' ? entry.user?.name : entry.userName || 'Member';

              return (
                <div
                  key={entry._id}
                  className={cn(
                    'flex items-center justify-between gap-2 px-2.5 py-2 rounded-[8px] border transition-colors text-xs',
                    isEditingThis
                      ? 'border-[var(--brand)] bg-[var(--accent-subtle)]'
                      : 'border-[var(--border-default)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-muted)]'
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {isAdmin && (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelectEntry(entry._id)}
                        className="w-4 h-4 rounded-[4px] border-[var(--border-contrast)] accent-[var(--brand)] cursor-pointer"
                        aria-label={`Select ${userName}`}
                      />
                    )}
                    <span className="font-semibold text-[var(--text-primary)] truncate max-w-[120px] sm:max-w-[160px]">
                      {userName}
                    </span>
                    <span className="px-1.5 py-0.5 rounded-[4px] font-semibold bg-[var(--bg-surface)] border border-[var(--border-default)] text-[var(--text-secondary)] uppercase text-[10px]">
                      {entry.type}
                    </span>
                    {entry.isGuestMeal && entry.guestCount > 0 && (
                      <span className="text-[10px] font-semibold text-[var(--brand)] tabular-nums">
                        +{entry.guestCount} guest
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveEditingEntry(entry);
                        setFormData({
                          date: toIsoDateString(entry.date),
                          type: entry.type || 'both',
                          isGuestMeal: Boolean(entry.isGuestMeal || entry.guestCount > 0),
                          guestCount: entry.guestCount || 0,
                          remarks: entry.remarks || '',
                          userId: typeof entry.user === 'object' ? entry.user?._id : (entry.user || ''),
                          userIds: [],
                        });
                      }}
                      className="p-1 rounded-[6px] text-[var(--text-secondary)] hover:text-[var(--brand)] hover:bg-[var(--bg-muted)]"
                      aria-label={`Edit ${userName}`}
                    >
                      <HiOutlinePencilSquare className="w-4 h-4" />
                    </button>
                    {onDelete && (
                      <button
                        type="button"
                        onClick={() => onDelete(entry._id)}
                        className="p-1 rounded-[6px] text-[var(--text-secondary)] hover:text-[var(--danger-text)] hover:bg-[var(--danger-bg)]"
                        aria-label={`Delete ${userName}`}
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
                setFormData((prev) => ({
                  ...prev,
                  guestCount: 0,
                  remarks: '',
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

      {/* ── MODE SWITCH (Single Day | Date Range) ──────────────────── */}
      {!activeEditingEntry && (
        <div
          role="radiogroup"
          aria-label="Date entry mode"
          className="segmented-control w-full min-h-[44px]"
        >
          <button
            type="button"
            role="radio"
            aria-checked={entryMode === 'single'}
            tabIndex={entryMode === 'single' ? 0 : -1}
            onClick={() => setEntryMode('single')}
            onKeyDown={(e) => handleModeKeyDown(e, entryMode)}
            className={cn(
              'segmented-control-button flex-1 min-h-[38px] flex items-center justify-center gap-2 select-none',
              entryMode === 'single' && 'text-[var(--brand)] font-semibold'
            )}
          >
            <HiOutlineCalendar className={cn('w-4 h-4 shrink-0 transition-colors', entryMode === 'single' ? 'text-[var(--brand)]' : 'text-[var(--text-secondary)]')} />
            <span>Single day</span>
          </button>

          <button
            type="button"
            role="radio"
            aria-checked={entryMode === 'range'}
            tabIndex={entryMode === 'range' ? 0 : -1}
            onClick={() => setEntryMode('range')}
            onKeyDown={(e) => handleModeKeyDown(e, entryMode)}
            className={cn(
              'segmented-control-button flex-1 min-h-[38px] flex items-center justify-center gap-2 select-none',
              entryMode === 'range' && 'text-[var(--brand)] font-semibold'
            )}
          >
            <HiOutlineCalendar className={cn('w-4 h-4 shrink-0 transition-colors', entryMode === 'range' ? 'text-[var(--brand)]' : 'text-[var(--text-secondary)]')} />
            <span>Date range</span>
          </button>
        </div>
      )}

      {/* ── MEMBER MULTI-SELECT ─────────────────────────────────────── */}
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
                setMemberError('');
              }}
              loading={isUsersLoading}
              disabled={isSubmitting || readOnly}
              accentColor="primary"
              placeholder="Select members…"
            />
            {memberError && (
              <p id="member-select-error" className="text-xs text-[var(--danger-text)] font-medium mt-1">
                {memberError}
              </p>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2.5 px-3 h-11 min-h-[44px] rounded-[8px] border border-[var(--border-contrast)] bg-[var(--input-bg)]">
            <Avatar name={currentUser?.name} size="xs" />
            <span className="text-sm font-semibold text-[var(--text-primary)] truncate">
              {currentUser?.name || 'You'}
            </span>
            <span className="text-xs text-[var(--text-muted)] ml-auto">(Active member)</span>
          </div>
        )}
      </div>

      {/* ── DATE / RANGE INPUTS ────────────────────────────────────── */}
      {entryMode === 'single' || activeEditingEntry ? (
        <DateField
          id="meal-single-date"
          label="Date"
          value={formData.date}
          onChange={(e) => setFormData((p) => ({ ...p, date: e.target.value }))}
          disabled={isSubmitting || readOnly}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <DateField
            id="meal-range-from"
            label="From date"
            value={rangeFrom}
            onChange={(e) => {
              setRangeFrom(e.target.value);
              setRangeError('');
            }}
            disabled={isSubmitting || readOnly}
          />
          <DateField
            id="meal-range-to"
            label="To date"
            value={rangeTo}
            min={rangeFrom}
            onChange={(e) => {
              setRangeTo(e.target.value);
              setRangeError('');
            }}
            disabled={isSubmitting || readOnly}
            error={activeRangeError}
          />
        </div>
      )}

      {/* ── MEAL TYPE RADIOGROUP ───────────────────────────────────── */}
      <div className="flex flex-col gap-1 w-full">
        <label className="text-xs font-medium text-[var(--text-secondary)] select-none">
          Meal type
        </label>
        <div
          role="radiogroup"
          aria-label="Meal type"
          className="grid grid-cols-2 sm:grid-cols-4 gap-2"
        >
          {mealTypes.map((t, idx) => {
            const isSelected = formData.type === t.value;
            const IconComponent = t.icon;

            return (
              <button
                key={t.value}
                type="button"
                role="radio"
                aria-checked={isSelected}
                tabIndex={isSelected ? 0 : -1}
                onClick={() => !readOnly && !isSubmitting && setFormData((p) => ({ ...p, type: t.value }))}
                onKeyDown={(e) => handleTypeKeyDown(e, idx)}
                disabled={readOnly || isSubmitting}
                className={cn(
                  'relative flex flex-col items-center justify-center gap-1 min-h-[48px] py-2 px-2.5 rounded-[8px] border transition-colors text-center select-none',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]',
                  isSelected
                    ? 'border-[var(--brand)] bg-[var(--accent-subtle)] text-[var(--brand)] font-semibold shadow-xs'
                    : 'border-[var(--border-contrast)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-contrast-hover)] hover:bg-[var(--bg-muted)]',
                  (readOnly || isSubmitting) && 'opacity-60 cursor-not-allowed'
                )}
              >
                <IconComponent className="w-4 h-4 shrink-0" />
                <span className="text-xs font-semibold leading-tight">{t.label}</span>
                <span className="text-[10px] text-[var(--text-muted)] leading-tight hidden sm:block">
                  {t.description}
                </span>

                {/* Single accent check badge — no unexplained green dots, no purple */}
                {isSelected && (
                  <span
                    className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[var(--brand)] text-[var(--text-on-brand)] flex items-center justify-center"
                    aria-hidden="true"
                  >
                    <HiOutlineCheck className="w-2.5 h-2.5 stroke-[3]" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── GUEST MEALS SECTION ────────────────────────────────────── */}
      <GuestMealField
        value={Number(formData.guestCount) || 0}
        onChange={(count) => {
          const nextCount = typeof count === 'function' ? count(Number(formData.guestCount) || 0) : (Number(count) || 0);
          setFormData((p) => ({ ...p, guestCount: nextCount, isGuestMeal: nextCount > 0 }));
        }}
        min={0}
        max={20}
        disabled={readOnly || isSubmitting}
      />

      {/* ── REMARKS ────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-1 w-full">
        <label htmlFor="meal-remarks" className="text-xs font-medium text-[var(--text-secondary)] select-none">
          Remarks (optional)
        </label>
        <input
          id="meal-remarks"
          type="text"
          value={formData.remarks}
          onChange={(e) => setFormData((p) => ({ ...p, remarks: e.target.value }))}
          disabled={readOnly || isSubmitting}
          placeholder="Special diet or guest notes…"
          className={cn(
            'w-full h-11 min-h-[44px] px-3 rounded-[8px] border transition-colors',
            'border-[var(--border-contrast)] hover:border-[var(--border-contrast-hover)] focus:border-[var(--brand)]',
            'bg-[var(--input-bg)] text-[16px] sm:text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]'
          )}
        />
      </div>

      {/* ── LIVE SUMMARY ROW (N members × M meals × D days = T) ─────── */}
      <div className="flex items-center justify-between px-3.5 py-2.5 rounded-[8px] border border-[var(--border-default)] bg-[var(--bg-surface)] mt-1">
        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-xs font-medium text-[var(--text-secondary)]">
          <span className="text-[11px] uppercase tracking-wider text-[var(--text-muted)] font-semibold">
            Summary:
          </span>
          <span className="tabular-nums font-medium text-[var(--text-primary)]">
            {memberCount} member{memberCount !== 1 ? 's' : ''} × {mealCountPerDay} meal{mealCountPerDay !== 1 ? 's' : ''} × {effectiveDaysCount} day{effectiveDaysCount !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex items-baseline gap-1 shrink-0">
          <span className="text-base font-bold tabular-nums text-[var(--brand)]">
            = {totalMealsCount}
          </span>
          <span className="text-xs font-medium text-[var(--text-muted)]">meals</span>
        </div>
      </div>

      {/* ── INLINE STICKY FOOTER (if renderFooter not used) ─────────── */}
      {!renderFooter && (
        <div className="sticky bottom-0 z-10 flex items-center gap-3 pt-3 mt-2 border-t border-[var(--border-default)] bg-[var(--bg-elevated)] pb-safe">
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            disabled={isSubmitting}
            className="flex-1 min-h-[44px] rounded-[8px] text-sm"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={!isValidToSave}
            isLoading={isSubmitting}
            className="flex-1 min-h-[44px] rounded-[8px] text-sm font-semibold"
          >
            {activeEditingEntry ? 'Update meal' : totalMealsCount > 0 ? `Save ${totalMealsCount} meals` : 'Save meals'}
          </Button>
        </div>
      )}
    </form>
  );
};

MealForm.displayName = 'MealForm';
export default MealForm;
