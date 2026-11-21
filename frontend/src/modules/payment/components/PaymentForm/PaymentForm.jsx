import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { format, parseISO, isValid } from 'date-fns';
import {
  HiOutlineCalendar,
  HiOutlineCalendarDays,
  HiOutlineUser,
  HiOutlineLockClosed,
  HiOutlineArrowPath,
  HiOutlineIdentification,
} from 'react-icons/hi2';
import { BsCashCoin, BsGlobe2 } from 'react-icons/bs';
import { SiRazorpay } from 'react-icons/si';
import { MdPendingActions, MdCheckCircleOutline, MdErrorOutline, MdRefresh } from 'react-icons/md';
import apiClient from '@/services/api/client/apiClient';
import paymentService from '../../services/payment.service';
import { getBillingPeriod, MONTH_NAMES as MONTHS } from '@shared/utils/billingPeriod';
import { Button, Avatar, MemberSelect, IconSelect } from '@/shared/components/ui';
import { cn } from '@/core/utils/helpers/string.helper';
import toast from 'react-hot-toast';
import '@/shared/components/ui/RecordForm/record-form.css';

/* ─── Helpers ─────────────────────────────────────────────────── */

/**
 * Format date string to "21 Nov 2026"
 */
const formatDisplayDate = (dateVal) => {
  if (!dateVal) return '';
  try {
    const d = typeof dateVal === 'string' ? parseISO(dateVal) : dateVal;
    return isValid(d) ? format(d, 'd MMM yyyy') : String(dateVal);
  } catch {
    return String(dateVal);
  }
};

/**
 * Format date string to "yyyy-MM-dd"
 */
const toIsoDateString = (dateVal) => {
  if (!dateVal) return format(new Date(), 'yyyy-MM-dd');
  try {
    const d = typeof dateVal === 'string' ? (dateVal.length === 10 ? parseISO(dateVal) : new Date(dateVal)) : dateVal;
    return isValid(d) ? format(d, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
  } catch {
    return format(new Date(), 'yyyy-MM-dd');
  }
};

/**
 * Billing-period-aware month label for a payment date.
 */
const monthForDate = (dateStr) => {
  let d = dateStr ? new Date(`${dateStr}T12:00:00Z`) : new Date();
  if (isNaN(d.getTime())) d = new Date();
  return getBillingPeriod(d).monthName;
};

/* ─── Constants ─────────────────────────────────────────────── */

const PAYMENT_TYPES = [
  { value: 'mess_bill', label: 'Mess Bill' },
  { value: 'gas_bill', label: 'Gas Bill' },
  { value: 'other', label: 'Other' },
];

const PAYABLE_KEY_FOR_TYPE = {
  mess_bill: 'messPayable',
  gas_bill: 'gasPayable',
  other: null,
};

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash', Icon: BsCashCoin, iconClass: 'text-[var(--success)]' },
  { value: 'online', label: 'Online', Icon: BsGlobe2, iconClass: 'text-[var(--info)]' },
  { value: 'razorpay', label: 'Razorpay', Icon: SiRazorpay, iconClass: 'text-[var(--brand)]' },
  { value: 'upi_manual', label: 'Manual UPI', Icon: HiOutlineIdentification, iconClass: 'text-[var(--info)]' },
];

const STATUS_OPTIONS = [
  { value: 'completed', label: 'Completed', Icon: MdCheckCircleOutline, iconClass: 'text-[var(--success)]' },
  { value: 'pending', label: 'Pending', Icon: MdPendingActions, iconClass: 'text-[var(--warning)]' },
  { value: 'failed', label: 'Failed', Icon: MdErrorOutline, iconClass: 'text-[var(--danger)]' },
  { value: 'refunded', label: 'Refunded', Icon: MdRefresh, iconClass: 'text-[var(--info)]' },
];

/**
 * Accessible Outlined Date Field with "21 Nov 2026" display
 */
