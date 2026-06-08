import { clsx } from 'clsx';

export const Spinner = ({ size = 'md', className = '', color = 'primary' }) => {
  const sizes = {
    xs: 'w-3 h-3 border',
    sm: 'w-4 h-4 border-2',
    md: 'w-5 h-5 border-2',
    lg: 'w-7 h-7 border-2',
    xl: 'w-9 h-9 border-[3px]',
  };

  const colors = {
    primary: 'border-primary/30 border-t-primary',
    white: 'border-white/30 border-t-white',
    current: 'border-current/30 border-t-current',
  };

  return (
    <div
      role="status"
      aria-label="Loading"
      className={clsx(
        'animate-spin rounded-full',
        sizes[size],
        colors[color] || colors.primary,
        className,
      )}
    />
  );
};

export const DotsLoader = ({ size = 'md', className = '' }) => {
  const dotSizes = {
    xs: 'w-1 h-1',
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-2.5 h-2.5',
    xl: 'w-3 h-3',
  };

  return (
    <div className={clsx('flex items-center gap-1', className)} role="status" aria-label="Loading">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={clsx(
            dotSizes[size],
            'rounded-full bg-current animate-bounce',
          )}
          style={{ animationDelay: `${i * 0.1}s`, animationDuration: '0.6s' }}
        />
      ))}
    </div>
  );
};

export const PulseLoader = ({ className = '' }) => (
  <div className={clsx('flex items-center gap-2', className)} role="status" aria-label="Loading">
    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
      <div className="h-full bg-primary rounded-full animate-shimmer" style={{ width: '40%' }} />
    </div>
  </div>
);

export const Skeleton = ({ className = '', as: Component = 'div' }) => (
  <Component className={clsx('skeleton', className)} aria-hidden="true" />
);

export const FullPageLoader = ({ label = 'Loading…' }) => (
  <div
    className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-background"
    role="status"
    aria-label={label}
  >
    <div className="relative flex flex-col items-center gap-4 px-10 py-8 rounded-3xl border border-white/10 dark:border-white/5 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl shadow-2xl">
      <Spinner size="xl" color="primary" />
      <p className="text-sm font-semibold text-muted-foreground tracking-wide">
        {label}
      </p>
    </div>
  </div>
);

const Loader = ({ variant = 'spinner', ...props }) => {
  switch (variant) {
    case 'dots': return <DotsLoader {...props} />;
    case 'pulse': return <PulseLoader {...props} />;
    case 'skeleton': return <Skeleton {...props} />;
    case 'fullPage': return <FullPageLoader {...props} />;
    default: return <Spinner {...props} />;
  }
};

export default Loader;
