import { useState, useCallback, useEffect, useLayoutEffect, useRef, useMemo, useId, lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { addMonths, subMonths, format, startOfMonth, endOfMonth, addDays } from 'date-fns';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import CalendarHeader from './CalendarHeader';
import CalendarGrid from './CalendarGrid';
import MealLegend from './MealLegend';
import DayDetailContent from './DayDetailContent';
import DayDetailDialog, { EntryEditActions } from './DayDetailDialog';
import { canDeleteDayEntry, canEditDayEntry } from './dayEntryPermissions';
import { Button } from '@/shared/components/ui';
import { isMemberEditablePaymentAmount } from '@shared/utils/paymentStatus';
import MarketScheduleModal from './MarketScheduleModal';
import SegmentedControl from '../SegmentedControl';


import { formatInIST, getISTDateKey } from '@/core/utils/helpers/date.helper';
import eventService from '../../services/event.service';
import { setCurrentMonth, setLoading } from '../../store/events.slice';
import { fetchMonthSchedule, fetchAvailableDates } from '../../store/marketSchedule.slice';
import { createMeal, bulkCreateMeals, updateMeal, deleteMeal } from '../../../meal/store/meal.slice';
import { createMarket, updateMarket, deleteMarket, bulkCreateMarkets } from '../../../market/store/market.slice';
import { createPayment, createBulkPayments, updatePayment, deletePayment } from '../../../payment/store/payment.slice';

const CalendarDayEdit = lazy(() => import('./CalendarDayEdit'));
const EntryEditForm = lazy(() => import('./CalendarDayEdit').then(({ EntryEditForm }) => ({ default: EntryEditForm })));
const BulkUpdateForm = lazy(() => import('./CalendarDayEdit').then(({ BulkUpdateForm }) => ({ default: BulkUpdateForm })));
const DaySelectionControls = lazy(() => import('./CalendarDayEdit').then(({ DaySelectionControls }) => ({ default: DaySelectionControls })));
const MealModal = lazy(() => import('../../../meal/components/MealModal/MealModal'));
const MarketModal = lazy(() => import('../../../market/components/MarketModal/MarketModal'));
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

const groupByDateIST = (items) => {
  const map = {};
  if (!items || !Array.isArray(items)) return map;
  for (const item of items) {
    const dateField = item.date || item.pollDate || item.paymentDate || item.createdAt || item.updatedAt;
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
    d = addDays(d, 1);
  }
  return days;
};

const EventCalendar = () => {
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const category = searchParams.get('view') || 'meals';
  const currentMonth = useSelector((state) => state.events.currentMonth);
  const viewScope = `${category}:${currentMonth}`;
  const currentMonthDate = useMemo(() => new Date(currentMonth), [currentMonth]);

  const [dataMap, setDataMap] = useState({});
  const [loadingMap, setLoadingMap] = useState({});
  const [errorMap, setErrorMap] = useState({});
  const [detailDate, setDetailDate] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingEntry, setEditingEntry] = useState(null);
  const editFormId = useId();
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [selectedEntryIds, setSelectedEntryIds] = useState(new Set());
  const [selectionScope, setSelectionScope] = useState(null);
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [confirmSelectionDelete, setConfirmSelectionDelete] = useState(false);
  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [isDaySubmitting, setIsDaySubmitting] = useState(false);
  const [paymentFooter, setPaymentFooter] = useState(null);

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
      const dateKey = getISTDateKey(item.date);
      map[dateKey] = item;
    }
    return map;
  }, [monthSchedule, scheduleKey]);

  const getScheduleForDate = useCallback((date) => {
    const dateKey = getISTDateKey(date);
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

  const filteredCurrentDateEntries = useMemo(() => {
    if (!selectedMemberId) return currentDateEntries;
    return currentDateEntries.filter((entry) => {
      const userId = typeof entry.user === 'object' ? entry.user?._id : entry.user;
      return userId === selectedMemberId;
    });
  }, [currentDateEntries, selectedMemberId]);

  const editableDayEntries = filteredCurrentDateEntries.filter((entry) => canEditDayEntry(entry, category, user));
  const editableMonthEntries = useMemo(() => {
    if (!detailDate) return [];
    const monthKey = format(currentMonthDate, 'yyyy-MM');
    return Object.keys(dataMap).filter((key) => key.startsWith(monthKey)).sort()
      .flatMap((key) => dataMap[key].filter((entry) =>
        (!selectedMemberId || (entry.user?._id || entry.user) === selectedMemberId) &&
        canEditDayEntry(entry, category, user),
      ));
  }, [category, currentMonthDate, dataMap, detailDate, selectedMemberId, user]);
  const selectionEntries = selectionScope === 'month' ? editableMonthEntries : editableDayEntries;
  const selectedEntries = selectionEntries.filter((entry) => selectedEntryIds.has(entry._id));
  const canDeleteSelection = selectedEntries.length > 0 && selectedEntries.every((entry) => canDeleteDayEntry(entry, category, user));

  const userOwnMealEntry = useMemo(() => {
    if (category !== 'meals' || isAdmin || !detailDate) return null;
    const uid = user?._id || user?.id;
    return currentDateEntries.find((e) => {
      const euid = typeof e.user === 'object' ? e.user?._id : e.user;
      return euid === uid;
    }) || null;
  }, [currentDateEntries, category, isAdmin, detailDate, user]);

  const abortRef = useRef(null);
  const saveRequestRef = useRef(null);
  const rowTriggerRef = useRef(null);
  const activeViewRef = useRef(null);

  const resetDayModal = useCallback(() => {
    setDetailDate(null);
    setIsEditMode(false);
    setIsAdding(false);
    setEditingId(null);
    setEditingEntry(null);
    setConfirmDeleteId(null);
    setSelectedEntryIds(new Set());
    setSelectionScope(null);
    setBulkEditOpen(false);
    setConfirmSelectionDelete(false);
    setIsBulkSubmitting(false);
    setIsPaymentModalOpen(false);
    setEditingPayment(null);
    setPaymentFooter(null);
    setIsDaySubmitting(false);
    rowTriggerRef.current = null;
  }, []);

  useLayoutEffect(() => {
    if (!editingEntry && rowTriggerRef.current) {
      rowTriggerRef.current.focus();
      rowTriggerRef.current = null;
    }
  }, [editingEntry]);

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
      if (signal.aborted) return;
      const allItems = extractItems(envelope, category);

      const grouped = groupByDateIST(allItems);

      setDataMap(grouped);
      setErrorMap({});
      setLoadingMap({});
    } catch (err) {
      if (signal.aborted || err.name === 'CanceledError' || err.code === 'ERR_CANCELED' || err.name === 'AbortError') return;
      const days = getDaysInMonth(currentMonthDate);
      const errors = {};
      for (const d of days) errors[d] = true;
      setErrorMap(errors);
      setLoadingMap({});
    } finally {
      if (!signal.aborted) dispatch(setLoading(false));
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
      if (document.visibilityState !== 'visible' || saveRequestRef.current) return;
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

  const handleCellClick = useCallback((date) => {
    if (saveRequestRef.current) return;
    setDetailDate(date);
    setIsEditMode(false);
    setIsAdding(false);
    setEditingId(null);
    setEditingEntry(null);
    setConfirmDeleteId(null);
    setSelectedEntryIds(new Set());
    setSelectionScope(null);
    setBulkEditOpen(false);
    setConfirmSelectionDelete(false);
  }, []);

  const handleRetry = useCallback(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    return fetchData(controller.signal);
  }, [fetchData]);

  useLayoutEffect(() => {
    activeViewRef.current = { scope: viewScope, refresh: handleRetry };
    resetDayModal();
    setDataMap({});
    return () => {
      activeViewRef.current = null;
      saveRequestRef.current = null;
      abortRef.current?.abort();
    };
  }, [viewScope, handleRetry, resetDayModal]);

  const handleCloseDetail = useCallback(() => {
    if (!saveRequestRef.current) resetDayModal();
  }, [resetDayModal]);

  const handleCancelEntry = useCallback(() => {
    if (saveRequestRef.current) return;
    setIsEditMode(false);
    setIsAdding(false);
    setEditingId(null);
    setEditingEntry(null);
  }, []);

  const mergeSavedDayEntry = useCallback((entry, sourceDate) => {
    if (!entry?._id || !sourceDate) return;
    const destinationDate = getISTDateKey(entry.date || entry.paymentDate || sourceDate);
    const visibleMonth = format(currentMonthDate, 'yyyy-MM');

    setDataMap((previous) => {
      const source = previous[sourceDate] || [];
      const prior = source.find((row) => row._id === entry._id);
      // Payment PATCH can return just the owner id. Keep the name and avatar from the list.
      const owner = (typeof entry.user === 'string' && prior?.user?._id === entry.user) ? prior.user : entry.user ?? prior?.user;
      const updated = { ...prior, ...entry, user: owner };
      if (destinationDate === sourceDate) {
        return { ...previous, [sourceDate]: prior ? source.map((row) => row._id === entry._id ? updated : row) : [...source, updated] };
      }

      const next = { ...previous, [sourceDate]: source.filter((row) => row._id !== entry._id) };
      if (destinationDate.startsWith(visibleMonth)) {
        const ownerId = owner?._id || owner;
        const destination = (previous[destinationDate] || []).filter((row) =>
          row._id !== entry._id && !(category === 'meals' && ownerId && (row.user?._id || row.user) === ownerId),
        );
        next[destinationDate] = [...destination, updated];
      }
      return next;
    });
  }, [category, currentMonthDate]);

  const runDaySave = useCallback(async (save, sourceDate) => {
    if (saveRequestRef.current) return;
    const request = {};
    saveRequestRef.current = request;
    setIsDaySubmitting(true);
    try {
      const result = await save();
      const message = result?.message ?? result;
      if (saveRequestRef.current !== request) {
        if (!saveRequestRef.current && activeViewRef.current?.scope === viewScope) {
          mergeSavedDayEntry(result?.entry, sourceDate);
          await activeViewRef.current.refresh();
        }
        return;
      }
      mergeSavedDayEntry(result?.entry, sourceDate);
      await handleRetry();
      if (saveRequestRef.current !== request) return;
      toast.success(message);
      resetDayModal();
    } catch (error) {
      if (saveRequestRef.current !== request) return;
      const message = Array.isArray(error) ? error.join(' ') : error?.message || error;
      toast.error(typeof message === 'string' ? message : 'Failed to save entry');
    } finally {
      if (saveRequestRef.current === request) {
        saveRequestRef.current = null;
        setIsDaySubmitting(false);
      }
    }
  }, [handleRetry, mergeSavedDayEntry, resetDayModal, viewScope]);

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

  const handleEntryClick = useCallback((entry, trigger) => {
    rowTriggerRef.current = trigger;
    setEditingEntry(entry);
  }, []);

  const handleMealUpdate = useCallback((event) => {
    if (userOwnMealEntry) handleEntryClick(userOwnMealEntry, event.currentTarget);
  }, [handleEntryClick, userOwnMealEntry]);

  const handleSaveEntry = useCallback((entryData) => runDaySave(async () => {
    const { userIds, ...fields } = entryData;
    const bulk = isAdmin && userIds?.length > 0;

    if (category === 'meals') {
      if (fields.startDate || bulk) {
        const date = fields.date ? getISTDateKey(fields.date) : getISTDateKey(detailDate);
        const response = await dispatch(bulkCreateMeals({
          ...fields, userIds, startDate: fields.startDate || date, endDate: fields.endDate || date,
        })).unwrap();
        const { inserted = 0, updated = 0, skipped = 0 } = response?.data || response || {};
        return [
          inserted > 0 && `${inserted} added`,
          updated > 0 && `${updated} updated`,
          skipped > 0 && `${skipped} unchanged`,
        ].filter(Boolean).join(' · ') || 'Meals saved';
      }
      await dispatch(createMeal(fields)).unwrap();
      return 'Meal added';
    }

    if (bulk) {
      const { inserted = 0, skipped = 0 } = await dispatch(bulkCreateMarkets({
        ...fields, userIds, date: getISTDateKey(fields.date || detailDate),
      })).unwrap() || {};
      return [
        inserted > 0 && `${inserted} added`,
        skipped > 0 && `${skipped} unchanged`,
      ].filter(Boolean).join(' · ') || 'Market entries saved';
    }

    await dispatch(createMarket(fields)).unwrap();
    return 'Market entry added';
  }), [category, detailDate, dispatch, isAdmin, runDaySave]);

  const updateEntry = useCallback((entryId, fields) => {
    if (category === 'meals') return dispatch(updateMeal({ mealId: entryId, mealData: fields })).unwrap();
    if (category === 'payments') return dispatch(updatePayment({ paymentId: entryId, paymentData: fields })).unwrap();
    return dispatch(updateMarket({ marketId: entryId, marketData: fields })).unwrap();
  }, [category, dispatch]);

  const deleteEntry = useCallback((entryId) => {
    if (category === 'meals') return dispatch(deleteMeal(entryId)).unwrap();
    if (category === 'payments') return dispatch(deletePayment(entryId)).unwrap();
    return dispatch(deleteMarket(entryId)).unwrap();
  }, [category, dispatch]);

  const handleUpdateEntry = useCallback((entryId, fields, sourceDate = detailDate) => runDaySave(async () => ({
    entry: await updateEntry(entryId, fields),
    message: { meals: 'Meal updated', payments: 'Payment updated', markets: 'Market entry updated' }[category],
  }), sourceDate && getISTDateKey(sourceDate)), [category, detailDate, runDaySave, updateEntry]);

  // ── Payment CRUD ──────────────────────────────────────────────
  const handlePaymentAdd = useCallback(() => {
    const defaultDate = detailDate ? getISTDateKey(detailDate) : undefined;
    setDetailDate(null);
    setIsEditMode(false);
    setIsAdding(false);
    setEditingId(null);
    setConfirmDeleteId(null);
    setEditingPayment(defaultDate ? { paymentDate: defaultDate } : null);
    setIsPaymentModalOpen(true);
  }, [detailDate]);

  const handlePaymentSave = useCallback((formData) => runDaySave(async () => {
    if (formData.userIds?.length > 1) {
      await dispatch(createBulkPayments(formData)).unwrap();
      return `Payments recorded for ${formData.userIds.length} members`;
    }
    const { userIds, ...fields } = formData;
    await dispatch(createPayment({ ...fields, userId: userIds?.[0] || fields.userId })).unwrap();
    return 'Payment recorded';
  }), [dispatch, runDaySave]);

  const handlePaymentClose = useCallback(() => {
    if (!saveRequestRef.current) resetDayModal();
  }, [resetDayModal]);
  const handleToggleSelect = useCallback((entryId) => {
    setSelectedEntryIds((prev) => {
      const next = new Set(prev);
      if (next.has(entryId)) next.delete(entryId);
      else next.add(entryId);
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedEntryIds((previous) => {
      const ids = selectionEntries.map((entry) => entry._id);
      return ids.every((id) => previous.has(id)) ? new Set() : new Set(ids);
    });
  }, [selectionEntries]);

  const handleExitSelectMode = useCallback(() => {
    setSelectionScope(null);
    setSelectedEntryIds(new Set());
    setBulkEditOpen(false);
    setConfirmSelectionDelete(false);
  }, []);

  const handleSelectionScope = useCallback((scope) => {
    setSelectionScope(scope);
    setSelectedEntryIds(new Set());
  }, []);

  const runEntryBatch = useCallback(async (entries, operation, fields) => {
    if (entries.length === 0 || saveRequestRef.current) return;
    const canOperate = operation === 'delete' ? canDeleteDayEntry : canEditDayEntry;
    if (!entries.every((entry) => canOperate(entry, category, user))) {
      toast.error('Some selected entries are unavailable for this action');
      return;
    }

    const request = {};
    saveRequestRef.current = request;
    setIsBulkSubmitting(operation === 'delete' ? 'deleting' : 'updating');

    try {
      // Serialize writes for each owner so payment and cached total updates stay ordered.
      const byOwner = new Map();
      for (const entry of entries) {
        const owner = entry.user?._id || entry.user || entry._id;
        if (!byOwner.has(owner)) byOwner.set(owner, []);
        byOwner.get(owner).push(entry);
      }
      const groups = [...byOwner.values()];
      const succeeded = new Map();
      const failed = new Map();
      let nextGroup = 0;
      await Promise.all(groups.slice(0, 4).map(async () => {
        while (nextGroup < groups.length) {
          for (const entry of groups[nextGroup++]) {
            try {
              const saved = operation === 'delete' ? await deleteEntry(entry._id) : await updateEntry(entry._id, fields);
              succeeded.set(entry._id, saved);
            } catch (error) {
              failed.set(entry._id, error);
            }
          }
        }
      }));

      if (saveRequestRef.current !== request) {
        if (succeeded.size && !saveRequestRef.current && activeViewRef.current?.scope === viewScope) {
          await activeViewRef.current.refresh();
        }
        return;
      }

      if (succeeded.size) {
        const changedDates = new Set(entries.filter((entry) => succeeded.has(entry._id))
          .map((entry) => getISTDateKey(entry.date || entry.paymentDate)));
        setDataMap((previous) => {
          const next = { ...previous };
          for (const date of changedDates) {
            const rows = previous[date] || [];
            next[date] = operation === 'delete'
              ? rows.filter((entry) => !succeeded.has(entry._id))
              : rows.map((entry) => {
                const saved = succeeded.get(entry._id);
                if (!saved) return entry;
                const owner = typeof saved.user === 'string' && entry.user?._id === saved.user ? entry.user : saved.user ?? entry.user;
                return { ...entry, ...saved, user: owner };
              });
          }
          return next;
        });
        await handleRetry();
      }
      if (saveRequestRef.current !== request) return;

      const resultLabel = operation === 'delete' ? 'deleted' : 'updated';
      if (failed.size) {
        const reason = failed.values().next().value;
        const detail = (typeof reason === 'string' ? reason : reason?.message) || 'Try again.';
        toast.error(`${succeeded.size} of ${entries.length} entries ${resultLabel}. ${detail}`);
        setSelectedEntryIds(new Set(failed.keys()));
      } else {
        toast.success(`${succeeded.size} ${succeeded.size === 1 ? 'entry' : 'entries'} ${resultLabel}`);
        setSelectedEntryIds(new Set());
        setBulkEditOpen(false);
      }
      if (succeeded.size) setConfirmSelectionDelete(false);
    } finally {
      if (saveRequestRef.current === request) {
        saveRequestRef.current = null;
        setIsBulkSubmitting(false);
      }
    }
  }, [category, deleteEntry, handleRetry, updateEntry, user, viewScope]);

  const handleDeleteEntry = useCallback((id) => {
    const entry = editableMonthEntries.find((row) => row._id === id);
    return entry && runEntryBatch([entry], 'delete');
  }, [editableMonthEntries, runEntryBatch]);

  const handleBulkDelete = useCallback((ids) => runEntryBatch(
    Array.isArray(ids) ? editableMonthEntries.filter((entry) => ids.includes(entry._id)) : selectedEntries,
    'delete',
  ), [editableMonthEntries, runEntryBatch, selectedEntries]);

  const handleBulkUpdate = useCallback((fields) => runEntryBatch(selectedEntries, 'update', fields), [runEntryBatch, selectedEntries]);

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

  const filteredScheduleMap = useMemo(() => {
    if (!selectedMemberId) return scheduleMap;
    const result = {};
    for (const [dateKey, item] of Object.entries(scheduleMap)) {
      const userId = typeof item.user === 'object' ? item.user?._id : item.user;
      if (userId === selectedMemberId) {
        result[dateKey] = item;
      }
    }
    return result;
  }, [scheduleMap, selectedMemberId]);

  const ownDutyMap = useMemo(() => {
    if (!user?._id) return {};
    const result = {};
    for (const [dateKey, item] of Object.entries(scheduleMap)) {
      const userId = typeof item.user === 'object' ? item.user?._id : item.user;
      if (userId === user._id) {
        result[dateKey] = true;
      }
    }
    return result;
  }, [scheduleMap, user?._id]);

  const calendarSuspenseFallback = (
    <div className="flex items-center justify-center py-8">
      <div className="w-6 h-6 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const showSelection = Boolean(selectionScope && !editingEntry);
  const showBatchEdit = showSelection && bulkEditOpen && selectedEntries.length > 0;
  const showDeleteConfirmation = showSelection && confirmSelectionDelete && selectedEntries.length > 0;
  const busy = isDaySubmitting || Boolean(isBulkSubmitting);
  const entryLabel = selectedEntries.length === 1 ? 'entry' : 'entries';
  const titleDate = editingEntry?.date || editingEntry?.paymentDate || detailDate;
  let editFooter = editingEntry && (
    <EntryEditActions formId={editFormId} onCancel={handleCancelEntry} isSubmitting={isDaySubmitting} />
  );
  if (showDeleteConfirmation) {
    editFooter = (
      <div className="grid w-full grid-cols-2 gap-2">
        <Button autoFocus variant="secondary" onClick={() => setConfirmSelectionDelete(false)} disabled={busy}>Cancel</Button>
        <Button variant="danger" onClick={() => handleBulkDelete()} isLoading={busy}>Confirm delete</Button>
      </div>
    );
  } else if (showBatchEdit) {
    editFooter = <EntryEditActions formId={editFormId} onCancel={() => setBulkEditOpen(false)} isSubmitting={busy} />;
  } else if (showSelection) {
    editFooter = (
      <div className="flex w-full flex-col gap-2">
        {selectedEntries.length > 0 && !canDeleteSelection && (
          <p role="status" className="text-xs text-[var(--text-secondary)]">Some selected payments cannot be deleted.</p>
        )}
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" disabled={busy || !selectedEntries.length}
            onClick={() => selectedEntries.length === 1 ? handleEntryClick(selectedEntries[0]) : setBulkEditOpen(true)}>
            Edit selected
          </Button>
          <Button variant="danger" disabled={busy || !canDeleteSelection} onClick={() => setConfirmSelectionDelete(true)}>
            Delete selected
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Page header */}
      <header className="dashboard-header flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Events Calendar</h1>
          <p className="text-sm text-muted-foreground">
            Track daily events, meals, markets, and payments at a glance across months.
          </p>
        </div>
        <div className="dashboard-header-actions w-full sm:w-auto flex items-center gap-2 shrink-0">
          <SegmentedControl isAdmin={isAdmin} />
        </div>
      </header>

      {/* Calendar section */}
      <div className="relative">
          <div className="flex justify-end">
            <CalendarHeader
              isAdmin={isAdmin}
              selectedMemberId={selectedMemberId}
              onMemberFilter={handleMemberFilter}
            />
          </div>
          <div className="rounded-xl border border-[var(--calendar-border)] shadow-sm overflow-hidden bg-[var(--bg-elevated)]">
            <CalendarGrid
              currentMonth={currentMonthDate}
              dataMap={filteredDataMap}
              category={category}
              loadingMap={loadingMap}
              errorMap={errorMap}
              onCellClick={handleCellClick}
              onRetry={handleRetry}
              onPrevMonth={handlePrevMonth}
              onNextMonth={handleNextMonth}
              showMealCount={showMealCount}
              scheduleMap={category === 'markets' ? filteredScheduleMap : {}}
              ownDutyMap={category === 'markets' ? ownDutyMap : {}}
            />
            {category === 'meals' && <MealLegend />}
          </div>
      </div>

      {/* Unified Meal Modal for EventCalendar meal add/edit */}
      {detailDate && category === 'meals' && isEditMode && (
        <Suspense fallback={calendarSuspenseFallback}>
          <MealModal
            isOpen={Boolean(detailDate && isEditMode)}
            onClose={handleCancelEntry}
            isSubmitting={isDaySubmitting}
            mode={isAdding ? 'add' : 'edit'}
            date={detailDate}
            entries={filteredCurrentDateEntries}
            initialData={editingId ? filteredCurrentDateEntries.find((e) => e._id === editingId) : null}
            onSubmit={handleSaveEntry}
            onSave={handleSaveEntry}
            onUpdate={handleUpdateEntry}
            onDelete={handleDeleteEntry}
            onBulkDelete={handleBulkDelete}
            onBulkUpdate={handleBulkUpdate}
            isAdmin={isAdmin}
            currentUser={user}
          />
        </Suspense>
      )}

      {/* Unified Market Modal for EventCalendar market add/edit */}
      {detailDate && category === 'markets' && isEditMode && (
        <Suspense fallback={calendarSuspenseFallback}>
          <MarketModal
            isOpen={Boolean(detailDate && isEditMode)}
            onClose={handleCancelEntry}
            isSubmitting={isDaySubmitting}
            mode={isAdding ? 'add' : 'edit'}
            date={detailDate}
            entries={filteredCurrentDateEntries}
            initialData={editingId ? filteredCurrentDateEntries.find((e) => e._id === editingId) : null}
            onSubmit={handleSaveEntry}
            onSave={handleSaveEntry}
            onUpdate={handleUpdateEntry}
            onDelete={handleDeleteEntry}
            onBulkDelete={handleBulkDelete}
            isAdmin={isAdmin}
            currentUser={user}
          />
        </Suspense>
      )}

      {/* DayDetailDialog for non-meals / non-markets OR in day view mode */}
      {detailDate && !(['meals', 'markets'].includes(category) && isEditMode) && (
        <DayDetailDialog
          isOpen={!!detailDate}
          onClose={handleCloseDetail}
          role={showDeleteConfirmation ? 'alertdialog' : undefined}
          description={showDeleteConfirmation ? `This permanently deletes the selected ${entryLabel}.` : undefined}
          title={
            showDeleteConfirmation
              ? `Delete ${selectedEntries.length} ${entryLabel}?`
              : `${formatInIST(titleDate, 'd MMM yyyy')}${isEditMode && category !== 'meals' ? ' · Edit' : ''} · ${category.charAt(0).toUpperCase() + category.slice(1)}`
          }
          isEditMode={isEditMode || Boolean(editingEntry) || showSelection}
          onEditToggle={!['votes', 'payments'].includes(category) ? handleEditToggle : undefined}
          category={category}
          onScheduleClick={category === 'markets' ? handleScheduleClick : undefined}
          onPaymentAdd={category === 'payments' && isAdmin ? handlePaymentAdd : undefined}
          onAddMarket={category === 'markets' ? handleAddMarket : undefined}
          onMealAdd={category === 'meals' ? (userOwnMealEntry ? handleMealUpdate : handleMealAdd) : undefined}
          onManageEntries={editableDayEntries.length || editableMonthEntries.length
            ? () => handleSelectionScope(editableDayEntries.length ? 'day' : 'month')
            : undefined}
          mealActionLabel={category === 'meals' ? (userOwnMealEntry ? 'Update Meal' : 'Add Meal') : undefined}
          isAdding={isAdding}
          editingId={editingId}
          confirmDeleteId={confirmDeleteId}
          isSubmitting={busy}
          showEditInstructions={editableDayEntries.length > 0}
          editFooter={editFooter}
        >
          {isEditMode ? (
            <Suspense fallback={calendarSuspenseFallback}>
              <CalendarDayEdit
                entries={filteredCurrentDateEntries}
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
          ) : showDeleteConfirmation ? null : showBatchEdit ? (
            <Suspense fallback={calendarSuspenseFallback}>
              <BulkUpdateForm
                formId={editFormId}
                category={category}
                selectedCount={selectedEntries.length}
                allowAmount={category !== 'payments' || isAdmin || selectedEntries.every(isMemberEditablePaymentAmount)}
                onSubmit={handleBulkUpdate}
                isBulkSubmitting={isBulkSubmitting}
              />
            </Suspense>
          ) : showSelection ? (
            <>
              <Suspense fallback={calendarSuspenseFallback}>
                <DaySelectionControls
                  scope={selectionScope}
                  onScopeChange={handleSelectionScope}
                  onExit={handleExitSelectMode}
                  count={selectedEntries.length}
                  total={selectionEntries.length}
                  onSelectAll={handleSelectAll}
                  disabled={busy}
                />
              </Suspense>
              <DayDetailContent
                key={selectionScope}
                entries={selectionEntries}
                category={category}
                selection={{ selectedIds: selectedEntryIds, onToggle: handleToggleSelect }}
              />
            </>
          ) : (
            <>
              <div hidden={Boolean(editingEntry)} className={editingEntry ? 'hidden' : 'contents'}>
                <DayDetailContent
                  entries={filteredCurrentDateEntries}
                  category={category}
                  totalMealsCount={totalMealsForDate}
                  scheduleData={getScheduleForDate(detailDate)}
                  onEntryClick={handleEntryClick}
                />
              </div>
              {editingEntry && (
                <Suspense fallback={calendarSuspenseFallback}>
                  <EntryEditForm
                    key={editingEntry._id}
                    formId={editFormId}
                    entry={editingEntry}
                    category={category}
                    isAdmin={isAdmin}
                    onUpdate={(id, fields) => handleUpdateEntry(id, fields, editingEntry.date || editingEntry.paymentDate)}
                    isSubmitting={isDaySubmitting}
                  />
                </Suspense>
              )}
            </>
          )}
        </DayDetailDialog>
      )}

      {/* Payment Modal (admin only) */}
      <Suspense fallback={null}>
        <PaymentModal isOpen={isPaymentModalOpen} onClose={handlePaymentClose} title="Record Payment" footer={paymentFooter}>
          <PaymentForm
            initialData={editingPayment}
            onSubmit={handlePaymentSave}
            onCancel={handlePaymentClose}
            isAdmin={isAdmin}
            currentUser={user}
            isSubmitting={isDaySubmitting}
            readOnly={!isAdmin}
            renderFooter={setPaymentFooter}
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
