import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { HiOutlineChevronDown, HiOutlineMagnifyingGlass, HiOutlineCheck, HiOutlineXMark, HiOutlineUser } from 'react-icons/hi2';
import Avatar from '../Avatar/Avatar.jsx';

const accentMap = {
    indigo: {
        ring:         'focus:ring-[var(--accent-primary)]/30 focus:border-[var(--accent-primary)]/60',
        selected:     'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]',
        checkbox:     'border-[var(--accent-primary)] bg-[var(--accent-primary)]',
        text:         'text-[var(--accent-primary)] hover:text-[var(--accent-primary)]',
        badge:        'bg-[var(--accent-primary)]/20 text-[var(--accent-primary)]',
        hoverCheck:   'hover:border-[var(--accent-primary)]/50',
        checkIcon:    'text-[var(--text-on-brand)]',
    },
    emerald: {
        ring:         'focus:ring-[var(--success)]/30 focus:border-[var(--success)]/60',
        selected:     'bg-[var(--success)]/10 text-[var(--success)]',
        checkbox:     'border-[var(--success)] bg-[var(--success)]',
        text:         'text-[var(--success)] hover:text-[var(--success)]',
        badge:        'bg-[var(--success)]/20 text-[var(--success)]',
        hoverCheck:   'hover:border-[var(--success)]/50',
        checkIcon:    'text-[var(--text-on-brand)]',
    },
    primary: {
        ring:         'focus:ring-[var(--accent-primary)]/30 focus:border-[var(--accent-primary)]/60',
        selected:     'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]',
        checkbox:     'border-[var(--accent-primary)] bg-[var(--accent-primary)]',
        text:         'text-[var(--accent-primary)] hover:text-[var(--accent-primary)]',
        badge:        'bg-[var(--accent-primary)]/20 text-[var(--accent-primary)]',
        hoverCheck:   'hover:border-[var(--accent-primary)]/50',
        checkIcon:    'text-[var(--text-on-brand)]',
    },
    slate: {
        ring:         'focus:ring-[var(--text-muted)]/30 focus:border-[var(--text-muted)]/60',
        selected:     'bg-[var(--text-muted)]/10 text-[var(--text-muted)]',
        checkbox:     'border-[var(--text-muted)] bg-[var(--text-muted)]',
        text:         'text-[var(--text-muted)] hover:text-[var(--text-muted)]',
        badge:        'bg-[var(--text-muted)]/20 text-[var(--text-muted)]',
        hoverCheck:   'hover:border-[var(--text-muted)]/50',
        checkIcon:    'text-[var(--text-on-brand)]',
    },
};

const inputBase =
    'w-full px-3 py-2 rounded-xl border border-[var(--input-border)] ' +
    'bg-[var(--input-bg)] ' +
    'outline-none transition-all duration-200 ' +
    'text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] ' +
    'shadow-[var(--inset-inner)] hover:border-[var(--input-border-hover)]';

