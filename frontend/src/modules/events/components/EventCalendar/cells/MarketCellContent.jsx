import { memo, useMemo } from 'react';
import { ShoppingBag } from 'lucide-react';
import { cn } from '@/core/utils/helpers/string.helper';
import { fmt } from '@/core/utils/helpers/currency.helper';
import AvatarCluster from './AvatarCluster';

const MarketCellContent = memo(({ entries = [], loading, error, isCompact, onRetry, onCellClick, scheduleData = null, isOwnDuty = false }) => {
  const total = useMemo(
    () => entries.reduce((sum, e) => sum + (e.amount || 0), 0),
    [entries],
  );
  const members = useMemo(
    () => entries.filter((e) => e.user || e.userName),
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

  const hasDuty = scheduleData?.user;

  if (entries.length === 0 && !hasDuty) return null;

  return (
    <div
      className="flex flex-col justify-end min-w-0 overflow-hidden cursor-pointer"
      onClick={onCellClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onCellClick?.(); }}
    >
      {isCompact ? (
        entries.length > 0 ? (
          <span className={cn(
            'text-[11px] sm:text-xs font-bold tabular-nums tracking-tight leading-none',
            'text-[var(--market-accent)]',
          )}>
            ₹{fmt(total)}
          </span>
        ) : hasDuty ? (
          <span className={cn(
            'inline-flex items-center gap-0.5 leading-none',
            isOwnDuty ? 'text-[var(--duty-own-text)]' : 'text-[var(--duty-other-text)]',
          )}>
            <span className={cn(
              'w-1 h-1 rounded-full shrink-0',
              isOwnDuty ? 'bg-[var(--duty-own)]' : 'bg-[var(--duty-other)]',
            )} />
            <span className="text-[10px] sm:text-[11px] font-semibold truncate">
              {scheduleData.user.name?.split(' ')[0]}
            </span>
          </span>
        ) : null
      ) : (
        <>
          {entries.length > 0 && (
            <>
              <ShoppingBag className="w-[14px] h-[14px] text-[var(--market-accent)] shrink-0 drop-shadow-sm" aria-hidden="true" />
              <AvatarCluster members={members} size="sm" maxAvatars={2} />
              <span className="text-[11px] font-bold tabular-nums tracking-tight text-[var(--text-primary)] ml-auto leading-none whitespace-nowrap shrink-0">
                ₹{fmt(total)}
              </span>
            </>
          )}
          {entries.length === 0 && hasDuty && (
            <span className={cn(
              'text-[10px] font-semibold truncate',
              isOwnDuty ? 'text-[var(--duty-own-text)]' : 'text-[var(--duty-other-text)]',
            )}>
              {scheduleData.user.name?.split(' ')[0]}
            </span>
          )}
        </>
      )}
    </div>
  );
});

MarketCellContent.displayName = 'MarketCellContent';
export default MarketCellContent;
