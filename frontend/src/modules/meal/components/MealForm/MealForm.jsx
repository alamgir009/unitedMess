import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { format, parseISO, differenceInDays } from 'date-fns';
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
    HiOutlineLockClosed,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import apiClient from '@/services/api/client/apiClient';
import { Button, Avatar, MemberSelect } from '@/shared/components/ui';

const MAX_RANGE_DAYS = 31;
const typeCountMap = { both: 2, day: 1, night: 1, off: 0 };

const mealTypes = [
    { value: 'both', label: 'Both', description: 'Day & Night', icon: HiOutlineSparkles, color: 'border-primary/60 bg-primary/10 text-primary' },
    { value: 'day', label: 'Day', description: 'Morning only', icon: HiOutlineSun, color: 'border-amber-500/60 bg-amber-500/10 text-amber-500' },
    { value: 'night', label: 'Night', description: 'Evening only', icon: HiOutlineMoon, color: 'border-indigo-400/60 bg-indigo-400/10 text-indigo-400' },
    { value: 'off', label: 'Off', description: 'No meals', icon: HiOutlineNoSymbol, color: 'border-muted-foreground/40 bg-muted/30 text-muted-foreground' },
];

const Field = ({ label, icon: Icon, children, className = '' }) => (
    <div className={`flex flex-col gap-1.5 ${className}`}>
        <label className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground select-none">
            {Icon && <Icon className="w-3 h-3 shrink-0 opacity-70" />}
            {label}
        </label>
        {children}
    </div>
);

const inputBase =
    'w-full px-3 py-2 rounded-xl border border-border/60 ' +
    'bg-background focus:ring-2 focus:ring-primary/30 focus:border-primary/60 ' +
    'outline-none transition-all duration-150 ' +
    'text-sm text-foreground placeholder:text-muted-foreground/50 ' +
    'hover:border-border';

const inputDisabled = 'opacity-60 cursor-not-allowed pointer-events-none select-none';

const TypeBtn = ({ value, current, onClick, icon: Icon, label, description, color, disabled }) => {
    const isActive = current === value;
    return (
        <button
            type="button"
            onClick={() => !disabled && onClick(value)}
            disabled={disabled}
            aria-pressed={isActive}
            className={`relative flex flex-col items-center gap-1 py-2 px-1 sm:py-2.5 sm:px-2 rounded-xl border-2 transition-all duration-150 text-center
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                ${isActive
                    ? `${color} shadow-sm scale-[1.01]`
                    : 'border-border/40 bg-muted/20 hover:bg-muted/40 text-muted-foreground'
                }`}
        >
            <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-[10px] sm:text-xs font-bold">{label}</span>
            <span className="text-[9px] sm:text-[10px] opacity-60 leading-tight hidden sm:block">{description}</span>
            {isActive && (
                <span className="absolute -top-1 -right-1 w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-primary border-2 border-background" />
            )}
        </button>
    );
};

const ReadOnlyBanner = () => (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400">
        <HiOutlineLockClosed className="w-3.5 h-3.5 flex-shrink-0" />
        <p className="text-xs font-semibold">View only — only admins can edit meal records</p>
    </div>
);

