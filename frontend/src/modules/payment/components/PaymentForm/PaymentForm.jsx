import React, { useState, useEffect, useRef } from 'react';
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
} from 'react-icons/hi2';
import { BsCashCoin, BsGlobe2 } from 'react-icons/bs';
import { MdPendingActions, MdCheckCircleOutline, MdErrorOutline, MdRefresh } from 'react-icons/md';
import apiClient from '@/services/api/client/apiClient';
import { Button } from '@/shared/components/ui';
import { SiRazorpay } from "react-icons/si";

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
    const d = new Date(dateStr + 'T00:00:00');
    return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

const PAYMENT_TYPES = [
    { value: 'mess_bill', label: 'Mess Bill', color: 'border-indigo-500/60 bg-indigo-500/10 text-indigo-500' },
    { value: 'gas_bill',  label: 'Gas Bill',  color: 'border-amber-500/60 bg-amber-500/10 text-amber-500'   },
    { value: 'other',     label: 'Other',     color: 'border-slate-400/60 bg-slate-400/10 text-muted-foreground' },
];

const PAYMENT_METHODS = [
    { value: 'cash',     label: 'Cash',     Icon: BsCashCoin,  iconClass: 'text-emerald-500' },
    { value: 'online',   label: 'Online',   Icon: BsGlobe2,    iconClass: 'text-sky-500'     },
    { value: 'razorpay', label: 'Razorpay', Icon: SiRazorpay,  iconClass: 'text-violet-500'  },
];

const STATUS_OPTIONS = [
    { value: 'pending',   label: 'Pending',   Icon: MdPendingActions,     iconClass: 'text-amber-500'   },
    { value: 'completed', label: 'Completed', Icon: MdCheckCircleOutline, iconClass: 'text-emerald-500' },
    { value: 'failed',    label: 'Failed',    Icon: MdErrorOutline,       iconClass: 'text-rose-500'    },
    { value: 'refunded',  label: 'Refunded',  Icon: MdRefresh,            iconClass: 'text-sky-500'     },
];

/* ─── Design tokens ─────────────────────────────────────────── */

const inputBase =
    'w-full px-3 py-2 rounded-xl border border-border/60 ' +
    'bg-background/70 backdrop-blur-md ' +
    'focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/60 ' +
    'outline-none transition-all duration-200 ' +
    'text-sm text-foreground placeholder:text-muted-foreground/50 ' +
    'shadow-sm hover:border-border';

const inputDisabled = 'opacity-60 cursor-not-allowed pointer-events-none select-none';

/* ─── Field wrapper ─────────────────────────────────────────── */
const Field = ({ label, icon: Icon, children, className = '' }) => (
    <div className={`flex flex-col gap-1 ${className}`}>
        <label className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground select-none">
            {Icon && <Icon className="w-3 h-3 shrink-0 opacity-70" />}
            {label}
        </label>
        {children}
    </div>
);

