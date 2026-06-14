import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { useReducedMotion } from 'framer-motion';
import { cn } from '@/core/utils/helpers/string.helper';

const btnVariantClass = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  destructive: 'btn-destructive',
  warning: 'btn-warning',
  success: 'btn-success',
  ghost: 'btn-ghost',
  danger: 'btn-destructive',
  premium: 'btn-premium',
  inverse: 'btn-inverse',
  glass: 'btn-glass',
  neutral: 'btn-neutral',
  link: 'btn-link',
  elevated: 'btn-elevated',
  'brand-subtle': 'btn-brand-subtle',
  loading: 'btn-loading',
  icon: 'btn-icon',
};

const fallbackStyles = {
  outline:
    'bg-transparent text-primary border border-primary/30 hover:bg-primary/[0.08] hover:border-primary/50 active:bg-primary/[0.12]',
};

const sizeStyles = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-11 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2.5',
  xl: 'h-14 px-8 text-base gap-3',
};

const iconSizeStyles = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
  xl: 'h-14 w-14',
};

const radiusStyles = {
  sm: 'rounded-btn-sm',
  md: 'rounded-btn-md',
  lg: 'rounded-btn-lg',
  xl: 'rounded-btn-xl',
};

const loaderSizeMap = { sm: 14, md: 16, lg: 18, xl: 20 };

const Button = forwardRef(({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  iconOnly = false,
  fullWidth = false,
  className = '',
  disabled,
  type = 'button',
  ...props
}, ref) => {
  const shouldReduceMotion = useReducedMotion();
  const isLink = variant === 'link';

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      aria-disabled={disabled || undefined}
      className={cn(
        'font-medium select-none whitespace-nowrap',
        'transition-all duration-[var(--duration-base)] ease-out',
        '-webkit-tap-highlight-color-transparent',

        isLink && [
          'btn-link',
          'inline p-0 h-auto min-h-0 min-w-0 border-none shadow-none',
          'text-base',
        ],

        !isLink && [
          'relative inline-flex items-center justify-center',
          'min-h-[44px] min-w-[44px]',
          'disabled:opacity-45 disabled:cursor-not-allowed disabled:pointer-events-none',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          !shouldReduceMotion && 'active:scale-[0.97] transform-gpu will-change-transform',
        ],

        isLoading && !isLink && 'btn-loading',
        !isLoading && btnVariantClass[variant],
        !btnVariantClass[variant] && fallbackStyles[variant],

        !isLink && (iconOnly ? iconSizeStyles[size] || iconSizeStyles.md : sizeStyles[size] || sizeStyles.md),

        !isLink && (radiusStyles[size] || radiusStyles.md),

        fullWidth && !isLink && 'w-full',

        className,
      )}
      {...props}
    >
      {!isLink && isLoading && (
        <span className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
          <Loader2 className="animate-spin shrink-0" size={loaderSizeMap[size] || 16} />
        </span>
      )}
      <span className={cn(
        'inline-flex items-center justify-center gap-2',
        isLoading && !isLink && 'opacity-0',
      )}>
        {children}
      </span>
    </button>
  );
});

Button.displayName = 'Button';

export default Button;
