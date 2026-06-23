import { memo, useMemo } from 'react';
import { cn } from '@/core/utils/helpers/string.helper';
import { HiOutlineSun, HiOutlineMoon, HiOutlineSparkles } from 'react-icons/hi2';
import SlotIcon from './SlotIcon';
import AvatarCluster from './AvatarCluster';

const CELL_DENSITY_THRESHOLD = 6;

const SLOT_ORDER = ['day', 'night', 'both'];

const groupBySlot = (entries) => {
  const groups = {};
  for (const entry of entries) {
    const slot = entry.type || 'day';
    if (!groups[slot]) groups[slot] = [];
    groups[slot].push(entry);
  }
  return groups;
};

const SlotRow = memo(({ slot, entries }) => {
  const members = useMemo(() => entries.filter((e) => e.user || e.userName), [entries]);
  const status = entries[0]?.status || 'confirmed';

  return (
    <div className="flex items-center gap-1 h-[22px] min-w-0">
      <SlotIcon slot={slot} status={status} size={14} />
      <AvatarCluster members={members} size="sm" maxAvatars={2} />
    </div>
  );
});
SlotRow.displayName = 'SlotRow';

const SummaryChip = memo(({ entries }) => {
  const total = entries.length;
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 h-5 px-1.5 rounded-md',
        'bg-[var(--surface-elevated)] border border-[var(--border-muted)]',
        'text-[10px] font-medium text-[var(--text-secondary)]',
        'hover:bg-[var(--accent-primary)]/10 hover:text-[var(--accent-primary)]',
        'transition-colors duration-100',
      )}
    >
      <HiOutlineSun className="w-3 h-3 text-[var(--slot-day)]" aria-hidden="true" />
      <HiOutlineMoon className="w-3 h-3 text-[var(--slot-night)]" aria-hidden="true" />
      <span aria-hidden="true" className="text-[var(--text-muted)]">·</span>
      <span className="tabular-nums">{total}</span>
    </div>
  );
});
SummaryChip.displayName = 'SummaryChip';

const MealCellContent = memo(({ entries = [], loading, error, isCompact, onRetry, onCellClick }) => {
  const groups = useMemo(() => groupBySlot(entries), [entries]);
  const sortedSlots = useMemo(() => SLOT_ORDER.filter((s) => groups[s]), [groups]);
  const totalEntries = entries.length;
  const shouldShowSummary = totalEntries > CELL_DENSITY_THRESHOLD && sortedSlots.length === 3;

  if (loading) {
    return <div className="skeleton h-8 w-full rounded-md" />;
  }

  if (error) {
    return (
      <button
        onClick={onRetry}
        className="flex items-center gap-1 text-xs text-[var(--danger)] hover:text-[var(--danger-text)] transition-colors"
        aria-label="Retry loading"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        <span>Retry</span>
      </button>
    );
  }

  if (entries.length === 0) return null;

  if (isCompact) {
    return (
      <div className="flex items-center gap-1" onClick={onCellClick} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onCellClick?.(); }}>
        {sortedSlots.map((slot) => (
          <span
            key={slot}
            className={cn(
              'inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold',
              'shadow-xs',
              slot === 'day' && 'bg-[var(--slot-day)]/10 text-[var(--slot-day)]',
              slot === 'night' && 'bg-[var(--slot-night)]/10 text-[var(--slot-night)]',
              slot === 'both' && 'bg-[var(--slot-both)]/10 text-[var(--slot-both)]',
            )}
          >
            {slot === 'day' && <HiOutlineSun className="w-2.5 h-2.5" aria-hidden="true" />}
            {slot === 'night' && <HiOutlineMoon className="w-2.5 h-2.5" aria-hidden="true" />}
            {slot === 'both' && <HiOutlineSparkles className="w-2.5 h-2.5" aria-hidden="true" />}
            {groups[slot].length}
          </span>
        ))}
      </div>
    );
  }

  if (shouldShowSummary && sortedSlots.length >= 3) {
    return (
      <div onClick={onCellClick} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onCellClick?.(); }}>
        <SummaryChip entries={entries} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[3px]" onClick={onCellClick} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onCellClick?.(); }}>
      {sortedSlots.map((slot) => (
        <SlotRow key={slot} slot={slot} entries={groups[slot]} />
      ))}
    </div>
  );
});

MealCellContent.displayName = 'MealCellContent';
export default MealCellContent;
