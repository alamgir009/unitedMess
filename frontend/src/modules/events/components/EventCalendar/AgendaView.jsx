import { useMemo } from 'react';
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  isSameMonth,
  isToday,
} from 'date-fns';
import { cn } from '@/core/utils/helpers/string.helper';
import { Avatar, Badge, Skeleton } from '@/shared/components/ui';
import { fmt } from '@/core/utils/helpers/currency.helper';

const AgendaView = ({
  currentMonth,
  dataMap = {},
  category,
  loadingMap = {},
  errorMap = {},
  onCellClick,
  onRetry,
}) => {
  const days = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  return (
    <div className="space-y-1 content-visibility-auto">
      {days.map((day) => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const entries = dataMap[dateStr] || [];
        const loading = loadingMap[dateStr];
        const error = errorMap[dateStr];
        const today = isToday(day);

        return (
          <div
            key={dateStr}
            className={cn(
              'flex items-center gap-4 p-3.5 rounded-xl cursor-pointer transition-all duration-150',
              today
                ? 'bg-[var(--bg-elevated)] border border-brand/40 shadow-sm shadow-brand/10'
                : 'bg-[var(--bg-elevated)] border border-border/60 shadow-sm hover:shadow-md hover:-translate-y-px',
              'content-visibility-auto',
            )}
            onClick={() => onCellClick?.(day, entries)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onCellClick?.(day, entries);
              }
            }}
          >
            <div className={cn(
              'flex flex-col items-center justify-center w-10 h-10 shrink-0 rounded-lg',
              today
                ? 'bg-gradient-to-br from-[var(--accent-primary)] to-[var(--brand)] text-white shadow-sm shadow-brand/20'
                : 'bg-muted/70 border border-border/40',
            )}>
              <span className={cn('text-xs font-bold leading-none', today ? 'text-white' : 'text-foreground')}>
                {format(day, 'd')}
              </span>
              <span className={cn('text-[9px] font-medium leading-none mt-0.5', today ? 'text-white/80' : 'text-muted-foreground')}>
                {format(day, 'EEE')}
              </span>
            </div>

            <div className="flex-1 min-w-0">
              {loading ? (
                <Skeleton className="h-5 w-full rounded" />
              ) : error ? (
                <button
                  onClick={(e) => { e.stopPropagation(); onRetry?.(day); }}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-danger hover:text-danger-text transition-colors"
                  aria-label="Retry"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Failed — retry
                </button>
              ) : entries.length === 0 ? (
                <span className="text-xs text-muted-foreground/60">No entries</span>
              ) : (
                <div className="flex flex-wrap items-center gap-1.5">
                  {entries.slice(0, 3).map((entry, i) => (
                    <Avatar
                      key={entry._id || i}
                      src={entry.user?.image}
                      name={entry.user?.name}
                      size="xs"
                      className="shrink-0"
                    />
                  ))}
                  {entries.length > 3 && (
                    <Badge variant="default" size="sm" className="text-[10px] px-1.5">
                      +{entries.length - 3}
                    </Badge>
                  )}
                  {(category === 'markets' || category === 'payments') && (
                    <span className="text-xs font-bold tabular-nums text-foreground ml-auto">
                      ₹{fmt(entries.reduce((s, e) => s + (e.amount || 0), 0))}
                    </span>
                  )}
                </div>
              )}
            </div>

            {entries.length > 0 && !loading && (
              <div className="flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full bg-muted/70 border border-border/40 shrink-0 shadow-xs">
                <span className="text-[10px] font-bold tabular-nums text-muted-foreground">
                  {entries.length}
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

AgendaView.displayName = 'AgendaView';
export default AgendaView;
