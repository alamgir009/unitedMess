import React, { useState, useMemo } from 'react';
import {
    Search,
    CheckCircle2,
    XCircle,
    Clock,
    Users,
    SlidersHorizontal,
    ShieldCheck,
    ShieldOff,
    CircleDot,
} from 'lucide-react';
// import { BiBlock } from "react-icons/md";
import { BiBlock } from "react-icons/bi";
import MemberRowActions from './MemberRowActions';
import UserEditModal from './UserEditModal';
import { cn } from '@/core/utils/helpers/string.helper';

/* ─────────────────────────────────────────────────────────────
   Avatar colour palette — deterministic by name
───────────────────────────────────────────────────────────── */
const AVATAR_GRADIENTS = [
    'from-blue-500 to-indigo-600',
    'from-rose-500 to-pink-600',
    'from-emerald-500 to-teal-600',
    'from-amber-500 to-orange-600',
    'from-violet-500 to-purple-600',
    'from-cyan-500 to-sky-600',
];

const avatarGradient = (name = '') =>
    AVATAR_GRADIENTS[(name.charCodeAt(0) || 0) % AVATAR_GRADIENTS.length];

/* ─────────────────────────────────────────────────────────────
   Derive display status from userStatus + isActive
───────────────────────────────────────────────────────────── */
const getDisplayStatus = ({ userStatus, isActive }) => {
    if (userStatus === 'pending') return 'pending';
    if (userStatus === 'denied')  return 'denied';
    return isActive ? 'active' : 'inactive';
};

