import { clsx } from 'clsx';

const variants = {
  default: 'bg-muted text-muted-foreground border border-border',
  primary: 'bg-primary/10 text-primary border border-primary/20',
  secondary: 'bg-secondary text-secondary-foreground border border-secondary',
  success: 'bg-success-bg text-success-text border border-success-border',
  warning: 'bg-warning-bg text-warning-text border border-warning-border',
  error: 'bg-danger-bg text-danger-text border border-danger-border',
  info: 'bg-info-bg text-info-text border border-info-border',
  glass: 'bg-card text-foreground border border-border',
  outline: 'bg-transparent text-foreground border border-border',
  profit: 'bg-profit-bg text-profit-text border border-success-border',
  loss: 'bg-loss-bg text-loss-text border border-danger-border',
};

const dotColors = {
  default: 'bg-muted-foreground',
  primary: 'bg-primary',
  secondary: 'bg-secondary-foreground',
  success: 'bg-success',
  warning: 'bg-warning',
  error: 'bg-danger',
  info: 'bg-info',
  glass: 'bg-foreground',
  outline: 'bg-foreground',
  profit: 'bg-profit',
  loss: 'bg-loss',
};

const sizes = {
  sm: 'text-[10px] px-2 py-0.5 rounded-md',
  md: 'text-xs px-2.5 py-1 rounded-lg',
  lg: 'text-sm px-3 py-1.5 rounded-lg',
};

const Badge = ({
  variant = 'default',
  size = 'md',
  className = '',
  children,
  dot = false,
  onClick,
  ...props
}) => {
  const isClickable = !!onClick;

  return (
    <span
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onClick={onClick}
      onKeyDown={isClickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick?.(e); } : undefined}
      className={clsx(
        'inline-flex items-center gap-1.5 font-medium',
        variants[variant] || variants.default,
        sizes[size],
        isClickable && 'cursor-pointer hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
        className,
      )}
      {...props}
    >
      {dot && (
        <span
          aria-hidden="true"
          className={clsx('inline-block w-1.5 h-1.5 rounded-full shrink-0', dotColors[variant])}
        />
      )}
      {children}
    </span>
  );
};

export default Badge;
