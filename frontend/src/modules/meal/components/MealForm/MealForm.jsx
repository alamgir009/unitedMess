import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { format, eachDayOfInterval, parseISO, differenceInDays } from 'date-fns';
import {
    HiOutlineSun,
    HiOutlineMoon,
    HiOutlineNoSymbol,
    HiOutlineSparkles,
    HiOutlineUserGroup,
    HiOutlineCalendarDays,
    HiOutlineChatBubbleBottomCenterText,
    HiOutlineUser,
    HiOutlineArrowRight,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import apiClient from '@/services/api/client/apiClient';
import { Button } from '@/shared/components/ui';

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Constants                                                                  */
/* ─────────────────────────────────────────────────────────────────────────── */
const MAX_RANGE_DAYS = 31;
const CONCURRENCY   = 5;   // max parallel requests
const MAX_RETRIES   = 3;   // per date
const typeCountMap  = { both: 2, day: 1, night: 1, off: 0 };

const mealTypes = [
    { value: 'both',  label: 'Both',  description: 'Day & Night',   icon: HiOutlineSparkles, color: 'border-primary/60 bg-primary/10 text-primary' },
    { value: 'day',   label: 'Day',   description: 'Morning only',  icon: HiOutlineSun,      color: 'border-amber-500/60 bg-amber-500/10 text-amber-500' },
    { value: 'night', label: 'Night', description: 'Evening only',  icon: HiOutlineMoon,     color: 'border-indigo-400/60 bg-indigo-400/10 text-indigo-400' },
    { value: 'off',   label: 'Off',   description: 'No meals',      icon: HiOutlineNoSymbol, color: 'border-muted-foreground/40 bg-muted/30 text-muted-foreground' },
];

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Helpers                                                                    */
/* ─────────────────────────────────────────────────────────────────────────── */

/**
 * Exponential backoff delay (ms): 100 → 200 → 400
 */
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * POST a single meal with up to MAX_RETRIES retries.
 * Returns { status: 'created' | 'skipped' | 'failed' | 'aborted', date }
 */
const postMealWithRetry = async ({ payload, abortRef }) => {
    const dateStr = payload.date;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        if (abortRef.current) return { status: 'aborted', date: dateStr };
        try {
            const url = payload._adminUserId
                ? `meals/admin/users/${payload._adminUserId}/meals`
                : 'meals';
            const body = { ...payload };
            delete body._adminUserId;
            await apiClient.post(url, body);
            return { status: 'created', date: dateStr };
        } catch (err) {
            const status = err?.response?.status;
            if (status === 409) return { status: 'skipped', date: dateStr };  // duplicate — not an error
            if (status === 401) return { status: 'unauthorized', date: dateStr }; // session expired
            if (attempt < MAX_RETRIES && (!status || status >= 500)) {
                await delay(100 * 2 ** (attempt - 1)); // 100, 200, 400 ms
                continue;
            }
            return { status: 'failed', date: dateStr };
        }
    }
    return { status: 'failed', date: dateStr };
};

/**
 * Run tasks with bounded concurrency (no external deps).
 */
