import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { HiOutlineChevronDown, HiOutlineMagnifyingGlass, HiOutlineCheck, HiOutlineXMark, HiOutlineUser, HiOutlineCheckCircle } from 'react-icons/hi2';
import { Avatar } from '@/shared/components/ui';

const inputBase =
    'w-full px-3 py-2 rounded-xl border border-border/60 ' +
    'bg-background/70 backdrop-blur-md ' +
    'focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/60 ' +
    'outline-none transition-all duration-200 ' +
    'text-sm text-foreground placeholder:text-muted-foreground/50 ' +
    'shadow-sm hover:border-border';

const MultiMemberSelect = ({ users = [], value = [], onChange, loading = false, disabled = false }) => {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const ref = useRef(null);
    const searchRef = useRef(null);

    useEffect(() => {
        const handler = (e) => {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    useEffect(() => {
        if (open) setTimeout(() => searchRef.current?.focus(), 80);
    }, [open]);

    const filtered = useMemo(() => {
        if (!search.trim()) return users;
        const q = search.toLowerCase().trim();
        return users.filter(u =>
            u.name?.toLowerCase().includes(q) ||
            u.email?.toLowerCase().includes(q)
        );
    }, [users, search]);

    const isFullyPaid = useCallback((u) =>
        u.payment === 'success' && u.gasBill === 'success',
    []);

    const selectedCount = value.length;
    const allFilteredSelected = filtered.length > 0 && filtered.every(u => isFullyPaid(u) || value.includes(u._id));

    const toggle = (userId) => {
        if (disabled) return;
        const user = users.find(u => u._id === userId);
        if (!user || isFullyPaid(user)) return;
        onChange(
            value.includes(userId)
                ? value.filter(id => id !== userId)
                : [...value, userId]
        );
    };

    const selectAll = () => {
        if (disabled) return;
        const selectable = filtered.filter(u => !isFullyPaid(u) && !value.includes(u._id));
        if (selectable.length === 0) return;
        onChange([...value, ...selectable.map(u => u._id)]);
    };

    const clearAll = () => {
        if (disabled) return;
        onChange([]);
    };

    return (
        <div ref={ref} className="relative w-full">
            <button
                type="button"
                onClick={() => !disabled && setOpen(o => !o)}
                className={`${inputBase} flex items-center justify-between gap-2 text-left
                    ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
            >
                <span className="flex items-center gap-2 truncate">
                    <HiOutlineUser className="w-4 h-4 shrink-0 text-muted-foreground/70" />
                    <span className="truncate text-sm">
                        {selectedCount === 0
                            ? 'Select members…'
                            : `${selectedCount} member${selectedCount !== 1 ? 's' : ''} selected`
                        }
                    </span>
                </span>
                <span className="flex items-center gap-2">
                    {selectedCount > 0 && (
                        <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-indigo-500/20 text-indigo-500 text-[11px] font-bold leading-none">
                            {selectedCount}
                        </span>
                    )}
                    {!disabled && (
                        <HiOutlineChevronDown
                            className={`w-4 h-4 shrink-0 text-muted-foreground/60 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                        />
                    )}
                </span>
            </button>

            {open && !disabled && (
                <div className="absolute z-50 top-full mt-1.5 w-full rounded-xl border border-border/60 bg-background/98 backdrop-blur-xl shadow-lg overflow-hidden">
                    {/* Search */}
                    <div className="px-2 pt-2 pb-1">
                        <div className="relative">
                            <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 pointer-events-none" />
                            <input
                                ref={searchRef}
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Search members…"
                                className={`${inputBase} pl-9 h-9 text-xs`}
                            />
                            {search && (
                                <button
                                    type="button"
                                    onClick={() => setSearch('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-muted/50 text-muted-foreground/60"
                                >
                                    <HiOutlineXMark className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Batch actions */}
                    {filtered.length > 0 && (
                        <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border/30">
                            <button
                                type="button"
                                onClick={selectAll}
                                disabled={allFilteredSelected || filtered.every(u => isFullyPaid(u))}
                                className="text-[11px] font-semibold uppercase tracking-wider text-indigo-500 hover:text-indigo-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                Select All
                            </button>
                            <span className="text-muted-foreground/30">|</span>
                            <button
                                type="button"
                                onClick={clearAll}
                                disabled={selectedCount === 0}
                                className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60 hover:text-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                Clear All
                            </button>
                        </div>
                    )}

                    {/* Loading shimmer */}
                    {loading ? (
                        <div className="p-3 space-y-2">
                            {[1, 2, 3].map(n => (
                                <div key={n} className="flex items-center gap-3 animate-pulse">
                                    <div className="w-4 h-4 rounded bg-muted/40" />
                                    <div className="w-8 h-8 rounded-full bg-muted/40" />
                                    <div className="flex-1 space-y-1">
                                        <div className="h-3 w-28 bg-muted/40 rounded" />
                                        <div className="h-2.5 w-36 bg-muted/20 rounded" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="px-4 py-6 text-center text-muted-foreground/60 text-sm">
                            {search ? 'No members match your search' : 'No members available'}
                        </div>
                    ) : (
                        /* Member list */
                        <div className="max-h-[260px] overflow-y-auto overscroll-contain py-1">
                            {filtered.map(u => {
                                const paid = isFullyPaid(u);
                                const selected = value.includes(u._id);
                                return (
                                    <button
                                        key={u._id}
                                        type="button"
                                        onClick={() => toggle(u._id)}
                                        disabled={paid}
                                        className={`
                                            w-full flex items-center gap-2.5 px-3 py-2.5 text-sm transition-all duration-100
                                            ${paid
                                                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 cursor-not-allowed'
                                                : selected
                                                    ? 'bg-indigo-500/10 text-indigo-500 font-medium'
                                                    : 'hover:bg-muted/40 text-foreground'
                                            }
                                        `}
                                    >
                                        {/* Checkbox */}
                                        <span className={`
                                            relative flex items-center justify-center w-4 h-4 shrink-0 rounded border-2 transition-all duration-100
                                            ${paid
                                                ? 'border-emerald-400/60 bg-emerald-400/20'
                                                : selected
                                                    ? 'border-indigo-500 bg-indigo-500'
                                                    : 'border-muted-foreground/30 hover:border-indigo-500/50'
                                            }
                                        `}>
                                            {(paid || selected) && (
                                                <HiOutlineCheck className={`w-3 h-3 ${paid ? 'text-emerald-500' : 'text-white'}`} strokeWidth={3} />
                                            )}
                                        </span>

                                        {/* Avatar */}
                                        <Avatar name={u.name} size="xs" />

                                        {/* Name + Email */}
                                        <span className="flex-1 min-w-0 text-left">
                                            <span className="block truncate text-xs font-medium leading-tight">
                                                {u.name}
                                            </span>
                                            <span className="block truncate text-[11px] text-muted-foreground/60 leading-tight">
                                                {u.email || ''}
                                            </span>
                                        </span>

                                        {/* Paid badge */}
                                        {paid && (
                                            <span className="flex items-center gap-1 shrink-0 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                                                <HiOutlineCheckCircle className="w-3.5 h-3.5" />
                                                All paid
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default MultiMemberSelect;
