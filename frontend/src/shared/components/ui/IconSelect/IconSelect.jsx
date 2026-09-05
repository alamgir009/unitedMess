import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { HiOutlineChevronDown, HiOutlineCheckCircle } from 'react-icons/hi2';
import { cn } from '@/core/utils/helpers/string.helper';

const DROPDOWN_MAX_H = 208;
const DROPDOWN_MARGIN = 6;

const inputBase =
  'w-full px-3 py-2 rounded-xl border border-[var(--input-border)] ' +
  'bg-[var(--input-bg)] ' +
  'focus:ring-0 focus:border-[var(--input-border-focus)] ' +
  'outline-none transition-all duration-200 ' +
  'text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] ' +
  'hover:border-[var(--input-border-hover)] ' +
  'dark:shadow-[var(--inset-top-glow),var(--shadow-xs)] dark:focus:shadow-[var(--inset-top-glow),var(--shadow-xs),0_0_0_3px_rgba(var(--brand-rgb),0.15)]';

const inputDisabled = 'opacity-60 cursor-not-allowed pointer-events-none select-none';

function getMenuStyle(triggerRect) {
  const vh = window.innerHeight;
  const vw = window.innerWidth;
  const spaceBelow = vh - triggerRect.bottom;
  const openAbove = spaceBelow < DROPDOWN_MAX_H + DROPDOWN_MARGIN * 2;

  let top;
  let maxHeight = DROPDOWN_MAX_H;
  let borderTopRadius = 0;
  let borderBottomRadius = 0;

  if (openAbove) {
    const spaceAbove = triggerRect.top;
    maxHeight = Math.min(DROPDOWN_MAX_H, spaceAbove - DROPDOWN_MARGIN * 2);
    top = triggerRect.top - maxHeight - DROPDOWN_MARGIN;
    borderTopRadius = 12;
  } else {
    top = triggerRect.bottom + DROPDOWN_MARGIN;
    borderBottomRadius = 12;
  }

  const left = Math.min(triggerRect.left, vw - triggerRect.width - 8);
  const width = triggerRect.width;

  return {
    position: 'fixed',
    top: `${top}px`,
    left: `${left}px`,
    width: `${width}px`,
    maxHeight: `${Math.max(maxHeight, 80)}px`,
    borderRadius: borderTopRadius
      ? `${borderTopRadius}px ${borderTopRadius}px 12px 12px`
      : `12px 12px ${borderBottomRadius}px ${borderBottomRadius}px`,
  };
}

const IconSelect = ({ name, value, onChange, options, disabled = false, placeholder = 'Select...' }) => {
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const triggerRef = useRef(null);
  const listRef = useRef(null);
  const selected = options.find(o => o.value === value) ?? options[0];

  const menuStyle = useMemo(() => {
    if (!open || !triggerRef.current) return {};
    return getMenuStyle(triggerRef.current.getBoundingClientRect());
  }, [open, highlightedIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target) &&
        listRef.current && !listRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    const onEscape = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', onEscape);
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      const idx = options.findIndex(o => o.value === value);
      setHighlightedIndex(idx >= 0 ? idx : 0);
    }
  }, [open, value, options]);

  useEffect(() => {
    if (!open || highlightedIndex < 0) return;
    const items = listRef.current?.querySelectorAll('[role="option"]');
    items?.[highlightedIndex]?.scrollIntoView({ block: 'nearest' });
  }, [open, highlightedIndex]);

  const pick = useCallback((val) => {
    if (disabled) return;
    onChange({ target: { name, value: val } });
    setOpen(false);
  }, [disabled, onChange, name]);

  const handleKeyDown = useCallback((e) => {
    if (disabled) return;
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(i => (i + 1) % options.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(i => (i - 1 + options.length) % options.length);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (highlightedIndex >= 0) pick(options[highlightedIndex].value);
        break;
      case 'Escape':
        e.preventDefault();
        setOpen(false);
        break;
      default:
        break;
    }
  }, [disabled, open, options, highlightedIndex, pick]);

  const dropdown = open && !disabled && createPortal(
    <div
      ref={listRef}
      role="listbox"
      aria-label={`${name} options`}
      className={cn(
        'fixed z-[9999] overflow-hidden',
        'bg-[var(--bg-surface)] border border-[var(--border-muted)]',
        'overflow-y-auto overscroll-contain',
        '[scrollbar-width:thin] [scrollbar-color:var(--border-strong)_transparent]',
        '[&::-webkit-scrollbar]:w-1.5',
        '[&::-webkit-scrollbar-track]:bg-transparent',
        '[&::-webkit-scrollbar-thumb]:bg-[var(--border-strong)] [&::-webkit-scrollbar-thumb]:rounded-full',
      )}
      style={{
        ...menuStyle,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 8px 32px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.08)',
      }}
    >
      {options.map((opt, idx) => (
        <button
          key={opt.value}
          type="button"
          role="option"
          aria-selected={value === opt.value}
          onClick={() => pick(opt.value)}
          onMouseEnter={() => setHighlightedIndex(idx)}
          className={cn(
            'w-full flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors duration-100',
            value === opt.value
              ? 'bg-[var(--accent-subtle)] text-[var(--accent-primary)] font-medium'
              : highlightedIndex === idx
                ? 'bg-[var(--bg-muted)] text-[var(--text-primary)]'
                : 'hover:bg-[var(--bg-muted)] text-[var(--text-primary)]',
          )}
        >
          {opt.Icon && <opt.Icon className={cn('w-4 h-4 shrink-0', opt.iconClass)} />}
          <span>{opt.label}</span>
          {value === opt.value && (
            <HiOutlineCheckCircle className="ml-auto w-4 h-4 text-[var(--accent-primary)]" />
          )}
        </button>
      ))}
    </div>,
    document.body,
  );

  return (
    <div className="relative w-full">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => !disabled && setOpen(o => !o)}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          inputBase,
          'flex items-center justify-between gap-2 text-left',
          disabled ? inputDisabled : 'cursor-pointer',
        )}
      >
        <span className="flex items-center gap-2 truncate">
          {selected?.Icon && <selected.Icon className={cn('w-4 h-4 shrink-0', selected.iconClass)} />}
          <span className="truncate text-sm">{selected?.label ?? placeholder}</span>
        </span>
        {!disabled && (
          <HiOutlineChevronDown
            className={cn(
              'w-4 h-4 shrink-0 text-[var(--text-tertiary)] transition-transform duration-200',
              open && 'rotate-180',
            )}
          />
        )}
      </button>
      {dropdown}
    </div>
  );
};

IconSelect.displayName = 'IconSelect';
export default IconSelect;
