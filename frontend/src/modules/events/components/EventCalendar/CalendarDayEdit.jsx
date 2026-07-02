import { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, Trash2, X, Check } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/core/utils/helpers/string.helper';
import { fmt } from '@/core/utils/helpers/currency.helper';
import { MemberSelect } from '@/shared/components/ui';
import apiClient from '@/services/api/client/apiClient';
import SlotIcon from './cells/SlotIcon';

const MEAL_TYPES = [
  /* selected state: border matches text exactly, bg uses same color at low opacity for hierarchy */
  { value: 'day', label: 'Day', color: 'border-[var(--warning-text)] bg-[var(--warning-text)]/10 text-[var(--warning-text)]' },
  { value: 'night', label: 'Night', color: 'border-[var(--info-text)] bg-[var(--info-text)]/10 text-[var(--info-text)]' },
  { value: 'both', label: 'Both', color: 'border-[var(--slot-both)] bg-[var(--slot-both)]/10 text-[var(--slot-both)]' },
  { value: 'off', label: 'Off', color: 'border-muted-foreground bg-muted-foreground/10 text-muted-foreground' },
];

const inputBase =
  'w-full px-2.5 py-1.5 rounded-lg border border-[var(--border-default)] ' +
  'bg-[var(--bg-elevated)] text-sm text-[var(--text-primary)] ' +
  'focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/30 focus:border-[var(--accent-primary)]/50 ' +
  'transition-colors duration-100 ' +
  'placeholder:text-[var(--text-muted)]/50';

const getEntryUserId = (entry) =>
  typeof entry.user === 'object' ? entry.user?._id : entry.user;

const CalendarDayEdit = ({ entries = [], category, date: detailDate, isAdmin, currentUser, onSave, onUpdate, onDelete }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
          {visibleEntries.length} {category === 'meals' ? 'meal' : 'market'} entr{visibleEntries.length === 1 ? 'y' : 'ies'}
          {!isAdmin && entries.length > visibleEntries.length && (
            <span className="ml-1 text-[var(--text-muted)]">
              ({entries.length} total)
            </span>
          )}
        </p>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Plus className="w-3.5 h-3.5" />
            Add
          </button>
        )}
      </div>

      {isAdding && (
        <EntryForm
          category={category}
          dateStr={dateStr}
          isAdmin={isAdmin}
          currentUser={currentUser}
          onSave={onSave}
          onCancel={() => setIsAdding(false)}
          setIsSubmitting={setIsSubmitting}
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
                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    <span className="text-sm font-medium text-[var(--text-primary)] truncate">
                      {displayName}
                    </span>
                    {category === 'meals' && entry.type && (
                      <SlotIcon slot={entry.type} status={entry.status} size={12} />
                    )}
                    {category === 'markets' && (
                      <span className="text-xs font-bold tabular-nums text-[var(--text-primary)]">
                        ₹{fmt(entry.amount)}
                      </span>
                    )}
                  </div>

                  {isConfirming ? (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={async () => {
                          setIsSubmitting(true);
                          try { await onDelete(entry._id); }
                          finally { setConfirmDeleteId(null); setIsSubmitting(false); }
                        }}
                        disabled={isSubmitting}
                        className="p-1 rounded-md text-[var(--danger)] hover:bg-[var(--danger-bg)]/30 transition-colors disabled:opacity-50"
                        aria-label="Confirm delete"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        disabled={isSubmitting}
                        className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)] transition-colors disabled:opacity-50"
                        aria-label="Cancel delete"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : canEdit(entry) ? (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => setEditingId(entry._id)}
                        /* --text-secondary for icon UI contrast 3:1 AA (was 2.44:1 on light bg) */
                        className="p-1 rounded-md text-[var(--text-secondary)] hover:text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/10 transition-colors"
                        aria-label="Edit entry"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(entry._id)}
                        /* --text-secondary for icon UI contrast 3:1 AA (was 2.44:1 on light bg) */
                        className="p-1 rounded-md text-[var(--text-secondary)] hover:text-[var(--danger)] hover:bg-[var(--danger-bg)]/20 transition-colors"
                        aria-label="Delete entry"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          );
        })}
      </div>


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
    className={cn(
      /* composited: only bg/text/border-color change */
      'flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-colors duration-100 border',
      current === mode
        /* richer bg/border for premium depth; active tab raises above the well */
        ? 'bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] border-[var(--accent-primary)]/40 shadow-sm'
        /* --text-secondary replaces --text-muted for inactive tab AA contrast (2.44:1 fails → 4.86:1 passes) */
        : 'text-[var(--text-secondary)] border-transparent hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)]/50',
    )}
  >
    {label}
  </button>
);

