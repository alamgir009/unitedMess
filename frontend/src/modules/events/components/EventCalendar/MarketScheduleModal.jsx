import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, Calendar, Loader2, AlertCircle } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isToday, isBefore, addMonths, subMonths } from 'date-fns';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { cn } from '@/core/utils/helpers/string.helper';
import { Avatar } from '@/shared/components/ui';
import { useMediaQuery } from '@/shared/hooks/useMediaQuery';
import {
  fetchMonthSchedule,
  fetchAvailableDates,
  fetchMyScheduledDates,
  selectMarketDates,
  clearMySelectedDates,
} from '../../store/marketSchedule.slice';

const MAX_DATES = 3;

const toUTCDateKey = (date) => {
  const d = new Date(date);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
};

let lockCount = 0;
function lockBodyScroll() {
  if (typeof document === 'undefined') return;
  if (lockCount === 0) document.body.style.overflow = 'hidden';
  lockCount++;
}
function unlockBodyScroll() {
  if (typeof document === 'undefined') return;
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) document.body.style.overflow = '';
}

const MarketScheduleModal = ({ isOpen, onClose, currentMonth }) => {
  const dispatch = useDispatch();
  const isMobile = useMediaQuery('(max-width: 639px)');
  const dialogRef = useRef(null);
  const previousFocusRef = useRef(null);

  const [selectedDates, setSelectedDates] = useState(new Set());
  const [viewMonth, setViewMonth] = useState(currentMonth || new Date());

  const { monthSchedule, availableDates, mySelectedDates, isSelecting, error } = useSelector(
    (state) => state.marketSchedule
  );

  const scheduleKey = `${viewMonth.getFullYear()}-${viewMonth.getMonth() + 1}`;
  const currentSchedule = monthSchedule[scheduleKey] || [];
  const currentAvailable = availableDates[scheduleKey] || [];

  useEffect(() => {
    if (!isOpen) {
      previousFocusRef.current?.focus?.();
      unlockBodyScroll();
      setSelectedDates(new Set());
      return;
    }
    setViewMonth(currentMonth || new Date());
    previousFocusRef.current = document.activeElement;
    lockBodyScroll();
    dispatch(clearMySelectedDates());
    document.addEventListener('keydown', handleKeyDown);
    const raf = requestAnimationFrame(() => dialogRef.current?.focus());
    return () => {
      cancelAnimationFrame(raf);
      unlockBodyScroll();
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && viewMonth) {
      const year = viewMonth.getFullYear();
      const month = viewMonth.getMonth() + 1;
      dispatch(fetchMonthSchedule({ year, month }));
      dispatch(fetchAvailableDates({ year, month }));
      dispatch(fetchMyScheduledDates({ year, month }));
    }
  }, [isOpen, viewMonth, dispatch]);

  useEffect(() => {
    if (mySelectedDates.length > 0) {
      const now = new Date();
      const myDates = new Set(
        mySelectedDates
          .map((d) => toUTCDateKey(d.date))
          .filter((dateKey) => {
            const d = new Date(dateKey + 'T12:00:00');
            return !isBefore(d, now) || isToday(d);
          })
      );
      setSelectedDates(myDates);
    }
  }, [mySelectedDates]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') onClose?.();
  }, [onClose]);

  const days = useMemo(() => {
    const monthStart = startOfMonth(viewMonth);
    const monthEnd = endOfMonth(viewMonth);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [viewMonth]);

  const today = new Date();

  const unavailableDatesMap = useMemo(() => {
    const map = {};
    for (const item of currentAvailable) {
      if (!item.available && item.date) {
        map[item.date] = item;
      }
    }
    return map;
  }, [currentAvailable]);

  const takenDatesMap = useMemo(() => {
    const map = {};
    for (const item of currentSchedule) {
      if (!item.user) continue;
      const dateKey = toUTCDateKey(item.date);
      map[dateKey] = item;
    }
    return map;
  }, [currentSchedule]);

  const handleDateClick = useCallback((date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    if (isBefore(date, today) && !isToday(date)) return;
    if (unavailableDatesMap[dateKey] && !selectedDates.has(dateKey)) return;

    const isRemoving = selectedDates.has(dateKey);

    if (!isRemoving && selectedDates.size >= MAX_DATES) {
      toast.error(`Maximum ${MAX_DATES} dates allowed`);
      return;
    }

    setSelectedDates((prev) => {
      const next = new Set(prev);
      if (isRemoving) {
        next.delete(dateKey);
      } else {
        next.add(dateKey);
      }
      return next;
    });
  }, [today, unavailableDatesMap, selectedDates]);

  const canGoPrev = useMemo(() => {
    const now = new Date();
    return viewMonth.getFullYear() > now.getFullYear() ||
           (viewMonth.getFullYear() === now.getFullYear() && viewMonth.getMonth() > now.getMonth());
  }, [viewMonth]);

  const handleConfirm = useCallback(async () => {
    if (selectedDates.size === 0) {
      toast.error('Please select at least one date');
      return;
    }

    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth() + 1;
    const now = new Date();
    const dates = Array.from(selectedDates).filter((dateKey) => {
      const d = new Date(dateKey + 'T12:00:00');
      return !isBefore(d, now) || isToday(d);
    });

    if (dates.length === 0) {
      toast.error('Selected dates are no longer valid');
      return;
    }

    try {
      await dispatch(selectMarketDates({ dates, year, month })).unwrap();
      toast.success(`${dates.length} market date${dates.length !== 1 ? 's' : ''} selected successfully`);
      dispatch(fetchMonthSchedule({ year, month }));
      dispatch(fetchAvailableDates({ year, month }));
      dispatch(fetchMyScheduledDates({ year, month }));
      onClose?.();
    } catch (err) {
      toast.error(err || 'Failed to select dates');
    }
  }, [selectedDates, viewMonth, dispatch, onClose]);

  const handlePrevMonth = useCallback(() => {
    setViewMonth((prev) => subMonths(prev, 1));
    setSelectedDates(new Set());
  }, []);

  const handleNextMonth = useCallback(() => {
    setViewMonth((prev) => addMonths(prev, 1));
    setSelectedDates(new Set());
  }, []);

  const getDateStatus = useCallback((date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    const inMonth = isSameMonth(date, viewMonth);
    const isPast = isBefore(date, today) && !isToday(date);
    const isSelected = selectedDates.has(dateKey);
    const unavailableItem = unavailableDatesMap[dateKey];
    const isTakenByOther = unavailableItem && !isSelected;
    const takenItem = takenDatesMap[dateKey];
    const isMyDate = mySelectedDates.some((d) => toUTCDateKey(d.date) === dateKey);

    return { dateKey, inMonth, isPast, isSelected, isTakenByOther, takenItem, isMyDate };
  }, [viewMonth, today, selectedDates, unavailableDatesMap, takenDatesMap, mySelectedDates]);

  if (typeof document === 'undefined') return null;

  const modalContent = (
    <div
      ref={dialogRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label="Schedule Market Dates"
      className={cn(
        'flex flex-col',
        'bg-[var(--bg-elevated)] border border-[var(--border-default)]',
        'rounded-2xl shadow-xl shadow-black/10 dark:shadow-black/40',
        'focus:outline-none animate-fade-in-up',
        isMobile
          ? 'fixed inset-x-0 bottom-0 rounded-t-2xl max-h-[90vh]'
          : 'w-full max-w-lg max-h-[85vh]',
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-[var(--border-default)] shrink-0">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[var(--accent-primary)]" />
          <h2 className="text-base font-semibold text-[var(--text-primary)]">Schedule Market Dates</h2>
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto overscroll-contain custom-scrollbar p-4">
        {/* Selection Counter */}
        <div className={cn(
          'flex items-center justify-center gap-2 py-2 px-3 rounded-lg mb-4 border transition-colors',
          selectedDates.size > 0
            ? 'bg-[var(--accent-primary)]/10 border-[var(--accent-primary)]/30 text-[var(--accent-primary)]'
            : 'bg-[var(--bg-muted)]/30 border-[var(--border-default)] text-[var(--text-secondary)]',
        )}>
          <span className="text-sm font-bold">{selectedDates.size}/{MAX_DATES}</span>
          <span className="text-xs">
            {selectedDates.size === 0 ? 'Select up to 3 dates' : 'dates selected'}
          </span>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={handlePrevMonth}
            disabled={!canGoPrev}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-sm font-semibold text-[var(--text-primary)]">
            {format(viewMonth, 'MMMM yyyy')}
          </span>
          <button
            onClick={handleNextMonth}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Day Headers */}
        <div className="grid grid-cols-7 mb-1">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
            <div key={i} className="text-center py-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-0.5">
          {days.map((day) => {
            const { dateKey, inMonth, isPast, isSelected, isTakenByOther, takenItem } = getDateStatus(day);
            const isCurrentDay = isToday(day);
            const canClick = inMonth && !isPast && !isTakenByOther;

            return (
              <button
                key={dateKey}
                onClick={() => canClick && handleDateClick(day)}
                disabled={!canClick}
                aria-label={`${format(day, 'MMM d')}${isSelected ? ', selected' : ''}${isTakenByOther ? ', taken' : ''}`}
                className={cn(
                  'relative flex flex-col items-center justify-center p-1 sm:p-1.5 rounded-lg transition-all duration-100',
                  'min-h-[40px] sm:min-h-[48px]',
                  !inMonth && 'opacity-30',
                  inMonth && isPast && 'opacity-50 cursor-not-allowed',
                  canClick && !isSelected && 'hover:bg-[var(--accent-primary)]/10 cursor-pointer',
                  isSelected && 'bg-[var(--accent-primary)]/15 border-2 border-[var(--accent-primary)] shadow-sm',
                  isTakenByOther && !isSelected && 'bg-[var(--danger-bg)]/20 border border-[var(--danger)]/20',
                  isCurrentDay && !isSelected && 'ring-1 ring-[var(--accent-primary)]/40',
                )}
              >
                <span className={cn(
                  'text-xs sm:text-sm font-semibold',
                  isSelected ? 'text-[var(--accent-primary)]' : 'text-[var(--text-primary)]',
                  isTakenByOther && !isSelected && 'text-[var(--danger)]',
                )}>
                  {format(day, 'd')}
                </span>
                {isTakenByOther && takenItem?.user && (
                  <div className="mt-0.5">
                    <Avatar
                      src={takenItem.user.image}
                      name={takenItem.user.name}
                      size="xs"
                      className="w-4 h-4 sm:w-5 sm:h-5"
                    />
                  </div>
                )}
                {isSelected && (
                  <div className="absolute top-0.5 right-0.5">
                    <Check className="w-3 h-3 text-[var(--accent-primary)]" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 mt-4 pt-3 border-t border-[var(--border-default)]">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-[var(--accent-primary)]/15 border-2 border-[var(--accent-primary)]" />
            <span className="text-[10px] text-[var(--text-muted)]">Your selection</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-[var(--danger-bg)]/20 border border-[var(--danger)]/20" />
            <span className="text-[10px] text-[var(--text-muted)]">Taken by others</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-[var(--bg-muted)]" />
            <span className="text-[10px] text-[var(--text-muted)]">Available</span>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 mt-3 p-2 rounded-lg bg-[var(--danger-bg)]/20 border border-[var(--danger)]/20">
            <AlertCircle className="w-4 h-4 text-[var(--danger)] shrink-0" />
            <span className="text-xs text-[var(--danger)]">{error}</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex gap-2 px-4 py-3 border-t border-[var(--border-default)] shrink-0">
        <button
          onClick={onClose}
          disabled={isSelecting}
          className="flex-1 py-2 rounded-lg text-xs font-semibold border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/30 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={handleConfirm}
          disabled={isSelecting || selectedDates.size === 0}
          className={cn(
            'flex-[2] py-2 rounded-lg text-xs font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50',
            isSelecting || selectedDates.size === 0
              ? 'bg-[var(--bg-muted)] text-[var(--text-muted)] border border-[var(--border-default)] cursor-not-allowed'
              : 'bg-[var(--btn-success-from)] text-[var(--btn-success-label)] hover:opacity-90 active:opacity-80 shadow-sm',
          )}
        >
          {isSelecting ? (
            <span className="flex items-center justify-center gap-1.5">
              <Loader2 className="w-3 h-3 animate-spin" />
              Saving...
            </span>
          ) : (
            `Confirm ${selectedDates.size}/${MAX_DATES} dates`
          )}
        </button>
      </div>
    </div>
  );

  if (isMobile) {
    return createPortal(
      isOpen ? (
        <div className={cn('fixed inset-0 z-modal', 'bg-[var(--bg-overlay)]')}>
          <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />
          <div className="fixed inset-x-0 bottom-0 z-10 flex items-end justify-center" onClick={(e) => e.stopPropagation()}>
            {modalContent}
          </div>
        </div>
      ) : null,
      document.body
    );
  }

  return createPortal(
    isOpen ? (
      <div className={cn('fixed inset-0 z-modal', 'bg-[var(--bg-overlay)]')}>
        <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />
        <div className="fixed inset-0 z-10 flex items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
          {modalContent}
        </div>
      </div>
    ) : null,
    document.body
  );
};

MarketScheduleModal.displayName = 'MarketScheduleModal';
export default MarketScheduleModal;
