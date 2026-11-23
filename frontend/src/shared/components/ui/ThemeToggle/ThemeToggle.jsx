import { useTheme } from '@/app/providers/ThemeProvider';
import Button from '../Button/Button';

const ThemeToggle = ({ appearance = 'header' }) => {
    const { isDark, toggleTheme } = useTheme();
    const isNavbar = appearance === 'navbar';
    const buttonProps = {
        onClick: toggleTheme,
        'aria-label': `Switch to ${isDark ? 'light' : 'dark'} mode`,
        'aria-pressed': isDark,
    };
    const icon = (
        <svg
            className={isNavbar ? 'w-4 h-4' : 'w-5 h-5'}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.8}
            aria-hidden="true"
            focusable="false"
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d={isDark
                    ? isNavbar
                        ? 'M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z'
                        : 'M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z'
                    : 'M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z'}
            />
        </svg>
    );

    if (isNavbar) {
        return <Button variant="ghost" size="icon" className="h-9 w-9" {...buttonProps}>{icon}</Button>;
    }

    return (
        <button
            type="button"
            className="header-control inline-flex w-11 items-center justify-center text-foreground/60 transition-[color,background-color,border-color,transform] active:scale-95 motion-reduce:transform-none motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            {...buttonProps}
        >
            {icon}
        </button>
    );
};

export default ThemeToggle;
