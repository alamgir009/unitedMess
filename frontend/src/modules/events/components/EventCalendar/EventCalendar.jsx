import { useState, useCallback, useEffect, useRef, useMemo, lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { addMonths, subMonths, format, startOfMonth, endOfMonth } from 'date-fns';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import CalendarHeader from './CalendarHeader';
import CalendarGrid from './CalendarGrid';
import DayDetailContent from './DayDetailContent';
import DayDetailModal from './DayDetailModal';
import DayDetailSheet from './DayDetailSheet';
import SegmentedControl from '../SegmentedControl';

import { useMediaQuery } from '@/shared/hooks/useMediaQuery';
import { formatInIST } from '@/core/utils/helpers/date.helper';
import eventService from '../../services/event.service';
import { setCurrentMonth, setLoading } from '../../store/events.slice';
import { createMeal, bulkCreateMeals, updateMeal, deleteMeal, adminCreateMeal } from '../../../meal/store/meal.slice';
import { createMarket, updateMarket, deleteMarket, adminCreateMarket } from '../../../market/store/market.slice';

const CalendarDayEdit = lazy(() => import('./CalendarDayEdit'));

const CATEGORY_ENDPOINTS = {
  meals: eventService.getMeals,
  markets: eventService.getMarkets,
  payments: eventService.getPayments,

};

// Backend response shape varies by category:
// meals:   { success, message, data: { meals, pagination } }
// markets: { success, message, data: { markets, pagination } }
// payments:{ success, message, data: { results, totalResults, totalPages, page, limit } }
const DATA_KEY = {
  meals: 'meals',
  markets: 'markets',
  payments: 'results',

};

const extractItems = (envelope, category) => {
  if (!envelope) return [];
  const inner = envelope.data;
  if (!inner) return [];
  // Backend may return array directly under `data` when limit=all bypasses pagination
  if (Array.isArray(inner)) return inner;
  const key = DATA_KEY[category];
  if (!key) return [];
  const items = inner[key];
  return Array.isArray(items) ? items : [];
};

// Day-bucketing is server-authoritative via IST.
// Parse date in IST to determine which day an entry belongs to.
const getISTDateKey = (dateStr) => {
  try {
    const ms = Date.parse(
      new Date(dateStr).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }),
    );
    return format(new Date(ms), 'yyyy-MM-dd');
  } catch {
    return 'unknown';
  }
};

const groupByDateIST = (items) => {
  const map = {};
  if (!items || !Array.isArray(items)) return map;
  for (const item of items) {
    const dateField = item.date || item.createdAt || item.updatedAt || item.paymentDate;
    const d = dateField ? getISTDateKey(dateField) : 'unknown';
    if (!map[d]) map[d] = [];
    map[d].push(item);
  }
  return map;
};

const getDaysInMonth = (date) => {
  const start = startOfMonth(date);
  const end = endOfMonth(date);
  const days = [];
  let d = new Date(start);
  while (d <= end) {
    days.push(format(d, 'yyyy-MM-dd'));
    d = new Date(d.getTime() + 86400000);
  }
  return days;
};