/* ─────────────────────────────────────────────────────────────
   StatusBadge
───────────────────────────────────────────────────────────── */
const STATUS_CONFIG = {
    active:   { icon: ShieldCheck,  cls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/10' },
    inactive: { icon: BiBlock,      cls: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/10' },
    pending:  { icon: Clock,        cls: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/10' },
    denied:   { icon: XCircle,      cls: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/10' },
};

const StatusBadge = ({ status }) => {
    const { icon: Icon, cls } = STATUS_CONFIG[status] ?? STATUS_CONFIG.inactive;
    return (
        <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wider', cls)}>
            <Icon size={11} strokeWidth={2.5} />
            {status}
        </span>
    );
};

/* ─────────────────────────────────────────────────────────────
   PaymentBadge
───────────────────────────────────────────────────────────── */
const resolvePayment = (raw) => {
    const s = String(raw || '').toLowerCase();
    if (s === 'paid' || s === 'success')  return { label: 'Paid',     icon: CheckCircle2, cls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/10' };
    if (s === 'pending')                  return { label: 'Pending',  icon: Clock,        cls: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/10' };
    if (s === 'refunded')                 return { label: 'Refunded', icon: CircleDot,    cls: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/10' };
    return                                       { label: 'Unpaid',   icon: XCircle,      cls: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/10' };
};

const PaymentBadge = ({ status }) => {
    const { label, icon: Icon, cls } = resolvePayment(status);
    return (
        <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wider', cls)}>
            <Icon size={11} strokeWidth={2.5} />
            {label}
        </span>
    );
};

/* ─────────────────────────────────────────────────────────────
   Filter tabs config
───────────────────────────────────────────────────────────── */
const FILTER_TABS = [
    { id: 'all',     label: 'All'     },
    { id: 'active',  label: 'Active'  },
    { id: 'inactive',  label: 'Inactive'  },
    { id: 'pending', label: 'Pending' },
    { id: 'denied',  label: 'Denied'  },
];

/* ─────────────────────────────────────────────────────────────
   Skeleton row
───────────────────────────────────────────────────────────── */
const SkeletonRow = () => (
    <tr className="animate-pulse">
        <td className="px-5 py-4">
            <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-muted" />
                <div className="space-y-2">
                    <div className="h-3 w-28 rounded bg-muted" />
                    <div className="h-2.5 w-20 rounded bg-muted" />
                </div>
            </div>
        </td>
        <td className="px-5 py-4">
            <div className="h-6 w-20 rounded-full bg-muted" />
        </td>
        <td className="px-5 py-4">
            <div className="h-6 w-16 rounded-full bg-muted" />
        </td>
        <td className="px-5 py-4">
            <div className="h-6 w-16 rounded-full bg-muted" />
        </td>
        <td className="px-5 py-4 text-right">
            <div className="ml-auto h-8 w-20 rounded-xl bg-muted" />
        </td>
    </tr>
);

/* ─────────────────────────────────────────────────────────────
   MembersTable
───────────────────────────────────────────────────────────── */
const MembersTable = ({ users = [], onSearch, isLoading }) => {
    const [editingUser,     setEditingUser]     = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [activeFilter,    setActiveFilter]    = useState('all');
    const [localSearch,     setLocalSearch]     = useState('');

    const handleEditUser = (user) => {
        setEditingUser(user);
        setIsEditModalOpen(true);
    };

    const handleCloseEditModal = () => {
        setIsEditModalOpen(false);
        setTimeout(() => setEditingUser(null), 250);
    };

    const handleSearchChange = (e) => {
        const val = e.target.value;
        setLocalSearch(val);
        onSearch?.(val);
    };

    /* Attach derived status once */
    const usersWithStatus = useMemo(
        () => users.map(u => ({ ...u, _displayStatus: getDisplayStatus(u) })),
        [users]
    );

    /* Tab counts */
    const counts = useMemo(() => {
        const c = { all: usersWithStatus.length, active: 0, inactive: 0, pending: 0, denied: 0 };
        usersWithStatus.forEach(({ _displayStatus: s }) => {
            if (s === 'active')        c.active++;
            else if (s === 'inactive') c.inactive++;
            else if (s === 'pending')  c.pending++;
            else if (s === 'denied')   c.denied++;
        });
        return c;
    }, [usersWithStatus]);

    /* Filtered list */
    const filteredUsers = useMemo(
        () => activeFilter === 'all'
            ? usersWithStatus
            : usersWithStatus.filter(u => u._displayStatus === activeFilter),
        [usersWithStatus, activeFilter]
    );

    return (
        <>
            <div className="flex flex-col overflow-hidden rounded-2xl border border-border/50 bg-card shadow-sm">

                {/* ── Header ── */}
                <div className="flex flex-col gap-3 border-b border-border/50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">

                    {/* Title block */}
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 border border-primary/10">
                            <Users size={18} strokeWidth={2} className="text-primary" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold tracking-tight text-foreground">
                                Members Matrix
                            </h3>
                            <p className="text-xs text-muted-foreground">
                                {filteredUsers.length} of {users.length} members
                            </p>
                        </div>
                    </div>

                    {/* Search */}
                    <div className="relative w-full sm:w-64">
                        <Search
                            size={15}
                            strokeWidth={2}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                        />
                        <input
                            type="text"
                            value={localSearch}
                            placeholder="Search members..."
                            onChange={handleSearchChange}
                            className="w-full rounded-xl border border-border/45 bg-muted/30 py-2 pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none transition-all focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40"
                        />
                    </div>
                </div>

                {/* ── Filter tabs ── */}
                <div className="flex items-center gap-0.5 overflow-x-auto border-b border-border/50 px-4">
                    {FILTER_TABS.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveFilter(tab.id)}
                            className={cn(
                                'inline-flex shrink-0 items-center gap-1.5 border-b-2 px-4 py-3 text-xs font-semibold transition-all',
                                activeFilter === tab.id
                                    ? 'border-primary text-primary'
                                    : 'border-transparent text-muted-foreground hover:text-foreground'
                            )}
                        >
                            {tab.label}
                            {counts[tab.id] > 0 && (
                                <span
                                    className={cn(
                                        'rounded-full px-1.5 py-0.5 text-[10px] font-bold transition-colors',
                                        activeFilter === tab.id
                                            ? 'bg-primary text-primary-foreground'
                                            : 'bg-muted text-muted-foreground'
                                    )}
                                >
                                    {counts[tab.id]}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* ── Table ── */}
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[720px] table-auto text-left text-sm">

                        {/* Head */}
                        <thead className="border-b border-border/50 bg-muted/30 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                            <tr>
                                <th className="px-5 py-3">Member</th>
                                <th className="px-5 py-3">Status</th>
                                <th className="px-5 py-3">Meal Bill</th>
                                <th className="px-5 py-3">Gas Bill</th>
                                <th className="px-5 py-3 text-right">Actions</th>
                            </tr>
                        </thead>

                        {/* Body */}
                        <tbody className="divide-y divide-border/20">
                            {isLoading ? (
                                Array.from({ length: 5 }, (_, i) => <SkeletonRow key={i} />)
                            ) : filteredUsers.length > 0 ? (
                                filteredUsers.map((user) => (
                                    <tr
                                        key={user._id}
                                        className="group transition-colors hover:bg-muted/40"
                                    >
                                        {/* Member */}
                                        <td className="px-5 py-3.5">
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className={cn(
                                                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
                                                        'bg-gradient-to-br text-sm font-bold text-white shadow-sm',
                                                        avatarGradient(user.name)
                                                    )}
                                                >
                                                    {user.name?.charAt(0).toUpperCase() ?? 'U'}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="truncate text-sm font-semibold leading-snug text-foreground">
                                                        {user.name}
                                                    </p>
                                                    <p className="truncate text-xs text-muted-foreground">
                                                        {user.email}
                                                    </p>
                                                    {user.phone && (
                                                        <p className="text-[10px] text-muted-foreground/60">
                                                            {user.phone}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </td>

                                        {/* Status + role */}
                                        <td className="px-5 py-3.5">
                                            <div className="flex flex-col items-start gap-1.5">
                                                <StatusBadge status={user._displayStatus} />
                                                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                                                    {user.role}
                                                </span>
                                            </div>
                                        </td>

                                        {/* Meal bill */}
                                        <td className="px-5 py-3.5">
                                            <PaymentBadge status={user.paymentStatus ?? user.payment} />
                                        </td>

                                        {/* Gas bill */}
                                        <td className="px-5 py-3.5">
                                            <PaymentBadge status={user.gasBillStatus ?? user.gasBill} />
                                        </td>

                                        {/* Actions */}
                                        <td className="px-5 py-3.5 text-right">
                                            <MemberRowActions user={user} onEdit={handleEditUser} />
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-16 text-center">
                                        <div className="flex flex-col items-center gap-2.5 text-muted-foreground">
                                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
                                                <SlidersHorizontal size={22} strokeWidth={1.8} className="opacity-50" />
                                            </div>
                                            <p className="text-sm font-semibold text-foreground">
                                                No members found
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                Try adjusting the filter or search query
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <UserEditModal
                isOpen={isEditModalOpen}
                onClose={handleCloseEditModal}
                user={editingUser}
            />
        </>
    );
};

export default MembersTable;