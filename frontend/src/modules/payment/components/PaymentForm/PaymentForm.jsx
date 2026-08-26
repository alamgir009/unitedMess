import { useState, useEffect, useRef, useCallback } from 'react';
import { format } from 'date-fns';
import {
    HiOutlineCurrencyRupee,
    HiOutlineCalendarDays,
    HiOutlineCreditCard,
    HiOutlineTag,
    HiOutlineCheckCircle,
    HiOutlineChatBubbleBottomCenterText,
    HiOutlineUser,
    HiOutlineChevronDown,
    HiOutlineLockClosed,
    HiOutlineArrowPath,
} from 'react-icons/hi2';
import { BsCashCoin, BsGlobe2 } from 'react-icons/bs';
import { MdPendingActions, MdCheckCircleOutline, MdErrorOutline, MdRefresh } from 'react-icons/md';
import apiClient from '@/services/api/client/apiClient';
import paymentService from '../../services/payment.service';
import { Button, Avatar, MemberSelect } from '@/shared/components/ui';
import { SiRazorpay } from "react-icons/si";
import { HiOutlineIdentification } from 'react-icons/hi2';
import toast from 'react-hot-toast';

/* ─── Constants ─────────────────────────────────────────────── */

const MONTHS = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December',
];

const currentMonthYear = () => {
    const d = new Date();
    return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

const monthYearFromDate = (dateStr) => {
    if (!dateStr) return currentMonthYear();
    const d = new Date(dateStr + 'T12:00:00Z');
    return `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
};

const PAYMENT_TYPES = [
    { value: 'mess_bill', label: 'Mess Bill', color: 'bg-[var(--accent-primary)] text-[var(--text-on-brand)]' },
    { value: 'gas_bill',  label: 'Gas Bill',  color: 'bg-[var(--warning)] text-[#1A1A1A]' },
    { value: 'other',     label: 'Other',     color: 'bg-[var(--bg-muted)] text-[var(--text-primary)]' },
];

// Single source of truth: paymentType → payable-batch cache key.
const PAYABLE_KEY_FOR_TYPE = {
    mess_bill: 'messPayable',
    gas_bill: 'gasPayable',
    other: null, // no payable to auto-fill → 0
};

const PAYMENT_METHODS = [
    { value: 'cash',       label: 'Cash',       Icon: BsCashCoin,           iconClass: 'text-[var(--success)]' },
    { value: 'online',     label: 'Online',     Icon: BsGlobe2,             iconClass: 'text-[var(--info)]'     },
    { value: 'razorpay',   label: 'Razorpay',   Icon: SiRazorpay,           iconClass: 'text-[var(--accent-primary)]'  },
    { value: 'upi_manual', label: 'Manual UPI', Icon: HiOutlineIdentification, iconClass: 'text-[var(--info)]' },
];

const STATUS_OPTIONS = [
    { value: 'pending',   label: 'Pending',   Icon: MdPendingActions,     iconClass: 'text-[var(--warning)]'   },
    { value: 'completed', label: 'Completed', Icon: MdCheckCircleOutline, iconClass: 'text-[var(--success)]' },
    { value: 'failed',    label: 'Failed',    Icon: MdErrorOutline,       iconClass: 'text-[var(--danger)]'    },
    { value: 'refunded',  label: 'Refunded',  Icon: MdRefresh,            iconClass: 'text-[var(--info)]'     },
];

/* ─── Design tokens ─────────────────────────────────────────── */

const inputBase =
    'w-full px-3 py-2 rounded-xl border border-[var(--input-border)] ' +
    'bg-[var(--input-bg)] ' +
    'focus:ring-0 focus:border-[var(--input-border-focus)] ' +
    'outline-none transition-all duration-200 ' +
    'text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] ' +
    'hover:border-[var(--input-border-hover)] ' +
    'dark:shadow-[var(--inset-top-glow),var(--shadow-xs)] dark:focus:shadow-[var(--inset-top-glow),var(--shadow-xs),0_0_0_3px_rgba(var(--brand-rgb),0.15)]';

const inputDisabled = 'opacity-60 cursor-not-allowed pointer-events-none select-none';

/* ─── Field wrapper ─────────────────────────────────────────── */
const Field = ({ label, icon: Icon, children, className = '' }) => (
    <div className={`flex flex-col gap-1.5 ${className}`}>
        <label className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)] select-none">
            {Icon && <Icon className="w-3 h-3 shrink-0 opacity-60" />}
            {label}
        </label>
        {children}
    </div>
);

/* ─── Custom icon dropdown ──────────────────────────────────── */
const IconDropdown = ({ name, value, onChange, options, disabled = false }) => {
    const [open, setOpen] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const ref = useRef(null);
    const listRef = useRef(null);
    const selected = options.find(o => o.value === value) ?? options[0];

    useEffect(() => {
        const handler = (e) => {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    useEffect(() => {
        if (open) {
            const idx = options.findIndex(o => o.value === value);
            setHighlightedIndex(idx >= 0 ? idx : 0);
        }
    }, [open, value, options]);

    useEffect(() => {
        if (!open || highlightedIndex < 0) return;
        const items = listRef.current?.querySelectorAll('[role="option"]');
        items?.[highlightedIndex]?.scrollIntoView({ block: 'nearest' });
    }, [open, highlightedIndex]);

    const pick = (val) => {
        if (disabled) return;
        onChange({ target: { name, value: val } });
        setOpen(false);
    };

    const handleKeyDown = (e) => {
        if (disabled) return;
        if (!open) {
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setOpen(true);
            }
            return;
        }
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setHighlightedIndex(i => (i + 1) % options.length);
                break;
            case 'ArrowUp':
                e.preventDefault();
                setHighlightedIndex(i => (i - 1 + options.length) % options.length);
                break;
            case 'Enter':
            case ' ':
                e.preventDefault();
                if (highlightedIndex >= 0) pick(options[highlightedIndex].value);
                break;
            case 'Escape':
                e.preventDefault();
                setOpen(false);
                break;
            default:
                break;
        }
    };

    return (
        <div ref={ref} className="relative w-full">
            <button
                type="button"
                onClick={() => !disabled && setOpen(o => !o)}
                onKeyDown={handleKeyDown}
                aria-haspopup="listbox"
                aria-expanded={open}
                className={`${inputBase} flex items-center justify-between gap-2 text-left
                    ${disabled ? inputDisabled : 'cursor-pointer'}`}
            >
                <span className="flex items-center gap-2 truncate">
                    <selected.Icon className={`w-4 h-4 shrink-0 ${selected.iconClass}`} />
                    <span className="truncate text-sm">{selected.label}</span>
                </span>
                {!disabled && (
                    <HiOutlineChevronDown
                        className={`w-4 h-4 shrink-0 text-[var(--text-tertiary)] transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                    />
                )}
            </button>

            {open && !disabled && (
                <div
                    ref={listRef}
                    role="listbox"
                    aria-label={`${name} options`}
                    className="absolute z-50 top-full mt-1.5 w-full rounded-xl border border-[var(--border-muted)] bg-[var(--bg-elevated)] overflow-hidden max-h-[200px] overflow-y-auto [scrollbar-width:thin] [scrollbar-color:var(--border-strong)_transparent]"
                    style={{ boxShadow: 'var(--shadow-lg), var(--inset-top-glow)' }}
                >
                    {options.map((opt, idx) => (
                        <button
                            key={opt.value}
                            type="button"
                            role="option"
                            aria-selected={value === opt.value}
                            onClick={() => pick(opt.value)}
                            onMouseEnter={() => setHighlightedIndex(idx)}
                            className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors duration-100
                                ${value === opt.value
                                    ? 'bg-[var(--accent-subtle)] text-[var(--accent-primary)] font-medium'
                                    : idx === highlightedIndex
                                        ? 'bg-[var(--bg-muted)] text-[var(--text-primary)]'
                                        : 'hover:bg-[var(--bg-muted)] text-[var(--text-primary)]'
                                }`}
                        >
                            <opt.Icon className={`w-4 h-4 shrink-0 ${opt.iconClass}`} />
                            <span>{opt.label}</span>
                            {value === opt.value && (
                                <HiOutlineCheckCircle className="ml-auto w-4 h-4 text-[var(--accent-primary)]" />
                            )}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

/* ─── Payment type toggle button (segmented pill control) ───── */
const TypeBtn = ({ value, current, onClick, label, color, disabled = false }) => (
    <button
        type="button"
        onClick={() => !disabled && onClick(value)}
        disabled={disabled}
        className={`flex-1 min-w-0 py-2.5 px-2 rounded-full text-xs font-semibold
            tracking-wide transition-all duration-200 text-center truncate
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            ${current === value
                ? `${color} shadow-sm`
                : disabled
                    ? 'bg-[var(--bg-muted)] text-[var(--text-tertiary)]'
                    : 'bg-[var(--bg-muted)] text-[var(--text-secondary)] hover:bg-[var(--border-strong)] hover:text-[var(--text-primary)]'
            }`}
    >
        {label}
    </button>
);

/* ─── ReadOnly banner ───────────────────────────────────────── */
const ReadOnlyBanner = () => (
    <div
        className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[var(--warning-bg)] border border-[var(--warning-border)] text-[var(--warning-text)]"
        style={{ boxShadow: 'var(--inset-top-glow)' }}
    >
        <HiOutlineLockClosed className="w-3.5 h-3.5 flex-shrink-0 opacity-80" />
        <p className="text-xs font-medium">View only — only admins can edit payment records</p>
    </div>
);

/* ─── PaymentForm ───────────────────────────────────────────── */
/**
 * @param {Object}   initialData        - payment record to edit/view (null for create)
 * @param {Function} onSubmit           - called with form data (create/update)
 * @param {Function} onCancel           - close modal
 * @param {boolean}  isAdmin            - admin role flag
 * @param {Object}   currentUser        - logged-in user object
 * @param {boolean}  readOnly           - view-only mode for non-admins viewing their payment
 * @param {boolean}  isSubmitting       - disable form while submitting
 * @param {string}   preselectedUserId  - pre-select member in MemberSelect (create mode only)
 */
const PaymentForm = ({ initialData, onSubmit, onCancel, isAdmin = false, currentUser, readOnly = false, isSubmitting = false, preselectedUserId = null }) => {

    const [formData, setFormData] = useState({
        amount:        '',
        paymentDate:   format(new Date(), 'yyyy-MM-dd'),
        month:         currentMonthYear(),
        type:          'mess_bill',
        status:        'completed',
        paymentMethod: 'cash',
        transactionId: '',
        remarks:       '',
        userId:        '',
        userIds:       [],
    });

    const [users, setUsers]              = useState([]);
    const [isUsersLoading, setUsersLoad] = useState(false);

    /* ── Payable amounts cache + batch-loaded state ── */
    const payableCacheRef = useRef(new Map());
    const previousAmountsRef = useRef({});
    const [isPayableLoading, setPayableLoading] = useState(false);
    const [isBatchLoaded, setBatchLoaded] = useState(false);

    /* Admin: fetch member list + batch payable amounts */
    useEffect(() => {
        if (!isAdmin) return;
        setUsersLoad(true);
        apiClient.get('/users?limit=500&userStatus=approved&isActive=true')
            .then(async (r) => {
                const userList = r.data?.data?.users || r.data?.users || [];
                setUsers(userList);
                if (userList.length > 0) {
                    try {
                        setPayableLoading(true);
                        const ids = userList.map(u => u._id);
                        const batchRes = await paymentService.getPayableAmountsBatch(ids);
                        const batchData = batchRes?.data || {};
                        for (const [uid, info] of Object.entries(batchData)) {
                            payableCacheRef.current.set(uid, { ...payableCacheRef.current.get(uid), ...info });
                        }
                    } catch (err) {
                        console.error('[PaymentForm] Batch payable fetch failed:', err);
                    } finally {
                        setPayableLoading(false);
                    }
                }
            })
            .catch(console.error)
            .finally(() => {
                setUsersLoad(false);
                setBatchLoaded(true);
            });
    }, [isAdmin]);

    /* ── On-demand resolver: authoritative per-user fetch (self-healing).
       The bulk batch is a fast path, but must NOT be a hard dependency —
       if it is missing/slow/failed on any deployment, a single-member select
       still resolves the exact amount via the legacy per-user endpoints. */
    const resolvePayableForUser = useCallback(async (userId, type, cache) => {
        const key = PAYABLE_KEY_FOR_TYPE[type];
        if (!key || !userId) return null;

        const cachedInfo = cache.get(userId);
        if (cachedInfo && cachedInfo[key] != null) {
            return Number(cachedInfo[key]);
        }

        try {
            // Legacy per-user endpoints (guaranteed on all deployments).
            const legacyRes = key === 'messPayable'
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
            const pd = initialData.paymentDate
                ? format(new Date(initialData.paymentDate), 'yyyy-MM-dd')
                : format(new Date(), 'yyyy-MM-dd');
            const targetUserId = typeof initialData.user === 'object'
                ? initialData.user?._id
                : (initialData.user || '');
            setFormData({
                amount:        initialData.amount        ?? '',
                paymentDate:   pd,
                month:         initialData.month         || monthYearFromDate(pd),
                type:          initialData.type          || 'mess_bill',
                status:        initialData.status        || 'completed',
                paymentMethod: initialData.paymentMethod || 'cash',
                transactionId: initialData.transactionId || '',
                remarks:       initialData.remarks       || '',
                userId:        targetUserId,
                userIds:       targetUserId ? [targetUserId] : [],
            });
        } else {
            const ids = preselectedUserId ? [preselectedUserId] : [];
            setFormData(p => ({ ...p, userId: preselectedUserId || '', userIds: ids }));
        }
    }, [initialData, currentUser, preselectedUserId]);

    /* ── Auto-fill amount when single member is selected or type changes ──
       Mess Bill (messPayable) and Gas Bill (gasPayable) resolve from the
       already-fetched batch cache (client-side, no network round-trip).
       On cache miss the amount is resolved on demand from the authoritative
       per-user endpoints, so the field is never left blank because a bulk
       fetch failed. */
    useEffect(() => {
        if (readOnly || isSubmitting || initialData) return;
        if (formData.userIds.length !== 1) return;

        const selectedId = formData.userIds[0];
        const key = PAYABLE_KEY_FOR_TYPE[formData.type];
        const cache = payableCacheRef.current;
        const cachedInfo = cache.get(selectedId);

        // Fast path: cache hit.
        if (key && cachedInfo && cachedInfo[key] != null) {
            const amount = Number(cachedInfo[key]);
            if (formData.amount !== amount) {
                setFormData(p => {
                    const next = { ...p, amount };
                    if (amount < 0 && p.status === 'completed') next.status = 'refunded';
                    return next;
                });
            }
            return;
        }

        // Slow path: cache miss → fetch the exact user's amount on demand.
        let cancelled = false;
        resolvePayableForUser(selectedId, formData.type, cache).then(value => {
            if (value == null || cancelled) return;
            setFormData(p => {
                if (p.userIds[0] !== selectedId) return p;
                const next = { ...p, amount: value };
                if (value < 0 && p.status === 'completed') next.status = 'refunded';
                return next;
            });
        }).catch(() => {});
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps -- formData.amount must stay out of deps: this effect only reacts to member/type selection, never to every keystroke, so manual amounts are never clobbered.
    }, [formData.userIds, formData.type, readOnly, isSubmitting, initialData, isBatchLoaded, resolvePayableForUser]);

    /* Dynamic filter: block users who already have a completed payment for the selected type.
       Already-selected users are never blocked — lets pre-selected members render as selected. */
    const filterUser = useCallback((u) => {
        if (formData.userIds.includes(u._id)) return false;
        if (formData.type === 'mess_bill') return u.payment === 'success';
        if (formData.type === 'gas_bill') return u.gasBill === 'success';
        return false;
    }, [formData.type, formData.userIds]);

    /* Unified change handler — auto-syncs month from date */
    const handleChange = (e) => {
        if (readOnly || isSubmitting) return;
        const { name, value, type } = e.target;
        setFormData(p => {
            const next = {
                ...p,
                [name]: type === 'number'
                    ? (value === '' ? '' : parseFloat(value) || 0)
                    : value,
            };
            if (name === 'paymentDate' && value) next.month = monthYearFromDate(value);
            return next;
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (readOnly || isSubmitting) return;

        const parsedAmount = parseFloat(formData.amount);
        const isRefund = formData.status === 'refunded';

        // B01: Block zero/negative amounts for non-refund payments
        if (!isRefund && (isNaN(parsedAmount) || parsedAmount <= 0)) {
            toast.error('Please enter a valid amount greater than zero');
            return;
        }

        // B01: Block negative amounts for non-refund status
        if (!isRefund && parsedAmount < 0) {
            toast.error('Amount cannot be negative for non-refund payments');
            return;
        }

        const payload = { ...formData, amount: isRefund ? Math.abs(parsedAmount) : parsedAmount };

        // B02: Soft warning if amount significantly exceeds payable (single-member only)
        if (!isRefund && !initialData && formData.userIds.length === 1) {
            const selectedId = formData.userIds[0];
            const key = PAYABLE_KEY_FOR_TYPE[formData.type];
            const cachedInfo = payableCacheRef.current.get(selectedId);
            const payable = cachedInfo?.[key];
            if (payable != null && parsedAmount > Number(payable) * 1.5) {
                toast(`Heads up: ₹${parsedAmount.toLocaleString('en-IN')} is significantly more than the expected payable of ₹${Number(payable).toLocaleString('en-IN')}`, { icon: '⚠️' });
            }
        }

        if (initialData) {
            payload.userId = formData.userId;
            delete payload.userIds;
        } else {
            payload.userIds = formData.userIds;
            delete payload.userId;
            if (!payload.userIds || payload.userIds.length === 0) {
                toast.error('Please select at least one member');
                return;
            }
        }

        if (!isAdmin) delete payload.status;
        onSubmit(payload);
    };

    /* Month option list: prev year → current → next year */
    const yr = new Date().getFullYear();
    const monthOptions = [yr - 1, yr, yr + 1].flatMap(y => MONTHS.map(m => `${m} ${y}`));

    // Status dropdown: admin only (never shown to regular users)
    const showStatus = isAdmin;
    const showTxn    = formData.paymentMethod === 'online' || formData.paymentMethod === 'razorpay' || formData.paymentMethod === 'upi_manual';

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full">

            {/* Read-only notice */}
            {readOnly && <ReadOnlyBanner />}

            {/* ── Amount preview banner ── */}
            <div
                className={`relative flex items-center justify-center py-4 rounded-2xl border overflow-hidden shrink-0 ${
                    formData.status === 'refunded' && parseFloat(formData.amount) < 0
                        ? 'border-[var(--danger)]/30 bg-[var(--danger-bg)]'
                        : 'border-[var(--accent-primary)]/30 bg-[var(--accent-subtle)]'
                }`}
                style={{ boxShadow: 'var(--inset-top-glow), var(--shadow-xs)' }}
            >
                <div className="flex items-baseline gap-2.5">
                    <span className={`text-[36px] font-black leading-none tracking-[-0.03em] ${
                        formData.status === 'refunded' && parseFloat(formData.amount) < 0
                            ? 'text-[var(--danger)]'
                            : 'text-[var(--text-primary)]'
                    }`}>
                        {formData.status === 'refunded' && Number(formData.amount) < 0 ? '-₹' : '₹'}
                        {formData.amount === '' ? '—' : Math.abs(Number(formData.amount)).toLocaleString('en-IN')}
                    </span>
                    <span className="text-xs font-medium text-[var(--text-muted)]">
                        {formData.status === 'refunded' && parseFloat(formData.amount) < 0 ? 'refund amount' : 'payment amount'}
                    </span>
                </div>
                {isPayableLoading && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <HiOutlineArrowPath className="w-3.5 h-3.5 animate-spin text-[var(--text-muted)]" />
                    </div>
                )}
            </div>

            {/* ── Form fields ── */}
            <div className="flex flex-col gap-4">

                {/* Admin: member selector */}
                {isAdmin && (
                    <Field label="Member" icon={HiOutlineUser}>
                        {initialData ? (
                            /* Edit/View mode — show single member as read-only tag */
                            <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] text-sm dark:shadow-[var(--inset-top-glow),var(--shadow-xs)]">
                                <Avatar
                                    name={typeof initialData.user === 'object' ? initialData.user?.name : ''}
                                    size="xs"
                                />
                                <span className="flex-1 truncate font-medium">
                                    {typeof initialData.user === 'object'
                                        ? initialData.user?.name
                                        : 'Member'
                                    }
                                </span>
                                {typeof initialData.user === 'object' && initialData.user?.email && (
                                    <span className="text-[11px] text-[var(--text-tertiary)] truncate hidden sm:inline">
                                        {initialData.user.email}
                                    </span>
                                )}
                            </div>
                        ) : (
                            <MemberSelect
                                users={users}
                                value={formData.userIds}
                                onChange={(ids) => setFormData(p => ({
                                    ...p,
                                    userIds: ids,
                                    userId: ids.length === 1 ? ids[0] : '',
                                    // Clear amount when selection changes to avoid stale data
                                    // (auto-fill effect will repopulate from cache)
                                    amount: ids.length === 1 ? '' : p.amount,
                                }))}
                                loading={isUsersLoading}
                                disabled={readOnly || isSubmitting}
                                accentColor="primary"
                                filterUser={filterUser}
                            />
                        )}
                    </Field>
                )}

                {/* Amount */}
                <Field label="Amount (₹)" icon={HiOutlineCurrencyRupee}>
                    <div className="relative">
                        <span className={`absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-sm pointer-events-none select-none ${
                            formData.status === 'refunded' ? 'text-[var(--danger)]' : 'text-[var(--text-muted)]'
                        }`}>
                            ₹
                        </span>
                        <input
                            type="number" name="amount" value={formData.amount}
                            onChange={handleChange} step="0.01" min="0"
                            required={!readOnly}
                            placeholder={formData.status === 'refunded' ? 'Enter refund amount (negative)' : 'Enter amount'}
                            disabled={readOnly || isSubmitting}
                            className={`${inputBase} pl-7 ${
                                formData.status === 'refunded' && parseFloat(formData.amount) < 0
                                    ? 'border-[var(--danger)]/40 focus:ring-[var(--danger)]/30 focus:border-[var(--danger)]/50'
                                    : ''
                            } ${readOnly || isSubmitting ? inputDisabled : ''}`}
                        />
                    </div>
                </Field>

                {/* Date + Month — always side by side */}
                <div className="grid grid-cols-2 gap-3">
                    <Field label="Payment Date" icon={HiOutlineCalendarDays}>
                        <input
                            type="date" name="paymentDate" value={formData.paymentDate}
                            onChange={handleChange}
                            required={!readOnly}
                            disabled={readOnly || isSubmitting}
                            className={`${inputBase} ${readOnly || isSubmitting ? inputDisabled : ''}`}
                        />
                    </Field>
                    <Field label="For Month" icon={HiOutlineCalendarDays}>
                        <div className="relative">
                            <select
                                name="month" value={formData.month} onChange={handleChange}
                                disabled={readOnly || isSubmitting}
                                className={`${inputBase} appearance-none cursor-pointer pr-9 ${readOnly || isSubmitting ? inputDisabled : ''}`}
                            >
                                {monthOptions.map(mo => (
                                    <option key={mo} value={mo}>{mo}</option>
                                ))}
                            </select>
                            {!readOnly && !isSubmitting && (
                                <HiOutlineChevronDown className="absolute inset-y-0 right-3 my-auto w-4 h-4 pointer-events-none text-[var(--text-tertiary)]" />
                            )}
                        </div>
                    </Field>
                </div>

                {/* Payment Type */}
                <Field label="Payment Type" icon={HiOutlineTag}>
                    <div className="flex gap-2">
                        {PAYMENT_TYPES.map(t => (
                            <TypeBtn
                                key={t.value} value={t.value} current={formData.type}
                                onClick={v => {
                                    if (v === formData.type) return; // No-op if same type
                                    // Save current amount before switching
                                    if (formData.amount !== '') {
                                        previousAmountsRef.current[formData.type] = formData.amount;
                                    }
                                    const restoredAmount = previousAmountsRef.current[v] || '';
                                    setFormData(p => ({
                                        ...p,
                                        type: v,
                                        // Restore previous amount for this type, or clear for auto-fill
                                        amount: restoredAmount,
                                    }));
                                }}
                                label={t.label} color={t.color}
                                disabled={readOnly || isSubmitting}
                            />
                        ))}
                    </div>
                </Field>

                {/* Method + Status (admin only) — side by side */}
                <div className={`grid gap-3 ${showStatus ? 'grid-cols-2' : 'grid-cols-1'}`}>
                    <Field label="Method" icon={HiOutlineCreditCard}>
                        <IconDropdown
                            name="paymentMethod" value={formData.paymentMethod}
                            onChange={handleChange} options={PAYMENT_METHODS}
                            disabled={readOnly || isSubmitting}
                        />
                    </Field>
                    {showStatus && (
                        <Field label="Status" icon={HiOutlineCheckCircle}>
                            <IconDropdown
                                name="status" value={formData.status}
                                onChange={handleChange} options={STATUS_OPTIONS}
                                disabled={readOnly || isSubmitting}
                            />
                        </Field>
                    )}
                </div>

                {/* Transaction ID / UTR — online / razorpay / upi_manual */}
                {showTxn && (
                    <Field label={formData.paymentMethod === 'upi_manual' ? 'UTR / Reference' : 'Transaction ID'} icon={HiOutlineCreditCard}>
                        <input
                            type="text" name="transactionId" value={formData.transactionId}
                            onChange={handleChange}
                            placeholder={formData.paymentMethod === 'upi_manual' ? 'e.g. HDFC12345678' : 'e.g. pay_XXXXXXXXXX'}
                            disabled={readOnly || isSubmitting}
                            className={`${inputBase} ${readOnly || isSubmitting ? inputDisabled : ''}`}
                        />
                    </Field>
                )}

                {/* Remarks */}
                <Field label="Remarks (Optional)" icon={HiOutlineChatBubbleBottomCenterText}>
                    <textarea
                        name="remarks" value={formData.remarks} onChange={handleChange}
                        rows={2}
                        disabled={readOnly || isSubmitting}
                        className={`${inputBase} resize-none ${readOnly || isSubmitting ? inputDisabled : ''}`}
                        placeholder={readOnly ? '' : 'Add any notes about this payment…'}
                    />
                </Field>
            </div>

            {/* ── Action buttons ── */}
            <div className="flex gap-3 pt-4 border-t border-[var(--border-muted)] shrink-0">
                <Button
                    type="button" variant="ghost" size="sm"
                    onClick={onCancel} disabled={isSubmitting}
                    className={readOnly ? 'flex-1' : 'flex-1'}
                >
                    {readOnly ? 'Close' : 'Cancel'}
                </Button>
                {!readOnly && (
                    <Button
                        type="submit" variant="success" size="sm"
                        disabled={isSubmitting}
                        className="flex-[2]"
                    >
                        {isSubmitting ? (
                            <span className="flex items-center justify-center gap-2">
                                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                {initialData ? 'Updating…' : 'Recording…'}
                            </span>
                        ) : (
                            initialData ? 'Update Payment' : 'Record Payment'
                        )}
                    </Button>
                )}
            </div>
        </form>
    );
};

export default PaymentForm;