const EntryForm = ({ category, dateStr, isAdmin, currentUser, onSave, onCancel, setIsSubmitting }) => {
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
    if (isAdmin && userIds.length === 0) errs.userIds = 'Select at least one member';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [isRangeMode, rangeFrom, rangeTo, date, daysCount, category, type, amount, items, isAdmin, userIds]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      if (isRangeMode) {
        const currentUserId = currentUser?._id || currentUser?.id;
        await onSave({
          startDate: rangeFrom,
          endDate: rangeTo,
          type,
          userIds: isAdmin ? userIds : (currentUserId ? [currentUserId] : []),
          ...(remarks.trim() && { remarks: remarks.trim() }),
        });
      } else {
        const payload = { date: new Date(date).toISOString() };
        if (isAdmin) payload.userIds = userIds;
        if (category === 'meals') {
          payload.type = type;
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 p-3 rounded-xl border border-[var(--border-default)] bg-[var(--bg-muted)]/30">
      <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Add Entry</p>

      {isAdmin && (
        <MemberSelect
          users={users}
          value={userIds}
          onChange={(ids) => { setUserIds(ids); setErrors((p) => ({ ...p, userIds: undefined })); }}
          loading={isUsersLoading}
          accentColor="primary"
          placeholder="Select members..."
        />
      )}
      {errors.userIds && <p className="text-xs text-[var(--danger)]">{errors.userIds}</p>}

      {/* Mode toggle — only for meals (markets don't support bulk) */}
      {category === 'meals' && (
        /* shadow-inner creates a recessed well; active tab with shadow-sm rises above it */
        <div role="tablist" aria-label="Date mode" className="flex gap-1 p-0.5 rounded-lg bg-[var(--bg-muted)]/40 border border-[var(--border-default)] shadow-[var(--inset-shadow-deep)]">
          <ModeTab mode="single" current={mode} onChange={setMode} label="Single" />
          <ModeTab mode="range" current={mode} onChange={setMode} label="Range" />
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
            : <span>{daysCount} day{daysCount !== 1 ? 's' : ''} · {typeCountMap[type] ?? 0} meal{typeCountMap[type] !== 1 ? 's' : ''} per day</span>
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
              className={cn(inputBase, errors.rangeFrom && 'ring-2 ring-[var(--danger)]/50')}
            />
            {errors.rangeFrom && <p className="text-[10px] text-[var(--danger)] mt-0.5">{errors.rangeFrom}</p>}
          </div>
          <div>
            <input
              type="date"
              value={rangeTo}
              min={rangeFrom}
              onChange={(e) => { setRangeTo(e.target.value); setErrors((p) => ({ ...p, rangeTo: undefined })); }}
              className={cn(inputBase, errors.rangeTo && 'ring-2 ring-[var(--danger)]/50')}
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
            className={cn(inputBase, errors.date && 'ring-2 ring-[var(--danger)]/50')}
          />
          {errors.date && <p className="text-[10px] text-[var(--danger)] mt-0.5">{errors.date}</p>}
        </div>
      )}

      {category === 'meals' ? (
        <div className="grid grid-cols-4 gap-1.5">
          {MEAL_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => { setType(t.value); setErrors((p) => ({ ...p, type: undefined })); }}
              className={cn(
                'py-1.5 px-1 rounded-lg text-[11px] font-bold border transition-colors duration-100',
                type === t.value ? `${t.color} shadow-xs` : 'border-[var(--border-default)] text-[var(--text-muted)] hover:bg-[var(--bg-muted)]',
              )}
            >
              {t.label}
            </button>
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
              className={cn(inputBase, 'pl-6', errors.amount && 'ring-2 ring-[var(--danger)]/50')}
            />
          </div>
          <input
            type="text"
            value={items}
            onChange={(e) => { setItems(e.target.value); setErrors((p) => ({ ...p, items: undefined })); }}
            placeholder="Items"
            className={cn(inputBase, 'flex-[2]', errors.items && 'ring-2 ring-[var(--danger)]/50')}
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

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          /* neutral gray outline/ghost — no color competing with Save */
          className="flex-1 py-1.5 rounded-lg text-xs font-semibold border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)] hover:border-[var(--border-strong)] active:bg-[var(--bg-muted)]/80 transition-colors duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/30"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isRangeMode && (rangeInvalid || daysCount === 0)}
          className={cn(
            /* --btn-success-* for fintech confirm; brightness → opacity for composited perf */
            'flex-[2] py-1.5 rounded-lg text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50 transition-opacity duration-100 transition-shadow duration-150',
            isRangeMode && (rangeInvalid || daysCount === 0)
              ? 'bg-[var(--bg-muted)] text-[var(--text-muted)] border border-[var(--border-default)] cursor-not-allowed'
              : 'bg-[var(--btn-success-from)] text-[var(--btn-success-label)] hover:opacity-90 active:opacity-80 shadow-sm hover:shadow-md',
          )}
        >
          {isRangeMode ? `Save ${daysCount > 0 ? daysCount : ''} day${daysCount !== 1 ? 's' : ''}` : 'Save'}
        </button>
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
  const [errors, setErrors] = useState({});

  const validate = () => {
    const errs = {};
    if (category === 'meals' && !type) errs.type = 'Type is required';
    if (category === 'markets' && (!amount || Number(amount) <= 0)) errs.amount = 'Amount must be > 0';
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
    <form onSubmit={handleSubmit} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--bg-muted)]/50 border border-[var(--border-default)]">
      {category === 'meals' ? (
        <div className="flex gap-1">
          {MEAL_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => { setType(t.value); setErrors((p) => ({ ...p, type: undefined })); }}
              className={cn(
                'px-2 py-1 rounded-md text-[10px] font-bold border transition-colors duration-100',
                type === t.value ? `${t.color} shadow-xs` : 'border-[var(--border-default)] text-[var(--text-muted)]',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-1.5 flex-1">
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

      <input
        type="text"
        value={remarks}
        onChange={(e) => setRemarks(e.target.value)}
        placeholder="Notes"
        className={cn(inputBase, 'w-24 py-1 text-xs')}
      />

      <div className="flex items-center gap-1 shrink-0">
        <button
          type="submit"
          /* --btn-success-* for confirm; brightness→opacity for composited perf */
          className="p-1.5 rounded-md text-[var(--btn-success-label)] bg-[var(--btn-success-from)] hover:opacity-90 active:opacity-80 shadow-xs transition-opacity duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50"
          aria-label="Save changes"
        >
          <Check className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={onCancel}
          /* neutral gray outline — no color competing with Save */
          className="p-1.5 rounded-md border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)] hover:border-[var(--border-strong)] active:bg-[var(--bg-muted)]/80 transition-colors duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/30"
          aria-label="Cancel edit"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </form>
  );
};

CalendarDayEdit.displayName = 'CalendarDayEdit';
export default CalendarDayEdit;
