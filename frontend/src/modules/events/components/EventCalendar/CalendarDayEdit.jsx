import { useState, useEffect } from 'react';
import { Plus, Trash2, X, Check } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/core/utils/helpers/string.helper';
import { fmt } from '@/core/utils/helpers/currency.helper';
import { MemberSelect } from '@/shared/components/ui';
import apiClient from '@/services/api/client/apiClient';
import SlotIcon from './cells/SlotIcon';

const MEAL_TYPES = [
  { value: 'day', label: 'Day', color: 'border-amber-500/40 bg-amber-500/8 text-[var(--slot-day)]' },
  { value: 'night', label: 'Night', color: 'border-indigo-400/40 bg-indigo-400/8 text-[var(--slot-night)]' },
  { value: 'both', label: 'Both', color: 'border-primary/40 bg-primary/8 text-[var(--slot-both)]' },
  { value: 'off', label: 'Off', color: 'border-muted-foreground/30 bg-muted/20 text-muted-foreground' },
];

const inputBase =
  'w-full px-2.5 py-1.5 rounded-lg border border-[var(--border-default)] ' +
  'bg-[var(--bg-elevated)] text-sm text-[var(--text-primary)] ' +
  'focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/30 focus:border-[var(--accent-primary)]/50 ' +
  'transition-all duration-100 ' +
  'placeholder:text-[var(--text-muted)]/50';

const CalendarDayEdit = ({ entries = [], category, date: detailDate, isAdmin, onSave, onUpdate, onDelete, onDone }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const dateStr = detailDate ? format(new Date(detailDate), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');

  const sorted = [...entries].sort(
    (a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt),
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
          {entries.length} {category === 'meals' ? 'meal' : 'market'} entr{entries.length === 1 ? 'y' : 'ies'}
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
          onSave={onSave}
          onCancel={() => setIsAdding(false)}
          setIsSubmitting={setIsSubmitting}
        />
      )}

      <div className="flex flex-col gap-1">
        {sorted.length === 0 && !isAdding && (
          <p className="text-sm text-[var(--text-muted)] py-4 text-center">No entries for this day.</p>
        )}
        {sorted.map((entry) => {
          const isEditing = editingId === entry._id;
          const isConfirming = confirmDeleteId === entry._id;
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
                    'flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-100',
                    'hover:bg-[var(--bg-muted)]',
                    isConfirming && 'bg-[var(--danger-bg)]/20 border border-[var(--danger)]/30',
                  )}
                >
                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    <span className="text-sm font-medium text-[var(--text-primary)] truncate">
                      {entry.user?.name || entry.userName || 'Unknown'}
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
                  ) : (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => setEditingId(entry._id)}
                        className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/10 transition-colors"
                        aria-label="Edit entry"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(entry._id)}
                        className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-[var(--danger-bg)]/20 transition-colors"
                        aria-label="Delete entry"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex gap-2 pt-3 border-t border-[var(--border-default)] shrink-0">
        <button
          onClick={onDone}
          disabled={isSubmitting}
          className="flex-1 px-3 py-2 rounded-xl text-sm font-semibold bg-[var(--accent-primary)] text-white hover:opacity-90 transition-opacity disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {isSubmitting ? 'Saving...' : 'Done'}
        </button>
      </div>
    </div>
  );
};

// ─── Inline Add Form ───────────────────────────────────────────

const EntryForm = ({ category, dateStr, isAdmin, onSave, onCancel, setIsSubmitting }) => {
  const [date, setDate] = useState(dateStr);
  const [type, setType] = useState('day');
  const [amount, setAmount] = useState('');
  const [items, setItems] = useState('');
  const [remarks, setRemarks] = useState('');
  const [userIds, setUserIds] = useState([]);
  const [users, setUsers] = useState([]);
  const [isUsersLoading, setIsUsersLoading] = useState(false);
  const [errors, setErrors] = useState({});

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

  const validate = () => {
    const errs = {};
    if (!date) errs.date = 'Date is required';
    if (category === 'meals' && !type) errs.type = 'Type is required';
    if (category === 'markets' && (!amount || Number(amount) <= 0)) errs.amount = 'Amount must be > 0';
    if (category === 'markets' && !items.trim()) errs.items = 'Items is required';
    if (isAdmin && userIds.length === 0) errs.userIds = 'Select at least one member';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setIsSubmitting(true);
    try {
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
      onCancel();
    } finally {
      setIsSubmitting(false);
    }
  };

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

      <div className="flex items-center gap-2">
        <input
          type="date"
          value={date}
          onChange={(e) => { setDate(e.target.value); setErrors((p) => ({ ...p, date: undefined })); }}
          className={cn(inputBase, 'w-40', errors.date && 'ring-2 ring-[var(--danger)]/50')}
        />
      </div>

      {category === 'meals' ? (
        <div className="grid grid-cols-4 gap-1.5">
          {MEAL_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => { setType(t.value); setErrors((p) => ({ ...p, type: undefined })); }}
              className={cn(
                'py-1.5 px-1 rounded-lg text-[11px] font-bold border transition-all duration-100',
                type === t.value ? `${t.color} shadow-xs ring-1 ring-[var(--accent-primary)]/20` : 'border-[var(--border-default)] text-[var(--text-muted)] hover:bg-[var(--bg-muted)]',
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
          className="flex-1 py-1.5 rounded-lg text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)] transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="flex-[2] py-1.5 rounded-lg text-xs font-semibold bg-[var(--accent-primary)] text-white hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Save
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
                'px-2 py-1 rounded-md text-[10px] font-bold border transition-all duration-100',
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
          className="p-1 rounded-md text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/10 transition-colors"
          aria-label="Save changes"
        >
          <Check className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)] transition-colors"
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
