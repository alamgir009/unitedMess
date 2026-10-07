import { useState, useEffect, useRef, useCallback, useId } from 'react';
import { useDispatch } from 'react-redux';
import { FiCalendar, FiAlertTriangle, FiUser, FiShield } from 'react-icons/fi';
import { HiCheckCircle, HiXCircle, HiClock } from 'react-icons/hi2';
import { fetchUsers } from '../../../members/store/members.slice';
import membersService from '../../../members/services/members.service';
import toast from 'react-hot-toast';
import apiClient from '@/services/api/client/apiClient';
import { cn } from '@/core/utils/helpers/string.helper';
import { format } from 'date-fns';
import { Modal, Button, IconSelect, Badge } from '@/shared/components/ui';
import { getBillingPeriod } from '@shared/utils/billingPeriod';
import { resolveBillStatus } from '@shared/utils/paymentStatus';

/**
 * Billing exemption is MANUAL and PERIOD-SCOPED.
 * There is deliberately no date / join-date heuristic here — the admin picks
 * the billing period and the rule explicitly. See backend
 * billingExemption.service.js for the single source of truth.
 *
 * Layout contract (responsive):
 *   ≤639px  → bottom sheet, everything stacked, 1-column field grids
 *   ≥640px  → centred dialog capped at max-w-2xl (672px)
 *   grids   → grid-cols-1 sm:grid-cols-2 (a 2-col row at 640px still gets
 *             ~274px per field, vs the ~125px this modal used to have)
 * The legacy right-hand sidebar was removed: it consumed 40% of a 576px
 * dialog and the dialog never grew with the viewport.
 */
const OVERRIDE_NONE = 'none';
const OVERRIDE_EXEMPT = 'force_exempt';
const OVERRIDE_BILL = 'force_bill';

const EXEMPTION_OPTIONS = [
  { value: OVERRIDE_NONE, label: 'Auto', hint: 'Zero-activity rule decides' },
  { value: OVERRIDE_EXEMPT, label: 'Exempt', hint: 'Never billed this period' },
  { value: OVERRIDE_BILL, label: 'Bill anyway', hint: 'Billed even with no activity' },
];

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

const MONTH_OPTIONS = MONTH_NAMES.map((m, i) => ({
  value: String(i + 1),
  label: m,
  Icon: FiCalendar,
  iconClass: 'text-[var(--text-secondary)]',
}));

const STATUS_LABELS = {
  approved: 'Approved',
  pending: 'Pending',
  denied: 'Denied',
};

const EMPTY_EXEMPTION = {
  loading: false,
  invoiceId: null,
  isFinalized: false,
  paidAmount: 0,
  isExempt: false,
  override: OVERRIDE_NONE,
  savedOverride: OVERRIDE_NONE,
  reason: '',
  savedReason: '',
};

const AVATAR_COLORS = [
  'from-blue-500 to-indigo-600',
  'from-rose-500 to-pink-600',
  'from-emerald-500 to-teal-600',
  'from-amber-500 to-orange-600',
  'from-violet-500 to-purple-600',
  'from-cyan-500 to-sky-600',
];

const getAvatarColor = (name = '') => {
  const idx = name.charCodeAt(0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx] || AVATAR_COLORS[0];
};

const inputClasses =
  'w-full h-10 px-3 py-2.5 rounded-xl ' +
  'border border-[var(--input-border)] ' +
  'bg-[var(--input-bg)] ' +
  'shadow-[var(--inset-inner),var(--inset-top-glow)] ' +
  'focus:ring-2 focus:ring-[var(--brand)]/25 focus:border-[var(--brand)] ' +
  'outline-none transition-all duration-150 ' +
  'text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] ' +
  'hover:border-[var(--input-border-hover)] ' +
  '-webkit-appearance:none';

const labelClasses = 'text-xs font-semibold uppercase tracking-wider text-muted-foreground';
const eyebrowClasses = 'text-[11px] font-bold uppercase tracking-wider text-muted-foreground';

