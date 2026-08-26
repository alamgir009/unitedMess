import { memo, useMemo } from 'react';
import { cn } from '@/core/utils/helpers/string.helper';
import { HiOutlineCheckBadge, HiOutlineArrowPath, HiOutlineMinus } from 'react-icons/hi2';
import AvatarCluster from './AvatarCluster';

const EVENT_ICONS = {
  vote_created: { icon: HiOutlineCheckBadge, color: 'text-[var(--success)]' },
  vote_updated: { icon: HiOutlineArrowPath, color: 'text-[var(--warning)]' },
  vote_unchanged: { icon: HiOutlineMinus, color: 'text-[var(--text-muted)]' },
};

const groupByEventType = (entries) => {
  const groups = {};
  for (const entry of entries) {
    const type = entry.eventType || 'vote_unchanged';
    if (!groups[type]) groups[type] = [];
    groups[type].push(entry);
  }
  return groups;
};

const VoteCellContent = memo(({ entries = [], loading, error, isCompact, onRetry, onCellClick }) => {
  const groups = useMemo(() => groupByEventType(entries), [entries]);
  const totalEntries = entries.length;

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

  if (totalEntries === 0) return null;

  const members = entries.filter((e) => e.user);

  if (isCompact) {
    return (
      <div className="flex items-center gap-1" onClick={onCellClick} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onCellClick?.(); }}>
        {Object.entries(groups).map(([eventType, evts]) => {
          const meta = EVENT_ICONS[eventType] || EVENT_ICONS.vote_unchanged;
          return (
            <span
              key={eventType}
              className={cn(
                'inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold shadow-xs',
                'bg-[var(--success-bg)] text-[var(--success-text)]',
              )}
            >
              <meta.icon className={cn('w-2.5 h-2.5', meta.color)} aria-hidden="true" />
              {evts.length}
            </span>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[3px]" onClick={onCellClick} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onCellClick?.(); }}>
      <div className="flex items-center gap-1 h-[22px] min-w-0">
        <AvatarCluster members={members} size="sm" maxAvatars={2} />
        <span className="text-[10px] font-medium text-muted-foreground tabular-nums ml-auto">
          {totalEntries}
        </span>
      </div>
    </div>
  );
});

VoteCellContent.displayName = 'VoteCellContent';
export default VoteCellContent;
