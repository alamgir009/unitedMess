import { useMemo, useRef, useCallback, useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Avatar } from '@/shared/components/ui';
import { cn } from '@/core/utils/helpers/string.helper';
import { fmt } from '@/core/utils/helpers/currency.helper';
import { formatInIST } from '@/core/utils/helpers/date.helper';
import { Calendar, Trash2, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { removeMarketScheduledDate } from '../../store/marketSchedule.slice';
import SlotIcon from './cells/SlotIcon';

const STATUS_BADGE = {
  completed: { variant: 'success', label: 'Paid' },
  pending: { variant: 'warning', label: 'Pending' },
  pending_verification: { variant: 'warning', label: 'Verifying' },
  failed: { variant: 'error', label: 'Failed' },
  refunded: { variant: 'neutral', label: 'Refunded' },
};

const VOTE_EVENT_LABELS = {
  vote_created: { text: 'Created', color: 'bg-[var(--success-bg)] text-[var(--success-text)] border-[var(--success-border)]' },
  vote_updated: { text: 'Edited', color: 'bg-[var(--warning-bg)] text-[var(--warning-text)] border-[var(--warning-border)]' },
  vote_unchanged: { text: 'No Change', color: 'bg-[var(--bg-muted)] text-[var(--text-secondary)] border-[var(--border-default)]' },
  vote_carried_forward: { text: 'Moved', color: 'bg-[var(--info-bg)] text-[var(--info-text)] border-[var(--info-border)]' },
  vote_preference_closed: { text: 'Closed', color: 'bg-[var(--warning-bg)] text-[var(--warning-text)] border-[var(--warning-border)]' },
};

const VOTE_TYPE_LABELS = {
  both: 'Both',
  day: 'Day',
  night: 'Night',
  off: 'Off',
};

const VOTE_VALUE_BADGE_COLORS = {
  night: 'bg-[var(--accent-subtle)] text-[var(--accent-primary)] border-[var(--accent-primary)]/20',
  day: 'bg-[var(--warning-bg)] text-[var(--warning-text)] border-[var(--warning-border)]',
  both: 'bg-[var(--tint-bg)] text-[var(--tint-text)] border-[var(--tint-text)]/20',
  off: 'bg-[var(--bg-muted)] text-[var(--text-secondary)] border-[var(--border-default)]',
};

const ROW_HEIGHT = 44;
const OVERSCAN = 4;

const DayDetailContent = ({ entries = [], category, totalMealsCount = 0, scheduleData = null, onPaymentEdit, onEntryClick }) => {
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const containerRef = useRef(null);
  const currentUser = useSelector((state) => state.auth.user);
  const isVotes = category === 'votes';

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
    if (category === 'markets' && scheduleData?.user) {
      return (
        <div className="space-y-4">
          <MarketDutyBanner scheduleData={scheduleData} currentUser={currentUser} />
          <p className="text-sm text-[var(--text-muted)] py-4 text-center">No market entries for this day.</p>
        </div>
      );
    }
    return <p className="text-sm text-[var(--text-muted)] py-8 text-center">No entries for this day.</p>;
  }

  const showMealSummary = category === 'meals' && totalMealsCount > 0;

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
      {showMealSummary && (
        <div className="flex items-center justify-center gap-1.5 mb-3 py-1.5 px-3 rounded-full bg-[var(--slot-both)]/8">
          <span className="text-xs font-semibold text-[var(--slot-both)]">
            {totalMealsCount} meal{totalMealsCount !== 1 ? 's' : ''} total
          </span>
          <span className="text-xs text-[var(--text-muted)]">
            ({entries.length} member{entries.length !== 1 ? 's' : ''})
          </span>
        </div>
      )}
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ position: 'absolute', top: startIdx * ROW_HEIGHT, left: 0, right: 0 }}>
          {visibleRows.map((entry, i) => {
            const idx = startIdx + i;
            const isUnpopulated = entry.user && typeof entry.user === 'string';
            const name = entry.user?.name || entry.userName || (isUnpopulated ? currentUser?.name : 'Unknown');
            const firstName = name.split(' ')[0];
            const avatarSrc = entry.user?.image || (isUnpopulated ? currentUser?.image : undefined);
            const isFailed = entry.status === 'failed';
            const isCompleted = entry.status === 'completed';

            if (isVotes) {
              const hasPrev = !!entry.previousState?.type;
              const eventTypeLabel = VOTE_EVENT_LABELS[entry.eventType] || VOTE_EVENT_LABELS.vote_unchanged;

              return (
                <div
                  key={entry._id || idx}
                  className="flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-2 rounded-lg transition-all duration-100 hover:bg-[var(--bg-muted)] hover:shadow-xs"
                  style={{ height: ROW_HEIGHT }}
                >
                  <Avatar src={avatarSrc} name={name} size="sm" className="shrink-0" />
                  <div className="flex-1 min-w-0 flex items-center gap-1.5 sm:gap-2">
                    <span className="text-sm font-semibold text-[var(--text-primary)] truncate">
                      {firstName}
                    </span>
                    <span className={cn(
                      'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide shrink-0',
                      eventTypeLabel.color,
                    )}>
                      {eventTypeLabel.text}
                    </span>
                    {entry.newState?.type && (
                      <span className={cn(
                        'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide shrink-0',
                        VOTE_VALUE_BADGE_COLORS[entry.newState.type] || VOTE_VALUE_BADGE_COLORS.off,
                      )}>
                        {VOTE_TYPE_LABELS[entry.newState.type] || entry.newState.type}
                      </span>
                    )}
                    {hasPrev && (
                      <span className="hidden sm:inline-flex items-center text-[var(--text-muted)] text-sm mx-0.5 md:mx-1">
                        ← {VOTE_TYPE_LABELS[entry.previousState.type] || entry.previousState.type}
                      </span>
                    )}
                    {hasPrev && (
                      <span className="sm:hidden text-[var(--text-muted)] text-xs">
                        ← {VOTE_TYPE_LABELS[entry.previousState.type] || entry.previousState.type}
                      </span>
                    )}
                  </div>
                  {entry.timestamp && (
                    <span className="text-[11px] font-medium text-[var(--text-secondary)] tabular-nums shrink-0">
                      {formatInIST(entry.timestamp, 'h:mm a')}
                    </span>
                  )}
                </div>
              );
            }

            const isOwnEntry = onEntryClick && (
              (typeof entry.user === 'object' && entry.user?._id === currentUser?._id) ||
              (typeof entry.user === 'string' && entry.user === currentUser?._id)
            );

            return (
              <div
                key={entry._id || idx}
                onClick={category === 'payments' && onPaymentEdit ? () => onPaymentEdit(entry) : isOwnEntry ? () => onEntryClick(entry) : undefined}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-100',
                  'hover:bg-[var(--bg-muted)] hover:shadow-xs',
                  (category === 'payments' && onPaymentEdit || isOwnEntry) && 'cursor-pointer',
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
                  {category === 'meals' && entry.guestCount > 0 && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--warning-bg)] text-[var(--warning-text)] border border-[var(--warning-border)] shrink-0">
                      +{entry.guestCount} guest{entry.guestCount !== 1 ? 's' : ''}
                    </span>
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

const MarketDutyBanner = ({ scheduleData, currentUser }) => {
  const dispatch = useDispatch();
  const [removing, setRemoving] = useState(false);

  if (!scheduleData?.user) return null;

  const userName = scheduleData.user.name || 'Member';
  const firstName = userName.split(' ')[0];
  const isOwnDuty = currentUser?._id === scheduleData?.user?._id;

  const handleRemove = async () => {
    if (!scheduleData?._id || removing) return;
    setRemoving(true);
    try {
      await dispatch(removeMarketScheduledDate(scheduleData._id)).unwrap();
      toast.success('Market duty removed');
    } catch (err) {
      toast.error(err || 'Failed to remove market duty');
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className={cn(
      'flex items-center gap-3 px-3 py-2.5 rounded-lg border',
      isOwnDuty
        ? 'bg-[var(--duty-own-bg)] border-[var(--duty-own-border)]'
        : 'bg-[var(--duty-other-bg)] border-[var(--duty-other-border)]',
    )}>
      <Avatar
        src={scheduleData.user.image}
        name={userName}
        size="sm"
        className={cn(
          'shrink-0 ring-2',
          isOwnDuty ? 'ring-[var(--duty-own-border)]' : 'ring-[var(--duty-other-border)]',
        )}
      />
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <Calendar className={cn(
          'w-4 h-4 shrink-0',
          isOwnDuty ? 'text-[var(--duty-own)]' : 'text-[var(--duty-other)]',
        )} />
        <span className={cn(
          'text-sm font-semibold truncate',
          isOwnDuty ? 'text-[var(--duty-own-text)]' : 'text-[var(--duty-other-text)]',
        )}>
          {isOwnDuty ? `You are on market duty today` : `${firstName} is on market duty today`}
        </span>
      </div>
      {isOwnDuty && (
        <button
          onClick={handleRemove}
          disabled={removing}
          aria-label="Remove your market duty"
          className={cn(
            'p-1.5 rounded-lg transition-colors shrink-0',
            'text-[var(--danger)] hover:bg-[var(--danger-bg)]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            removing && 'opacity-50 cursor-not-allowed',
          )}
        >
          {removing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Trash2 className="w-4 h-4" />
          )}
        </button>
      )}
    </div>
  );
};

MarketDutyBanner.displayName = 'MarketDutyBanner';
