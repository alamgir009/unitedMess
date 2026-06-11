import { useState } from 'react';
import { cn } from '@/core/utils/helpers/string.helper';

export const TabsList = ({ children, variant = 'underline', className = '' }) => {
TabsList.displayName = 'TabsList';
  const wrapperStyles = {
    underline: 'flex border-b border-border gap-1 overflow-x-auto no-scrollbar',
    pill: 'flex bg-muted p-1 rounded-lg gap-1 overflow-x-auto no-scrollbar',
    glass: 'flex bg-card/60 backdrop-blur-sm p-1 rounded-lg gap-1 border border-border overflow-x-auto no-scrollbar',
  };
  return (
    <div role="tablist" className={cn(wrapperStyles[variant], className)}>
      {children}
    </div>
  );
};

export const TabsTrigger = ({
  children,
  isActive,
  onClick,
  variant = 'underline',
  className = '',
  disabled = false,
  id,
  controls,
}) => {
TabsTrigger.displayName = 'TabsTrigger';
  const baseStyles = [
    'inline-flex items-center justify-center gap-2 px-4 py-2',
    'text-sm font-medium whitespace-nowrap',
    'transition-all duration-150',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
    'disabled:pointer-events-none disabled:opacity-50',
    'touch-target',
  ];

  const variants = {
    underline: {
      base: 'text-muted-foreground hover:text-foreground border-b-2 border-transparent rounded-none -mb-[1px]',
      active: 'text-foreground border-primary',
    },
    pill: {
      base: 'text-muted-foreground hover:text-foreground rounded-lg',
      active: 'bg-background text-foreground shadow-sm rounded-lg',
    },
    glass: {
      base: 'text-muted-foreground hover:text-foreground rounded-lg',
      active: 'bg-card text-foreground shadow-sm rounded-lg',
    },
  };

  return (
    <button
      role="tab"
      id={id}
      aria-selected={isActive}
      aria-controls={controls}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        baseStyles,
        variants[variant].base,
        isActive && variants[variant].active,
        className,
      )}
    >
      {children}
    </button>
  );
};

export const TabsContent = ({ children, isActive, id, labelledBy, className = '' }) => {
TabsContent.displayName = 'TabsContent';
return (
  <div
    role="tabpanel"
    id={id}
    aria-labelledby={labelledBy}
    hidden={!isActive}
    tabIndex={0}
    className={cn('focus:outline-none', className)}
  >
    {isActive && <div className="animate-fade-in">{children}</div>}
  </div>
  );
};

const Tabs = ({
  tabs = [],
  variant = 'underline',
  defaultIndex = 0,
  className = '',
}) => {
  const [active, setActive] = useState(defaultIndex);

  return (
    <div className={cn('w-full', className)}>
      <TabsList variant={variant}>
        {tabs.map((tab, i) => (
          <TabsTrigger
            key={i}
            isActive={active === i}
            onClick={() => setActive(i)}
            variant={variant}
            disabled={tab.disabled}
            id={`tab-${i}`}
            controls={`tabpanel-${i}`}
          >
            {tab.icon && <span className="w-4 h-4">{tab.icon}</span>}
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
      <div className="mt-4">
        {tabs.map((tab, i) => (
          <TabsContent
            key={i}
            isActive={active === i}
            id={`tabpanel-${i}`}
            labelledBy={`tab-${i}`}
          >
            {tab.content}
          </TabsContent>
        ))}
      </div>
    </div>
  );
};

Tabs.displayName = 'Tabs';
export default Tabs;
