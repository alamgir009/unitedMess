import { useState, useEffect, useMemo, useCallback } from 'react';
import { Check, AlertCircle, Trash2 } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isToday, isBefore, addMonths, subMonths } from 'date-fns';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { cn } from '@/core/utils/helpers/string.helper';
import { Modal, Avatar, Button } from '@/shared/components/ui';
import { getISTDateKey } from '@/core/utils/helpers/date.helper';
import {
  fetchMonthSchedule,
  fetchAvailableDates,
  fetchMyScheduledDates,
  selectMarketDates,
  removeMarketScheduledDate,
  clearMySelectedDates,
} from '../../store/marketSchedule.slice';

const MAX_DATES = 3;

const MarketScheduleModal = ({ isOpen, onClose, currentMonth }) => {
  const dispatch = useDispatch();

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
      setSelectedDates(new Set());
      return;
    }
    setViewMonth(currentMonth || new Date());
    dispatch(clearMySelectedDates());
  }, [isOpen, currentMonth, dispatch]);

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
          .map((d) => getISTDateKey(d.date))
          .filter((dateKey) => {
            const d = new Date(dateKey + 'T12:00:00');
            return !isBefore(d, now) || isToday(d);
          })
      );
      setSelectedDates(myDates);
    }
  }, [mySelectedDates]);

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
        const key = getISTDateKey(item.date);
        map[key] = item;
      }
    }
    return map;
  }, [currentAvailable]);

  const takenDatesMap = useMemo(() => {
    const map = {};
    for (const item of currentSchedule) {
      if (!item.user) continue;
      const dateKey = getISTDateKey(item.date);
      map[dateKey] = item;
    }
    return map;
  }, [currentSchedule]);

  const handleDateClick = useCallback((date) => {
    const dateKey = getISTDateKey(date);
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
    const dates = Array.from(selectedDates);

    if (dates.length === 0) {
      toast.error('Selected dates are no longer valid');
      return;
    }

    try {
      const result = await dispatch(selectMarketDates({ dates, year, month })).unwrap();
      if (result && result.inserted === 0 && result.removed === 0) {
        if (result.conflicts > 0) {
          toast.error(`${result.conflicts} date${result.conflicts !== 1 ? 's' : ''} already taken by others`);
        } else {
          toast('No changes — dates already saved', { icon: 'ℹ️' });
        }
      } else if (result && result.conflicts > 0) {
        toast.success(`${result.inserted} date${result.inserted !== 1 ? 's' : ''} saved (${result.conflicts} skipped — taken by others)`);
      } else {
        toast.success(`${dates.length} market date${dates.length !== 1 ? 's' : ''} selected successfully`);
      }
      await dispatch(fetchMyScheduledDates({ year, month })).unwrap();
      onClose?.();
    } catch (err) {
      toast.error(err || 'Failed to select dates');
    }
  }, [selectedDates, viewMonth, dispatch, onClose]);

  const handleRemoveDate = useCallback(async (scheduleId) => {
    try {
      await dispatch(removeMarketScheduledDate(scheduleId)).unwrap();
      toast.success('Date removed');
      const year = viewMonth.getFullYear();
      const month = viewMonth.getMonth() + 1;
      dispatch(fetchMyScheduledDates({ year, month }));
      dispatch(fetchMonthSchedule({ year, month }));
      dispatch(fetchAvailableDates({ year, month }));
    } catch (err) {
      toast.error(err || 'Failed to remove date');
    }
  }, [viewMonth, dispatch]);

  const handlePrevMonth = useCallback(() => {
    setViewMonth((prev) => subMonths(prev, 1));
    setSelectedDates(new Set());
  }, []);

  const handleNextMonth = useCallback(() => {
    setViewMonth((prev) => addMonths(prev, 1));
    setSelectedDates(new Set());
  }, []);

  const getDateStatus = useCallback((date) => {
    const dateKey = getISTDateKey(date);
    const inMonth = isSameMonth(date, viewMonth);
    const isPast = isBefore(date, today) && !isToday(date);
    const isSelected = selectedDates.has(dateKey);
    const unavailableItem = unavailableDatesMap[dateKey];
    const isTakenByOther = unavailableItem && !isSelected;
    const takenItem = takenDatesMap[dateKey];
    const isMyDate = mySelectedDates.some((d) => getISTDateKey(d.date) === dateKey);

    return { dateKey, inMonth, isPast, isSelected, isTakenByOther, takenItem, isMyDate };
  }, [viewMonth, today, selectedDates, unavailableDatesMap, takenDatesMap, mySelectedDates]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={isSelecting ? undefined : onClose}
      title="Schedule Market Dates"
      size="lg"
      mobileSheet
      accentColor="emerald"
      closeOnOverlayClick={!isSelecting}
      footer={
        <div className="flex gap-2.5 w-full">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isSelecting}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="success"
            size="sm"
            onClick={handleConfirm}
            disabled={isSelecting || selectedDates.size === 0}
            isLoading={isSelecting}
            className="flex-[2]"
          >
            Confirm {selectedDates.size}/{MAX_DATES} dates
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className={cn(
          'flex items-center justify-center gap-2 py-2 px-3 rounded-lg border transition-colors',
          selectedDates.size > 0
            ? 'bg-primary/10 border-primary/30 text-primary'
            : 'bg-muted/30 border-border text-muted-foreground',
        )}>
          <span className="text-sm font-bold">{selectedDates.size}/{MAX_DATES}</span>
          <span className="text-xs">
            {selectedDates.size === 0 ? 'Select up to 3 dates' : 'dates selected'}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <button
            onClick={handlePrevMonth}
            disabled={!canGoPrev}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-sm font-semibold text-foreground">
            {format(viewMonth, 'MMMM yyyy')}
          </span>
          <button
            onClick={handleNextMonth}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-7 mb-1">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
            <div key={i} className="text-center py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-0.5">
          {days.map((day) => {
            const { dateKey, inMonth, isPast, isSelected, isTakenByOther, takenItem, isMyDate } = getDateStatus(day);
            const isCurrentDay = isToday(day);
            const canClick = inMonth && !isPast && !isTakenByOther;

            return (
              <button
                key={dateKey}
                onClick={() => canClick && handleDateClick(day)}
                disabled={!canClick}
                aria-label={`${format(day, 'MMM d')}${isSelected ? ', selected' : ''}${isTakenByOther ? ', taken' : ''}${isMyDate ? ', your duty' : ''}`}
                className={cn(
                  'relative aspect-square min-w-0 flex flex-col items-center justify-center p-1 sm:p-1.5 rounded-lg transition-all duration-100',
                  !inMonth && 'opacity-30',
                  inMonth && isPast && 'opacity-50 cursor-not-allowed',
                  canClick && !isSelected && !isMyDate && 'hover:bg-primary/10 cursor-pointer',
                  isSelected && 'bg-primary/15 border-2 border-primary shadow-sm',
                  isMyDate && !isSelected && 'bg-success-bg border border-success-border',
                  isTakenByOther && !isSelected && !isMyDate && 'bg-danger-bg/20 border border-danger/20',
                  isCurrentDay && !isSelected && !isMyDate && 'ring-1 ring-primary/40',
                )}
              >
                <span className={cn(
                  'text-xs sm:text-sm font-semibold',
                  isSelected ? 'text-primary' : isMyDate ? 'text-success-text' : 'text-foreground',
                  isTakenByOther && !isSelected && !isMyDate && 'text-danger',
                )}>
                  {format(day, 'd')}
                </span>
                {isTakenByOther && takenItem?.user && !isMyDate && (
                  <div className="mt-0.5">
                    <Avatar
                      src={takenItem.user.image}
                      name={takenItem.user.name}
                      size="xs"
                      className="w-4 h-4 sm:w-5 sm:h-5"
                    />
                  </div>
                )}
                {isMyDate && !isSelected && (
                  <div className="mt-0.5">
                    <div className="w-2 h-2 rounded-full bg-success" />
                  </div>
                )}
                {isSelected && (
                  <div className="absolute top-0.5 right-0.5">
                    <Check className="w-3 h-3 text-primary" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-border">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-primary/15 border-2 border-primary" />
            <span className="text-[10px] text-muted-foreground">Your selection</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-success-bg border border-success-border" />
            <span className="text-[10px] text-muted-foreground">Your duty</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-danger-bg/20 border border-danger/20" />
            <span className="text-[10px] text-muted-foreground">Taken by others</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-muted" />
            <span className="text-[10px] text-muted-foreground">Available</span>
          </div>
        </div>

        {mySelectedDates.length > 0 && (
          <div className="pt-3 border-t border-border">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Your Scheduled Dates
            </h3>
            <div className="space-y-1.5">
              {mySelectedDates.map((item) => {
                const dateLabel = format(new Date(item.date), 'EEE, MMM d');
                return (
                  <div
                    key={item._id}
                    className="flex items-center justify-between px-3 py-2 rounded-xl bg-success-bg border border-success-border shadow-xs"
                  >
                    <span className="text-sm font-medium text-success-text">
                      {dateLabel}
                    </span>
                    <button
                      onClick={() => handleRemoveDate(item._id)}
                      aria-label={`Remove ${dateLabel}`}
                      className="p-1 rounded-md text-danger hover:bg-danger-bg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-2 rounded-xl bg-danger-bg/20 border border-danger/20">
            <AlertCircle className="w-4 h-4 text-danger shrink-0" />
            <span className="text-xs text-danger">{error}</span>
          </div>
        )}
      </div>
    </Modal>
  );
};

MarketScheduleModal.displayName = 'MarketScheduleModal';
export default MarketScheduleModal;
