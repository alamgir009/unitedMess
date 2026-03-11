import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import {
    HiOutlineCalendarDays,
    HiOutlineCurrencyDollar,
    HiOutlineShoppingCart,
    HiOutlineChatBubbleBottomCenterText,
    HiOutlineUser,
} from 'react-icons/hi2';
import apiClient from '@/services/api/client/apiClient';
import { Button } from '@/shared/components/ui';

/* ── Field wrapper ── */
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
    'w-full px-3 py-2 sm:px-4 sm:py-3 rounded-xl border border-white/20 dark:border-white/10 bg-background/60 backdrop-blur-md focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/50 outline-none transition-all duration-200 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground/60 shadow-inner';

const MarketForm = ({ initialData, onSubmit, onCancel, isAdmin = false, currentUser }) => {
    const [formData, setFormData] = useState({
        date: format(new Date(), 'yyyy-MM-dd'),
        amount: '',
        items: '',
        description: '',
        userId: currentUser?._id || currentUser?.id || '',
    });

    const [users, setUsers] = useState([]);
    const [isUsersLoading, setIsUsersLoading] = useState(false);

    /* Fetch user list for admin */
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

    /* Populate form when editing */
    useEffect(() => {
        if (initialData) {
            setFormData({
                date: initialData.date
                    ? format(new Date(initialData.date), 'yyyy-MM-dd')
                    : format(new Date(), 'yyyy-MM-dd'),
                amount: initialData.amount ?? '',
                items: initialData.items || '',
                description: initialData.description || '',
                userId:
                    typeof initialData.user === 'object'
                        ? initialData.user?._id
                        : initialData.user || '',
            });
        } else {
            setFormData((prev) => ({
                ...prev,
                userId: currentUser?._id || currentUser?.id || '',
            }));
        }
    }, [initialData, currentUser]);

    const handleChange = (e) => {
        const { name, value, type } = e.target;
        let newVal = value;
        if (type === 'number') newVal = value === '' ? '' : parseFloat(value) || 0;
        setFormData((prev) => ({ ...prev, [name]: newVal }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit({
            ...formData,
            amount: parseFloat(formData.amount) || 0,
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">

            {/* ── Amount Preview ── */}
            <div className="flex items-center justify-center py-2 sm:py-3 rounded-xl sm:rounded-2xl border border-emerald-500/20 bg-emerald-500/5 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-teal-400/5 to-cyan-500/5" />
                <div className="relative text-center">
                    <span className="text-3xl sm:text-4xl font-black text-foreground">
                        ₹{formData.amount === '' ? '0' : Number(formData.amount).toLocaleString()}
                    </span>
                    <span className="text-xs sm:text-sm font-semibold text-muted-foreground ml-1 sm:ml-2">
                        will be recorded
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:gap-5">

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

                {/* ── Amount ── */}
                <Field label="Amount (₹)" icon={HiOutlineCurrencyDollar}>
                    <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-500 font-bold text-sm pointer-events-none">₹</span>
                        <input
                            type="number"
                            name="amount"
                            value={formData.amount}
                            onChange={handleChange}
                            min="0"
                            step="0.01"
                            required
                            placeholder="0.00"
                            className={`${inputBase} pl-8`}
                        />
                    </div>
                </Field>

                {/* ── Items ── */}
                <Field label="Items Purchased" icon={HiOutlineShoppingCart}>
                    <input
                        type="text"
                        name="items"
                        value={formData.items}
                        onChange={handleChange}
                        required
                        placeholder="e.g. Rice, Vegetables, Oil…"
                        className={inputBase}
                    />
                </Field>

                {/* ── Description ── */}
                <Field label="Description (Optional)" icon={HiOutlineChatBubbleBottomCenterText}>
                    <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        rows={2}
                        className={`${inputBase} resize-none`}
                        placeholder="Add extra notes about this purchase…"
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
                    {initialData ? 'Update Entry' : 'Save Entry'}
                </Button>
            </div>
        </form>
    );
};

export default MarketForm;