const MemberSelect = ({
    users = [],
    value = [],
    onChange,
    loading = false,
    disabled = false,
    placeholder = 'Select members…',
    accentColor = 'primary',
    filterUser,
}) => {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const ref = useRef(null);
    const searchRef = useRef(null);

    const ac = accentMap[accentColor] || accentMap.primary;

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

    const visibleUsers = useMemo(() =>
        users.filter(u => u.userStatus === 'approved' && u.isActive !== false),
        [users]
    );

    const filtered = useMemo(() => {
        if (!search.trim()) return visibleUsers;
        const q = search.toLowerCase().trim();
        return visibleUsers.filter(u =>
            u.name?.toLowerCase().includes(q) ||
            u.email?.toLowerCase().includes(q)
        );
    }, [visibleUsers, search]);

    const isUserBlocked = useCallback(
        (u) => (typeof filterUser === 'function' ? filterUser(u) : false),
        [filterUser]
    );

    const selectedCount = value.length;
    const allFilteredSelected = filtered.length > 0 &&
        filtered.every(u => isUserBlocked(u) || value.includes(u._id));

    const toggle = (userId) => {
        if (disabled) return;
        const user = users.find(u => u._id === userId);
        if (!user || isUserBlocked(user)) return;
        onChange(
            value.includes(userId)
                ? value.filter(id => id !== userId)
                : [...value, userId]
        );
    };

    const selectAll = () => {
        if (disabled) return;
        const selectable = filtered.filter(u => !isUserBlocked(u) && !value.includes(u._id));
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
                className={`${inputBase} ${ac.ring} flex items-center justify-between gap-2 text-left
                    ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
            >
                <span className="flex items-center gap-2 truncate">
                    {selectedCount === 1 ? (
                        <>
                            <Avatar
                                name={users.find(u => value.includes(u._id))?.name || ''}
                                size="xs"
                            />
                            <span className="truncate text-sm font-medium">
                                {users.find(u => value.includes(u._id))?.name || '1 member selected'}
                            </span>
                        </>
                    ) : (
                        <>
                            <HiOutlineUser className="w-4 h-4 shrink-0 text-muted-foreground/70" />
                            <span className="truncate text-sm">
                                {selectedCount === 0
                                    ? placeholder
                                    : `${selectedCount} members selected`
                                }
                            </span>
                        </>
                    )}
                </span>
                <span className="flex items-center gap-2">
                    {selectedCount > 0 && (
                        <span className={`flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full ${ac.badge} text-[11px] font-bold leading-none`}>
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
                <div className="absolute z-50 top-full mt-1.5 w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] shadow-xl overflow-hidden">
                    {/* Search */}
                    <div className="px-2 pt-2 pb-1">
                        <div className="relative">
                            <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
                            <input
                                ref={searchRef}
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Search members…"
                                className={`${inputBase} pl-9 h-10 text-xs`}
                            />
                            {search && (
                                <button
                                    type="button"
                                    onClick={() => setSearch('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-[var(--bg-muted)] text-[var(--text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                                >
                                    <HiOutlineXMark className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Batch actions */}
                    {filtered.length > 0 && (
                        <div className="flex items-center gap-2 px-3 py-1.5 border-b border-[var(--border-muted)]">
                            <button
                                type="button"
                                onClick={selectAll}
                                disabled={allFilteredSelected || filtered.every(u => isUserBlocked(u))}
                                className={`text-[11px] font-semibold uppercase tracking-wider ${ac.text} transition-colors duration-150 disabled:opacity-30 disabled:cursor-not-allowed`}
                            >
                                Select All
                            </button>
                            <span className="text-[var(--text-muted)]/30">|</span>
                            <button
                                type="button"
                                onClick={clearAll}
                                disabled={selectedCount === 0}
                                className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors duration-150 disabled:opacity-30 disabled:cursor-not-allowed"
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
                                    <div className="w-4 h-4 rounded bg-[var(--bg-muted)]" />
                                    <div className="w-8 h-8 rounded-full bg-[var(--bg-muted)]" />
                                    <div className="flex-1 space-y-1">
                                        <div className="h-3 w-28 bg-[var(--bg-muted)] rounded" />
                                        <div className="h-2.5 w-36 bg-[var(--bg-subtle)] rounded" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="px-4 py-6 text-center text-[var(--text-muted)] text-sm">
                            {search ? 'No members match your search' : 'No members available'}
                        </div>
                    ) : (
                        /* Member list */
                        <div className="max-h-[260px] overflow-y-auto overscroll-contain py-1">
                            {filtered.map(u => {
                                const blocked = isUserBlocked(u);
                                const selected = value.includes(u._id);
                                return (
                                    <button
                                        key={u._id}
                                        type="button"
                                        onClick={() => toggle(u._id)}
                                        disabled={blocked}
                                        className={`
                                            w-full flex items-center gap-2.5 px-3 py-2.5 text-sm transition-all duration-100
                                            ${blocked
                                                ? 'bg-[var(--success-bg)] text-[var(--success-text)] cursor-not-allowed'
                                                : selected
                                                    ? `${ac.selected} font-medium`
                                                    : 'hover:bg-[var(--bg-muted)] text-[var(--text-primary)]'
                                            }
                                        `}
                                    >
                                        {/* Checkbox */}
                                        <span className={`
                                            relative flex items-center justify-center w-5 h-5 shrink-0 rounded border-2 transition-all duration-100
                                            ${blocked
                                                ? 'border-[var(--success)] bg-[var(--success)]'
                                                : selected
                                                    ? ac.checkbox
                                                    : `border-[var(--text-muted)]/40 ${ac.hoverCheck}`
                                            }
                                        `}>
                                            {(blocked || selected) && (
                                                <HiOutlineCheck className={`w-3.5 h-3.5 ${blocked ? 'text-[var(--text-on-brand)]' : ac.checkIcon}`} strokeWidth={3} />
                                            )}
                                        </span>

                                        {/* Avatar */}
                                        <Avatar name={u.name} size="xs" />

                                        {/* Name + Email */}
                                        <span className="flex-1 min-w-0 text-left">
                                            <span className="block truncate text-xs font-medium leading-tight text-[var(--text-primary)]">
                                                {u.name}
                                            </span>
                                            <span className="block truncate text-[11px] text-[var(--text-muted)] leading-tight">
                                                {u.email || ''}
                                            </span>
                                        </span>

                                        {/* Blocked badge */}
                                        {blocked && (
                                            <span className="flex items-center gap-1 shrink-0 text-[11px] font-semibold text-[var(--success-text)]">
                                                <HiOutlineCheck className="w-3.5 h-3.5" />
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

MemberSelect.displayName = 'MemberSelect';
export default MemberSelect;