const DateField = ({ label, value, onChange, min, max, disabled, error, id, name = 'paymentDate' }) => {
  const displayStr = useMemo(() => formatDisplayDate(value), [value]);

  return (
    <div className="flex flex-col gap-1 w-full min-w-0">
      <label htmlFor={id} className="text-xs font-medium text-[var(--text-secondary)] select-none">
        {label}
      </label>
      <div
        className={cn(
          'relative flex items-center justify-between h-11 min-h-[44px] px-3 rounded-[8px] border transition-colors',
          'bg-[var(--input-bg)] text-[16px] sm:text-sm text-[var(--text-primary)]',
          error
            ? 'border-[var(--danger)] focus-within:ring-2 focus-within:ring-[var(--danger)]'
            : 'border-[var(--border-contrast)] hover:border-[var(--border-contrast-hover)] focus-within:ring-2 focus-within:ring-[var(--brand)]',
          disabled && 'opacity-60 cursor-not-allowed bg-[var(--input-bg-disabled)]'
        )}
      >
        <span className="tabular-nums font-medium text-sm text-[var(--text-primary)] select-none pointer-events-none">
          {displayStr || 'Select date'}
        </span>
        <HiOutlineCalendar className="w-4 h-4 text-[var(--text-muted)] shrink-0 pointer-events-none" />
        <input
          id={id}
          name={name}
          type="date"
          value={value}
          onChange={onChange}
          min={min}
          max={max}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
        />
      </div>
      {error && (
        <p id={`${id}-error`} className="text-xs text-[var(--danger-text)] font-medium">
          {error}
        </p>
      )}
    </div>
  );
};

/* ─── ReadOnly banner ───────────────────────────────────────── */
const ReadOnlyBanner = () => (
  <div className="flex items-center gap-2 px-3 py-2.5 rounded-[8px] bg-[var(--warning-bg)] border border-[var(--warning-border)] text-[var(--warning-text)] text-xs font-semibold">
    <HiOutlineLockClosed className="w-4 h-4 shrink-0" />
    <span>View only — administrative privileges required to edit payment records.</span>
  </div>
);

