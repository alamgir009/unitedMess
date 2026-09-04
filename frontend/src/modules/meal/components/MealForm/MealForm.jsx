import { useState, useEffect, useCallback, useMemo } from 'react';
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
    HiOutlineMinus,
    HiOutlinePlus,
} from 'react-icons/hi2';
import apiClient from '@/services/api/client/apiClient';
import { Button, Avatar, MemberSelect } from '@/shared/components/ui';

const MAX_RANGE_DAYS = 31;
const typeCountMap = { both: 2, day: 1, night: 1, off: 0 };

const mealTypes = [
    { value: 'both', label: 'Both', description: 'Day & Night', icon: HiOutlineSparkles, color: 'border-[var(--brand)]/60 bg-[var(--brand)]/10 text-[var(--brand)]' },
    { value: 'day', label: 'Day', description: 'Morning only', icon: HiOutlineSun, color: 'border-[var(--warning)]/60 bg-[var(--warning)]/10 text-[var(--warning)]' },
    { value: 'night', label: 'Night', description: 'Evening only', icon: HiOutlineMoon, color: 'border-[var(--info)]/60 bg-[var(--info)]/10 text-[var(--info)]' },
    { value: 'off', label: 'Off', description: 'No meals', icon: HiOutlineNoSymbol, color: 'border-[var(--text-muted)]/40 bg-[var(--bg-muted)] text-[var(--text-secondary)]' },
];

const Field = ({ label, icon: Icon, children, className = '' }) => (
    <div className={`flex flex-col gap-1.5 ${className}`}>
        <label className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)] select-none">
            {Icon && <Icon className="w-3 h-3 shrink-0 opacity-70" />}
            {label}
        </label>
        {children}
    </div>
);

const inputBase =
    'w-full px-3 py-2.5 rounded-xl border border-[var(--input-border)] ' +
    'bg-[var(--input-bg)] ' +
    'shadow-[var(--inset-inner),var(--inset-top-glow)] ' +
    'focus:ring-2 focus:ring-[var(--brand)]/25 focus:border-[var(--brand)] ' +
    'outline-none transition-all duration-150 ' +
    'text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] ' +
    'hover:border-[var(--input-border-hover)]';

const inputDisabled = 'opacity-60 cursor-not-allowed pointer-events-none select-none';

const TypeBtn = ({ value, current, onClick, icon: Icon, label, description, color, disabled }) => {
    const isActive = current === value;
    return (
        <button
            type="button"
            onClick={() => !disabled && onClick(value)}
            disabled={disabled}
            aria-pressed={isActive}
            className={`relative flex flex-col items-center gap-1 py-2.5 px-2 sm:py-3 sm:px-3 rounded-xl border-2 transition-all duration-150 text-center
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                ${isActive
                    ? `${color} shadow-md scale-[1.02]`
                    : 'border-[var(--border-default)] bg-[var(--bg-muted)] hover:bg-[var(--bg-muted)]/80 text-[var(--text-secondary)]'
                }`}
        >
            <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-[10px] sm:text-xs font-bold">{label}</span>
            <span className="text-[9px] sm:text-[10px] text-[var(--text-muted)] leading-tight hidden sm:block">{description}</span>
            {isActive && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[var(--brand)] border-2 border-[var(--bg-elevated)]" />
            )}
        </button>
    );
};

