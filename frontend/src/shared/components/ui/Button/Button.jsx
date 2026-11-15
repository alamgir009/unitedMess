import { forwardRef, cloneElement, isValidElement, Children } from 'react';
import { Loader2 } from 'lucide-react';
import { useReducedMotion } from 'framer-motion';
import { cn } from '@/core/utils/helpers/string.helper';

const btnVariantClass = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  destructive: 'btn-destructive',
  danger: 'btn-destructive',
  warning: 'btn-warning',
  success: 'btn-success',
  ghost: 'btn-ghost',
  outline: 'btn-outline',
  neutral: 'btn-neutral',
  elevated: 'btn-elevated',
  'brand-subtle': 'btn-brand-subtle',
  subtle: 'btn-brand-subtle',
  premium: 'btn-premium',
  inverse: 'btn-inverse',
  glass: 'btn-glass',
  link: 'btn-link',
  icon: 'btn-icon',
  loading: 'btn-loading',
};

const sizeStyles = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2.5',
  xl: 'h-14 px-8 text-base gap-3',
};

const linkSizeStyles = {
  sm: 'text-xs gap-1',
  md: 'text-sm gap-1.5',
  lg: 'text-base gap-2',
  xl: 'text-base gap-2',
};

const iconSizeStyles = {
  sm: 'h-8 w-8 p-0',
  md: 'h-10 w-10 p-0',
  lg: 'h-12 w-12 p-0',
  xl: 'h-14 w-14 p-0',
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
  asChild = false,
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
  const isDestructive = variant === 'destructive' || variant === 'danger';

  const btnClasses = cn(
    'font-semibold select-none whitespace-nowrap',
    'transition-[background-image,background-color,border-color,box-shadow,opacity,color,transform] motion-reduce:transition-none duration-[180ms] ease-out',
    '-webkit-tap-highlight-color-transparent',

    isLink && [
      'btn-link',
      'inline-flex items-center justify-center p-0 h-auto min-h-0 min-w-0 border-none shadow-none bg-transparent',
      'hover:underline underline-offset-4 cursor-pointer',
      linkSizeStyles[size] || linkSizeStyles.md,
      'disabled:opacity-45 disabled:cursor-not-allowed disabled:no-underline disabled:pointer-events-none',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
    ],

    !isLink && [
      'btn',
      'relative inline-flex items-center justify-center',
      /* Touch guarantee on mobile only — restores the size scale on desktop
         (previously min-h-[44px] silently overrode h-8/h-10 everywhere). */
      'min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0',
      'disabled:opacity-45 disabled:cursor-not-allowed disabled:pointer-events-none disabled:shadow-none',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
      isDestructive ? 'focus-visible:ring-destructive' : 'focus-visible:ring-ring',
      !shouldReduceMotion && 'active:scale-[0.98] transform-gpu',
    ],

    // Always keep the variant styling so buttons retain visual identity even during loading
    btnVariantClass[variant] || 'btn-primary',

    isLoading && 'cursor-wait pointer-events-none',

    !isLink && (iconOnly ? iconSizeStyles[size] || iconSizeStyles.md : sizeStyles[size] || sizeStyles.md),

    !isLink && (radiusStyles[size] || radiusStyles.md),

    fullWidth && !isLink && 'w-full',

    className,
  );

  if (asChild) {
    const child = Children.only(children);
    if (!isValidElement(child)) return null;
    return cloneElement(child, {
      ref,
      className: cn(btnClasses, child.props.className),
      ...props,
      ...child.props,
    });
  }

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      aria-disabled={disabled || undefined}
      className={btnClasses}
      {...props}
    >
      {!isLink && isLoading && (
        <span className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden="true">
          <Loader2 className="animate-spin shrink-0" size={loaderSizeMap[size] || 16} />
        </span>
      )}
      {isLink && isLoading && (
        <Loader2 className="animate-spin shrink-0 inline-block mr-1.5" size={loaderSizeMap[size] || 14} aria-hidden="true" />
      )}
      <span className={cn(
        'inline-flex items-center justify-center',
        !iconOnly && 'gap-2',
        isLoading && !isLink && 'opacity-0 select-none pointer-events-none',
      )}>
        {children}
      </span>
    </button>
  );
});

Button.displayName = 'Button';

export default Button;
