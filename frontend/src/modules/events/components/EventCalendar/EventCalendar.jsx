import { useState, useCallback, useEffect, useRef, useMemo, lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { addMonths, subMonths, format, startOfMonth, endOfMonth } from 'date-fns';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import CalendarHeader from './CalendarHeader';
import CalendarGrid from './CalendarGrid';
import MealLegend from './MealLegend';
import DayDetailContent from './DayDetailContent';
import DayDetailModal from './DayDetailModal';
import DayDetailSheet from './DayDetailSheet';
import MarketScheduleModal from './MarketScheduleModal';
import SegmentedControl from '../SegmentedControl';

import { useMediaQuery } from '@/shared/hooks/useMediaQuery';
import { formatInIST } from '@/core/utils/helpers/date.helper';
import eventService from '../../services/event.service';
import { setCurrentMonth, setLoading } from '../../store/events.slice';
import { fetchMonthSchedule, fetchAvailableDates } from '../../store/marketSchedule.slice';
import { createMeal, bulkCreateMeals, updateMeal, deleteMeal, bulkDeleteMeals } from '../../../meal/store/meal.slice';
import { createMarket, updateMarket, deleteMarket, bulkCreateMarkets } from '../../../market/store/market.slice';
import { createPayment, createBulkPayments, updatePayment, deletePayment } from '../../../payment/store/payment.slice';

const CalendarDayEdit = lazy(() => import('./CalendarDayEdit'));
const PaymentModal = lazy(() => import('../../../payment/components/PaymentModal/PaymentModal'));
const PaymentForm = lazy(() => import('../../../payment/components/PaymentForm/PaymentForm'));

const CATEGORY_ENDPOINTS = {
  meals: eventService.getMeals,
  markets: eventService.getMarkets,
  payments: eventService.getPayments,
  votes: eventService.getAuditLogs,
};

const DATA_KEY = {
  meals: 'meals',
  markets: 'markets',
  payments: 'results',
  votes: 'logs',
};

const extractItems = (envelope, category) => {
  if (!envelope) return [];
  const inner = envelope.data;
  if (!inner) return [];
  if (Array.isArray(inner)) return inner;
  const key = DATA_KEY[category];
  if (!key) return [];
  const items = inner[key];
  return Array.isArray(items) ? items : [];
};

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
    const dateField = item.date || item.pollDate || item.createdAt || item.updatedAt || item.paymentDate;
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
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [selectedEntryIds, setSelectedEntryIds] = useState(new Set());
  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [isPaymentSubmitting, setIsPaymentSubmitting] = useState(false);

  const { monthSchedule } = useSelector((state) => state.marketSchedule);

  const currentDateEntries = useMemo(() => {
    if (!detailDate) return [];
    const key = format(new Date(detailDate), 'yyyy-MM-dd');
    return dataMap[key] || [];
  }, [detailDate, dataMap]);

  const user = useSelector((state) => state.auth.user);
  const isAdmin = user?.role === 'admin';
  const [selectedMemberId, setSelectedMemberId] = useState(null);

  const showMealCount = category === 'meals' && (isAdmin ? !!selectedMemberId : true);

  const scheduleKey = `${currentMonthDate.getFullYear()}-${currentMonthDate.getMonth() + 1}`;
  const scheduleMap = useMemo(() => {
    const map = {};
    const scheduleData = monthSchedule[scheduleKey] || [];
    for (const item of scheduleData) {
      if (!item?.user) continue;
      const dateKey = format(new Date(item.date), 'yyyy-MM-dd');
      map[dateKey] = item;
    }
    return map;
  }, [monthSchedule, scheduleKey]);

  const getScheduleForDate = useCallback((date) => {
    const dateKey = format(new Date(date), 'yyyy-MM-dd');
    return scheduleMap[dateKey] || null;
  }, [scheduleMap]);

  const totalMealsForDate = useMemo(() => {
    if (category !== 'meals' || currentDateEntries.length === 0) return 0;
    return currentDateEntries.reduce((sum, e) => {
      const t = e.type;
      const baseMeals = t === 'both' ? 2 : t === 'day' || t === 'night' ? 1 : 0;
      return sum + baseMeals + (e.guestCount || 0);
    }, 0);
  }, [currentDateEntries, category]);

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

  useEffect(() => {
    if (category === 'markets') {
      const year = currentMonthDate.getFullYear();
      const month = currentMonthDate.getMonth() + 1;
      dispatch(fetchMonthSchedule({ year, month }));
    }
  }, [category, currentMonthDate, dispatch]);

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
    setIsAdding(false);
    setEditingId(null);
    setConfirmDeleteId(null);
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
    setIsAdding(false);
    setEditingId(null);
    setConfirmDeleteId(null);
  }, []);

  const handleScheduleClick = useCallback(() => {
    setDetailDate(null);
    setIsEditMode(false);
    setIsAdding(false);
    setEditingId(null);
    setConfirmDeleteId(null);
    setIsScheduleModalOpen(true);
  }, []);

  const handleCloseScheduleModal = useCallback(() => {
    setIsScheduleModalOpen(false);
    if (category === 'markets') {
      const year = currentMonthDate.getFullYear();
      const month = currentMonthDate.getMonth() + 1;
      dispatch(fetchMonthSchedule({ year, month }));
      dispatch(fetchAvailableDates({ year, month }));
    }
  }, [category, currentMonthDate, dispatch]);

  const handleEditToggle = useCallback(() => {
    setIsEditMode((prev) => {
      if (!prev) {
        setEditingId(null);
        setConfirmDeleteId(null);
        setIsAdding(currentDateEntries.length === 0);
      } else {
        setIsAdding(false);
      }
      return !prev;
    });
  }, [currentDateEntries.length]);

  const handleAddMarket = useCallback(() => {
    setIsEditMode(true);
    setIsAdding(true);
    setEditingId(null);
    setConfirmDeleteId(null);
  }, []);

  const handleMealAdd = useCallback(() => {
    setIsEditMode(true);
    setIsAdding(true);
    setEditingId(null);
    setConfirmDeleteId(null);
  }, []);

  const snapshotRef = useRef(null);

  const handleSaveEntry = useCallback(async (entryData) => {
    if (isAdmin && !entryData.startDate && 'userIds' in entryData && (!entryData.userIds || entryData.userIds.length === 0)) {
      toast.error('Select at least one member');
      return;
    }

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
          const res = await dispatch(bulkCreateMeals({
            startDate: dateKey,
            endDate: dateKey,
            type: entryData.type,
            userIds: selectedIds,
            isGuestMeal: entryData.isGuestMeal || false,
            guestCount: entryData.guestCount || 0,
            remarks: entryData.remarks || '',
          })).unwrap();
          const result = res?.data || res;
          const inserted = result?.inserted || 0;
          const skipped = result?.skipped || 0;
          const parts = [];
          if (inserted > 0) parts.push(`${inserted} added`);
          if (skipped > 0) parts.push(`${skipped} unchanged`);
          toast.success(parts.length ? parts.join(' · ') : 'Meals saved');
        } else {
          const res = await dispatch(bulkCreateMarkets({
            userIds: selectedIds,
            date: dateKey,
            amount: entryData.amount,
            items: entryData.items,
            description: entryData.description || '',
          })).unwrap();
          const inserted = res?.inserted || 0;
          const skipped = res?.skipped || 0;
          const parts = [];
          if (inserted > 0) parts.push(`${inserted} added`);
          if (skipped > 0) parts.push(`${skipped} unchanged`);
          toast.success(parts.length ? parts.join(' · ') : 'Market entries saved');
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

  // ── Payment CRUD ──────────────────────────────────────────────
  const handlePaymentAdd = useCallback(() => {
    setDetailDate(null);
    setIsEditMode(false);
    setIsAdding(false);
    setEditingId(null);
    setConfirmDeleteId(null);
    setEditingPayment(null);
    setIsPaymentModalOpen(true);
  }, []);

  const handlePaymentEdit = useCallback((payment) => {
    setEditingPayment(payment);
    setIsPaymentModalOpen(true);
  }, []);

  const handlePaymentSave = useCallback(async (formData) => {
    if (!isAdmin) {
      toast.error('Only administrators can manage payment records');
      return;
    }
    setIsPaymentSubmitting(true);
    try {
      if (editingPayment) {
        await dispatch(updatePayment({
          paymentId: editingPayment._id,
          paymentData: formData,
        })).unwrap();
        toast.success('Payment updated');
      } else if (formData.userIds && formData.userIds.length > 1) {
        await dispatch(createBulkPayments(formData)).unwrap();
        toast.success(`Payments recorded for ${formData.userIds.length} members`);
      } else {
        const singleData = { ...formData, userId: formData.userIds?.[0] || '' };
        delete singleData.userIds;
        await dispatch(createPayment(singleData)).unwrap();
        toast.success('Payment recorded');
      }
      setIsPaymentModalOpen(false);
      setEditingPayment(null);
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      fetchData(controller.signal);
    } catch (err) {
      toast.error(typeof err === 'string' ? err : err?.message ?? 'Failed to save payment');
    } finally {
      setIsPaymentSubmitting(false);
    }
  }, [editingPayment, isAdmin, dispatch, fetchData]);

  const handlePaymentClose = useCallback(() => {
    setIsPaymentModalOpen(false);
    setEditingPayment(null);
  }, []);

  const paymentModalTitle = useMemo(() => {
    if (editingPayment) return 'Edit Payment';
    return 'Record Payment';
  }, [editingPayment]);

  // ── Bulk selection ──────────────────────────────────────────────
  const handleToggleSelect = useCallback((entryId) => {
    setSelectedEntryIds((prev) => {
      const next = new Set(prev);
      if (next.has(entryId)) next.delete(entryId);
      else next.add(entryId);
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedEntryIds((prev) => {
      const allIds = currentDateEntries.map((e) => e._id);
      const allSelected = allIds.length > 0 && allIds.every((id) => prev.has(id));
      if (allSelected) return new Set();
      return new Set(allIds);
    });
  }, [currentDateEntries]);

  const handleExitSelectMode = useCallback(() => {
    setSelectedEntryIds(new Set());
  }, []);

  useEffect(() => {
    if (!isEditMode || !detailDate) {
      setSelectedEntryIds(new Set());
    }
  }, [isEditMode, detailDate]);

  const handleBulkDelete = useCallback(async () => {
    if (selectedEntryIds.size === 0 || isBulkSubmitting) return;
    if (!detailDate) return;
    const dateKey = format(new Date(detailDate), 'yyyy-MM-dd');

    setIsBulkSubmitting('deleting');
    snapshotRef.current = { ...dataMap };

    const idsToRemove = new Set(selectedEntryIds);
    setDataMap((prevMap) => ({
      ...prevMap,
      [dateKey]: (prevMap[dateKey] || []).filter((e) => !idsToRemove.has(e._id)),
    }));

    try {
      let results;
      if (category === 'meals') {
        await dispatch(bulkDeleteMeals({ mealIds: [...idsToRemove] })).unwrap();
        results = [{ status: 'fulfilled' }];
      } else {
        results = await Promise.allSettled(
          [...idsToRemove].map((entryId) => dispatch(deleteMarket(entryId)).unwrap()),
        );
      }

      const failed = results.filter((r) => r.status === 'rejected');
      if (failed.length > 0) {
        if (snapshotRef.current) setDataMap(snapshotRef.current);
        failed.forEach((r) => {
          const msg = r.reason?.response?.data?.message || r.reason?.message || 'Delete failed';
          toast.error(msg);
        });
      } else {
        toast.success(`${idsToRemove.size} entr${idsToRemove.size === 1 ? 'y' : 'ies'} deleted`);
      }

      handleExitSelectMode();
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      fetchData(controller.signal);
    } catch (err) {
      if (snapshotRef.current) setDataMap(snapshotRef.current);
      const msg = err?.response?.data?.message || err?.message || 'Failed to delete';
      toast.error(msg);
    } finally {
      setIsBulkSubmitting(false);
    }
  }, [selectedEntryIds, detailDate, dataMap, category, dispatch, fetchData, handleExitSelectMode, isBulkSubmitting]);

  const handleBulkUpdate = useCallback(async (payload) => {
    if (selectedEntryIds.size === 0 || isBulkSubmitting) return;
    if (!detailDate) return;
    const dateKey = format(new Date(detailDate), 'yyyy-MM-dd');

    setIsBulkSubmitting('updating');
    snapshotRef.current = { ...dataMap };

    const idsToUpdate = new Set(selectedEntryIds);
    setDataMap((prevMap) => ({
      ...prevMap,
      [dateKey]: (prevMap[dateKey] || []).map((e) =>
        idsToUpdate.has(e._id) ? { ...e, ...payload } : e,
      ),
    }));

    try {
      const results = await Promise.allSettled(
        [...idsToUpdate].map((entryId) => {
          if (category === 'meals') return dispatch(updateMeal({ mealId: entryId, mealData: payload })).unwrap();
          return dispatch(updateMarket({ marketId: entryId, marketData: payload })).unwrap();
        }),
      );

      const failed = results.filter((r) => r.status === 'rejected');
      if (failed.length > 0) {
        if (snapshotRef.current) setDataMap(snapshotRef.current);
        failed.forEach((r) => {
          const msg = r.reason?.response?.data?.message || r.reason?.message || 'Update failed';
          toast.error(msg);
        });
      } else {
        toast.success(`${idsToUpdate.size} entr${idsToUpdate.size === 1 ? 'y' : 'ies'} updated`);
      }

      handleExitSelectMode();
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      fetchData(controller.signal);
    } catch (err) {
      if (snapshotRef.current) setDataMap(snapshotRef.current);
      const msg = err?.response?.data?.message || err?.message || 'Failed to update';
      toast.error(msg);
    } finally {
      setIsBulkSubmitting(false);
    }
  }, [selectedEntryIds, detailDate, dataMap, category, dispatch, fetchData, handleExitSelectMode, isBulkSubmitting]);

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

  const calendarSuspenseFallback = (
    <div className="flex items-center justify-center py-8">
      <div className="w-6 h-6 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin" />
    </div>
  );

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
          <SegmentedControl isAdmin={isAdmin} />
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
          <div className="rounded-xl border border-[var(--calendar-border)] shadow-sm overflow-hidden bg-[var(--bg-elevated)]">
            <CalendarGrid
              currentMonth={currentMonthDate}
              dataMap={filteredDataMap}
              category={category}
              loadingMap={loadingMap}
              errorMap={errorMap}
              onCellClick={handleCellClick}
              onRetry={handleRetry}
              showMealCount={showMealCount}
              scheduleMap={category === 'markets' ? scheduleMap : {}}
            />
            {category === 'meals' && <MealLegend />}
          </div>
      </div>

      {detailDate && (
        isMobile ? (
          <DayDetailSheet
            isOpen={!!detailDate}
            onClose={handleCloseDetail}
            title={`${formatInIST(detailDate, 'MMM d, yyyy')}${isEditMode ? ' — Edit' : ''} — ${category}`}
            isEditMode={isEditMode}
            onEditToggle={!['votes', 'payments'].includes(category) ? handleEditToggle : undefined}
            category={category}
            onScheduleClick={category === 'markets' ? handleScheduleClick : undefined}
            onPaymentAdd={category === 'payments' && isAdmin ? handlePaymentAdd : undefined}
            onAddMarket={category === 'markets' && isAdmin ? handleAddMarket : undefined}
            onMealAdd={category === 'meals' && isAdmin ? handleMealAdd : undefined}
            isAdding={isAdding}
            editingId={editingId}
            confirmDeleteId={confirmDeleteId}
          >
            {isEditMode ? (
              <Suspense fallback={calendarSuspenseFallback}>
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
                  selectedEntryIds={selectedEntryIds}
                  onToggleSelect={isAdmin ? handleToggleSelect : undefined}
                  onSelectAll={isAdmin ? handleSelectAll : undefined}
                  onBulkDelete={handleBulkDelete}
                  onBulkUpdate={handleBulkUpdate}
                  onExitSelectMode={handleExitSelectMode}
                  isBulkSubmitting={isBulkSubmitting}
                  isEditMode={isEditMode}
                  isAdding={isAdding}
                  setIsAdding={setIsAdding}
                  editingId={editingId}
                  setEditingId={setEditingId}
                  confirmDeleteId={confirmDeleteId}
                  setConfirmDeleteId={setConfirmDeleteId}
                />
              </Suspense>
            ) : (
              <DayDetailContent
                entries={currentDateEntries}
                category={category}
                totalMealsCount={totalMealsForDate}
                scheduleData={getScheduleForDate(detailDate)}
                onPaymentEdit={category === 'payments' && isAdmin ? handlePaymentEdit : undefined}
              />
            )}
          </DayDetailSheet>
        ) : (
          <DayDetailModal
            isOpen={!!detailDate}
            onClose={handleCloseDetail}
            title={`${formatInIST(detailDate, 'MMM d, yyyy')}${isEditMode ? ' — Edit' : ''} — ${category}`}
            isEditMode={isEditMode}
            onEditToggle={!['votes', 'payments'].includes(category) ? handleEditToggle : undefined}
            category={category}
            onScheduleClick={category === 'markets' ? handleScheduleClick : undefined}
            onPaymentAdd={category === 'payments' && isAdmin ? handlePaymentAdd : undefined}
            onAddMarket={category === 'markets' && isAdmin ? handleAddMarket : undefined}
            onMealAdd={category === 'meals' && isAdmin ? handleMealAdd : undefined}
            isAdding={isAdding}
            editingId={editingId}
            confirmDeleteId={confirmDeleteId}
          >
            {isEditMode ? (
              <Suspense fallback={calendarSuspenseFallback}>
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
                  selectedEntryIds={selectedEntryIds}
                  onToggleSelect={isAdmin ? handleToggleSelect : undefined}
                  onSelectAll={isAdmin ? handleSelectAll : undefined}
                  onBulkDelete={handleBulkDelete}
                  onBulkUpdate={handleBulkUpdate}
                  onExitSelectMode={handleExitSelectMode}
                  isBulkSubmitting={isBulkSubmitting}
                  isEditMode={isEditMode}
                  isAdding={isAdding}
                  setIsAdding={setIsAdding}
                  editingId={editingId}
                  setEditingId={setEditingId}
                  confirmDeleteId={confirmDeleteId}
                  setConfirmDeleteId={setConfirmDeleteId}
                />
              </Suspense>
            ) : (
              <DayDetailContent
                entries={currentDateEntries}
                category={category}
                totalMealsCount={totalMealsForDate}
                scheduleData={getScheduleForDate(detailDate)}
                onPaymentEdit={category === 'payments' && isAdmin ? handlePaymentEdit : undefined}
              />
            )}
          </DayDetailModal>
        ))}

      {/* Payment Modal (admin only) */}
      <Suspense fallback={null}>
        <PaymentModal isOpen={isPaymentModalOpen} onClose={handlePaymentClose} title={paymentModalTitle}>
          <PaymentForm
            initialData={editingPayment}
            onSubmit={handlePaymentSave}
            onCancel={handlePaymentClose}
            isAdmin={isAdmin}
            currentUser={user}
            isSubmitting={isPaymentSubmitting}
            readOnly={!isAdmin}
          />
        </PaymentModal>
      </Suspense>

      {/* Market Schedule Modal */}
      <MarketScheduleModal
        isOpen={isScheduleModalOpen}
        onClose={handleCloseScheduleModal}
        currentMonth={currentMonthDate}
      />
    </div>
  );
};

EventCalendar.displayName = 'EventCalendar';
export default EventCalendar;
