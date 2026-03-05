import { cn } from '@/core/utils/helpers/string.helper';

export const Card = ({ className, children, ...props }) => {
    return (
        <div className={cn("rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-gray-950 dark:text-gray-50 shadow-sm transition-colors duration-300", className)} {...props}>
            {children}
        </div>
    );
};

export const CardHeader = ({ className, children, ...props }) => (
    <div className={cn("flex flex-col space-y-1.5 p-6", className)} {...props}>
        {children}
    </div>
);

export const CardTitle = ({ className, children, ...props }) => (
    <h3 className={cn("font-semibold leading-none tracking-tight", className)} {...props}>
        {children}
    </h3>
);

export const CardContent = ({ className, children, ...props }) => (
    <div className={cn("p-6 pt-0", className)} {...props}>
        {children}
    </div>
);