const ModeTab = ({ mode, current, onChange, label }) => (
    <button
        type="button"
        role="tab"
        aria-selected={current === mode}
        onClick={() => onChange(mode)}
        className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all duration-150 ${
            current === mode
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
        }`}
    >
        {label}
    </button>
);

const MealForm = ({ initialData, onSubmit, onCancel, onBulkComplete, isAdmin = false, currentUser, readOnly = false }) => {
    const [mode, setMode] = useState('single');

    const [formData, setFormData] = useState({
        date: format(new Date(), 'yyyy-MM-dd'),
        type: 'both',
        isGuestMeal: false,
        guestCount: 0,
        remarks: '',
        userId: currentUser?._id || currentUser?.id || '',
        userIds: [],
    });

    const [rangeFrom, setRangeFrom] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [rangeTo, setRangeTo] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [rangeError, setRangeError] = useState('');

    const [isRunning, setIsRunning] = useState(false);
    const [progress, setProgress] = useState({ done: 0, total: 0 });

    const abortRef = useRef(false);

    const [users, setUsers] = useState([]);
    const [isUsersLoading, setIsUsersLoading] = useState(false);

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

    useEffect(() => {
        if (initialData) {
            const targetUserId = typeof initialData.user === 'object' ? initialData.user?._id : (initialData.user || '');
            setFormData({
                date: initialData.date ? format(new Date(initialData.date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
                type: initialData.type || 'both',
                isGuestMeal: initialData.isGuestMeal || false,
                guestCount: initialData.guestCount || 0,
                remarks: initialData.remarks || '',
                userId: targetUserId,
                userIds: targetUserId ? [targetUserId] : [],
            });
        } else {
            setFormData(prev => ({ ...prev, userId: currentUser?._id || currentUser?.id || '', userIds: [] }));
        }
    }, [initialData, currentUser]);

    useEffect(() => {
        abortRef.current = false;
        return () => { abortRef.current = true; };
    }, []);

    const handleChange = (e) => {
        if (readOnly) return;
        const { name, value, type, checked } = e.target;
        let newVal = value;
        if (type === 'checkbox') newVal = checked;
        if (type === 'number') newVal = parseInt(value, 10) || 0;
        setFormData(prev => {
            const next = { ...prev, [name]: newVal };
            if (name === 'isGuestMeal' && !newVal) next.guestCount = 0;
            return next;
        });
    };

    const handleTypeChange = (val) => {
        if (isRunning || readOnly) return;
        setFormData(prev => ({ ...prev, type: val }));
    };

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

    const handleSingleSubmit = (e) => {
        e.preventDefault();
        if (readOnly) return;
        const baseCount = typeCountMap[formData.type] ?? 0;
        const guestAdd = formData.isGuestMeal ? (formData.guestCount || 0) : 0;
        const submitDate = new Date(formData.date).toISOString();

        const payload = { ...formData, date: submitDate, mealCount: baseCount + guestAdd };

        if (initialData) {
            payload.userId = formData.userId;
            delete payload.userIds;
        } else {
            delete payload.userId;
            if (isAdmin && (!payload.userIds || payload.userIds.length === 0)) return;
        }

        onSubmit(payload);
    };

    const handleBulkSubmit = useCallback(async (selectedType) => {
        const err = validateRange(rangeFrom, rangeTo);
        if (err) { setRangeError(err); return; }

        if (isAdmin && (!formData.userIds || formData.userIds.length === 0)) {
            setRangeError('Please select at least one member.');
            return;
        }

        setRangeError('');

        const targetUsers = isAdmin && formData.userIds?.length > 0
            ? formData.userIds
            : [formData.userId || currentUser?._id || currentUser?.id].filter(Boolean);

        setIsRunning(true);
        setProgress({ done: 0, total: 1 });
        abortRef.current = false;

        try {
            const payload = {
                startDate: rangeFrom,
                endDate: rangeTo,
                type: selectedType,
                userIds: targetUsers,
                isGuestMeal: formData.isGuestMeal,
                guestCount: formData.isGuestMeal ? (formData.guestCount || 0) : 0,
                remarks: formData.remarks || '',
            };

            const response = await apiClient.post('meals/bulk', payload);
            const result = response.data?.data || response.data;

            const inserted = result?.inserted || 0;
            const skipped = result?.skipped || 0;

            setProgress({ done: 1, total: 1 });

            if (inserted > 0) {
                const parts = [];
                parts.push(`${inserted} added`);
                if (skipped > 0) parts.push(`${skipped} already existed`);
                toast.success(parts.join(' · '));
            } else if (skipped > 0) {
                toast(`All ${skipped} dates already have meals.`, { icon: 'ℹ️' });
            } else {
                toast.error('No meals were created.');
            }

            onBulkComplete?.();
            onCancel?.();
        } catch (err) {
            const status = err?.response?.status;
            const message = err?.response?.data?.message || err?.message || 'Failed to create bulk meals';

            if (status === 401) {
                toast.error('Session expired. Please log in again.');
                onCancel?.();
            } else {
                toast.error(message);
            }
        } finally {
            setIsRunning(false);
        }
    }, [rangeFrom, rangeTo, formData, isAdmin, currentUser, validateRange, onBulkComplete, onCancel]);

    const previewCount = typeCountMap[formData.type] + (formData.isGuestMeal ? formData.guestCount : 0);
    const rangeErrMsg = useMemo(
        () => rangeError || validateRange(rangeFrom, rangeTo),
        [rangeError, rangeFrom, rangeTo, validateRange]
    );
    const rangeInvalid = mode === 'range' && !!rangeErrMsg;

    return (
        <form
            onSubmit={mode === 'single' ? handleSingleSubmit : (e) => { e.preventDefault(); handleBulkSubmit(formData.type); }}
            className="flex flex-col gap-3 w-full"
        >

            {readOnly && <ReadOnlyBanner />}

            {!initialData && (
                <div
                    role="tablist"
                    aria-label="Entry mode"
                    className="flex gap-1 p-1 rounded-xl bg-muted/30 border border-border/40"
                >
                    <ModeTab mode="single" current={mode} onChange={setMode} label="Single Day" />
                    <ModeTab mode="range" current={mode} onChange={setMode} label="Date Range" />
                </div>
            )}

            {mode === 'single' && (
                <div className="relative flex items-center justify-center py-2.5 rounded-xl border border-primary/20 bg-primary/5 overflow-hidden shrink-0">
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-foreground leading-none tracking-tight">
                            {previewCount}
                        </span>
                        <span className="text-xs font-medium text-muted-foreground">
                            meal{previewCount !== 1 ? 's' : ''} to record
                        </span>
                    </div>
                </div>
            )}

            {mode === 'range' && !isRunning && (
                <div className={`relative flex items-center justify-center py-2.5 rounded-xl border overflow-hidden shrink-0 transition-colors ${
                    rangeInvalid ? 'border-destructive/30 bg-destructive/5' : 'border-primary/20 bg-primary/5'
                }`}>
                    {rangeInvalid ? (
                        <p className="text-xs font-semibold text-destructive px-4 text-center">{rangeErrMsg}</p>
                    ) : (
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-foreground leading-none tracking-tight">{daysCount}</span>
                            <span className="text-xs font-medium text-muted-foreground">
                                day{daysCount !== 1 ? 's' : ''} selected — pick a type to apply
                            </span>
                        </div>
                    )}
                </div>
            )}

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

                {isAdmin && (
                    <Field label="Member" icon={HiOutlineUser}>
                        {initialData ? (
                            <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl border border-border/60 bg-background text-sm">
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
                                    <span className="text-[11px] text-muted-foreground/60 truncate hidden sm:inline">
                                        {initialData.user.email}
                                    </span>
                                )}
                            </div>
                        ) : (
                            <MemberSelect
                                users={users}
                                value={formData.userIds}
                                onChange={(ids) => setFormData(p => ({ ...p, userIds: ids }))}
                                loading={isUsersLoading}
                                disabled={isRunning || readOnly}
                                accentColor="primary"
                                placeholder="Select members…"
                            />
                        )}
                    </Field>
                )}

                {mode === 'single' && (
                    <Field label="Date" icon={HiOutlineCalendarDays}>
                        <input
                            type="date"
                            name="date"
                            value={formData.date}
                            onChange={handleChange}
                            required={!readOnly}
                            disabled={isRunning || readOnly}
                            className={`${inputBase} ${readOnly ? inputDisabled : ''}`}
                        />
                    </Field>
                )}

                {mode === 'range' && (
                    <div className="grid grid-cols-2 gap-3">
                        <Field label="From" icon={HiOutlineCalendarDays}>
                            <input
                                type="date"
                                value={rangeFrom}
                                onChange={(e) => { setRangeFrom(e.target.value); setRangeError(''); }}
                                required={!readOnly}
                                disabled={isRunning || readOnly}
                                className={`${inputBase} ${readOnly ? inputDisabled : ''}`}
                            />
                        </Field>
                        <Field label="To" icon={HiOutlineArrowRight}>
                            <input
                                type="date"
                                value={rangeTo}
                                min={rangeFrom}
                                onChange={(e) => { setRangeTo(e.target.value); setRangeError(''); }}
                                required={!readOnly}
                                disabled={isRunning || readOnly}
                                className={`${inputBase} ${readOnly ? inputDisabled : ''}`}
                            />
                        </Field>
                    </div>
                )}

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
                                disabled={isRunning || readOnly || (mode === 'range' && rangeInvalid)}
                            />
                        ))}
                    </div>
                </Field>

                <div className="flex flex-col sm:flex-row items-stretch gap-3">
                    <label className={`flex items-center gap-3 p-3 rounded-xl border border-border/60 bg-background transition-colors group flex-1 h-full ${readOnly ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:bg-muted/20'}`}>
                        <div className="relative flex items-center flex-shrink-0">
                            <input
                                type="checkbox"
                                name="isGuestMeal"
                                checked={formData.isGuestMeal}
                                onChange={handleChange}
                                disabled={isRunning || readOnly}
                                className="peer sr-only"
                            />
                            <div className="w-11 h-6 bg-muted-foreground/25 peer-focus:ring-2 peer-focus:ring-primary/40 rounded-full transition-colors peer-checked:bg-primary" />
                            <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-all peer-checked:translate-x-5" />
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
                                disabled={isRunning || readOnly}
                                className={`w-full h-full px-3 py-2 rounded-xl border border-amber-500/30 bg-amber-500/5 focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/50 outline-none transition-all text-sm text-amber-600 dark:text-amber-300 font-bold text-center ${readOnly ? inputDisabled : ''}`}
                                placeholder="#"
                            />
                            <span className="absolute -top-2 left-2 px-1 text-[10px] font-bold text-amber-500/70 bg-background rounded">guests</span>
                        </div>
                    )}
                </div>

                <Field label="Remarks (Optional)" icon={HiOutlineChatBubbleBottomCenterText}>
                    <textarea
                        name="remarks"
                        value={formData.remarks}
                        onChange={handleChange}
                        rows={2}
                        disabled={isRunning || readOnly}
                        className={`${inputBase} resize-none ${readOnly ? inputDisabled : ''}`}
                        placeholder={readOnly ? '' : 'Add special notes about this meal…'}
                    />
                </Field>
            </div>

            {mode === 'single' && (
                <div className="flex gap-2.5 pt-3 border-t border-border/30 shrink-0">
                    <Button type="button" variant="secondary" size="sm" onClick={onCancel} className="flex-1" disabled={isRunning}>
                        {readOnly ? 'Close' : 'Cancel'}
                    </Button>
                    {!readOnly && (
                        <Button type="submit" variant="success" size="sm" className="flex-[2]" disabled={isRunning}>
                            {initialData ? 'Update Meal' : 'Save Meal'}
                        </Button>
                    )}
                </div>
            )}

            {mode === 'range' && (
                <div className="flex gap-2.5 pt-3 border-t border-border/30 shrink-0">
                    <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => { abortRef.current = true; onCancel?.(); }}
                        className="flex-1"
                        disabled={false}
                    >
                        {isRunning ? 'Cancel & Stop' : 'Cancel'}
                    </Button>
                    {!readOnly && (
                        <Button
                            type="submit"
                            variant="success"
                            size="sm"
                            className="flex-[2]"
                            disabled={isRunning || rangeInvalid || daysCount === 0 || (isAdmin && formData.userIds?.length === 0)}
                        >
                            {isRunning
                                ? `Saving ${progress.done} / ${progress.total}…`
                                : `Save ${daysCount > 0 ? daysCount : ''} Meal${daysCount !== 1 ? 's' : ''}`
                            }
                        </Button>
                    )}
                </div>
            )}
        </form>
    );
};

export default MealForm;
