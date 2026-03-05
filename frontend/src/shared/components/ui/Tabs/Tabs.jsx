import { useState } from 'react';
import { clsx } from 'clsx';

/**
 * Tabs Component
 * Variants: underline | pill | glass
 */
export const TabsList = ({ children, variant = 'underline', className = '' }) => {
    const wrapperStyles = {
        underline: 'flex border-b border-border gap-1',
        pill: 'flex bg-muted p-1 rounded-xl gap-1',
        glass: 'flex glass p-1 rounded-xl gap-1',
    };
    return (
        <div role="tablist" className={clsx(wrapperStyles[variant], className)}>
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
    const baseStyles = [
        'inline-flex items-center justify-center gap-2 px-4 py-2',
        'text-sm font-medium',
        'transition-all duration-200',
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
            active: 'bg-white/30 dark:bg-white/10 text-foreground shadow-sm rounded-lg backdrop-blur-sm',
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
            className={clsx(
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

export const TabsContent = ({ children, isActive, id, labelledBy, className = '' }) => (
    <div
        role="tabpanel"
        id={id}
        aria-labelledby={labelledBy}
        hidden={!isActive}
        tabIndex={0}
        className={clsx('focus:outline-none animate-fade-in', className)}
    >
        {isActive && children}
    </div>
);

/**
 * Tabs — convenience wrapper that manages state internally
 */
const Tabs = ({
    tabs = [],  // [{ label, content, icon, disabled }]
    variant = 'underline',
    defaultIndex = 0,
    className = '',
}) => {
    const [active, setActive] = useState(defaultIndex);

    return (
        <div className={clsx('w-full', className)}>
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

export default Tabs;