/* ─── PaymentForm ───────────────────────────────────────────── */
export const PaymentForm = ({
  initialData = null,
  date: defaultDate,
  onSubmit,
  onSave,
  onCancel,
  isAdmin = false,
  currentUser,
  readOnly = false,
  isSubmitting = false,
  preselectedUserId = null,
  renderFooter,
}) => {
  const isEditMode = Boolean(initialData && initialData._id);

  const [formData, setFormData] = useState({
    amount: initialData?.amount ?? '',
    paymentDate: toIsoDateString(initialData?.paymentDate || initialData?.date || defaultDate),
    month: initialData?.month || monthForDate(initialData?.paymentDate || initialData?.date || defaultDate),
    type: initialData?.type || 'mess_bill',
    status: initialData?.status || 'completed',
    paymentMethod: initialData?.paymentMethod || 'cash',
    transactionId: initialData?.transactionId || initialData?.utr || '',
    remarks: initialData?.remarks || initialData?.notes || '',
    userId: typeof initialData?.user === 'object' ? initialData.user?._id : (initialData?.user || ''),
    userIds: [],
  });

  const [errors, setErrors] = useState({});
  const [users, setUsers] = useState([]);
  const [isUsersLoading, setIsUsersLoading] = useState(false);

  /* Payable amounts cache + batch-loaded state */
  const payableCacheRef = useRef(new Map());
  const previousAmountsRef = useRef({});
  const [isPayableLoading, setIsPayableLoading] = useState(false);
  const [isBatchLoaded, setIsBatchLoaded] = useState(false);

  /* Admin: fetch member list + batch payable amounts */
  useEffect(() => {
    if (!isAdmin) return;
    let isMounted = true;
    setIsUsersLoading(true);

    apiClient
      .get('/users?limit=500&userStatus=approved&isActive=true')
      .then(async (r) => {
        if (!isMounted) return;
        const userList = r.data?.data?.users || r.data?.users || [];
        setUsers(userList);
        if (userList.length > 0) {
          try {
            setIsPayableLoading(true);
            const ids = userList.map((u) => u._id);
            const batchRes = await paymentService.getPayableAmountsBatch(ids);
            const batchData = batchRes?.data || {};
            for (const [uid, info] of Object.entries(batchData)) {
              payableCacheRef.current.set(uid, { ...payableCacheRef.current.get(uid), ...info });
            }
          } catch (err) {
            console.error('[PaymentForm] Batch payable fetch failed:', err);
          } finally {
            if (isMounted) setIsPayableLoading(false);
          }
        }
      })
      .catch((err) => {
        console.error('[PaymentForm] Failed to fetch users:', err);
      })
      .finally(() => {
        if (isMounted) {
          setIsUsersLoading(false);
          setIsBatchLoaded(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isAdmin]);

  /* On-demand resolver for single member payable */
  const resolvePayableForUser = useCallback(async (userId, type, cache) => {
    const key = PAYABLE_KEY_FOR_TYPE[type];
    if (!key || !userId) return null;

    const cachedInfo = cache.get(userId);
    if (cachedInfo && cachedInfo[key] != null) {
      return Number(cachedInfo[key]);
    }

    try {
      const legacyRes =
        key === 'messPayable'
          ? await apiClient.get(`/users/${userId}/payable`)
          : await apiClient.get(`/users/${userId}/payable/gasbill`);
      const value = legacyRes?.data?.data?.payableAmount;
      if (value != null) {
        const info = { ...cache.get(userId), [key]: value };
        cache.set(userId, { ...info, monthName: legacyRes?.data?.data?.monthName || info.monthName || '' });
        return Number(value);
      }
    } catch (err) {
      console.error('[PaymentForm] Per-user payable fetch failed:', err);
    }
    return null;
  }, []);

  /* Populate on edit/view */
  useEffect(() => {
    if (initialData) {
      const pd = toIsoDateString(initialData.paymentDate || initialData.date);
      const targetUserId =
        typeof initialData.user === 'object' ? initialData.user?._id : (initialData.user || '');
      setFormData({
        amount: initialData.amount ?? '',
        paymentDate: pd,
        month: initialData.month || monthForDate(pd),
        type: initialData.type || 'mess_bill',
        status: initialData.status || 'completed',
        paymentMethod: initialData.paymentMethod || 'cash',
        transactionId: initialData.transactionId || initialData.utr || '',
        remarks: initialData.remarks || initialData.notes || '',
        userId: targetUserId,
        userIds: targetUserId ? [targetUserId] : [],
      });
    } else {
      const targetDate = toIsoDateString(defaultDate);
      const ids = preselectedUserId ? [preselectedUserId] : [];
      setFormData((p) => ({
        ...p,
        paymentDate: targetDate,
        month: monthForDate(targetDate),
        userId: preselectedUserId || '',
        userIds: ids,
      }));
    }
  }, [initialData, currentUser, preselectedUserId, defaultDate]);

  /* Auto-fill amount when single member is selected or type changes */
  useEffect(() => {
    if (readOnly || isSubmitting || isEditMode) return;
    if (formData.userIds.length !== 1) return;

    const selectedId = formData.userIds[0];
    const key = PAYABLE_KEY_FOR_TYPE[formData.type];
    const cache = payableCacheRef.current;
    const cachedInfo = cache.get(selectedId);

    // Fast path: cache hit
    if (key && cachedInfo && cachedInfo[key] != null) {
      const amount = Number(cachedInfo[key]);
      if (formData.amount !== amount) {
        setFormData((p) => {
          const next = { ...p, amount };
          if (amount < 0 && p.status === 'completed') next.status = 'refunded';
          return next;
        });
      }
      return;
    }

    // Slow path: on demand
    let cancelled = false;
    resolvePayableForUser(selectedId, formData.type, cache)
      .then((value) => {
        if (value == null || cancelled) return;
        setFormData((p) => {
          if (p.userIds[0] !== selectedId) return p;
          const next = { ...p, amount: value };
          if (value < 0 && p.status === 'completed') next.status = 'refunded';
          return next;
        });
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [formData.userIds, formData.type, readOnly, isSubmitting, isEditMode, isBatchLoaded, resolvePayableForUser]);

  /* Dynamic filter: block users who already have completed payment */
  const filterUser = useCallback(
    (u) => {
      if (formData.userIds.includes(u._id)) return false;
      if (formData.type === 'mess_bill') return u.payment === 'success';
      if (formData.type === 'gas_bill') return u.gasBill === 'success';
      return false;
    },
    [formData.type, formData.userIds]
  );

  /* Unified change handler */
  const handleChange = (e) => {
    if (readOnly || isSubmitting) return;
    const { name, value, type } = e.target;
    setFormData((p) => {
      const next = {
        ...p,
        [name]: type === 'number' ? (value === '' ? '' : parseFloat(value) || 0) : value,
      };
      if (name === 'paymentDate' && value) {
        next.month = monthForDate(value);
      }
      return next;
    });
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  /* Validation */
  const isValidToSave = useMemo(() => {
    if (readOnly || isSubmitting) return false;
    const parsedAmount = parseFloat(formData.amount);
    const isRefund = formData.status === 'refunded';
    if (!isRefund && (isNaN(parsedAmount) || parsedAmount <= 0)) return false;
    if (isRefund && (isNaN(parsedAmount) || parsedAmount === 0)) return false;
    if (!formData.paymentDate) return false;
    if (isAdmin && !isEditMode && (!formData.userIds || formData.userIds.length === 0)) return false;
    return true;
  }, [readOnly, isSubmitting, formData.amount, formData.status, formData.paymentDate, isAdmin, isEditMode, formData.userIds]);

  /* Form submission */
  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (readOnly || isSubmitting) return;

    const parsedAmount = parseFloat(formData.amount);
    const isRefund = formData.status === 'refunded';

    if (!isRefund && (isNaN(parsedAmount) || parsedAmount <= 0)) {
      setErrors((p) => ({ ...p, amount: 'Please enter a valid amount greater than zero' }));
      toast.error('Please enter a valid amount greater than zero');
      return;
    }

    if (isRefund && (isNaN(parsedAmount) || parsedAmount === 0)) {
      setErrors((p) => ({ ...p, amount: 'Please enter a valid refund amount' }));
      toast.error('Please enter a valid refund amount');
      return;
    }

    if (isAdmin && !isEditMode && (!formData.userIds || formData.userIds.length === 0)) {
      setErrors((p) => ({ ...p, userIds: 'Please select at least one member' }));
      toast.error('Please select at least one member');
      return;
    }

    const payload = {
      ...formData,
      amount: isRefund ? Math.abs(parsedAmount) : parsedAmount,
    };

    // Soft warning if amount significantly exceeds payable (single-member only)
    if (!isRefund && !isEditMode && formData.userIds.length === 1) {
      const selectedId = formData.userIds[0];
      const key = PAYABLE_KEY_FOR_TYPE[formData.type];
      const cachedInfo = payableCacheRef.current.get(selectedId);
      const payable = cachedInfo?.[key];
      if (payable != null && parsedAmount > Number(payable) * 1.5) {
        toast(
          `Heads up: ₹${parsedAmount.toLocaleString('en-IN')} is significantly more than expected payable ₹${Number(
            payable
          ).toLocaleString('en-IN')}`,
          { icon: '⚠️' }
        );
      }
    }

    if (isEditMode) {
      payload.userId = formData.userId;
      delete payload.userIds;
    } else {
      payload.userIds = formData.userIds;
      delete payload.userId;
    }

    if (!isAdmin) delete payload.status;

    const targetFn = onSubmit || onSave;
    if (targetFn) targetFn(payload);
  };

  /* Month option list: prev year → current → next year */
  const yr = new Date().getFullYear();
  const monthOptions = useMemo(
    () => [yr - 1, yr, yr + 1].flatMap((y) => MONTHS.map((m) => `${m} ${y}`)),
    [yr]
  );

  const showStatus = isAdmin;
  const showTxn =
    formData.paymentMethod === 'online' ||
    formData.paymentMethod === 'razorpay' ||
    formData.paymentMethod === 'upi_manual';

  const isRefund = formData.status === 'refunded';
  const parsedAmount = parseFloat(formData.amount) || 0;
  const selectedTypeObj = PAYMENT_TYPES.find((t) => t.value === formData.type);

  // Dynamic Save CTA label
  const saveLabel = useMemo(() => {
    if (isSubmitting) return isEditMode ? 'Updating…' : 'Saving…';
    if (isEditMode) return isRefund ? 'Update Refund' : 'Update Payment';
    if (parsedAmount > 0) {
      return isRefund
        ? `Save -₹${parsedAmount.toLocaleString('en-IN')} refund`
        : `Save ₹${parsedAmount.toLocaleString('en-IN')} payment`;
    }
    return isRefund ? 'Save Refund' : 'Save Payment';
  }, [isSubmitting, isEditMode, isRefund, parsedAmount]);

  /* Render Modal Bottom Footer */
  useEffect(() => {
    if (!renderFooter) return;

    renderFooter(
      <div className="record-form-actions">
        <Button
          type="button"
          variant="secondary"
          size="md"
          onClick={onCancel}
          disabled={isSubmitting}
          className="flex-1"
        >
          {readOnly ? 'Close' : 'Cancel'}
        </Button>
        {!readOnly && (
          <Button
            type="submit"
            form="payment-form"
            variant="primary"
            size="md"
            onClick={handleSubmit}
            disabled={!isValidToSave || isSubmitting}
            isLoading={isSubmitting}
            className="flex-[2]"
          >
            {saveLabel}
          </Button>
        )}
      </div>
    );
  }, [renderFooter, onCancel, readOnly, isValidToSave, isSubmitting, saveLabel]);

  // Display user name and email for view/edit mode
  const editMemberName = useMemo(() => {
    if (!initialData) return currentUser?.name || 'Member';
    return typeof initialData.user === 'object' ? initialData.user?.name : 'Member';
  }, [initialData, currentUser]);

  const editMemberEmail = useMemo(() => {
    if (!initialData) return currentUser?.email || '';
    return typeof initialData.user === 'object' ? initialData.user?.email : '';
  }, [initialData, currentUser]);

  return (
    <form id="payment-form" onSubmit={handleSubmit} className="flex flex-col gap-4 w-full" noValidate>
      <button type="submit" className="sr-only" tabIndex={-1} aria-hidden="true" />

      {/* Read-only notice */}
      {readOnly && <ReadOnlyBanner />}

      {/* ── LIVE PAYMENT AMOUNT CARD ──────────────────────────────── */}
      <div className="flex items-center justify-between px-3.5 py-2.5 rounded-[8px] border border-[var(--border-default)] bg-[var(--bg-surface)]">
        <div className="flex flex-col">
          <span className="text-[11px] uppercase tracking-wider text-[var(--text-muted)] font-semibold">
            {isRefund ? 'Refund Amount' : 'Payment Amount'}
          </span>
          <span className="text-xs text-[var(--text-secondary)] truncate max-w-[200px]">
            {selectedTypeObj?.label || 'Payment entry'}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isPayableLoading && (
            <HiOutlineArrowPath className="w-3.5 h-3.5 animate-spin text-[var(--text-muted)]" />
          )}
          <span
            className={cn(
              'text-lg font-bold tabular-nums',
              isRefund ? 'text-[var(--danger)]' : 'text-[var(--brand)]'
            )}
          >
            {isRefund ? '-₹' : '₹'}
            {formData.amount === ''
              ? '0'
              : Math.abs(Number(formData.amount)).toLocaleString('en-IN', {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 2,
                })}
          </span>
        </div>
      </div>

      {/* ── MEMBER SELECT ──────────────────────────────────────────── */}
      <div className="flex flex-col gap-1 w-full min-w-0">
        <label className="text-xs font-medium text-[var(--text-secondary)] select-none">
          {isAdmin && !isEditMode ? 'Select members' : 'Member'}
        </label>

        {isEditMode ? (
          <div className="flex items-center gap-2.5 px-3 h-11 min-h-[44px] rounded-[8px] border border-[var(--border-contrast)] bg-[var(--input-bg)]">
            <Avatar name={editMemberName} size="xs" />
            <span className="text-sm font-semibold text-[var(--text-primary)] truncate">
              {editMemberName}
            </span>
            {editMemberEmail && (
              <span className="text-[11px] text-[var(--text-tertiary)] truncate hidden sm:inline ml-auto">
                {editMemberEmail}
              </span>
            )}
          </div>
        ) : isAdmin ? (
          <div className="w-full min-w-0">
            <MemberSelect
              variant="default"
              users={users}
              value={formData.userIds}
              onChange={(ids) => {
                setFormData((p) => ({
                  ...p,
                  userIds: ids,
                  userId: ids.length === 1 ? ids[0] : '',
                  amount: ids.length === 1 ? '' : p.amount,
                }));
                setErrors((p) => ({ ...p, userIds: undefined }));
              }}
              loading={isUsersLoading}
              disabled={readOnly || isSubmitting}
              accentColor="primary"
              filterUser={filterUser}
              placeholder="Select members…"
            />
            {errors.userIds && (
              <p className="text-xs text-[var(--danger-text)] font-medium mt-1">
                {errors.userIds}
              </p>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2.5 px-3 h-11 min-h-[44px] rounded-[8px] border border-[var(--border-contrast)] bg-[var(--input-bg)]">
            <Avatar name={currentUser?.name || 'Member'} size="xs" />
            <span className="text-sm font-semibold text-[var(--text-primary)] truncate">
              {currentUser?.name || 'Member'}
            </span>
          </div>
        )}
      </div>

      {/* ── AMOUNT FIELD ───────────────────────────────────────────── */}
      <div className="flex flex-col gap-1 w-full min-w-0">
        <label htmlFor="payment-amount" className="text-xs font-medium text-[var(--text-secondary)] select-none">
          Amount (₹)
        </label>
        <div
          className={cn(
            'relative flex items-center h-11 min-h-[44px] px-3 rounded-[8px] border transition-colors',
            'bg-[var(--input-bg)] text-[16px] sm:text-sm text-[var(--text-primary)]',
            errors.amount
              ? 'border-[var(--danger)] focus-within:ring-2 focus-within:ring-[var(--danger)]'
              : 'border-[var(--border-contrast)] hover:border-[var(--border-contrast-hover)] focus-within:ring-2 focus-within:ring-[var(--brand)]',
            (readOnly || isSubmitting) && 'opacity-60 cursor-not-allowed bg-[var(--input-bg-disabled)]'
          )}
        >
          <span className="font-bold text-sm text-[var(--text-muted)] mr-2 select-none">₹</span>
          <input
            id="payment-amount"
            type="number"
            name="amount"
            step="0.01"
            value={formData.amount}
            onChange={handleChange}
            placeholder={isRefund ? 'Enter refund amount' : '0.00'}
            disabled={readOnly || isSubmitting}
            className="w-full bg-transparent text-[var(--text-primary)] font-medium outline-none border-none p-0 text-[16px] sm:text-sm placeholder:text-[var(--text-muted)] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            aria-invalid={Boolean(errors.amount)}
            aria-describedby={errors.amount ? 'payment-amount-error' : undefined}
          />
        </div>
        {errors.amount && (
          <p id="payment-amount-error" className="text-xs text-[var(--danger-text)] font-medium">
            {errors.amount}
          </p>
        )}
      </div>

      {/* ── DATE + MONTH (SIDE BY SIDE) ────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <DateField
          id="payment-date"
          name="paymentDate"
          label="Payment Date"
          value={formData.paymentDate}
          onChange={handleChange}
          disabled={readOnly || isSubmitting}
          error={errors.paymentDate}
        />
        <div className="flex flex-col gap-1 w-full min-w-0">
          <label className="text-xs font-medium text-[var(--text-secondary)] select-none">
            For Month
          </label>
          <IconSelect
            variant="default"
            name="month"
            value={formData.month}
            onChange={handleChange}
            disabled={readOnly || isSubmitting}
            options={monthOptions.map((mo) => ({
              value: mo,
              label: mo,
              Icon: HiOutlineCalendarDays,
              iconClass: 'text-[var(--text-secondary)]',
            }))}
          />
        </div>
      </div>

      {/* ── PAYMENT TYPE (SEGMENTED CONTROL WITH DEPTH) ────────────── */}
      <div className="flex flex-col gap-1 w-full min-w-0">
        <label className="text-xs font-medium text-[var(--text-secondary)] select-none">
          Payment Type
        </label>
        <div
          role="radiogroup"
          aria-label="Payment type"
          className="segmented-control w-full min-h-[44px]"
        >
          {PAYMENT_TYPES.map((t) => {
            const isSelected = formData.type === t.value;
            return (
              <button
                key={t.value}
                type="button"
                role="radio"
                aria-checked={isSelected}
                aria-pressed={isSelected}
                onClick={() => {
                  if (readOnly || isSubmitting || isSelected) return;
                  if (formData.amount !== '') {
                    previousAmountsRef.current[formData.type] = formData.amount;
                  }
                  const restoredAmount = previousAmountsRef.current[t.value] || '';
                  setFormData((p) => ({
                    ...p,
                    type: t.value,
                    amount: restoredAmount,
                  }));
                }}
                disabled={readOnly || isSubmitting}
                className={cn(
                  'segmented-control-button flex-1 min-h-[38px] flex items-center justify-center gap-2 select-none text-xs sm:text-sm font-medium transition-colors',
                  isSelected && 'text-[var(--brand)] font-semibold'
                )}
              >
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── METHOD & STATUS (SIDE BY SIDE) ─────────────────────────── */}
      <div className={cn('grid gap-3', showStatus ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1')}>
        <div className="flex flex-col gap-1 w-full min-w-0">
          <label className="text-xs font-medium text-[var(--text-secondary)] select-none">
            Method
          </label>
          <IconSelect
            variant="default"
            name="paymentMethod"
            value={formData.paymentMethod}
            onChange={handleChange}
            options={PAYMENT_METHODS}
            disabled={readOnly || isSubmitting}
          />
        </div>
        {showStatus && (
          <div className="flex flex-col gap-1 w-full min-w-0">
            <label className="text-xs font-medium text-[var(--text-secondary)] select-none">
              Status
            </label>
            <IconSelect
              variant="default"
              name="status"
              value={formData.status}
              onChange={handleChange}
              options={STATUS_OPTIONS}
              disabled={readOnly || isSubmitting}
            />
          </div>
        )}
      </div>

      {/* ── TRANSACTION ID / UTR ───────────────────────────────────── */}
      {showTxn && (
        <div className="flex flex-col gap-1 w-full min-w-0">
          <label
            htmlFor="payment-transaction-id"
            className="text-xs font-medium text-[var(--text-secondary)] select-none"
          >
            {formData.paymentMethod === 'upi_manual' ? 'UTR / Reference' : 'Transaction ID'}
          </label>
          <div
            className={cn(
              'relative flex items-center h-11 min-h-[44px] px-3 rounded-[8px] border transition-colors',
              'bg-[var(--input-bg)] text-[16px] sm:text-sm text-[var(--text-primary)]',
              'border-[var(--border-contrast)] hover:border-[var(--border-contrast-hover)] focus-within:ring-2 focus-within:ring-[var(--brand)]',
              (readOnly || isSubmitting) && 'opacity-60 cursor-not-allowed bg-[var(--input-bg-disabled)]'
            )}
          >
            <input
              id="payment-transaction-id"
              type="text"
              name="transactionId"
              value={formData.transactionId}
              onChange={handleChange}
              placeholder={
                formData.paymentMethod === 'upi_manual' ? 'e.g. HDFC12345678' : 'e.g. pay_XXXXXXXXXX'
              }
              disabled={readOnly || isSubmitting}
              className="w-full bg-transparent text-[var(--text-primary)] font-medium outline-none border-none p-0 text-[16px] sm:text-sm placeholder:text-[var(--text-muted)]"
            />
          </div>
        </div>
      )}

      {/* ── REMARKS ────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-1 w-full min-w-0">
        <label
          htmlFor="payment-remarks"
          className="text-xs font-medium text-[var(--text-secondary)] select-none"
        >
          Remarks (Optional)
        </label>
        <textarea
          id="payment-remarks"
          name="remarks"
          value={formData.remarks}
          onChange={handleChange}
          rows={2}
          disabled={readOnly || isSubmitting}
          placeholder={readOnly ? '' : 'Add any notes about this payment…'}
          className="w-full min-h-[44px] px-3 py-2 rounded-[8px] border border-[var(--border-contrast)] hover:border-[var(--border-contrast-hover)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)] bg-[var(--input-bg)] text-[16px] sm:text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none transition-colors resize-none disabled:opacity-60 disabled:cursor-not-allowed"
        />
      </div>

      {/* Fallback footer if not rendered by modal shell */}
      {!renderFooter && (
        <div className="record-form-actions mt-2 pt-3 border-t border-[var(--border-default)]">
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={onCancel}
            disabled={isSubmitting}
            className="flex-1"
          >
            {readOnly ? 'Close' : 'Cancel'}
          </Button>
          {!readOnly && (
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={!isValidToSave || isSubmitting}
              isLoading={isSubmitting}
              className="flex-1"
            >
              {saveLabel}
            </Button>
          )}
        </div>
      )}
    </form>
  );
};

PaymentForm.displayName = 'PaymentForm';
export default PaymentForm;
