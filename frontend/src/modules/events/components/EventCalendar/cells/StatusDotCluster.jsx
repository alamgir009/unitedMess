import { memo, useMemo } from 'react';
import { cn } from '@/core/utils/helpers/string.helper';

const STATUS_SORT = { paid: 0, pending: 1, failed: 2 };
const STATUS_CONFIG = {
  paid: { bg: 'bg-[var(--payment-paid)]', label: 'Paid' },
  completed: { bg: 'bg-[var(--payment-paid)]', label: 'Paid' },
  pending: { bg: 'bg-[var(--payment-pending)]', label: 'Pending' },
  pending_verification: { bg: 'bg-[var(--payment-pending)]', label: 'Pending' },
  failed: { bg: 'bg-[var(--payment-failed)]', label: 'Failed' },
  refunded: { bg: 'bg-[var(--neutral)]', label: 'Refunded' },
};

const StatusDotCluster = memo(({ entries = [] }) => {
  const summary = useMemo(() => {
    const counts = {};
    for (const e of entries) {
      const s = e.status || 'pending';
      const key = s === 'completed' ? 'paid' : s === 'pending_verification' ? 'pending' : s;
      counts[key] = (counts[key] || 0) + 1;
    }

    const uniqueStatuses = Object.keys(counts);
    const total = entries.length;

    if (uniqueStatuses.length === 1) {
      return { mode: 'single', status: uniqueStatuses[0], count: total, label: `${total} ${STATUS_CONFIG[uniqueStatuses[0]]?.label || uniqueStatuses[0]}` };
    }

    const sorted = uniqueStatuses.sort((a, b) => (STATUS_SORT[a] ?? 99) - (STATUS_SORT[b] ?? 99));
    const dots = sorted.slice(0, 3);
    const hasFailed = sorted.includes('failed');

    return { mode: 'mixed', dots, hasFailed, label: sorted.map((s) => `${counts[s]} ${STATUS_CONFIG[s]?.label || s}`).join(' · ') };
  }, [entries]);

  if (summary.mode === 'single') {
    const cfg = STATUS_CONFIG[summary.status];
    return (
      <span
        className="inline-flex items-center gap-1 shrink-0"
        aria-label={summary.label}
      >
        <span className={cn('w-1.5 h-1.5 rounded-full ring-1 ring-[var(--bg-elevated)]', cfg?.bg || 'bg-muted')} aria-hidden="true" />
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-0.5 shrink-0"
      aria-label={summary.label}
    >
      {summary.dots.map((status) => {
        const cfg = STATUS_CONFIG[status];
        return (
          <span
            key={status}
            className={cn('w-1.5 h-1.5 rounded-full ring-1 ring-[var(--bg-elevated)]', cfg?.bg || 'bg-muted')}
            aria-hidden="true"
          />
        );
      })}
    </span>
  );
});

StatusDotCluster.displayName = 'StatusDotCluster';
export default StatusDotCluster;
