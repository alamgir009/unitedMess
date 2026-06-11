import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import {
    HiOutlineCalendarDays,
    HiOutlineCurrencyRupee,
    HiOutlineShoppingCart,
    HiOutlineChatBubbleBottomCenterText,
    HiOutlineUser,
    HiOutlineLockClosed,
} from 'react-icons/hi2';
import apiClient from '@/services/api/client/apiClient';
import { Button, Avatar, MemberSelect } from '@/shared/components/ui';

/* ─── Design tokens ─────────────────────────────────────────── */

const inputBase =
    'w-full px-3 py-2 rounded-xl border border-border/60 ' +
    'bg-background ' +
    'focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/60 ' +
    'outline-none transition-all duration-150 ' +
    'text-sm text-foreground placeholder:text-muted-foreground/50 ' +
    'hover:border-border';

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

/* ─── ReadOnly banner ───────────────────────────────────────── */
const ReadOnlyBanner = () => (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400">
        <HiOutlineLockClosed className="w-3.5 h-3.5 flex-shrink-0" />
        <p className="text-xs font-semibold">View only — only admins can edit market records</p>
    </div>
);

/* ─── MarketForm ────────────────────────────────────────────── */
const MarketForm = ({ initialData, onSubmit, onCancel, isAdmin = false, currentUser, readOnly = false }) => {
    const [formData, setFormData] = useState({
        date: format(new Date(), 'yyyy-MM-dd'),
        amount: '',
        items: '',
        description: '',
        userId: currentUser?._id || currentUser?.id || '',
        userIds: [],
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
            const targetUserId = typeof initialData.user === 'object'
                ? initialData.user?._id
                : initialData.user || '';
            setFormData({
                date: initialData.date
                    ? format(new Date(initialData.date), 'yyyy-MM-dd')
                    : format(new Date(), 'yyyy-MM-dd'),
                amount: initialData.amount ?? '',
                items: initialData.items || '',
                description: initialData.description || '',
                userId: targetUserId,
                userIds: targetUserId ? [targetUserId] : [],
            });
        } else {
            setFormData((prev) => ({
                ...prev,
                userId: currentUser?._id || currentUser?.id || '',
                userIds: [],
            }));
        }
    }, [initialData, currentUser]);

    const handleChange = (e) => {
        if (readOnly) return;
        const { name, value, type } = e.target;
        let newVal = value;
        if (type === 'number') newVal = value === '' ? '' : parseFloat(value) || 0;
        setFormData((prev) => ({ ...prev, [name]: newVal }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (readOnly) return;

        const submitDate = new Date(formData.date).toISOString();

        const payload = {
            ...formData,
            date: submitDate,
            amount: parseFloat(formData.amount) || 0,
        };

        if (initialData) {
            payload.userId = formData.userId;
            delete payload.userIds;
        } else {
            delete payload.userId;
            if (isAdmin && (!payload.userIds || payload.userIds.length === 0)) return;
        }

        onSubmit(payload);
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 w-full">

            {/* Read-only notice */}
            {readOnly && <ReadOnlyBanner />}

            {/* ── Amount preview banner ── */}
            <div className="relative flex items-center justify-center py-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 overflow-hidden shrink-0">
                <div className="flex items-baseline gap-2">
                    <span className="text-[28px] font-black text-foreground leading-none tracking-tight">
                        ₹{formData.amount === '' ? '0' : Number(formData.amount).toLocaleString('en-IN')}
                    </span>
                    <span className="text-xs font-medium text-muted-foreground">purchase amount</span>
                </div>
            </div>

            {/* ── Form fields ── */}
            <div className="flex flex-col gap-3">

                {/* Admin: member selector */}
                {isAdmin && (
                    <Field label="Member" icon={HiOutlineUser}>
                        {initialData ? (
                            /* Edit mode — show single member as read-only tag */
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
                                disabled={readOnly}
                                accentColor="emerald"
                                placeholder="Select members…"
                            />
                        )}
                    </Field>
                )}

                {/* Date */}
                <Field label="Date" icon={HiOutlineCalendarDays}>
                    <input
                        type="date"
                        name="date"
                        value={formData.date}
                        onChange={handleChange}
                        required={!readOnly}
                        disabled={readOnly}
                        className={`${inputBase} ${readOnly ? inputDisabled : ''}`}
                    />
                </Field>

                {/* Amount */}
                <Field label="Amount (₹)" icon={HiOutlineCurrencyRupee}>
                    <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-500 font-semibold text-sm pointer-events-none select-none">
                            ₹
                        </span>
                        <input
                            type="number"
                            name="amount"
                            value={formData.amount}
                            onChange={handleChange}
                            min="0"
                            step="0.01"
                            required={!readOnly}
                            placeholder="0.00"
                            disabled={readOnly}
                            className={`${inputBase} pl-7 ${readOnly ? inputDisabled : ''}`}
                        />
                    </div>
                </Field>

                {/* Items */}
                <Field label="Items Purchased" icon={HiOutlineShoppingCart}>
                    <input
                        type="text"
                        name="items"
                        value={formData.items}
                        onChange={handleChange}
                        required={!readOnly}
                        placeholder="e.g. Rice, Vegetables, Oil…"
                        disabled={readOnly}
                        className={`${inputBase} ${readOnly ? inputDisabled : ''}`}
                    />
                </Field>

                {/* Description */}
                <Field label="Description (Optional)" icon={HiOutlineChatBubbleBottomCenterText}>
                    <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        rows={2}
                        disabled={readOnly}
                        className={`${inputBase} resize-none ${readOnly ? inputDisabled : ''}`}
                        placeholder={readOnly ? '' : 'Add extra notes about this purchase…'}
                    />
                </Field>
            </div>

            {/* ── Action buttons ── */}
            <div className="flex gap-2.5 pt-3 border-t border-border/30 shrink-0">
                <Button
                    type="button" variant="secondary" size="sm"
                    onClick={onCancel} className="flex-1"
                >
                    {readOnly ? 'Close' : 'Cancel'}
                </Button>
                {!readOnly && (
                    <Button
                        type="submit" variant="success" size="sm"
                        className="flex-[2]"
                    >
                        {initialData ? 'Update Entry' : 'Save Entry'}
                    </Button>
                )}
            </div>
        </form>
    );
};

export default MarketForm;
