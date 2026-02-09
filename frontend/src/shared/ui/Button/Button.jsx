import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/core/utils/helpers/string.helper'; // Function we'll need

const Button = ({
    children,
    variant = 'primary',
    size = 'md',
    isLoading = false,
    className,
    disabled,
    ...props
}) => {
    const baseStyles = "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";

    const variants = {
        primary: "bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-600",
        secondary: "bg-gray-100 text-gray-900 hover:bg-gray-200 focus-visible:ring-gray-500",
        outline: "border border-gray-300 bg-transparent hover:bg-gray-100 text-gray-700",
        ghost: "hover:bg-gray-100 hover:text-gray-900",
        link: "text-blue-600 underline-offset-4 hover:underline",
        danger: "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-600",
    };

    const sizes = {
        sm: "h-8 px-3 text-xs",
        md: "h-10 px-4 py-2",
        lg: "h-12 px-8 text-lg",
    };

    return (
        <button
            className={cn(baseStyles, variants[variant], sizes[size], className)}
            disabled={disabled || isLoading}
            {...props}
        >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {children}
        </button>
    );
};

// Helper for classnames if not installed yet, but usually we install 'clsx' and 'tailwind-merge'
// For now, simple implementation
function simpleCn(...classes) {
    return classes.filter(Boolean).join(' ');
}

// In real app, we use tailwind-merge
export default Button;