const throttledPool = async ({ tasks, concurrency, onSettled }) => {
    const results = [];
    let idx = 0;

    const worker = async () => {
        while (idx < tasks.length) {
            const taskIdx = idx++;
            const result = await tasks[taskIdx]();
            results[taskIdx] = result;
            onSettled(result);
        }
    };

    const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, worker);
    await Promise.all(workers);
    return results;
};

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Sub-components                                                             */
/* ─────────────────────────────────────────────────────────────────────────── */
const Field = ({ label, icon: Icon, children, className = '' }) => (
    <div className={`space-y-1.5 sm:space-y-2 ${className}`}>
        <label className="flex items-center gap-1.5 text-[10px] sm:text-xs font-bold uppercase tracking-widest text-muted-foreground">
            {Icon && <Icon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
            {label}
        </label>
        {children}
    </div>
);

const inputBase =
    'w-full px-3 py-2 sm:px-4 sm:py-3 rounded-xl border border-white/20 dark:border-white/10 bg-background/60 backdrop-blur-md focus:ring-2 focus:ring-primary/40 focus:border-primary/50 outline-none transition-all duration-200 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground/60 shadow-inner';

const TypeBtn = ({ value, current, onClick, icon: Icon, label, description, color, disabled }) => {
    const isActive = current === value;
    return (
        <button
            type="button"
            onClick={() => !disabled && onClick(value)}
            disabled={disabled}
            aria-pressed={isActive}
            className={`relative flex flex-col items-center gap-1 py-2 px-1 sm:py-3 sm:px-2 rounded-xl sm:rounded-2xl border-2 transition-all duration-200 text-center
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                ${isActive
                    ? `${color} shadow-lg scale-[1.02]`
                    : 'border-white/10 dark:border-white/5 bg-muted/20 hover:bg-muted/40 text-muted-foreground'
                }`}
        >
            <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-[10px] sm:text-xs font-bold">{label}</span>
            <span className="text-[8px] sm:text-[10px] opacity-60 leading-tight hidden sm:block">{description}</span>
            {isActive && (
                <span className="absolute -top-1 -right-1 w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-primary border-2 border-background" />
            )}
        </button>
    );
};

/** Mode toggle tab */
const ModeTab = ({ mode, current, onChange, label }) => (
    <button
        type="button"
        role="tab"
        aria-selected={current === mode}
        onClick={() => onChange(mode)}
        className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all duration-200 ${
            current === mode
                ? 'bg-primary text-primary-foreground shadow'
                : 'text-muted-foreground hover:text-foreground'
        }`}
    >
        {label}
    </button>
);

/* ─────────────────────────────────────────────────────────────────────────── */
/*  MealForm                                                                   */
/* ─────────────────────────────────────────────────────────────────────────── */
const MealForm = ({ initialData, onSubmit, onCancel, onBulkComplete, isAdmin = false, currentUser }) => {
    /* ── Mode ── */
    const [mode, setMode] = useState('single'); // 'single' | 'range'

    /* ── Shared form state ── */
    const [formData, setFormData] = useState({
        date:       format(new Date(), 'yyyy-MM-dd'),
        type:       'both',
        isGuestMeal: false,
        guestCount: 0,
        remarks:    '',
        userId:     currentUser?._id || currentUser?.id || '',
    });

    /* ── Range-specific state ── */
    const [rangeFrom, setRangeFrom] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [rangeTo,   setRangeTo]   = useState(format(new Date(), 'yyyy-MM-dd'));
    const [rangeError, setRangeError] = useState('');

    /* ── Bulk progress state ── */
    const [isRunning, setIsRunning] = useState(false);
    const [progress,  setProgress]  = useState({ done: 0, total: 0 });

    /* ── Abort ref (survives re-renders) ── */
    const abortRef = useRef(false);

    /* ── Admin users list ── */
    const [users, setUsers] = useState([]);
    const [isUsersLoading, setIsUsersLoading] = useState(false);

    /* ── Load users for admin ── */
    useEffect(() => {
        if (!isAdmin) return;
        let cancelled = false;
        (async () => {
            setIsUsersLoading(true);
            try {
                const res = await apiClient.get('users?limit=100');
                if (!cancelled) setUsers(res.data?.data?.users || res.data?.users || []);
            } finally {
                if (!cancelled) setIsUsersLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [isAdmin]);

    /* ── Populate from initialData (edit mode) ── */
    useEffect(() => {
        if (initialData) {
            setFormData({
                date:       initialData.date ? format(new Date(initialData.date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
                type:       initialData.type || 'both',
                isGuestMeal: initialData.isGuestMeal || false,
                guestCount: initialData.guestCount || 0,
                remarks:    initialData.remarks || '',
                userId:     typeof initialData.user === 'object' ? initialData.user?._id : (initialData.user || ''),
            });
        } else {
            setFormData(prev => ({ ...prev, userId: currentUser?._id || currentUser?.id || '' }));
        }
    }, [initialData, currentUser]);

    /* ── Abort on unmount ── */
    useEffect(() => {
        abortRef.current = false;
        return () => { abortRef.current = true; };
    }, []);

    /* ── Handlers ── */
    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        let newVal = value;
        if (type === 'checkbox') newVal = checked;
        if (type === 'number')   newVal = parseInt(value, 10) || 0;
        setFormData(prev => {
            const next = { ...prev, [name]: newVal };
            // Reset guest count when the guest meal toggle is turned off
            if (name === 'isGuestMeal' && !newVal) next.guestCount = 0;
            return next;
        });
    };

    const handleTypeChange = (val) => {
        if (isRunning) return;
        setFormData(prev => ({ ...prev, type: val }));
    };

    /* ── Range validation ── */
    const validateRange = useCallback((from, to) => {
        if (!from || !to) return 'Both dates are required.';
        const f = parseISO(from), t = parseISO(to);
        if (f > t) return 'Start date must be on or before end date.';
        if (differenceInDays(t, f) + 1 > MAX_RANGE_DAYS) return `Maximum range is ${MAX_RANGE_DAYS} days.`;
        return '';
    }, []);

    const daysCount = (() => {
        if (!rangeFrom || !rangeTo) return 0;
        try {
            const diff = differenceInDays(parseISO(rangeTo), parseISO(rangeFrom)) + 1;
            return diff > 0 ? diff : 0;
        } catch { return 0; }
    })();

    /* ── Single-day submit (delegated to MealPage via onSubmit) ── */
    const handleSingleSubmit = (e) => {
        e.preventDefault();
        const baseCount = typeCountMap[formData.type] ?? 0;
        const guestAdd  = formData.isGuestMeal ? (formData.guestCount || 0) : 0;
        // Always send a full ISO string so parseDate() on the backend receives a
        // consistent, timezone-safe value regardless of which date was selected.
        const submitDate = new Date(formData.date).toISOString();
        onSubmit({ ...formData, date: submitDate, mealCount: baseCount + guestAdd });
    };

    /* ── Bulk submit (range mode) ── */
    const handleBulkSubmit = useCallback(async (selectedType) => {
        const err = validateRange(rangeFrom, rangeTo);
        if (err) { setRangeError(err); return; }
        setRangeError('');

        const dates = eachDayOfInterval({ start: parseISO(rangeFrom), end: parseISO(rangeTo) });
        const total = dates.length;

        setIsRunning(true);
        setProgress({ done: 0, total });
        abortRef.current = false;

        const baseCount = typeCountMap[selectedType] ?? 0;
        const guestAdd  = formData.isGuestMeal ? (formData.guestCount || 0) : 0;

        const counters = { created: 0, skipped: 0, failed: 0, unauthorized: false };

        const tasks = dates.map((d) => async () => {
            const dateStr = format(d, 'yyyy-MM-dd');
            const payload = {
                date:       dateStr,
                type:       selectedType,
                isGuestMeal: formData.isGuestMeal,
                guestCount: formData.isGuestMeal ? (formData.guestCount || 0) : 0,
                remarks:    formData.remarks || '',
                mealCount:  baseCount + guestAdd,
                ...(isAdmin && formData.userId ? { _adminUserId: formData.userId } : {}),
            };
            const result = await postMealWithRetry({ payload, abortRef });

            if (result.status === 'unauthorized') {
                counters.unauthorized = true;
                abortRef.current = true;
            } else {
                counters[result.status] = (counters[result.status] || 0) + 1;
            }

            setProgress(prev => ({ ...prev, done: prev.done + 1 }));
            return result;
        });

        await throttledPool({ tasks, concurrency: CONCURRENCY, onSettled: () => {} });

        setIsRunning(false);

        if (counters.unauthorized) {
            toast.error('Session expired. Please log in again.');
            onCancel?.();
            return;
        }

        const parts = [];
        if (counters.created)  parts.push(`${counters.created} added`);
        if (counters.skipped)  parts.push(`${counters.skipped} already existed`);
        if (counters.failed)   parts.push(`${counters.failed} failed`);

        if (counters.created > 0) {
            toast.success(parts.join(' · '));
        } else if (counters.skipped > 0 && counters.failed === 0) {
            toast(`All dates already have meals. ${counters.skipped} skipped.`, { icon: 'ℹ️' });
        } else {
            toast.error(parts.join(' · ') || 'Batch completed with errors.');
        }

        onBulkComplete?.();
        onCancel?.();
    }, [rangeFrom, rangeTo, formData, isAdmin, validateRange, onBulkComplete, onCancel]);

    /* ── Preview count (single mode) ── */
    const previewCount = typeCountMap[formData.type] + (formData.isGuestMeal ? formData.guestCount : 0);
    // Memoized so validateRange() is not called on every keystroke unrelated to dates
    const rangeErrMsg  = useMemo(
        () => rangeError || validateRange(rangeFrom, rangeTo),
        [rangeError, rangeFrom, rangeTo, validateRange]
    );
    const rangeInvalid = mode === 'range' && !!rangeErrMsg;

    /* ─────────────────────── Render ─────────────────────── */
    return (
        <form
            onSubmit={mode === 'single' ? handleSingleSubmit : (e) => { e.preventDefault(); handleBulkSubmit(formData.type); }}
            className="space-y-4 sm:space-y-5"
        >

            {/* ── Mode Toggle (hidden in edit mode) ── */}
            {!initialData && (
                <div
                    role="tablist"
                    aria-label="Entry mode"
                    className="flex gap-1 p-1 rounded-2xl bg-muted/30 border border-white/10 dark:border-white/5"
                >
                    <ModeTab mode="single" current={mode} onChange={setMode} label="Single Day" />
                    <ModeTab mode="range"  current={mode} onChange={setMode} label="Date Range" />
                </div>
            )}

            {/* ── Single-day preview badge ── */}
            {mode === 'single' && (
                <div className="flex items-center justify-center py-2 sm:py-3 rounded-xl sm:rounded-2xl border border-primary/20 bg-primary/5 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-secondary-400/5 to-accent/5" />
                    <div className="relative text-center">
                        <span className="text-3xl sm:text-4xl font-black text-foreground">{previewCount}</span>
                        <span className="text-xs sm:text-sm font-semibold text-muted-foreground ml-1 sm:ml-2">
                            meal{previewCount !== 1 ? 's' : ''} will be recorded
                        </span>
                    </div>
                </div>
            )}

            {/* ── Range preview badge ── */}
            {mode === 'range' && !isRunning && (
                <div className={`flex items-center justify-center py-2 rounded-xl border relative overflow-hidden transition-colors ${
                    rangeInvalid ? 'border-destructive/30 bg-destructive/5' : 'border-primary/20 bg-primary/5'
                }`}>
                    {rangeInvalid ? (
                        <p className="text-xs font-semibold text-destructive px-4 text-center">{rangeErrMsg}</p>
                    ) : (
                        <p className="text-xs sm:text-sm font-semibold text-muted-foreground">
                            <span className="text-2xl font-black text-foreground mr-1">{daysCount}</span>
                            day{daysCount !== 1 ? 's' : ''} selected — click a type below to apply
                        </p>
                    )}
                </div>
            )}

            {/* ── Bulk progress bar ── */}
            {isRunning && (
                <div className="space-y-2">
                    <div className="flex justify-between text-xs font-semibold text-muted-foreground">
                        <span>Saving meals…</span>
                        <span>{progress.done} / {progress.total}</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted/40 overflow-hidden">
                        <div
                            className="h-full rounded-full bg-gradient-to-r from-sky-500 to-violet-600 transition-all duration-300"
                            style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }}
                        />
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:gap-5">

                {/* ── Admin Member Select ── */}
                {isAdmin && (
                    <Field label="Member" icon={HiOutlineUser}>
                        <div className="relative">
                            <select
                                name="userId"
                                value={formData.userId}
                                onChange={handleChange}
                                required
                                disabled={isUsersLoading || !!initialData || isRunning}
                                className={`${inputBase} appearance-none cursor-pointer disabled:opacity-70`}
                            >
                                <option value="" disabled>
                                    {isUsersLoading ? 'Loading members…' : 'Select a member'}
                                </option>
                                {users.map((u) => (
                                    <option key={u._id} value={u._id}>
                                        {u.name}{u.email ? ` (${u.email})` : ''}
                                    </option>
                                ))}
                            </select>
                            <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-muted-foreground">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        </div>
                    </Field>
                )}

                {/* ── Date field (single) ── */}
                {mode === 'single' && (
                    <Field label="Date" icon={HiOutlineCalendarDays}>
                        <input
                            type="date"
                            name="date"
                            value={formData.date}
                            onChange={handleChange}
                            required
                            disabled={isRunning}
                            className={inputBase}
                        />
                    </Field>
                )}

                {/* ── Date range (range mode) ── */}
                {mode === 'range' && (
                    <div className="grid grid-cols-2 gap-3">
                        <Field label="From" icon={HiOutlineCalendarDays}>
                            <input
                                type="date"
                                value={rangeFrom}
                                onChange={(e) => { setRangeFrom(e.target.value); setRangeError(''); }}
                                required
                                disabled={isRunning}
                                className={inputBase}
                            />
                        </Field>
                        <Field label="To" icon={HiOutlineArrowRight}>
                            <input
                                type="date"
                                value={rangeTo}
                                min={rangeFrom}
                                onChange={(e) => { setRangeTo(e.target.value); setRangeError(''); }}
                                required
                                disabled={isRunning}
                                className={inputBase}
                            />
                        </Field>
                    </div>
                )}

                {/* ── Meal Type Selector ── */}
                <Field label="Meal Type" icon={HiOutlineSparkles}>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {mealTypes.map((t) => (
                            <TypeBtn
                                key={t.value}
                                value={t.value}
                                current={formData.type}
                                onClick={handleTypeChange}
                                icon={t.icon}
                                label={t.label}
                                description={t.description}
                                color={t.color}
                                disabled={isRunning || (mode === 'range' && rangeInvalid)}
                            />
                        ))}
                    </div>
                </Field>

                {/* ── Guest Meal ── */}
                <div className="flex flex-col sm:flex-row items-stretch gap-3">
                    <label className="flex items-center gap-3 cursor-pointer p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-white/10 dark:border-white/5 bg-muted/10 hover:bg-muted/20 transition-colors group flex-1 h-full">
                        <div className="relative flex items-center flex-shrink-0">
                            <input
                                type="checkbox"
                                name="isGuestMeal"
                                checked={formData.isGuestMeal}
                                onChange={handleChange}
                                disabled={isRunning}
                                className="peer sr-only"
                            />
                            <div className="w-12 h-6 bg-muted-foreground/25 peer-focus:ring-2 peer-focus:ring-primary/40 rounded-full transition-colors peer-checked:bg-primary" />
                            <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-all peer-checked:translate-x-6" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <HiOutlineUserGroup className="w-4 h-4 text-amber-500" />
                                <span className="text-xs sm:text-sm font-bold text-foreground">Include Guest Meals</span>
                            </div>
                            <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">Add extra meals for guests</p>
                        </div>
                    </label>

                    {formData.isGuestMeal && (
                        <div className="relative w-full sm:w-28 h-full flex items-center">
                            <input
                                type="number"
                                name="guestCount"
                                min="1"
                                max="20"
                                value={formData.guestCount}
                                onChange={handleChange}
                                disabled={isRunning}
                                className="w-full h-full px-3 py-2 sm:py-3 rounded-xl sm:rounded-2xl border border-amber-500/30 bg-amber-500/5 focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/50 outline-none transition-all text-sm text-amber-600 dark:text-amber-300 font-bold shadow-inner text-center"
                                placeholder="#"
                            />
                            <span className="absolute -top-2 left-2 px-1 text-[8px] sm:text-[10px] font-bold text-amber-500/70 bg-background rounded">guests</span>
                        </div>
                    )}
                </div>

                {/* ── Remarks ── */}
                <Field label="Remarks (Optional)" icon={HiOutlineChatBubbleBottomCenterText}>
                    <textarea
                        name="remarks"
                        value={formData.remarks}
                        onChange={handleChange}
                        rows={2}
                        disabled={isRunning}
                        className={`${inputBase} resize-none`}
                        placeholder="Add special notes about this meal…"
                    />
                </Field>
            </div>

            {/* ── Actions (single mode) ── */}
            {mode === 'single' && (
                <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4 sm:pt-5 border-t border-white/10 dark:border-white/5">
                    <Button type="button" variant="secondary" size="md" onClick={onCancel} className="w-full sm:w-auto" disabled={isRunning}>
                        Cancel
                    </Button>
                    <Button type="submit" variant="success" size="md" className="w-full sm:flex-[2]" disabled={isRunning}>
                        {initialData ? 'Update Meal' : 'Save Meal'}
                    </Button>
                </div>
            )}

            {/* ── Range mode actions ── */}
            {mode === 'range' && (
                <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4 sm:pt-5 border-t border-white/10 dark:border-white/5">
                    <Button
                        type="button"
                        variant="secondary"
                        size="md"
                        onClick={() => { abortRef.current = true; onCancel?.(); }}
                        className="w-full sm:w-auto"
                        disabled={false}
                    >
                        {isRunning ? 'Cancel & Stop' : 'Cancel'}
                    </Button>
                    <Button
                        type="submit"
                        variant="success"
                        size="md"
                        className="w-full sm:flex-[2]"
                        disabled={isRunning || rangeInvalid || daysCount === 0}
                    >
                        {isRunning
                            ? `Saving ${progress.done} / ${progress.total}…`
                            : `Save ${daysCount > 0 ? daysCount : ''} Meal${daysCount !== 1 ? 's' : ''}`
                        }
                    </Button>
                </div>
            )}
        </form>
    );
};

export default MealForm;