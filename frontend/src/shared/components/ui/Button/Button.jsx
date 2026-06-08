import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { clsx } from 'clsx';

const variantStyles = {
  primary:
    'bg-primary text-primary-foreground shadow-sm border-primary/10 hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
  secondary:
    'bg-card text-foreground border-border-strong shadow-sm hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
  outline:
    'bg-transparent text-primary border-primary/40 hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
  ghost:
    'bg-transparent text-muted-foreground border-transparent hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
  danger:
    'bg-destructive text-destructive-foreground shadow-sm border-destructive/10 hover:bg-destructive/90 focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2',
  success:
    'bg-emerald-600 text-white shadow-sm border-emerald-600/10 hover:bg-emerald-700 focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2',
};

const sizeStyles = {
  sm: 'h-8 px-3 text-xs rounded-md gap-1.5',
  md: 'h-10 px-4 text-sm rounded-md gap-2',
  lg: 'h-12 px-6 text-base rounded-lg gap-2.5',
  xl: 'h-14 px-8 text-base rounded-lg gap-3',
};

const iconSizeStyles = {
  sm: 'h-8 w-8 rounded-md',
  md: 'h-10 w-10 rounded-md',
  lg: 'h-12 w-12 rounded-lg',
  xl: 'h-14 w-14 rounded-lg',
};

const Button = forwardRef(({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  iconOnly = false,
  fullWidth = false,
  className = '',
  disabled,
  onClick,
  ...props
}, ref) => {
  return (
    <button
      ref={ref}
      type="button"
      disabled={disabled || isLoading}
      aria-busy={isLoading}
      className={clsx(
        'inline-flex items-center justify-center font-medium border transition-all duration-100 ease-out',
        'active:scale-[0.97] disabled:opacity-45 disabled:cursor-not-allowed disabled:pointer-events-none',
        'select-none whitespace-nowrap -webkit-tap-highlight-color-transparent',
        variantStyles[variant] || variantStyles.primary,
        iconOnly ? iconSizeStyles[size] : sizeStyles[size],
        fullWidth && 'w-full',
        className,
      )}
      onClick={onClick}
      {...props}
    >
      {isLoading && (
        <Loader2
          className="animate-spin shrink-0"
          size={size === 'sm' ? 13 : size === 'lg' || size === 'xl' ? 18 : 15}
        />
      )}
      {children}
    </button>
  );
});

Button.displayName = 'Button';

export default Button;