const ReadOnlyBanner = () => (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--warning-bg)] border border-[var(--warning-border)] text-[var(--warning-text)]">
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
                ? 'bg-[var(--brand)] text-[var(--text-on-brand)] shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)]/50'
        }`}
    >
        {label}
    </button>
);

const MealForm = ({ initialData, onSubmit, onCancel, isAdmin = false, currentUser, readOnly = false, renderFooter }) => {
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
const [singleAdminError, setSingleAdminError] = useState('');

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



    const handleChange = (e) => {
        if (readOnly || isRunning) return;
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

    const handleTypeChange = useCallback((val) => {
        if (isRunning || readOnly) return;
        setSingleAdminError('');
        setFormData(prev => ({ ...prev, type: val }));
    }, [isRunning, readOnly]);

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

    const handleSingleSubmit = async (e) => {
        e.preventDefault();
        if (readOnly || isRunning) return;
        const baseCount = typeCountMap[formData.type] ?? 0;
        const guestAdd = formData.isGuestMeal ? (formData.guestCount || 0) : 0;
        const submitDate = new Date(formData.date).toISOString();

        const payload = { ...formData, date: submitDate, mealCount: baseCount + guestAdd };

        if (initialData) {
            payload.userId = formData.userId;
            delete payload.userIds;
        } else {
            delete payload.userId;
            if (isAdmin && (!payload.userIds || payload.userIds.length === 0)) {
                setSingleAdminError('Please select at least one member.');
                return;
            }
            setSingleAdminError('');
        }

        setIsRunning(true);
        try {
            await onSubmit(payload);
        } finally {
            setIsRunning(false);
        }
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

            await onSubmit(payload);
        } finally {
            setIsRunning(false);
        }
    }, [rangeFrom, rangeTo, formData, isAdmin, currentUser, validateRange, onSubmit]);

    const previewCount = typeCountMap[formData.type] + (formData.isGuestMeal ? formData.guestCount : 0);
    const rangeErrMsg = useMemo(
        () => rangeError || validateRange(rangeFrom, rangeTo),
        [rangeError, rangeFrom, rangeTo, validateRange]
    );
    const rangeInvalid = mode === 'range' && !!rangeErrMsg;

    useEffect(() => {
        if (!renderFooter) return;

        const errorText = mode === 'single' && singleAdminError ? singleAdminError : null;

        renderFooter(
            <>
                {errorText && (
                    <p className="w-full text-xs font-semibold text-[var(--danger-text)]">{errorText}</p>
                )}
                <div className="flex gap-2.5 w-full">
                    {mode === 'single' ? (
                        <>
                            <Button type="button" variant="secondary" size="sm" onClick={onCancel} className="flex-1" disabled={isRunning}>
                                {readOnly ? 'Close' : 'Cancel'}
                            </Button>
                            {!readOnly && (
                                <Button type="submit" form="meal-form" variant="primary" size="sm" className="flex-[2]" isLoading={isRunning} disabled={isRunning}>
                                    {initialData ? 'Update Meal' : 'Save Meal'}
                                </Button>
                            )}
                        </>
                    ) : (
                        <>
                            <Button type="button" variant="secondary" size="sm" onClick={onCancel} className="flex-1" disabled={isRunning}>
                                {isRunning ? 'Saving…' : 'Cancel'}
                            </Button>
                            {!readOnly && (
                                <Button
                                    type="submit"
                                    form="meal-form"
                                    variant="primary"
                                    size="sm"
                                    className="flex-[2]"
                                    isLoading={isRunning}
                                    disabled={isRunning || rangeInvalid || daysCount === 0 || (isAdmin && formData.userIds?.length === 0)}
                                >
                                    {isRunning
                                        ? 'Saving…'
                                        : `Save ${daysCount > 0 ? daysCount : ''} Meal${daysCount !== 1 ? 's' : ''}`
                                    }
                                </Button>
                            )}
                        </>
                    )}
                </div>
            </>
        );
    }, [mode, isRunning, readOnly, initialData, singleAdminError, rangeInvalid, daysCount, isAdmin, formData.userIds?.length, onCancel, renderFooter]);

    return (
        <form
            id="meal-form"
            onSubmit={mode === 'single' ? handleSingleSubmit : (e) => { e.preventDefault(); handleBulkSubmit(formData.type); }}
            className="flex flex-col gap-3 w-full"
        >
            <button type="submit" className="sr-only" tabIndex={-1} aria-hidden="true" />


            {readOnly && <ReadOnlyBanner />}

            {!initialData && (
                <div
                    role="tablist"
                    aria-label="Entry mode"
                    className="flex gap-1 p-1 rounded-xl bg-[var(--bg-muted)] border border-[var(--border-default)]"
                >
                    <ModeTab mode="single" current={mode} onChange={setMode} label="Single Day" />
                    <ModeTab mode="range" current={mode} onChange={setMode} label="Date Range" />
                </div>
            )}

            {mode === 'single' && (
                <div className="relative flex items-center justify-center py-3 rounded-xl border border-[var(--brand)]/20 bg-[var(--brand)]/5 overflow-hidden shrink-0">
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-[var(--text-primary)] leading-none tracking-tight">
                            {previewCount}
                        </span>
                        <span className="text-xs font-medium text-[var(--text-secondary)]">
                            meal{previewCount !== 1 ? 's' : ''} to record
                        </span>
                    </div>
                </div>
            )}

            {mode === 'range' && !isRunning && (
                <div className={`relative flex items-center justify-center py-3 rounded-xl border overflow-hidden shrink-0 transition-colors ${
                    rangeInvalid ? 'border-[var(--danger)]/30 bg-[var(--danger)]/5' : 'border-[var(--brand)]/20 bg-[var(--brand)]/5'
                }`}>
                    {rangeInvalid ? (
                        <p className="text-xs font-semibold text-[var(--danger-text)] px-4 text-center">{rangeErrMsg}</p>
                    ) : (
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-[var(--text-primary)] leading-none tracking-tight">{daysCount}</span>
                            <span className="text-xs font-medium text-[var(--text-secondary)]">
                                day{daysCount !== 1 ? 's' : ''} selected — pick a type to apply
                            </span>
                        </div>
                    )}
                </div>
            )}

            {isRunning && (
                <div className="flex items-center gap-2.5 py-3 rounded-xl border border-[var(--brand)]/20 bg-[var(--brand)]/5 shrink-0">
                    <div className="flex items-center gap-2 text-xs font-semibold text-[var(--brand)]">
                        <span className="inline-block w-4 h-4 rounded-full border-2 border-[var(--brand)]/30 border-t-[var(--brand)] animate-spin" />
                        Saving meals…
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:gap-5">

                {isAdmin && (
                    <Field label="Member" icon={HiOutlineUser}>
                        {initialData ? (
                            <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] shadow-[var(--inset-inner)] text-sm">
                                <Avatar
                                    name={typeof initialData.user === 'object' ? initialData.user?.name : ''}
                                    size="xs"
                                />
                                <span className="flex-1 truncate font-medium text-[var(--text-primary)]">
                                    {typeof initialData.user === 'object'
                                        ? initialData.user?.name
                                        : 'Member'
                                    }
                                </span>
                                {typeof initialData.user === 'object' && initialData.user?.email && (
                                    <span className="text-[11px] text-[var(--text-muted)] truncate hidden sm:inline">
                                        {initialData.user.email}
                                    </span>
                                )}
                            </div>
                        ) : (
                            <MemberSelect
                                users={users}
                                value={formData.userIds}
                                onChange={(ids) => { setFormData(p => ({ ...p, userIds: ids })); setSingleAdminError(''); }}
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

                <div className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border transition-colors ${
                    readOnly ? 'opacity-60 cursor-not-allowed' : ''
                } ${
                    formData.isGuestMeal
                        ? 'border-[var(--warning-border)] bg-[var(--warning-bg)]/50'
                        : 'border-[var(--border-default)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-muted)]'
                }`}>
                    <button
                        type="button"
                        onClick={() => {
                            if (readOnly || isRunning) return;
                            setFormData(prev => {
                                const nextIsGuest = !prev.isGuestMeal;
                                return { ...prev, isGuestMeal: nextIsGuest, guestCount: nextIsGuest ? 1 : 0 };
                            });
                        }}
                        disabled={isRunning || readOnly}
                        className="flex items-center gap-1.5 flex-1 min-w-0 text-left"
                    >
                        <HiOutlineUserGroup className="w-4 h-4 text-[var(--warning)] shrink-0" />
                        <span className="text-xs font-semibold text-[var(--text-primary)]">Guest Meals</span>
                        {formData.isGuestMeal && formData.guestCount > 0 && (
                            <span className="text-[10px] font-bold text-[var(--warning-text)] bg-[var(--warning-bg)] px-1.5 py-0.5 rounded-full">
                                +{formData.guestCount}
                            </span>
                        )}
                    </button>

                    {formData.isGuestMeal ? (
                        <div className="flex items-center shrink-0 rounded-lg border border-[var(--warning-border)] overflow-hidden">
                            <button
                                type="button"
                                onClick={() => {
                                    if (readOnly || isRunning) return;
                                    setFormData(prev => {
                                        if (prev.guestCount <= 1) return { ...prev, isGuestMeal: false, guestCount: 0 };
                                        return { ...prev, guestCount: prev.guestCount - 1 };
                                    });
                                }}
                                disabled={isRunning || readOnly}
                                className="w-9 h-9 flex items-center justify-center bg-[var(--warning-bg)] text-[var(--warning-text)] hover:brightness-110 active:brightness-95 transition-all text-lg font-bold select-none disabled:opacity-50 disabled:cursor-not-allowed"
                                aria-label="Decrease guest count"
                            >
                                <HiOutlineMinus className="w-4 h-4" />
                            </button>
                            <div className="w-10 h-9 flex items-center justify-center bg-[var(--warning-bg)]/50 text-sm font-bold text-[var(--warning-text)] border-x border-[var(--warning-border)] tabular-nums select-none">
                                {formData.guestCount}
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    if (readOnly || isRunning) return;
                                    setFormData(prev => ({ ...prev, guestCount: Math.min(20, prev.guestCount + 1) }));
                                }}
                                disabled={isRunning || readOnly}
                                className="w-9 h-9 flex items-center justify-center bg-[var(--warning-bg)] text-[var(--warning-text)] hover:brightness-110 active:brightness-95 transition-all text-lg font-bold select-none disabled:opacity-50 disabled:cursor-not-allowed"
                                aria-label="Increase guest count"
                            >
                                <HiOutlinePlus className="w-4 h-4" />
                            </button>
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={() => {
                                if (readOnly || isRunning) return;
                                setFormData(prev => ({ ...prev, isGuestMeal: true, guestCount: 1 }));
                            }}
                            disabled={isRunning || readOnly}
                            className="px-3 h-9 rounded-lg bg-[var(--warning-bg)] text-[var(--warning-text)] text-xs font-semibold shrink-0 hover:brightness-110 active:brightness-95 transition-all border border-[var(--warning-border)] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            + Add
                        </button>
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

            {mode === 'single' && singleAdminError && (
                <p className="text-xs font-semibold text-[var(--danger-text)] px-1">{singleAdminError}</p>
            )}
        </form>
    );
};

export default MealForm;
