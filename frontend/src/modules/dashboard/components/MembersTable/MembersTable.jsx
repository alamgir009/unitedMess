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
    active:   { icon: ShieldCheck,  cls: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/25' },
    inactive: { icon: BiBlock,    cls: 'bg-slate-50   text-slate-500   border-slate-200   dark:bg-slate-700/30   dark:text-slate-400   dark:border-slate-600/40'   },
    pending:  { icon: Clock,        cls: 'bg-amber-50   text-amber-700   border-amber-200   dark:bg-amber-500/10   dark:text-amber-400   dark:border-amber-500/25'   },
    denied:   { icon: XCircle,      cls: 'bg-rose-50    text-rose-700    border-rose-200    dark:bg-rose-500/10    dark:text-rose-400    dark:border-rose-500/25'    },
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
    if (s === 'paid' || s === 'success')  return { label: 'Paid',     icon: CheckCircle2, cls: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/25' };
    if (s === 'pending')                  return { label: 'Pending',  icon: Clock,        cls: 'bg-amber-50   text-amber-700   border-amber-200   dark:bg-amber-500/10   dark:text-amber-400   dark:border-amber-500/25'   };
    if (s === 'refunded')                 return { label: 'Refunded', icon: CircleDot,    cls: 'bg-sky-50     text-sky-700     border-sky-200     dark:bg-sky-500/10     dark:text-sky-400     dark:border-sky-500/25'     };
    return                                       { label: 'Unpaid',   icon: XCircle,      cls: 'bg-rose-50    text-rose-700    border-rose-200    dark:bg-rose-500/10    dark:text-rose-400    dark:border-rose-500/25'    };
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
                <div className="h-9 w-9 rounded-full bg-slate-200/70 dark:bg-slate-700/50" />
                <div className="space-y-2">
                    <div className="h-3 w-28 rounded-full bg-slate-200/70 dark:bg-slate-700/50" />
                    <div className="h-2.5 w-20 rounded-full bg-slate-100/70 dark:bg-slate-800/50" />
                </div>
            </div>
        </td>
        {[28, 20, 20].map((w, i) => (
            <td key={i} className="px-5 py-4">
                <div className={`h-6 w-${w} rounded-full bg-slate-200/70 dark:bg-slate-700/50`} />
            </td>
        ))}
        <td className="px-5 py-4 text-right">
            <div className="ml-auto h-8 w-20 rounded-xl bg-slate-200/70 dark:bg-slate-700/50" />
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
        const c = { all: usersWithStatus.length, active: 0, pending: 0, denied: 0 };
        usersWithStatus.forEach(({ _displayStatus: s }) => {
            if (s === 'active')  c.active++;
            else if (s === 'pending') c.pending++;
            else if (s === 'denied')  c.denied++;
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
            <div className="flex flex-col overflow-hidden rounded-2xl border border-white/30 bg-white/70 shadow-sm backdrop-blur-xl dark:border-slate-700/50 dark:bg-slate-900/70">

                {/* ── Header ── */}
                <div className="flex flex-col gap-3 border-b border-white/30 px-5 py-4 dark:border-slate-700/50 sm:flex-row sm:items-center sm:justify-between">

                    {/* Title block */}
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20">
                            <Users size={18} strokeWidth={2} className="text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
                                Members Matrix
                            </h3>
                            <p className="text-xs text-slate-400 dark:text-slate-500">
                                {filteredUsers.length} of {users.length} members
                            </p>
                        </div>
                    </div>

                    {/* Search */}
                    <div className="relative w-full sm:w-64">
                        <Search
                            size={15}
                            strokeWidth={2}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                        <input
                            type="text"
                            value={localSearch}
                            placeholder="Search members..."
                            onChange={handleSearchChange}
                            className={cn(
                                'w-full rounded-xl border py-2 pl-9 pr-4 text-sm outline-none transition-all',
                                'border-slate-200 bg-white/60 text-slate-900 placeholder:text-slate-400',
                                'focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20',
                                'dark:border-slate-700/50 dark:bg-slate-800/50 dark:text-white',
                                'dark:placeholder:text-slate-500 dark:focus:border-indigo-500/50 dark:focus:ring-indigo-400/20'
                            )}
                        />
                    </div>
                </div>

                {/* ── Filter tabs ── */}
                <div className="flex items-center gap-0.5 overflow-x-auto border-b border-white/30 px-4 dark:border-slate-700/50">
                    {FILTER_TABS.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveFilter(tab.id)}
                            className={cn(
                                'inline-flex shrink-0 items-center gap-1.5 border-b-2 px-4 py-3 text-xs font-semibold transition-all',
                                activeFilter === tab.id
                                    ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
                            )}
                        >
                            {tab.label}
                            {counts[tab.id] > 0 && (
                                <span
                                    className={cn(
                                        'rounded-full px-1.5 py-0.5 text-[10px] font-bold',
                                        activeFilter === tab.id
                                            ? 'bg-indigo-600 text-white dark:bg-indigo-500'
                                            : 'bg-slate-100 text-slate-500 dark:bg-slate-700/60 dark:text-slate-400'
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
                        <thead className="border-b border-white/30 bg-slate-50/60 text-[11px] font-semibold uppercase tracking-widest text-slate-400 backdrop-blur-sm dark:border-slate-700/50 dark:bg-slate-800/30 dark:text-slate-500">
                            <tr>
                                <th className="px-5 py-3">Member</th>
                                <th className="px-5 py-3">Status</th>
                                <th className="px-5 py-3">Meal Bill</th>
                                <th className="px-5 py-3">Gas Bill</th>
                                <th className="px-5 py-3 text-right">Actions</th>
                            </tr>
                        </thead>

                        {/* Body */}
                        <tbody className="divide-y divide-slate-100/60 dark:divide-slate-700/40">
                            {isLoading ? (
                                Array.from({ length: 5 }, (_, i) => <SkeletonRow key={i} />)
                            ) : filteredUsers.length > 0 ? (
                                filteredUsers.map((user) => (
                                    <tr
                                        key={user._id}
                                        className="group transition-colors hover:bg-white/50 dark:hover:bg-slate-800/30"
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
                                                    <p className="truncate text-sm font-semibold leading-snug text-slate-900 dark:text-white">
                                                        {user.name}
                                                    </p>
                                                    <p className="truncate text-xs text-slate-400 dark:text-slate-500">
                                                        {user.email}
                                                    </p>
                                                    {user.phone && (
                                                        <p className="text-[10px] text-slate-300 dark:text-slate-600">
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
                                                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
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
                                        <div className="flex flex-col items-center gap-2.5 text-slate-400">
                                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
                                                <SlidersHorizontal size={22} strokeWidth={1.8} className="opacity-50" />
                                            </div>
                                            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                                                No members found
                                            </p>
                                            <p className="text-xs text-slate-400 dark:text-slate-500">
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