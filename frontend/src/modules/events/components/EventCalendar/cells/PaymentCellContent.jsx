import { memo, useMemo } from 'react';
import { CreditCard } from 'lucide-react';
import { cn } from '@/core/utils/helpers/string.helper';
import { fmt } from '@/core/utils/helpers/currency.helper';
import AvatarCluster from './AvatarCluster';
import StatusDotCluster from './StatusDotCluster';

const PaymentCellContent = memo(({ entries = [], loading, error, isCompact, onRetry, onCellClick }) => {
  const total = useMemo(
    () => entries.reduce((sum, e) => sum + (e.amount || 0), 0),
    [entries],
  );
  const members = useMemo(
    () => entries.filter((e) => e.user || e.userName),
    [entries],
  );
  const hasFailed = useMemo(
    () => entries.some((e) => e.status === 'failed'),
    [entries],
  );

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

  return (
    <div
      className={cn(
        'flex items-center gap-1 min-w-0 cursor-pointer rounded-sm',
        !isCompact && hasFailed && 'bg-[var(--danger-bg)]/40 border-l-[3px] border-[var(--payment-failed)] pl-1.5',
      )}
      onClick={onCellClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onCellClick?.(); }}
    >
      {isCompact ? (
        <>
          <span className="text-xs font-semibold tabular-nums text-[var(--text-primary)]">
            ₹{fmt(total)}
          </span>
          <StatusDotCluster entries={entries} />
        </>
      ) : (
        <>
          <CreditCard className="w-[14px] h-[14px] text-[var(--payment-paid)] shrink-0" aria-hidden="true" />
          <AvatarCluster members={members} size="sm" maxAvatars={2} />
          <StatusDotCluster entries={entries} />
          <span className="text-[10px] font-semibold tabular-nums text-[var(--text-primary)] ml-auto leading-none">
            ₹{fmt(total)}
          </span>
        </>
      )}
    </div>
  );
});

PaymentCellContent.displayName = 'PaymentCellContent';
export default PaymentCellContent;
