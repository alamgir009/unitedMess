import { forwardRef } from 'react';
import { clsx } from 'clsx';

const Card = forwardRef(({
  variant = 'default',
  padding = 'md',
  className = '',
  children,
  hover = false,
  ...props
}, ref) => {
  const variants = {
    default: 'bg-card text-card-foreground border border-border shadow-sm rounded-lg',
    glass: 'bg-card/80 backdrop-blur-sm text-foreground border border-border rounded-lg',
    elevated: 'bg-card text-card-foreground border border-border shadow-lg rounded-lg',
    flat: 'bg-muted/50 text-foreground rounded-lg',
    bordered: 'bg-transparent text-foreground border-2 border-border rounded-lg',
  };

  const paddings = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
    xl: 'p-10',
  };

  const hoverStyles = hover
    ? 'transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md cursor-pointer'
    : [];

  return (
    <div
      ref={ref}
      className={clsx(variants[variant], paddings[padding], hoverStyles, className)}
      {...props}
    >
      {children}
    </div>
  );
});

Card.displayName = 'Card';

export const CardHeader = ({ className = '', children, ...props }) => (
  <div className={clsx('flex flex-col space-y-1.5 pb-4', className)} {...props}>
    {children}
  </div>
);

export const CardTitle = ({ className = '', children, ...props }) => (
  <h3 className={clsx('font-semibold leading-none tracking-tight text-base', className)} {...props}>
    {children}
  </h3>
);

export const CardDescription = ({ className = '', children, ...props }) => (
  <p className={clsx('text-sm text-muted-foreground', className)} {...props}>
    {children}
  </p>
);

export const CardContent = ({ className = '', children, ...props }) => (
  <div className={clsx('', className)} {...props}>
    {children}
  </div>
);

export const CardFooter = ({ className = '', children, ...props }) => (
  <div className={clsx('flex items-center pt-4 border-t border-border mt-4', className)} {...props}>
    {children}
  </div>
);

export default Card;
