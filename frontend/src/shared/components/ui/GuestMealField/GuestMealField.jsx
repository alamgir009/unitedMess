import React, { useState, useEffect, useRef, useCallback, useId } from 'react';
import { HiOutlineUserGroup, HiOutlinePlus, HiOutlineMinus } from 'react-icons/hi2';
import { cn } from '@/core/utils/helpers/string.helper';

export const GuestMealField = React.memo(({
  value = 0,
  onChange,
  max = 20,
  min = 0,
  disabled = false,
  className = '',
}) => {
  const reactId = useId();
  const labelId = `guest-meals-label-${reactId.replace(/:/g, '')}`;
  const inputId = `guest-meals-count-${reactId.replace(/:/g, '')}`;

  const numValue = typeof value === 'number' ? value : (parseInt(value, 10) || 0);

  const [inputValue, setInputValue] = useState(String(numValue));
  useEffect(() => {
    setInputValue(String(numValue));
  }, [numValue]);

  const valueRef = useRef(numValue);
  useEffect(() => {
    valueRef.current = numValue;
  }, [numValue]);

  const timerRef = useRef(null);
  const intervalRef = useRef(null);
  const isRepeatingRef = useRef(false);

  const clearTimers = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
    timerRef.current = null;
    intervalRef.current = null;
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  const handleStep = useCallback((delta) => {
    if (disabled) return;
    const current = Number(valueRef.current) || 0;
    const next = Math.min(max, Math.max(min, current + delta));
    valueRef.current = next;
    setInputValue(String(next));
    onChange?.(next);
  }, [disabled, min, max, onChange]);

  const handlePointerDown = (delta) => {
    if (disabled) return;
    isRepeatingRef.current = false;
    clearTimers();
    timerRef.current = setTimeout(() => {
      isRepeatingRef.current = true;
      handleStep(delta);
      intervalRef.current = setInterval(() => {
        handleStep(delta);
      }, 80);
    }, 400);
  };

  const handleClick = (e, delta) => {
    e.preventDefault();
    clearTimers();
    if (isRepeatingRef.current) {
      isRepeatingRef.current = false;
      return;
    }
    handleStep(delta);
  };

  const handleInputChange = (e) => {
    if (disabled) return;
    const raw = e.target.value;
    if (raw === '') {
      setInputValue('');
      return;
    }
    const parsed = parseInt(raw, 10);
    if (!isNaN(parsed)) {
      setInputValue(String(parsed));
      const clamped = Math.min(max, Math.max(min, parsed));
      valueRef.current = clamped;
      onChange?.(clamped);
    }
  };

  const handleInputBlur = () => {
    clearTimers();
    if (inputValue === '' || isNaN(parseInt(inputValue, 10))) {
      setInputValue('0');
      valueRef.current = 0;
      onChange?.(0);
    } else {
      const parsed = parseInt(inputValue, 10);
      const clamped = Math.min(max, Math.max(min, parsed));
      setInputValue(String(clamped));
      if (clamped !== valueRef.current) {
        valueRef.current = clamped;
        onChange?.(clamped);
      }
    }
  };

  const handleKeyDown = (e) => {
    if (disabled) return;
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      handleStep(1);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      handleStep(-1);
    }
  };

  const isActive = numValue > 0;

  return (
    <div
      role="group"
      aria-labelledby={labelId}
      aria-disabled={disabled || undefined}
      className={cn(
        'min-h-[56px] p-3 rounded-[var(--radius-md)] border transition-[border-color,background-color] duration-[180ms] ease-out',
        'flex flex-col min-[400px]:flex-row min-[400px]:items-center justify-between gap-3',
        isActive
          ? 'border-[var(--brand)] bg-[var(--brand-subtle)]'
          : 'border-[var(--border-contrast)] bg-[var(--bg-elevated)]',
        disabled && 'opacity-60 cursor-not-allowed',
        className,
      )}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <HiOutlineUserGroup
          className={cn(
            'w-[18px] h-[18px] stroke-[1.5] shrink-0 transition-colors duration-[180ms]',
            isActive ? 'text-[var(--brand)]' : 'text-[var(--text-secondary)]',
          )}
          aria-hidden="true"
        />
        <div className="flex flex-col min-w-0">
          <span
            id={labelId}
            className="text-[13px] font-medium text-[var(--text-primary)] leading-tight select-none"
          >
            Guest meals
          </span>
          <span className="text-[12px] text-[var(--text-muted)] leading-tight select-none">
            Added to each selected meal
          </span>
        </div>
      </div>

      <div className="shrink-0 flex items-center transition-all duration-[180ms] ease-out">
        {numValue === 0 ? (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              if (disabled) return;
              handleStep(1);
            }}
            disabled={disabled}
            aria-disabled={disabled || undefined}
            className={cn(
              'min-h-[44px] h-11 px-4 w-full min-[400px]:w-auto min-[400px]:ml-auto',
              'inline-flex items-center justify-center gap-2',
              'rounded-[var(--radius-md)] border border-[var(--border-contrast)] bg-[var(--bg-elevated)]',
              'text-sm font-medium text-[var(--text-primary)] select-none',
              'hover:border-[var(--brand)] hover:text-[var(--brand)] hover:bg-[var(--accent-subtle)] active:bg-[var(--brand-subtle)]',
              'transition-[background-color,border-color,color] duration-[180ms] ease-out',
              'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-elevated)]',
            )}
          >
            <HiOutlinePlus className="w-4 h-4 shrink-0 stroke-[2]" aria-hidden="true" />
            <span>Add guest meal</span>
          </button>
        ) : (
          <div
            className="inline-flex items-center shrink-0 rounded-[var(--radius-md)] border border-[var(--border-contrast)] bg-[var(--bg-elevated)] overflow-hidden"
          >
            <button
              type="button"
              onClick={(e) => handleClick(e, -1)}
              onPointerDown={() => handlePointerDown(-1)}
              onPointerUp={clearTimers}
              onPointerCancel={clearTimers}
              onPointerLeave={clearTimers}
              onBlur={clearTimers}
              disabled={disabled || numValue <= min}
              aria-label="Decrease guest meals"
              aria-disabled={(disabled || numValue <= min) || undefined}
              className={cn(
                'w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center',
                'text-[var(--text-secondary)] hover:text-[var(--brand)] hover:bg-[var(--bg-muted)] active:bg-[var(--accent-subtle)]',
                'transition-colors duration-[180ms] ease-out',
                'disabled:opacity-30 disabled:cursor-not-allowed',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-elevated)]',
              )}
            >
              <HiOutlineMinus className="w-4 h-4 stroke-[2]" aria-hidden="true" />
            </button>

            <input
              id={inputId}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              role="spinbutton"
              aria-valuenow={numValue}
              aria-valuemin={min}
              aria-valuemax={max}
              aria-label="Guest meals count"
              disabled={disabled}
              value={inputValue}
              onChange={handleInputChange}
              onBlur={handleInputBlur}
              onKeyDown={handleKeyDown}
              className={cn(
                'w-12 h-11 min-h-[44px] text-center font-semibold text-sm tabular-nums',
                'text-[var(--text-primary)] bg-transparent border-x border-[var(--border-contrast)]',
                'focus:outline-none focus-visible:bg-[var(--bg-muted)] select-all',
                disabled && 'cursor-not-allowed opacity-60',
              )}
            />

            <button
              type="button"
              onClick={(e) => handleClick(e, 1)}
              onPointerDown={() => handlePointerDown(1)}
              onPointerUp={clearTimers}
              onPointerCancel={clearTimers}
              onPointerLeave={clearTimers}
              onBlur={clearTimers}
              disabled={disabled || numValue >= max}
              aria-label="Increase guest meals"
              aria-disabled={(disabled || numValue >= max) || undefined}
              className={cn(
                'w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center',
                'text-[var(--text-secondary)] hover:text-[var(--brand)] hover:bg-[var(--bg-muted)] active:bg-[var(--accent-subtle)]',
                'transition-colors duration-[180ms] ease-out',
                'disabled:opacity-30 disabled:cursor-not-allowed',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-elevated)]',
              )}
            >
              <HiOutlinePlus className="w-4 h-4 stroke-[2]" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>

      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {numValue === 0 ? 'No guest meals' : `${numValue} guest meal${numValue > 1 ? 's' : ''}`}
      </span>
    </div>
  );
});

GuestMealField.displayName = 'GuestMealField';
export default GuestMealField;