const buildInitialFormData = (user) => ({
  name: user?.name || '',
  email: user?.email || '',
  phone: user?.phone || '',
  role: user?.role || 'user',
  userStatus: user?.userStatus || 'pending',
  isActive: user?.isActive ?? true,
  denialReason: '',
});

const UserEditModal = ({ isOpen, onClose, user }) => {
  const dispatch = useDispatch();
  const formRef = useRef(null);
  const reactId = useId();
  const fieldId = (key) => `${reactId}-${key}`;

  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState(() => buildInitialFormData(null));
  const [initialData, setInitialData] = useState(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  // ── Billing exemption (admin, manual, per billing period) ──────────
  const [period, setPeriod] = useState(() => {
    const p = getBillingPeriod();
    return { month: p.month, year: p.year };
  });
  const [exemption, setExemption] = useState(EMPTY_EXEMPTION);
  const [isSavingExemption, setIsSavingExemption] = useState(false);
  const exemptionRequestId = useRef(0);

  const currentYear = new Date().getUTCFullYear();
  const YEAR_OPTIONS = Array.from(
    new Set([period.year, currentYear, currentYear - 1, currentYear - 2])
  ).sort((a, b) => b - a).map((y) => ({
    value: String(y),
    label: String(y),
    Icon: FiCalendar,
    iconClass: 'text-[var(--text-secondary)]',
  }));

  /**
   * Initialise profile fields when the MEMBER changes — keyed on the id, not
   * the object reference, so a list refresh (fetchUsers) cannot clobber
   * unsaved edits or reset the selected billing period.
   */
  useEffect(() => {
    if (!user?._id) return;
    const next = buildInitialFormData(user);
    setFormData(next);
    setInitialData(next);
    setConfirmDiscard(false);
    const p = getBillingPeriod();
    setPeriod({ month: p.month, year: p.year });
  }, [user?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadExemption = useCallback(async () => {
    if (!user?._id) return;
    const requestId = ++exemptionRequestId.current;
    setExemption((prev) => ({ ...prev, loading: true }));

    try {
      const res = await membersService.getInvoiceExemptionStatus(
        user._id, period.month, period.year,
      );
      if (requestId !== exemptionRequestId.current) return; // stale period

      const data = res?.data;
      if (!data?.exists) {
        setExemption({ ...EMPTY_EXEMPTION });
        return;
      }

      const override = EXEMPTION_OPTIONS.some((o) => o.value === data.override)
        ? data.override
        : OVERRIDE_NONE;
      const reason = data.exemptReason || '';

      setExemption({
        loading: false,
        invoiceId: data.invoiceId,
        isFinalized: !!data.isFinalized,
        paidAmount: Number(data.paidAmount) || 0,
        isExempt: !!data.isExempt,
        override,
        savedOverride: override,
        reason,
        savedReason: reason,
      });
    } catch {
      if (requestId !== exemptionRequestId.current) return;
      // Endpoint only rejects on bad params — treat as "no bill yet" so the
      // panel degrades gracefully instead of showing a broken control.
      setExemption({ ...EMPTY_EXEMPTION });
    }
  }, [user?._id, period.year, period.month]);

  useEffect(() => {
    if (!isOpen) return;
    loadExemption();
  }, [isOpen, loadExemption]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleBooleanChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value === 'true' }));
  };

  const handlePeriodChange = (e) => {
    const { name, value } = e.target;
    setPeriod((prev) => ({ ...prev, [name]: Number(value) }));
  };

  const handleExemptionChange = (patch) => setExemption((prev) => ({ ...prev, ...patch }));

  const selectOverride = (value) => {
    if (value === OVERRIDE_EXEMPT && exemption.paidAmount > 0 && !exemption.isExempt) return;
    // Leaving "Exempt" drops the reason: it is only meaningful for an exempt
    // rule, and keeping it would leave Save permanently enabled with the
    // textarea hidden.
    handleExemptionChange(value === OVERRIDE_EXEMPT ? { override: value } : { override: value, reason: '' });
  };

  const handleSegmentKeyDown = (e) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
    e.preventDefault();
    const delta = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1;
    const count = EXEMPTION_OPTIONS.length;
    let idx = EXEMPTION_OPTIONS.findIndex((o) => o.value === exemption.override);
    for (let step = 0; step < count; step++) {
      idx = (idx + delta + count) % count;
      const candidate = EXEMPTION_OPTIONS[idx].value;
      if (candidate === OVERRIDE_EXEMPT && exemption.paidAmount > 0 && !exemption.isExempt) continue;
      selectOverride(candidate);
      break;
    }
  };

  const formDirty = !!initialData && JSON.stringify(formData) !== JSON.stringify(initialData);
  const exemptionDirty =
    exemption.override !== exemption.savedOverride ||
    exemption.reason.trim() !== exemption.savedReason.trim();
  const isDirty = formDirty || exemptionDirty;

  const reasonTooShort =
    exemption.override === OVERRIDE_EXEMPT && exemption.reason.trim().length < 5;
  const exemptBlocked =
    exemption.override === OVERRIDE_EXEMPT &&
    exemption.paidAmount > 0 &&
    !exemption.isExempt;
  const canSaveExemption =
    !!exemption.invoiceId && !exemption.loading && !isSavingExemption &&
    exemptionDirty && !reasonTooShort && !exemptBlocked;

  const handleSaveExemption = async () => {
    if (!exemption.invoiceId) {
      toast.error('No bill has been generated for this period yet.');
      return;
    }
    if (exemption.override === OVERRIDE_EXEMPT && exemption.reason.trim().length < 5) {
      toast.error('A reason of at least 5 characters is required to exempt a member.');
      return;
    }

    setIsSavingExemption(true);
    try {
      await membersService.updateInvoiceExemption(exemption.invoiceId, {
        override: exemption.override,
        ...(exemption.override === OVERRIDE_EXEMPT ? { reason: exemption.reason.trim() } : {}),
      });

      toast.success('Billing exemption updated');
      dispatch(fetchUsers({ page: 1, limit: 100 }));
      await loadExemption();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to update billing exemption');
    } finally {
      setIsSavingExemption(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const statusChanged = formData.userStatus !== user.userStatus;

      if (statusChanged) {
        try {
          if (formData.userStatus === 'approved') {
            await apiClient.post(`users/${user._id}/approve`);
          } else if (formData.userStatus === 'denied') {
            await apiClient.post(`users/${user._id}/deny`, {
              reason: formData.denialReason || 'Admin Action',
            });
          }
        } catch (statusError) {
          const msg = statusError?.response?.data?.message || '';
          if (!msg.toLowerCase().includes('already approved') && !msg.toLowerCase().includes('already denied')) {
            throw statusError;
          }
        }
      }

      await apiClient.patch(`users/${user._id}`, formData);

      toast.success('User updated successfully');
      dispatch(fetchUsers({ page: 1, limit: 100 }));
      setInitialData(formData);
      onClose();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to update user');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Close request (✕ / Escape / overlay). Unsaved edits swap the footer into
   * an inline confirm row instead of nesting a second Modal — a nested dialog
   * sits outside the parent's focus trap and becomes keyboard-unreachable.
   */
  const handleRequestClose = useCallback(() => {
    if (isDirty) {
      setConfirmDiscard(true);
      return;
    }
    onClose();
  }, [isDirty, onClose]);

  if (!user) return null;

  const avatarColor = getAvatarColor(user.name);
  const joinedDate = user.createdAt ? format(new Date(user.createdAt), 'MMM d, yyyy') : 'N/A';

  const statusVariant =
    user.userStatus === 'approved' ? 'success'
      : user.userStatus === 'pending' ? 'warning' : 'error';
  // Canonical tokens — resolveBillStatus keeps 'refunded' (settled) and
  // 'refund' (still owed) distinct; the old `=== 'refund'` branch was dead
  // (stored enum has no 'refund') so settled refunds fell through to "unpaid".
  const mealBill = resolveBillStatus({ status: user.payment, payableAmount: user.paybleAmountforMeal });
  const gasBill  = resolveBillStatus({ status: user.gasBill, payableAmount: user.gasBillCharge });
  const toState = (token) =>
    token === 'success' ? 'paid'
      : token === 'refunded' ? 'refunded'
      : token === 'refund' ? 'refundDue'
      : 'unpaid';
  const mealState = toState(mealBill);
  const gasState = toState(gasBill);
  const moneyState = (state) =>
    state === 'paid' ? 'success'
      : state === 'refunded' || state === 'refundDue' ? 'info'
      : 'error';
  const moneyLabel = (word, state) =>
    state === 'refunded' ? `${word} refunded`
      : state === 'refundDue' ? `${word} refund due`
      : state === 'paid' ? `${word} paid`
      : `${word} unpaid`;

  const footer = confirmDiscard ? (
    <div className="flex w-full flex-col-reverse gap-2.5 sm:flex-row sm:items-center">
      <span className="flex items-center gap-1.5 text-xs font-semibold text-warning sm:mr-auto">
        <FiAlertTriangle size={13} className="shrink-0" />
        Unsaved changes
      </span>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="w-full sm:w-auto"
        onClick={() => setConfirmDiscard(false)}
      >
        Keep editing
      </Button>
      <Button
        type="button"
        variant="destructive"
        size="sm"
        className="w-full sm:w-auto"
        onClick={onClose}
      >
        Discard
      </Button>
    </div>
  ) : (
    <div className="flex w-full gap-2.5">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="flex-1"
        onClick={handleRequestClose}
        disabled={isLoading}
      >
        Cancel
      </Button>
      <Button
        type="button"
        variant="primary"
        size="sm"
        className="flex-[2]"
        onClick={() => formRef.current?.requestSubmit()}
        disabled={isLoading || !formDirty}
        isLoading={isLoading}
      >
        Save Changes
      </Button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleRequestClose}
      title="Edit Member"
      accentColor="blue"
      size="2xl"
      mobileSheet
      closeOnOverlayClick={!isDirty}
      footer={footer}
    >
      <div className="flex flex-col gap-5">
        {/* ── Identity header (replaces the old fixed sidebar) ─────────── */}
        <div className="flex flex-col gap-3">
          <div className="flex items-start gap-3 sm:gap-4">
            <div
              className={cn(
                'flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr text-lg font-bold text-white shadow-md sm:h-12 sm:w-12',
                avatarColor
              )}
              aria-hidden="true"
            >
              {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground sm:text-base">
                {user.name}
              </p>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                <span className="font-mono">#{user._id?.slice(-8).toUpperCase()}</span>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1">
                  <FiCalendar size={11} className="shrink-0" />
                  Joined {joinedDate}
                </span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <Badge variant={statusVariant} size="sm">
              {STATUS_LABELS[user.userStatus] || 'Pending'}
            </Badge>
            <Badge variant={user.isActive ? 'success' : 'default'} size="sm">
              {user.isActive ? 'Active' : 'Inactive'}
            </Badge>
            <Badge variant={moneyState(mealState)} size="sm">
              {moneyLabel('Meal', mealState)}
            </Badge>
            <Badge variant={moneyState(gasState)} size="sm">
              {moneyLabel('Gas', gasState)}
            </Badge>
          </div>
        </div>

        {/* ── Billing exemption — a separate transaction, in its own card ─ */}
        <section
          aria-labelledby={fieldId('exempt-title')}
          className="rounded-xl border border-border bg-muted/40 p-4 dark:bg-white/[0.02] sm:p-5"
        >
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3
                id={fieldId('exempt-title')}
                className="flex items-center gap-2 text-sm font-semibold text-foreground"
              >
                <FiShield size={15} className="shrink-0 text-[var(--brand)]" />
                Billing exemption
              </h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Manual override for one period — never derived from the join date.
              </p>
            </div>
            {!exemption.loading && exemption.invoiceId && (
              <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                <Badge variant={exemption.isExempt ? 'info' : 'default'} size="sm">
                  {exemption.isExempt ? 'Exempt' : 'Billed'}
                </Badge>
                {exemption.isFinalized && (
                  <Badge variant="warning" size="sm">Finalized</Badge>
                )}
              </div>
            )}
          </div>

          <div className="mb-4 grid grid-cols-2 gap-3">
            <div className="flex min-w-0 flex-col gap-1.5" role="group" aria-labelledby={fieldId('period-month')}>
              <span id={fieldId('period-month')} className={labelClasses}>Billing month</span>
              <IconSelect
                name="month"
                value={String(period.month)}
                onChange={handlePeriodChange}
                options={MONTH_OPTIONS}
                disabled={exemption.loading || isSavingExemption}
              />
            </div>
            <div className="flex min-w-0 flex-col gap-1.5" role="group" aria-labelledby={fieldId('period-year')}>
              <span id={fieldId('period-year')} className={labelClasses}>Billing year</span>
              <IconSelect
                name="year"
                value={String(period.year)}
                onChange={handlePeriodChange}
                options={YEAR_OPTIONS}
                disabled={exemption.loading || isSavingExemption}
              />
            </div>
          </div>

          <div
            role="radiogroup"
            aria-label="Billing exemption rule"
            onKeyDown={handleSegmentKeyDown}
            className="grid grid-cols-3 gap-1 rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] p-1"
          >
            {EXEMPTION_OPTIONS.map((opt) => {
              const active = exemption.override === opt.value;
              const locked =
                opt.value === OVERRIDE_EXEMPT &&
                exemption.paidAmount > 0 &&
                !exemption.isExempt;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  disabled={exemption.loading || isSavingExemption || locked}
                  title={locked ? 'A payment is already recorded — refund it before exempting' : undefined}
                  onClick={() => selectOverride(opt.value)}
                  className={cn(
                    'h-9 rounded-lg px-1 text-xs font-semibold transition-all duration-150',
                    'disabled:cursor-not-allowed disabled:opacity-45',
                    active
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--text-primary)]/5',
                  )}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            {EXEMPTION_OPTIONS.find((o) => o.value === exemption.override)?.hint}
          </p>

          {exemption.override === OVERRIDE_EXEMPT && (
            <div className="mt-3 flex flex-col gap-1.5">
              <label htmlFor={fieldId('exempt-reason')} className={labelClasses}>
                Reason <span className="text-danger normal-case">(min 5 characters)</span>
              </label>
              <textarea
                id={fieldId('exempt-reason')}
                rows={2}
                value={exemption.reason}
                onChange={(e) => handleExemptionChange({ reason: e.target.value })}
                placeholder="Why is this member exempt for this period?"
                className={cn(inputClasses, 'h-auto resize-none py-2')}
              />
            </div>
          )}

          {exemption.loading && (
            <p className="mt-3 animate-pulse text-xs text-muted-foreground" role="status">
              Loading bill for {MONTH_NAMES[period.month - 1]} {period.year}…
            </p>
          )}

          {!exemption.loading && !exemption.invoiceId && (
            <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-warning-border bg-warning-bg p-3">
              <FiAlertTriangle size={14} className="mt-0.5 shrink-0 text-warning" />
              <p className="text-xs text-warning">
                No bill generated for {MONTH_NAMES[period.month - 1]} {period.year} yet.
                The rule can be set once the bill exists.
              </p>
            </div>
          )}

          {!exemption.loading && exemption.invoiceId && exemptBlocked && (
            <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-warning-border bg-warning-bg p-3">
              <FiAlertTriangle size={14} className="mt-0.5 shrink-0 text-warning" />
              <p className="text-xs text-warning">
                ₹{exemption.paidAmount} already recorded against this bill — exempting it is
                blocked until the payment is refunded.
              </p>
            </div>
          )}

          {!exemption.loading && exemption.invoiceId && (
            <div className="mt-4 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-xs text-muted-foreground">
                Current:{' '}
                <span className={cn('font-bold', exemption.isExempt ? 'text-info' : 'text-foreground')}>
                  {exemption.isExempt ? 'Exempt' : 'Billed'}
                </span>
                {exemption.isFinalized && ' · finalized'}
              </span>
              <Button
                type="button"
                variant={exemptionDirty ? 'primary' : 'secondary'}
                size="sm"
                onClick={handleSaveExemption}
                disabled={!canSaveExemption}
                isLoading={isSavingExemption}
                className="w-full sm:w-auto"
              >
                Save Exemption
              </Button>
            </div>
          )}
        </section>

        {/* ── Profile form (a genuinely separate transaction) ───────────── */}
        <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-5">
          <section aria-labelledby={fieldId('identity')}>
            <p id={fieldId('identity')} className={cn(eyebrowClasses, 'mb-3')}>Identity</p>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label htmlFor={fieldId('name')} className={labelClasses}>Full name</label>
                <input
                  id={fieldId('name')}
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className={inputClasses}
                  autoComplete="name"
                  required
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex min-w-0 flex-col gap-1.5">
                  <label htmlFor={fieldId('email')} className={labelClasses}>Email</label>
                  <input
                    id={fieldId('email')}
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    className={inputClasses}
                    autoComplete="email"
                    required
                  />
                </div>
                <div className="flex min-w-0 flex-col gap-1.5">
                  <label htmlFor={fieldId('phone')} className={labelClasses}>Phone</label>
                  <input
                    id={fieldId('phone')}
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    className={inputClasses}
                    autoComplete="tel"
                  />
                </div>
              </div>
            </div>
          </section>

          <section
            aria-labelledby={fieldId('access')}
            className="border-t border-border/60 pt-5"
          >
            <p id={fieldId('access')} className={cn(eyebrowClasses, 'mb-3')}>Access &amp; Status</p>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5" role="group" aria-labelledby={fieldId('role')}>
                <span id={fieldId('role')} className={labelClasses}>Role</span>
                <IconSelect
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  options={[
                    { value: 'user', label: 'Regular User', Icon: FiUser, iconClass: 'text-[var(--text-secondary)]' },
                    { value: 'admin', label: 'Administrator', Icon: FiShield, iconClass: 'text-[var(--brand)]' },
                  ]}
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex min-w-0 flex-col gap-1.5" role="group" aria-labelledby={fieldId('status')}>
                  <span id={fieldId('status')} className={labelClasses}>Approval status</span>
                  <IconSelect
                    name="userStatus"
                    value={formData.userStatus}
                    onChange={handleChange}
                    options={[
                      { value: 'approved', label: 'Approved', Icon: HiCheckCircle, iconClass: 'text-[var(--success)]' },
                      { value: 'pending', label: 'Pending', Icon: HiClock, iconClass: 'text-[var(--warning)]' },
                      { value: 'denied', label: 'Denied', Icon: HiXCircle, iconClass: 'text-[var(--danger)]' },
                    ]}
                  />
                </div>
                <div className="flex min-w-0 flex-col gap-1.5" role="group" aria-labelledby={fieldId('active')}>
                  <span id={fieldId('active')} className={labelClasses}>Active state</span>
                  <IconSelect
                    name="isActive"
                    value={formData.isActive.toString()}
                    onChange={handleBooleanChange}
                    options={[
                      { value: 'true', label: 'Active', Icon: HiCheckCircle, iconClass: 'text-[var(--success)]' },
                      { value: 'false', label: 'Inactive', Icon: HiXCircle, iconClass: 'text-[var(--text-tertiary)]' },
                    ]}
                  />
                </div>
              </div>

              {formData.userStatus === 'denied' && (
                <div className="flex flex-col gap-1.5">
                  <label htmlFor={fieldId('denial')} className={cn(labelClasses, 'text-danger')}>
                    Denial reason (required for email)
                  </label>
                  <input
                    id={fieldId('denial')}
                    name="denialReason"
                    value={formData.denialReason}
                    onChange={handleChange}
                    placeholder="Brief reason for account denial..."
                    className={cn(
                      inputClasses,
                      'border-destructive/30 bg-destructive/5 placeholder:text-destructive/40 focus:border-destructive/50 focus:ring-destructive/20',
                    )}
                    required
                  />
                </div>
              )}
            </div>
          </section>
        </form>
      </div>
    </Modal>
  );
};

export default UserEditModal;
