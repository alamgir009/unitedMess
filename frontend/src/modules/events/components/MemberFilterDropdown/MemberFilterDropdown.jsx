import { useState, useRef, useEffect, useMemo, useCallback, memo } from 'react';
import {
  HiOutlineChevronDown,
  HiOutlineXMark,
  HiOutlineUser,
  HiOutlineCheck,
} from 'react-icons/hi2';
import { Search } from 'lucide-react';
import Avatar from '@/shared/components/ui/Avatar/Avatar.jsx';
import membersService from '@/modules/members/services/members.service';

const inputBase =
  'w-full px-3 h-9 rounded-lg border overflow-hidden ' +
  'bg-card text-foreground ' +
  'outline-none transition-all duration-100 ' +
  'text-sm shadow-sm';

const MemberFilterDropdown = ({ selectedMemberId, onSelect, disabled = false }) => {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [search, setSearch] = useState('');
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const ref = useRef(null);
  const searchRef = useRef(null);
  const listRef = useRef(null);
  const debounceRef = useRef(null);
  const cancelledRef = useRef(false);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await membersService.getUsers({ limit: 9999 });
      if (cancelledRef.current) return;
      const data = response?.data || response;
      const users = data.users || data.docs || (Array.isArray(data) ? data : []);
      setMembers(users);
    } catch (err) {
      if (!cancelledRef.current) {
        setError(err?.response?.data?.message || err.message || 'Failed to load members');
      }
    } finally {
      if (!cancelledRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    cancelledRef.current = false;
    fetchMembers();
    return () => { cancelledRef.current = true; };
  }, [fetchMembers]);

  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => searchRef.current?.focus(), 80);
      return () => clearTimeout(timer);
    }
    setInputValue('');
    setSearch('');
    setFocusedIndex(-1);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const activeMembers = useMemo(
    () => members.filter((u) => u.userStatus === 'approved' && u.isActive !== false),
    [members],
  );

  useEffect(() => {
    clearTimeout(debounceRef.current);
    return () => clearTimeout(debounceRef.current);
  }, []);

  const debouncedSearch = useCallback((value) => {
    setInputValue(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearch(value), 150);
  }, []);

  const searchTerm = search.toLowerCase().trim();
  const filteredMembers = useMemo(() => {
    if (!searchTerm) return activeMembers;
    return activeMembers.filter(
      (u) =>
        u.name?.toLowerCase().includes(searchTerm) ||
        u.email?.toLowerCase().includes(searchTerm),
    );
  }, [activeMembers, searchTerm]);

  useEffect(() => {
    setFocusedIndex(filteredMembers.length > 0 ? 0 : -1);
  }, [searchTerm, filteredMembers.length]);

  useEffect(() => {
    if (focusedIndex >= 0 && listRef.current) {
      const el = listRef.current.children[focusedIndex];
      el?.scrollIntoView?.({ block: 'nearest' });
    }
  }, [focusedIndex]);

  const handleSelect = useCallback(
    (userId) => {
      onSelect?.(userId);
      setOpen(false);
    },
    [onSelect],
  );

  const handleClear = useCallback(() => {
    onSelect?.(null);
    setOpen(false);
  }, [onSelect]);

  const handleKeyDown = useCallback(
    (e) => {
      if (!open) return;
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setFocusedIndex((prev) =>
            prev < filteredMembers.length - 1 ? prev + 1 : 0,
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setFocusedIndex((prev) =>
            prev > 0 ? prev - 1 : filteredMembers.length - 1,
          );
          break;
        case 'Home':
          e.preventDefault();
          setFocusedIndex(0);
          break;
        case 'End':
          e.preventDefault();
          setFocusedIndex(filteredMembers.length - 1);
          break;
        case 'Enter':
          e.preventDefault();
          if (focusedIndex >= 0 && focusedIndex < filteredMembers.length) {
            handleSelect(filteredMembers[focusedIndex]._id);
          }
          break;
        case 'Escape':
          e.preventDefault();
          setOpen(false);
          break;
      }
    },
    [open, filteredMembers, focusedIndex, handleSelect],
  );

  const selectedMember = selectedMemberId
    ? activeMembers.find((u) => u._id === selectedMemberId)
    : null;

  const memberName = selectedMember?.name || '';
  const firstName = memberName.trim().split(' ')[0] || '';
  const shortName = firstName.length > 7 ? firstName.slice(0, 7) + '…' : firstName;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => !disabled && setOpen((o) => !o)}
        disabled={disabled}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls="member-filter-listbox"
        aria-label={
          selectedMember
            ? `Filter by member: ${memberName}`
            : 'Filter by member: All members'
        }
        className={
          `${inputBase} flex items-center gap-2 text-left sm:min-w-[180px] ` +
          `${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'} ` +
          `${open ? 'border-primary/40 shadow-sm shadow-primary/5' : 'hover:border-border-strong'}`
        }
      >
        {selectedMember ? (
          <>
            <Avatar name={memberName} size="xs" />
            <span className="flex-1 min-w-0 truncate text-sm font-medium">
              <span className="sm:hidden">{shortName}</span>
              <span className="hidden sm:inline truncate">{memberName}</span>
            </span>
          </>
        ) : (
          <>
            <HiOutlineUser className="w-4 h-4 shrink-0 text-muted-foreground/70" />
            <span className="flex-1 min-w-0 truncate text-sm">
              <span className="sm:hidden">All</span>
              <span className="hidden sm:inline">All Members</span>
            </span>
          </>
        )}
        {!disabled && (
          <HiOutlineChevronDown
            className={
              `w-4 h-4 shrink-0 text-muted-foreground/60 transition-transform duration-200 ` +
              `${open ? 'rotate-180' : ''}`
            }
          />
        )}
      </button>

      {open && (
        <div
          className="absolute z-dropdown top-full mt-1.5 right-0 sm:left-0 w-full min-w-[200px] sm:min-w-[240px] rounded-xl border border-border/60 bg-card shadow-xl overflow-hidden"
          style={{
            maxWidth: 'calc(100vw - 16px)',
            animation: 'fade-up-fast 0.12s ease-out both',
            willChange: 'transform, opacity',
            transform: 'translateZ(0)',
          }}
        >
          <div className="p-2 pb-1">
            <div className="relative flex items-center rounded-lg border border-border/60 bg-muted/30 transition-all duration-150 focus-within:bg-card focus-within:border-primary/50 focus-within:shadow-sm focus-within:shadow-primary/5">
              <Search className="absolute left-3 w-4 h-4 text-muted-foreground pointer-events-none transition-colors duration-150 focus-within:text-primary" />
              <input
                ref={searchRef}
                type="text"
                placeholder="Search members..."
                value={inputValue}
                onChange={(e) => debouncedSearch(e.target.value)}
                onKeyDown={handleKeyDown}
                role="searchbox"
                aria-label="Search members"
                aria-activedescendant={
                  focusedIndex >= 0 ? `mfi-option-${focusedIndex}` : undefined
                }
                className="w-full h-10 pl-9 pr-9 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 outline-none"
              />
              {(inputValue || search) && (
                <button
                  type="button"
                  onClick={() => {
                    setInputValue('');
                    setSearch('');
                    clearTimeout(debounceRef.current);
                    searchRef.current?.focus();
                  }}
                  className="absolute right-1.5 p-1.5 rounded-full hover:bg-muted/50 text-muted-foreground/60 hover:text-foreground transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="Clear search"
                >
                  <HiOutlineXMark className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {selectedMemberId && (
            <div className="flex items-center px-3 py-1.5 border-b border-border/30">
              <button
                type="button"
                onClick={handleClear}
                className="text-[11px] font-semibold uppercase tracking-wider text-primary hover:text-primary/80 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
              >
                Clear filter
              </button>
            </div>
          )}

          {loading ? (
            <div className="p-3 space-y-2">
              {[1, 2, 3].map((n) => (
                <div key={n} className="flex items-center gap-3 animate-pulse">
                  <div className="w-7 h-7 rounded-full bg-muted/40" />
                  <div className="h-3 w-24 bg-muted/40 rounded" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="px-4 py-6 text-center">
              <p className="text-sm text-destructive mb-2">{error}</p>
              <button
                type="button"
                onClick={fetchMembers}
                className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
              >
                Retry
              </button>
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="px-4 py-6 text-center text-muted-foreground/60 text-sm">
              {search ? 'No members match your search' : 'No members available'}
            </div>
          ) : (
            <div
              id="member-filter-listbox"
              ref={listRef}
              role="listbox"
              aria-label="Members"
              className="max-h-[260px] overflow-y-auto overscroll-contain py-1 custom-scrollbar"
            >
              {filteredMembers.map((u, i) => {
                const isSelected = u._id === selectedMemberId;
                const isFocused = i === focusedIndex;
                return (
                  <button
                    key={u._id}
                    id={`mfi-option-${i}`}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    tabIndex={-1}
                    onClick={() => handleSelect(u._id)}
                    className={
                      `w-full flex items-center gap-2.5 px-3 py-2.5 text-sm transition-all duration-100 ` +
                      (isSelected
                        ? 'bg-primary/10 text-primary font-medium'
                        : isFocused
                          ? 'bg-muted/50 text-foreground'
                          : 'hover:bg-muted/40 text-foreground')
                    }
                  >
                    <Avatar name={u.name} size="xs" />
                    <span className="flex-1 min-w-0 text-left">
                      <span className="block truncate text-xs font-medium leading-tight">
                        {u.name}
                      </span>
                      {u.email && (
                        <span className="block truncate text-[11px] text-muted-foreground/60 leading-tight">
                          {u.email}
                        </span>
                      )}
                    </span>
                    {isSelected && (
                      <HiOutlineCheck
                        className="w-4 h-4 shrink-0 text-primary"
                        strokeWidth={2.5}
                      />
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

MemberFilterDropdown.displayName = 'MemberFilterDropdown';
export default memo(MemberFilterDropdown);
