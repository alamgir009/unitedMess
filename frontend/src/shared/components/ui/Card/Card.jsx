import { forwardRef } from 'react';
import { cn } from '@/core/utils/helpers/string.helper';

const Card = forwardRef(({
  variant = 'default',
  padding = 'md',
  className = '',
  children,
  interactive = false,
  selected = false,
  ...props
}, ref) => {
  const variants = {
    default: 'surface-elevated text-card-foreground border border-border card-base',
    glass: 'bg-[var(--surface-elevated)]/80 text-foreground border border-border rounded-lg',
    elevated: 'surface-elevated text-card-foreground border border-border card-elevated',
    flat: 'surface-raised text-foreground border border-muted rounded-lg',
    bordered: 'bg-transparent text-foreground border-2 border-border rounded-lg',
    premium: 'surface-elevated text-card-foreground border border-strong card-premium',
  };

  const paddings = {
    none: '',
    sm: 'p-3.5',
    md: 'p-4',
    lg: 'p-5',
    xl: 'p-6',
  };

  const interactiveStyles = interactive
    ? 'card-interactive hover:-translate-y-0.5 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
    : '';

  const selectedStyle = selected
    ? 'ring-2 ring-primary border-primary'
    : '';

  return (
    <div
      ref={ref}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      className={cn(variants[variant], paddings[padding], interactiveStyles, selectedStyle, className)}
      {...props}
    >
      {children}
    </div>
  );
});

Card.displayName = 'Card';

export const CardHeader = ({ className = '', children, ...props }) => (
  <div className={cn('flex flex-col space-y-1.5 pb-4 relative', className)} {...props}>
    {children}
  </div>
);

export const CardTitle = ({ className = '', children, ...props }) => (
  <h3 className={cn('text-h3', className)} {...props}>
    {children}
  </h3>
);

export const CardDescription = ({ className = '', children, ...props }) => (
  <p className={cn('text-sm text-muted-foreground', className)} {...props}>
    {children}
  </p>
);

export const CardContent = ({ className = '', children, ...props }) => (
  <div className={cn('', className)} {...props}>
    {children}
  </div>
);

export const CardFooter = ({ className = '', children, ...props }) => (
  <div className={cn('flex items-center pt-4 border-t border-border mt-4', className)} {...props}>
    {children}
  </div>
);

export default Card;