/* ─── Custom icon dropdown ──────────────────────────────────── */
const IconDropdown = ({ name, value, onChange, options, disabled = false }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    const selected = options.find(o => o.value === value) ?? options[0];

    useEffect(() => {
        const handler = (e) => {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const pick = (val) => {
        if (disabled) return;
        onChange({ target: { name, value: val } });
        setOpen(false);
    };

    return (
        <div ref={ref} className="relative w-full">
            <button
                type="button"
                onClick={() => !disabled && setOpen(o => !o)}
                className={`${inputBase} flex items-center justify-between gap-2 text-left
                    ${disabled ? inputDisabled : 'cursor-pointer'}`}
            >
                <span className="flex items-center gap-2 truncate">
                    <selected.Icon className={`w-4 h-4 shrink-0 ${selected.iconClass}`} />
                    <span className="truncate text-sm">{selected.label}</span>
                </span>
                {!disabled && (
                    <HiOutlineChevronDown
                        className={`w-4 h-4 shrink-0 text-muted-foreground/60 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                    />
                )}
            </button>

            {open && !disabled && (
                <div className="absolute z-50 top-full mt-1.5 w-full rounded-xl border border-border/60 bg-background/98 backdrop-blur-xl shadow-lg overflow-hidden">
                    {options.map(opt => (
                        <button
                            key={opt.value}
                            type="button"
                            onClick={() => pick(opt.value)}
                            className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors duration-100
                                ${value === opt.value
                                    ? 'bg-indigo-500/10 text-indigo-500 font-medium'
                                    : 'hover:bg-muted/40 text-foreground'
                                }`}
                        >
                            <opt.Icon className={`w-4 h-4 shrink-0 ${opt.iconClass}`} />
                            <span>{opt.label}</span>
                            {value === opt.value && (
                                <HiOutlineCheckCircle className="ml-auto w-4 h-4 text-indigo-500/70" />
                            )}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

/* ─── Payment type toggle button ────────────────────────────── */
const TypeBtn = ({ value, current, onClick, label, color, disabled = false }) => (
    <button
        type="button"
        onClick={() => !disabled && onClick(value)}
        disabled={disabled}
        className={`flex-1 min-w-0 py-2 px-2 rounded-xl border-2 text-xs font-semibold
            tracking-wide transition-all duration-200 text-center truncate
            ${disabled ? 'opacity-60 cursor-not-allowed' : ''}
            ${current === value
                ? `${color} shadow-sm`
                : disabled
                    ? 'border-border/40 bg-muted/20 text-muted-foreground'
                    : 'border-border/40 bg-muted/20 hover:bg-muted/50 text-muted-foreground hover:text-foreground'
            }`}
    >
        {label}
    </button>
);

/* ─── ReadOnly banner ───────────────────────────────────────── */
const ReadOnlyBanner = () => (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400">
        <HiOutlineLockClosed className="w-3.5 h-3.5 flex-shrink-0" />
        <p className="text-xs font-semibold">View only — only admins can edit payment records</p>
    </div>
);

/* ─── PaymentForm ───────────────────────────────────────────── */
/**
 * @param {Object}   initialData  - payment record to edit/view (null for create)
 * @param {Function} onSubmit     - called with form data (create/update)
 * @param {Function} onCancel     - close modal
 * @param {boolean}  isAdmin      - admin role flag
 * @param {Object}   currentUser  - logged-in user object
 * @param {boolean}  readOnly     - view-only mode for non-admins viewing their payment
 */
const PaymentForm = ({ initialData, onSubmit, onCancel, isAdmin = false, currentUser, readOnly = false }) => {

    const [formData, setFormData] = useState({
        amount:        '',
        paymentDate:   format(new Date(), 'yyyy-MM-dd'),
        month:         currentMonthYear(),
        type:          'mess_bill',
        status:        'completed',
        paymentMethod: 'cash',
        transactionId: '',
        remarks:       '',
        userId:        currentUser?._id || currentUser?.id || '',
    });

    const [users, setUsers]              = useState([]);
    const [isUsersLoading, setUsersLoad] = useState(false);

    /* Admin: fetch member list */
    useEffect(() => {
        if (!isAdmin) return;
        setUsersLoad(true);
        apiClient.get('users?limit=100')
            .then(r => setUsers(r.data?.data?.users || r.data?.users || []))
            .catch(console.error)
            .finally(() => setUsersLoad(false));
    }, [isAdmin]);

    /* Populate on edit/view */
    useEffect(() => {
        if (initialData) {
            const pd = initialData.paymentDate
                ? format(new Date(initialData.paymentDate), 'yyyy-MM-dd')
                : format(new Date(), 'yyyy-MM-dd');
            setFormData({
                amount:        initialData.amount        ?? '',
                paymentDate:   pd,
                month:         initialData.month         || monthYearFromDate(pd),
                type:          initialData.type          || 'mess_bill',
                status:        initialData.status        || 'completed',
                paymentMethod: initialData.paymentMethod || 'cash',
                transactionId: initialData.transactionId || '',
                remarks:       initialData.remarks       || '',
                userId:        typeof initialData.user === 'object'
                                   ? initialData.user?._id
                                   : (initialData.user || ''),
            });
        } else {
            setFormData(p => ({ ...p, userId: currentUser?._id || currentUser?.id || '' }));
        }
    }, [initialData, currentUser]);

    /* Unified change handler — auto-syncs month from date */
    const handleChange = (e) => {
        if (readOnly) return; // double-guard — no changes in read-only mode
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
        if (readOnly) return; // safety guard

        // Strip status for non-admin — backend will enforce, but be explicit
        const payload = { ...formData, amount: parseFloat(formData.amount) || 0 };
        if (!isAdmin) delete payload.status;
        onSubmit(payload);
    };

    /* Month option list: prev year → current → next year */
    const yr = new Date().getFullYear();
    const monthOptions = [yr - 1, yr, yr + 1].flatMap(y => MONTHS.map(m => `${m} ${y}`));

    // Status dropdown: admin only (never shown to regular users)
    const showStatus = isAdmin;
    const showTxn    = formData.paymentMethod === 'online' || formData.paymentMethod === 'razorpay';

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 w-full">

            {/* Read-only notice */}
            {readOnly && <ReadOnlyBanner />}

            {/* ── Amount preview banner ── */}
            <div className="relative flex items-center justify-center py-3 rounded-2xl border border-indigo-500/20 bg-gradient-to-r from-indigo-500/5 via-violet-500/5 to-purple-500/5 overflow-hidden shrink-0">
                <div className="flex items-baseline gap-2">
                    <span className="text-[28px] font-black text-foreground leading-none tracking-tight">
                        ₹{formData.amount === '' ? '0' : Number(formData.amount).toLocaleString('en-IN')}
                    </span>
                    <span className="text-xs font-medium text-muted-foreground">payment amount</span>
                </div>
            </div>

            {/* ── Form fields ── */}
            <div className="flex flex-col gap-3">

                {/* Admin: member selector */}
                {isAdmin && (
                    <Field label="Member" icon={HiOutlineUser}>
                        <div className="relative">
                            <select
                                name="userId" value={formData.userId} onChange={handleChange}
                                required
                                disabled={isUsersLoading || !!initialData || readOnly}
                                className={`${inputBase} appearance-none cursor-pointer disabled:opacity-60 pr-9`}
                            >
                                <option value="" disabled>
                                    {isUsersLoading ? 'Loading members…' : 'Select a member'}
                                </option>
                                {users.map(u => (
                                    <option key={u._id} value={u._id}>
                                        {u.name}{u.email ? ` (${u.email})` : ''}
                                    </option>
                                ))}
                            </select>
                            <HiOutlineChevronDown className="absolute inset-y-0 right-3 my-auto w-4 h-4 pointer-events-none text-muted-foreground/60" />
                        </div>
                    </Field>
                )}

                {/* Amount */}
                <Field label="Amount (₹)" icon={HiOutlineCurrencyRupee}>
                    <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-indigo-500 font-semibold text-sm pointer-events-none select-none">
                            ₹
                        </span>
                        <input
                            type="number" name="amount" value={formData.amount}
                            onChange={handleChange} min="0" step="0.01"
                            required={!readOnly}
                            placeholder="0.00"
                            disabled={readOnly}
                            className={`${inputBase} pl-7 ${readOnly ? inputDisabled : ''}`}
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
                            disabled={readOnly}
                            className={`${inputBase} ${readOnly ? inputDisabled : ''}`}
                        />
                    </Field>
                    <Field label="For Month" icon={HiOutlineCalendarDays}>
                        <div className="relative">
                            <select
                                name="month" value={formData.month} onChange={handleChange}
                                disabled={readOnly}
                                className={`${inputBase} appearance-none cursor-pointer pr-9 ${readOnly ? inputDisabled : ''}`}
                            >
                                {monthOptions.map(mo => (
                                    <option key={mo} value={mo}>{mo}</option>
                                ))}
                            </select>
                            {!readOnly && (
                                <HiOutlineChevronDown className="absolute inset-y-0 right-3 my-auto w-4 h-4 pointer-events-none text-muted-foreground/60" />
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
                                onClick={v => setFormData(p => ({ ...p, type: v }))}
                                label={t.label} color={t.color}
                                disabled={readOnly}
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
                            disabled={readOnly}
                        />
                    </Field>
                    {/* Status — admin only, never shown to regular users */}
                    {showStatus && (
                        <Field label="Status" icon={HiOutlineCheckCircle}>
                            <IconDropdown
                                name="status" value={formData.status}
                                onChange={handleChange} options={STATUS_OPTIONS}
                                disabled={readOnly}
                            />
                        </Field>
                    )}
                </div>

                {/* Transaction ID — online / razorpay only */}
                {showTxn && (
                    <Field label="Transaction ID" icon={HiOutlineCreditCard}>
                        <input
                            type="text" name="transactionId" value={formData.transactionId}
                            onChange={handleChange} placeholder="e.g. pay_XXXXXXXXXX"
                            disabled={readOnly}
                            className={`${inputBase} ${readOnly ? inputDisabled : ''}`}
                        />
                    </Field>
                )}

                {/* Remarks */}
                <Field label="Remarks (Optional)" icon={HiOutlineChatBubbleBottomCenterText}>
                    <textarea
                        name="remarks" value={formData.remarks} onChange={handleChange}
                        rows={2}
                        disabled={readOnly}
                        className={`${inputBase} resize-none ${readOnly ? inputDisabled : ''}`}
                        placeholder={readOnly ? '' : 'Add any notes about this payment…'}
                    />
                </Field>
            </div>

            {/* ── Action buttons ── */}
            <div className="flex gap-2.5 pt-3 border-t border-border/30 shrink-0">
                <Button
                    type="button" variant="secondary" size="sm"
                    onClick={onCancel} className={readOnly ? 'flex-1' : 'flex-1'}
                >
                    {readOnly ? 'Close' : 'Cancel'}
                </Button>
                {/* Submit button hidden in read-only mode */}
                {!readOnly && (
                    <Button
                        type="submit" variant="success" size="sm"
                        className="flex-[2]"
                    >
                        {initialData ? 'Update Payment' : 'Record Payment'}
                    </Button>
                )}
            </div>
        </form>
    );
};

export default PaymentForm;