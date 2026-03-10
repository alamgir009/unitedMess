import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import {
    HiOutlineSun,
    HiOutlineMoon,
    HiOutlineNoSymbol,
    HiOutlineSparkles,
    HiOutlineUserGroup,
    HiOutlineCalendarDays,
    HiOutlineChatBubbleBottomCenterText,
    HiOutlineUser,
} from 'react-icons/hi2';
import apiClient from '@/services/api/client/apiClient';
import { Button } from '@/shared/components/ui';

/* Simple show/hide wrapper */
const AnimatedField = ({ show, children }) => {
    if (!show) return null;
    return <div className="animate-in fade-in slide-in-from-top-2 duration-200">{children}</div>;
};

/* ── Styled Input ── */
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

/* ── Meal Type Button ── */
const TypeBtn = ({ value, current, onClick, icon: Icon, label, description, color }) => {
    const isActive = current === value;
    return (
        <button
            type="button"
            onClick={() => onClick(value)}
            className={`relative flex flex-col items-center gap-1 py-2 px-1 sm:py-3 sm:px-2 rounded-xl sm:rounded-2xl border-2 transition-all duration-200 text-center
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

const mealTypes = [
    {
        value: 'both',
        label: 'Both',
        description: 'Day & Night',
        icon: HiOutlineSparkles,
        color: 'border-primary/60 bg-primary/10 text-primary',
    },
    {
        value: 'day',
        label: 'Day',
        description: 'Morning only',
        icon: HiOutlineSun,
        color: 'border-amber-500/60 bg-amber-500/10 text-amber-500',
    },
    {
        value: 'night',
        label: 'Night',
        description: 'Evening only',
        icon: HiOutlineMoon,
        color: 'border-indigo-400/60 bg-indigo-400/10 text-indigo-400',
    },
    {
        value: 'off',
        label: 'Off',
        description: 'No meals',
        icon: HiOutlineNoSymbol,
        color: 'border-muted-foreground/40 bg-muted/30 text-muted-foreground',
    },
];

const typeCountMap = { both: 2, day: 1, night: 1, off: 0 };

const MealForm = ({ initialData, onSubmit, onCancel, isAdmin = false, currentUser }) => {
    const [formData, setFormData] = useState({
        date: format(new Date(), 'yyyy-MM-dd'),
        type: 'both',
        isGuestMeal: false,
        guestCount: 0,
        remarks: '',
        userId: currentUser?._id || currentUser?.id || '',
    });

    const [users, setUsers] = useState([]);
    const [isUsersLoading, setIsUsersLoading] = useState(false);

    useEffect(() => {
        if (isAdmin) {
            const fetchUsers = async () => {
                setIsUsersLoading(true);
                try {
                    const res = await apiClient.get('users?limit=100');
                    setUsers(res.data?.data?.users || res.data?.users || []);
                } catch (error) {
                    console.error('Failed to fetch users', error);
                } finally {
                    setIsUsersLoading(false);
                }
            };
            fetchUsers();
        }
    }, [isAdmin]);

    useEffect(() => {
        if (initialData) {
            setFormData({
                date: initialData.date
                    ? format(new Date(initialData.date), 'yyyy-MM-dd')
                    : format(new Date(), 'yyyy-MM-dd'),
                type: initialData.type || 'both',
                isGuestMeal: initialData.isGuestMeal || false,
                guestCount: initialData.guestCount || 0,
                remarks: initialData.remarks || '',
                userId: typeof initialData.user === 'object' ? initialData.user?._id : (initialData.user || ''),
            });
        } else {
            setFormData(prev => ({
                ...prev,
                userId: currentUser?._id || currentUser?.id || '',
            }));
        }
    }, [initialData, currentUser]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        let newVal = value;
        if (type === 'checkbox') newVal = checked;
        if (type === 'number') newVal = parseInt(value, 10) || 0;
        setFormData((prev) => ({ ...prev, [name]: newVal }));
    };

    const handleTypeChange = (val) => {
        setFormData((prev) => ({ ...prev, type: val }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const baseCount = typeCountMap[formData.type] ?? 0;
        const guestAdd = formData.isGuestMeal ? (formData.guestCount || 0) : 0;
        onSubmit({ ...formData, mealCount: baseCount + guestAdd });
    };

    // Preview badge
    const previewCount = typeCountMap[formData.type] + (formData.isGuestMeal ? formData.guestCount : 0);

    return (
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">

            {/* ── Meal Count Preview ── */}
            <div className="flex items-center justify-center py-2 sm:py-3 rounded-xl sm:rounded-2xl border border-primary/20 bg-primary/5 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-secondary-400/5 to-accent/5" />
                <div className="relative text-center">
                    <span className="text-3xl sm:text-4xl font-black text-foreground">{previewCount}</span>
                    <span className="text-xs sm:text-sm font-semibold text-muted-foreground ml-1 sm:ml-2">
                        meal{previewCount !== 1 ? 's' : ''} will be recorded
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:gap-6">

                {/* ── Admin User Selection ── */}
                {isAdmin && (
                    <Field label="Member" icon={HiOutlineUser}>
                        <div className="relative">
                            <select
                                name="userId"
                                value={formData.userId}
                                onChange={handleChange}
                                required
                                disabled={isUsersLoading || !!initialData}
                                className={`${inputBase} appearance-none cursor-pointer disabled:opacity-70`}
                            >
                                <option value="" disabled>
                                    {isUsersLoading ? 'Loading users...' : 'Select a member'}
                                </option>
                                {users.map((u) => (
                                    <option key={u._id} value={u._id}>
                                        {u.name} {u.email ? `(${u.email})` : ''}
                                    </option>
                                ))}
                            </select>
                            {/* Custom dropdown arrow */}
                            <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-muted-foreground">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        </div>
                    </Field>
                )}

                {/* ── Date ── */}
                <Field label="Date" icon={HiOutlineCalendarDays}>
                    <input
                        type="date"
                        name="date"
                        value={formData.date}
                        onChange={handleChange}
                        required
                        className={inputBase}
                    />
                </Field>

                {/* ── Type Selector ── */}
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
                            />
                        ))}
                    </div>
                </Field>

                {/* ── Guest Meal Toggle & Count ── */}
                <div className="flex flex-col sm:flex-row items-stretch gap-3">

                    {/* Toggle switch */}
                    <label className="flex items-center gap-3 cursor-pointer p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-white/10 dark:border-white/5 bg-muted/10 hover:bg-muted/20 transition-colors group flex-1 h-full">
                        <div className="relative flex items-center flex-shrink-0">
                            <input
                                type="checkbox"
                                name="isGuestMeal"
                                checked={formData.isGuestMeal}
                                onChange={handleChange}
                                className="peer sr-only"
                            />
                            <div className="w-12 h-6 bg-muted-foreground/25 peer-focus:ring-2 peer-focus:ring-primary/40 rounded-full transition-colors peer-checked:bg-primary" />
                            <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-all peer-checked:translate-x-6" />
                        </div>

                        <div>
                            <div className="flex items-center gap-2">
                                <HiOutlineUserGroup className="w-4 h-4 text-amber-500" />
                                <span className="text-xs sm:text-sm font-bold text-foreground">
                                    Include Guest Meals
                                </span>
                            </div>
                            <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
                                Add extra meals for guests
                            </p>
                        </div>
                    </label>

                    {/* Guest count input */}
                    {formData.isGuestMeal && (
                        <div className="relative w-full sm:w-28 h-full flex items-center">
                            <input
                                type="number"
                                name="guestCount"
                                min="1"
                                max="20"
                                value={formData.guestCount}
                                onChange={handleChange}
                                className="w-full h-full px-3 py-2 sm:py-3 rounded-xl sm:rounded-2xl border border-amber-500/30 bg-amber-500/5 focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/50 outline-none transition-all text-sm text-amber-600 dark:text-amber-300 font-bold shadow-inner text-center"
                                placeholder="#"
                            />
                            <span className="absolute -top-2 left-2 px-1 text-[8px] sm:text-[10px] font-bold text-amber-500/70 bg-background rounded">
                                guests
                            </span>
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
                        className={`${inputBase} resize-none`}
                        placeholder="Add special notes about this meal..."
                    />
                </Field>
            </div>

            {/* ── Actions ── */}
            <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4 sm:pt-6 border-t border-white/10 dark:border-white/5">
                <Button
                    type="button"
                    variant="secondary"
                    size="md"
                    onClick={onCancel}
                    className="w-full sm:w-auto"
                >
                    Cancel
                </Button>

                <Button
                    type="submit"
                    variant="success"
                    size="md"
                    className="w-full sm:flex-[2]"
                >
                    {initialData ? 'Update Meal' : 'Save Meal'}
                </Button>
            </div>
        </form>
    );
};

export default MealForm;