const EventCalendar = () => {
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const category = searchParams.get('view') || 'meals';
  const currentMonth = useSelector((state) => state.events.currentMonth);
  const currentMonthDate = useMemo(() => new Date(currentMonth), [currentMonth]);

  const [dataMap, setDataMap] = useState({});
  const [loadingMap, setLoadingMap] = useState({});
  const [errorMap, setErrorMap] = useState({});
  const [detailDate, setDetailDate] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);

  // Derive entries from live dataMap so optimistic updates reflect immediately
  const currentDateEntries = useMemo(() => {
    if (!detailDate) return [];
    const key = format(new Date(detailDate), 'yyyy-MM-dd');
    return dataMap[key] || [];
  }, [detailDate, dataMap]);

  const user = useSelector((state) => state.auth.user);
  const isAdmin = user?.role === 'admin';
  const [selectedMemberId, setSelectedMemberId] = useState(null);

  const abortRef = useRef(null);
  const isMobile = useMediaQuery('(max-width: 639px)');

  const fetchData = useCallback(async (signal) => {
    const monthStart = format(startOfMonth(currentMonthDate), 'yyyy-MM-dd');
    const monthEnd = format(endOfMonth(currentMonthDate), 'yyyy-MM-dd');

    dispatch(setLoading(true));
    setLoadingMap((prev) => {
      const next = { ...prev };
      for (const d of getDaysInMonth(currentMonthDate)) {
        next[d] = true;
      }
      return next;
    });

    try {
      const fetcher = CATEGORY_ENDPOINTS[category];
      if (!fetcher) return;

      const envelope = await fetcher({ signal, startDate: monthStart, endDate: monthEnd });
      const allItems = extractItems(envelope, category);

      const grouped = groupByDateIST(allItems);

      setDataMap(grouped);
      setErrorMap({});
      setLoadingMap({});
    } catch (err) {
      if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED' || err.name === 'AbortError') return;
      const days = getDaysInMonth(currentMonthDate);
      const errors = {};
      for (const d of days) errors[d] = true;
      setErrorMap(errors);
      setLoadingMap({});
    } finally {
      dispatch(setLoading(false));
    }
  }, [category, currentMonthDate, dispatch]);

  useEffect(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    fetchData(controller.signal);
    return () => controller.abort();
  }, [fetchData]);

  // Stale cache reconciliation: refetch on tab focus (visibilitychange)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      fetchData(controller.signal);
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [fetchData]);

  const handlePrevMonth = useCallback(() => {
    dispatch(setCurrentMonth(subMonths(currentMonthDate, 1).toISOString()));
  }, [dispatch, currentMonthDate]);

  const handleNextMonth = useCallback(() => {
    dispatch(setCurrentMonth(addMonths(currentMonthDate, 1).toISOString()));
  }, [dispatch, currentMonthDate]);

  const handleToday = useCallback(() => {
    dispatch(setCurrentMonth(new Date().toISOString()));
  }, [dispatch]);

  const handleCellClick = useCallback((date) => {
    setDetailDate(date);
    setIsEditMode(false);
  }, []);

  const handleRetry = useCallback(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    fetchData(controller.signal);
  }, [fetchData]);

  const handleCloseDetail = useCallback(() => {
    setDetailDate(null);
    setIsEditMode(false);
  }, []);

  const handleEditToggle = useCallback(() => {
    setIsEditMode((prev) => !prev);
  }, []);

  // Snapshot dataMap before mutation for rollback
  const snapshotRef = useRef(null);

  const handleSaveEntry = useCallback(async (entryData) => {
    // ── Guard: admin entry for others must have explicit target members ──
    if (isAdmin && !entryData.startDate && 'userIds' in entryData && (!entryData.userIds || entryData.userIds.length === 0)) {
      toast.error('Select at least one member');
      return;
    }

    // ── Bulk range mode (meals only) ──
    if (entryData.startDate && entryData.endDate) {
      try {
        const res = await dispatch(bulkCreateMeals(entryData)).unwrap();
        const result = res?.data || res;
        const inserted = result?.inserted || 0;
        const updated = result?.updated || 0;
        const skipped = result?.skipped || 0;
        const parts = [];
        if (inserted > 0) parts.push(`${inserted} added`);
        if (updated > 0) parts.push(`${updated} updated`);
        if (skipped > 0) parts.push(`${skipped} unchanged`);
        toast.success(parts.length ? parts.join(' · ') : 'Meals saved');
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;
        fetchData(controller.signal);
      } catch (err) {
        const msg = err?.response?.data?.message || err?.message || 'Failed to save meals';
        toast.error(msg);
      }
      return;
    }

    if (!detailDate) return;
    const dateKey = format(new Date(detailDate), 'yyyy-MM-dd');

    snapshotRef.current = { ...dataMap };

    // Optimistic insert
    const tempId = `temp_${Date.now()}`;
    const optimisticEntry = { ...entryData, _id: tempId, __optimistic: true };
    setDataMap((prevMap) => ({
      ...prevMap,
      [dateKey]: [...(prevMap[dateKey] || []), optimisticEntry],
    }));

    try {
      const isCreatingForOthers = isAdmin && entryData.userIds?.length > 0;

      if (isCreatingForOthers) {
        const selectedIds = [...entryData.userIds];
        delete entryData.userIds;

        if (category === 'meals') {
          const createdEntries = [];
          for (const userId of selectedIds) {
            const res = await dispatch(adminCreateMeal({ userId, mealData: entryData })).unwrap();
            createdEntries.push(res?.data ?? res);
          }
          setDataMap((prevMap) => ({
            ...prevMap,
            [dateKey]: [
              ...createdEntries,
              ...(prevMap[dateKey] || []).filter((e) => e._id !== tempId),
            ],
          }));
          toast.success(`${createdEntries.length} meal(s) added`);
        } else {
          const createdEntries = [];
          for (const userId of selectedIds) {
            const res = await dispatch(adminCreateMarket({ userId, marketData: entryData })).unwrap();
            createdEntries.push(res?.data ?? res);
          }
          setDataMap((prevMap) => ({
            ...prevMap,
            [dateKey]: [
              ...createdEntries,
              ...(prevMap[dateKey] || []).filter((e) => e._id !== tempId),
            ],
          }));
          toast.success(`${createdEntries.length} market entry(ies) added`);
        }
      } else {
        if (category === 'meals') {
          const res = await dispatch(createMeal(entryData)).unwrap();
          const created = res?.data ?? res;
          setDataMap((prevMap) => ({
            ...prevMap,
            [dateKey]: (prevMap[dateKey] || []).map((e) =>
              e._id === tempId ? created : e,
            ),
          }));
          toast.success('Meal added');
        } else {
          const res = await dispatch(createMarket(entryData)).unwrap();
          const created = res?.data ?? res;
          setDataMap((prevMap) => ({
            ...prevMap,
            [dateKey]: (prevMap[dateKey] || []).map((e) =>
              e._id === tempId ? created : e,
            ),
          }));
          toast.success('Market entry added');
        }
      }
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      fetchData(controller.signal);
    } catch (err) {
      if (snapshotRef.current) {
        setDataMap(snapshotRef.current);
      }
      const msg = err?.response?.data?.message || err?.message || 'Failed to save';
      toast.error(msg);
    }
  }, [detailDate, dataMap, category, dispatch, fetchData, isAdmin]);

  const handleUpdateEntry = useCallback(async (entryId, entryData) => {
    if (!detailDate) return;
    const dateKey = format(new Date(detailDate), 'yyyy-MM-dd');

    snapshotRef.current = { ...dataMap };

    // Optimistic update
    setDataMap((prevMap) => ({
      ...prevMap,
      [dateKey]: (prevMap[dateKey] || []).map((e) =>
        e._id === entryId ? { ...e, ...entryData } : e,
      ),
    }));

    try {
      if (category === 'meals') {
        const res = await dispatch(updateMeal({ mealId: entryId, mealData: entryData })).unwrap();
        const updated = res?.data ?? res;
        setDataMap((prevMap) => ({
          ...prevMap,
          [dateKey]: (prevMap[dateKey] || []).map((e) =>
            e._id === entryId ? updated : e,
          ),
        }));
        toast.success('Meal updated');
      } else {
        const res = await dispatch(updateMarket({ marketId: entryId, marketData: entryData })).unwrap();
        const updated = res?.data ?? res;
        setDataMap((prevMap) => ({
          ...prevMap,
          [dateKey]: (prevMap[dateKey] || []).map((e) =>
            e._id === entryId ? updated : e,
          ),
        }));
        toast.success('Market entry updated');
      }
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      fetchData(controller.signal);
    } catch (err) {
      if (snapshotRef.current) setDataMap(snapshotRef.current);
      const msg = err?.response?.data?.message || err?.message || 'Failed to update';
      toast.error(msg);
    }
  }, [detailDate, dataMap, category, dispatch, fetchData]);

  const handleDeleteEntry = useCallback(async (entryId) => {
    if (!detailDate) return;
    const dateKey = format(new Date(detailDate), 'yyyy-MM-dd');

    snapshotRef.current = { ...dataMap };

    // Optimistic remove
    setDataMap((prevMap) => ({
      ...prevMap,
      [dateKey]: (prevMap[dateKey] || []).filter((e) => e._id !== entryId),
    }));

    try {
      if (category === 'meals') {
        await dispatch(deleteMeal(entryId)).unwrap();
        toast.success('Meal deleted');
      } else {
        await dispatch(deleteMarket(entryId)).unwrap();
        toast.success('Market entry deleted');
      }
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      fetchData(controller.signal);
    } catch (err) {
      if (snapshotRef.current) setDataMap(snapshotRef.current);
      const msg = err?.response?.data?.message || err?.message || 'Failed to delete';
      toast.error(msg);
    }
  }, [detailDate, dataMap, category, dispatch, fetchData]);

  const handleMemberFilter = useCallback((id) => {
    setSelectedMemberId(id);
  }, []);

  const filteredDataMap = useMemo(() => {
    if (!selectedMemberId) return dataMap;
    const result = {};
    for (const [dateKey, entries] of Object.entries(dataMap)) {
      const matching = entries.filter((entry) => {
        const userId = typeof entry.user === 'object'
          ? entry.user?._id
          : entry.user;
        return userId === selectedMemberId;
      });
      if (matching.length > 0) {
        result[dateKey] = matching;
      }
    }
    return result;
  }, [dataMap, selectedMemberId]);

  return (
    <div className="space-y-6">

      {/* Page header */}
      <header className="animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-h1">Events Calendar</h2>
            <p className="text-sm text-muted-foreground">
              Track daily events, meals, markets, and payments at a glance across months.
            </p>
          </div>
          <SegmentedControl />
        </div>
      </header>

      {/* Calendar section */}
      <div className="relative">
          <CalendarHeader
            currentMonth={currentMonthDate}
            onPrevMonth={handlePrevMonth}
            onNextMonth={handleNextMonth}
            onToday={handleToday}
            isAdmin={isAdmin}
            selectedMemberId={selectedMemberId}
            onMemberFilter={handleMemberFilter}
          />
          <CalendarGrid
            currentMonth={currentMonthDate}
            dataMap={filteredDataMap}
            category={category}
            loadingMap={loadingMap}
            errorMap={errorMap}
            onCellClick={handleCellClick}
            onRetry={handleRetry}
          />
      </div>

      {detailDate && (
        isMobile ? (
          <DayDetailSheet
            isOpen={!!detailDate}
            onClose={handleCloseDetail}
            title={`${formatInIST(detailDate, 'MMM d, yyyy')}${isEditMode ? ' — Edit' : ''} — ${category}`}
            isEditMode={isEditMode}
            onEditToggle={handleEditToggle}
          >
            {isEditMode ? (
              <Suspense fallback={<div className="flex items-center justify-center py-8"><div className="w-6 h-6 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin" /></div>}>
                <CalendarDayEdit
                  entries={currentDateEntries}
                  category={category}
                  date={detailDate}
                  isAdmin={isAdmin}
                  currentUser={user}
                  onSave={handleSaveEntry}
                  onUpdate={handleUpdateEntry}
                  onDelete={handleDeleteEntry}
                  onDone={() => setIsEditMode(false)}
                />
              </Suspense>
            ) : (
              <DayDetailContent entries={currentDateEntries} category={category} />
            )}
          </DayDetailSheet>
        ) : (
          <DayDetailModal
            isOpen={!!detailDate}
            onClose={handleCloseDetail}
            title={`${formatInIST(detailDate, 'MMM d, yyyy')}${isEditMode ? ' — Edit' : ''} — ${category}`}
            isEditMode={isEditMode}
            onEditToggle={handleEditToggle}
          >
            {isEditMode ? (
              <Suspense fallback={<div className="flex items-center justify-center py-8"><div className="w-6 h-6 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin" /></div>}>
                <CalendarDayEdit
                  entries={currentDateEntries}
                  category={category}
                  date={detailDate}
                  isAdmin={isAdmin}
                  currentUser={user}
                  onSave={handleSaveEntry}
                  onUpdate={handleUpdateEntry}
                  onDelete={handleDeleteEntry}
                  onDone={() => setIsEditMode(false)}
                />
              </Suspense>
            ) : (
              <DayDetailContent entries={currentDateEntries} category={category} />
            )}
          </DayDetailModal>
        ))}
    </div>
  );
};

EventCalendar.displayName = 'EventCalendar';
export default EventCalendar;
