import { cn } from '@/core/utils/helpers/string.helper';

export const inputVariants = {
  base: cn(
    'w-full min-w-0 box-border',
    'rounded-[var(--radius-md)] border text-left',
    'font-sans text-[16px] sm:text-sm text-[var(--text-primary)]',
    'placeholder:text-[var(--text-muted)]',
    'transition-colors duration-[var(--duration-fast,120ms)] ease-out',
    'caret-[var(--brand)]',
    'focus:outline-none focus-visible:outline-none focus-visible:ring-[var(--focus-width,2px)] focus-visible:ring-[var(--focus)] focus-visible:ring-offset-[var(--focus-offset,2px)] focus-visible:ring-offset-[var(--bg-elevated)]',
    'disabled:bg-[var(--input-bg-disabled)] disabled:text-[var(--text-disabled)] disabled:cursor-not-allowed disabled:opacity-75',
    'read-only:bg-[var(--bg-subtle)] read-only:text-[var(--text-secondary)] read-only:cursor-default',
  ),
  variants: {
    default: 'bg-[var(--input-bg)] border-[var(--input-border)] hover:border-[var(--input-border-hover)]',
    filled: 'bg-[var(--bg-surface)] border-transparent hover:border-[var(--input-border)] focus:bg-[var(--input-bg)]',
    record: 'bg-[var(--bg-muted)] border-[var(--border-default)] hover:border-[var(--border-strong)]',
  },
  sizes: {
    sm: 'h-8 min-h-[var(--control-height-sm)] px-2.5 py-1 text-xs',
    md: 'h-11 min-h-[var(--control-height-md)] px-3 py-2 text-sm',
    lg: 'h-12 min-h-[var(--control-height-lg)] px-4 py-2.5 text-base',
  },
  states: {
    error: 'border-[var(--input-border-error)] focus-visible:ring-[var(--danger-text)] text-[var(--text-primary)]',
    success: 'border-[var(--success-border)] focus-visible:ring-[var(--success-text)]',
  },
};

export const textareaVariants = {
  base: cn(
    'w-full min-w-0 box-border',
    'rounded-[var(--radius-md)] border text-left',
    'font-sans text-[16px] sm:text-sm text-[var(--text-primary)]',
    'placeholder:text-[var(--text-muted)]',
    'transition-colors duration-[var(--duration-fast,120ms)] ease-out',
    'caret-[var(--brand)]',
    'focus:outline-none focus-visible:outline-none focus-visible:ring-[var(--focus-width,2px)] focus-visible:ring-[var(--focus)] focus-visible:ring-offset-[var(--focus-offset,2px)] focus-visible:ring-offset-[var(--bg-elevated)]',
    'disabled:bg-[var(--input-bg-disabled)] disabled:text-[var(--text-disabled)] disabled:cursor-not-allowed disabled:opacity-75',
    'read-only:bg-[var(--bg-subtle)] read-only:text-[var(--text-secondary)] read-only:cursor-default',
    'min-h-[96px] resize-y py-2.5 px-3 leading-relaxed',
  ),
  variants: {
    default: 'bg-[var(--input-bg)] border-[var(--input-border)] hover:border-[var(--input-border-hover)]',
    filled: 'bg-[var(--bg-surface)] border-transparent hover:border-[var(--input-border)] focus:bg-[var(--input-bg)]',
    record: 'bg-[var(--bg-muted)] border-[var(--border-default)] hover:border-[var(--border-strong)]',
  },
  states: {
    error: 'border-[var(--input-border-error)] focus-visible:ring-[var(--danger-text)] text-[var(--text-primary)]',
    success: 'border-[var(--success-border)] focus-visible:ring-[var(--success-text)]',
  },
};

export const selectVariants = {
  base: cn(
    'w-full min-w-0 box-border appearance-none cursor-pointer',
    'rounded-[var(--radius-md)] border text-left',
    'font-sans text-[16px] sm:text-sm text-[var(--text-primary)]',
    'transition-colors duration-[var(--duration-fast,120ms)] ease-out',
    'focus:outline-none focus-visible:outline-none focus-visible:ring-[var(--focus-width,2px)] focus-visible:ring-[var(--focus)] focus-visible:ring-offset-[var(--focus-offset,2px)] focus-visible:ring-offset-[var(--bg-elevated)]',
    'disabled:bg-[var(--input-bg-disabled)] disabled:text-[var(--text-disabled)] disabled:cursor-not-allowed disabled:opacity-75',
  ),
  variants: {
    default: 'bg-[var(--input-bg)] border-[var(--input-border)] hover:border-[var(--input-border-hover)]',
    filled: 'bg-[var(--bg-surface)] border-transparent hover:border-[var(--input-border)] focus:bg-[var(--input-bg)]',
    record: 'bg-[var(--bg-muted)] border-[var(--border-default)] hover:border-[var(--border-strong)]',
  },
  sizes: {
    sm: 'h-[var(--control-height-sm)] min-h-[var(--control-height-sm)] pl-2.5 pr-8 py-1 text-xs',
    md: 'h-[var(--control-height-md)] min-h-[var(--control-height-md)] pl-3 pr-9 py-2 text-sm',
    lg: 'h-[var(--control-height-lg)] min-h-[var(--control-height-lg)] pl-4 pr-10 py-2.5 text-base',
  },
  states: {
    error: 'border-[var(--input-border-error)] focus-visible:ring-[var(--danger-text)]',
    success: 'border-[var(--success-border)] focus-visible:ring-[var(--success-text)]',
  },
};
