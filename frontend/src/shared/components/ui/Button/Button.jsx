import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { useReducedMotion } from 'framer-motion';
import { cn } from '@/core/utils/helpers/string.helper';

const variantStyles = {
  primary:
    'bg-primary text-primary-foreground shadow-sm border border-primary/10 hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
  secondary:
    'bg-secondary text-secondary-foreground shadow-sm border border-secondary/20 hover:bg-secondary/80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
  ghost:
    'bg-transparent text-foreground border border-transparent hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
  destructive:
    'bg-destructive text-destructive-foreground shadow-sm border border-destructive/10 hover:bg-destructive/90 focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2',
  outline:
    'bg-transparent text-primary border border-primary/40 hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
  danger:
    'bg-destructive text-destructive-foreground shadow-sm border border-destructive/10 hover:bg-destructive/90 focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2',
  success:
    'bg-success text-white shadow-sm border border-success/10 hover:brightness-90 focus-visible:ring-2 focus-visible:ring-success focus-visible:ring-offset-2',
};

const sizeStyles = {
  sm: 'h-8 px-3 text-xs rounded-md gap-1.5',
  md: 'h-11 px-4 text-sm rounded-md gap-2',
  lg: 'h-12 px-6 text-base rounded-lg gap-2.5',
  xl: 'h-14 px-8 text-base rounded-lg gap-3',
};

const iconSizeStyles = {
  sm: 'h-8 w-8 rounded-md',
  md: 'h-10 w-10 rounded-md',
  lg: 'h-12 w-12 rounded-lg',
  xl: 'h-14 w-14 rounded-lg',
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

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      aria-disabled={disabled || undefined}
      className={cn(
        'relative inline-flex items-center justify-center font-medium border',
        'select-none whitespace-nowrap',
        'transition-all duration-[var(--duration-base)] ease-out',
        'min-h-[44px] min-w-[44px]',
        '-webkit-tap-highlight-color-transparent',
        !shouldReduceMotion && 'active:scale-[0.97] transform-gpu will-change-transform',
        'disabled:opacity-45 disabled:cursor-not-allowed disabled:pointer-events-none',
        variantStyles[variant] || variantStyles.primary,
        iconOnly ? (iconSizeStyles[size] || iconSizeStyles.md) : (sizeStyles[size] || sizeStyles.md),
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    >
      <span className={cn('inline-flex items-center justify-center gap-2', isLoading && 'opacity-0')}>
        {children}
      </span>
      {isLoading && (
        <span className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
          <Loader2 className="animate-spin shrink-0" size={loaderSizeMap[size] || 16} />
        </span>
      )}
    </button>
  );
});

Button.displayName = 'Button';

export default Button;
