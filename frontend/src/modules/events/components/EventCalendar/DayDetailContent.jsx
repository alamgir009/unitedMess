import { useMemo, useRef, useCallback, useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Avatar } from '@/shared/components/ui';
import { cn } from '@/core/utils/helpers/string.helper';
import { fmt } from '@/core/utils/helpers/currency.helper';
import SlotIcon from './cells/SlotIcon';

const STATUS_BADGE = {
  completed: { variant: 'success', label: 'Paid' },
  pending: { variant: 'warning', label: 'Pending' },
  pending_verification: { variant: 'warning', label: 'Verifying' },
  failed: { variant: 'error', label: 'Failed' },
  refunded: { variant: 'neutral', label: 'Refunded' },
};

const ROW_HEIGHT = 44;
const OVERSCAN = 4;

const DayDetailContent = ({ entries = [], category }) => {
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const containerRef = useRef(null);
  const currentUser = useSelector((state) => state.auth.user);
  const sorted = useMemo(
    () =>
      [...entries].sort(
        (a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt),
      ),
    [entries],
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setContainerHeight(entry.contentRect.height));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleScroll = useCallback((e) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  if (!entries || entries.length === 0) {
    return <p className="text-sm text-[var(--text-muted)] py-8 text-center">No entries for this day.</p>;
  }

  const totalHeight = sorted.length * ROW_HEIGHT;
  const startIdx = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const endIdx = Math.min(sorted.length, Math.ceil((scrollTop + containerHeight) / ROW_HEIGHT) + OVERSCAN);

  const visibleRows = sorted.slice(startIdx, endIdx);

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="relative overflow-y-auto custom-scrollbar"
      style={{ height: '100%', minHeight: 200 }}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ position: 'absolute', top: startIdx * ROW_HEIGHT, left: 0, right: 0 }}>
          {visibleRows.map((entry, i) => {
            const idx = startIdx + i;
            const isUnpopulated = entry.user && typeof entry.user === 'string';
            const name = entry.user?.name || entry.userName || (isUnpopulated ? currentUser?.name : 'Unknown');
            const avatarSrc = entry.user?.image || (isUnpopulated ? currentUser?.image : undefined);
            const isFailed = entry.status === 'failed';
            const isCompleted = entry.status === 'completed';

            return (
              <div
                key={entry._id || idx}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-100',
                  'hover:bg-[var(--bg-muted)] hover:shadow-xs',
                  isFailed && 'bg-[var(--danger-bg)]/40 border-l-[3px] border-[var(--payment-failed)] pl-2.5',
                )}
                style={{ height: ROW_HEIGHT }}
              >
                <Avatar
                  src={avatarSrc}
                  name={name}
                  size="sm"
                  className="shrink-0"
                />
                <div className="flex-1 min-w-0 flex items-center gap-2">
                  <span className="text-sm font-semibold text-[var(--text-primary)] truncate">
                    {name}
                  </span>
                  {category === 'meals' && entry.type && (
                    <SlotIcon slot={entry.type} status={entry.status} size={12} />
                  )}
                  {category === 'markets' && (
                    <span className="text-xs text-[var(--text-muted)] truncate">
                      {entry.items || entry.description || ''}
                    </span>
                  )}
                  {category === 'payments' && entry.paymentMethod && (
                    <span className="text-xs text-[var(--text-muted)] truncate">
                      {entry.paymentMethod}
                      {entry.transactionId && ` · ${entry.transactionId.slice(0, 10)}…`}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {(category === 'markets' || category === 'payments') && (
                    <span className="text-sm font-bold tabular-nums tracking-tight text-[var(--text-primary)]">
                      ₹{fmt(entry.amount)}
                    </span>
                  )}
                  {category === 'payments' && entry.status && (
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold shadow-xs',
                        isCompleted && 'bg-[var(--success-bg)] text-[var(--success-text)]',
                        isFailed && 'bg-[var(--danger-bg)] text-[var(--danger-text)]',
                        entry.status === 'pending' && 'bg-[var(--warning-bg)] text-[var(--warning-text)]',
                        entry.status === 'refunded' && 'bg-[var(--bg-muted)] text-[var(--text-secondary)]',
                      )}
                    >
                      {STATUS_BADGE[entry.status]?.label || entry.status}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

DayDetailContent.displayName = 'DayDetailContent';
export default DayDetailContent;
