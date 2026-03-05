import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@/app/providers/ThemeProvider';

const NAV_LINKS = [
    { label: 'Home', href: '/' },
    { label: 'About', href: '/about' },
    { label: 'Food Gallery', href: '/food-gallery' },
];

const SunIcon = () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
    </svg>
);

const MoonIcon = () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
    </svg>
);

const Navbar = () => {
    const { theme, toggleTheme, isDark } = useTheme();
    const [scrolled, setScrolled] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const location = useLocation();

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 24);
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => { setMobileOpen(false); }, [location]);

    return (
        <header
            className="fixed top-0 left-0 right-0 z-[100] transition-all duration-500"
            style={{ paddingTop: scrolled ? '8px' : '16px', paddingBottom: scrolled ? '8px' : '16px' }}
        >
            {/* ── Liquid Glass pill container ── */}
            <div
                className="mx-auto transition-all duration-500"
                style={{
                    maxWidth: scrolled ? '860px' : '100%',
                    padding: scrolled ? '0 16px' : '0 24px',
                }}
            >
                <div
                    className="relative flex items-center justify-between rounded-2xl px-5 py-3 transition-all duration-500"
                    style={{
                        /* Liquid glass surface */
                        background: scrolled
                            ? isDark
                                ? 'rgba(15, 15, 25, 0.55)'
                                : 'rgba(255, 255, 255, 0.55)'
                            : 'transparent',
                        backdropFilter: scrolled ? 'blur(24px) saturate(180%)' : 'none',
                        WebkitBackdropFilter: scrolled ? 'blur(24px) saturate(180%)' : 'none',
                        border: scrolled
                            ? isDark
                                ? '1px solid rgba(255,255,255,0.10)'
                                : '1px solid rgba(255,255,255,0.70)'
                            : '1px solid transparent',
                        boxShadow: scrolled
                            ? isDark
                                ? '0 8px 32px rgba(0,0,0,0.40), inset 0 1px 0 rgba(255,255,255,0.08)'
                                : '0 8px 32px rgba(99,102,241,0.12), inset 0 1px 0 rgba(255,255,255,0.90)'
                            : 'none',
                    }}
                >
                    {/* Liquid shimmer highlight line */}
                    {scrolled && (
                        <div
                            aria-hidden="true"
                            className="pointer-events-none absolute inset-x-0 top-0 h-px rounded-t-2xl"
                            style={{
                                background: isDark
                                    ? 'linear-gradient(90deg, transparent, rgba(255,255,255,0.18) 40%, rgba(255,255,255,0.06) 60%, transparent)'
                                    : 'linear-gradient(90deg, transparent, rgba(255,255,255,0.95) 40%, rgba(255,255,255,0.60) 60%, transparent)',
                            }}
                        />
                    )}

                    {/* ── Logo ── */}
                    <Link
                        to="/"
                        className="flex items-center gap-2.5 shrink-0 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl"
                        aria-label="UnitedMess home"
                    >
                        {/* Logo image */}
                        <div className="relative shrink-0">
                            <img
                                src="/assets/icons/new_logo.png"
                                alt="UnitedMess Logo"
                                className="w-9 h-9 object-contain rounded-sm transition-all duration-300 group-hover:scale-105 border-2 border-foreground/30"
                                style={{
                                    filter: 'drop-shadow(0 2px 6px rgba(99,102,241,0.35))',
                                }}
                            />
                        </div>
                        <span className="font-bold text-base tracking-tight text-foreground leading-none">
                            United<span className="text-gradient">Mess</span>
                        </span>
                    </Link>

                    {/* ── Desktop Nav Links ── */}
                    <ul className="hidden md:flex items-center gap-1" role="list">
                        {NAV_LINKS.map(({ label, href }) => {
                            const isActive = location.pathname === href;
                            return (
                                <li key={href}>
                                    <Link
                                        to={href}
                                        className="relative px-4 py-2 rounded-xl text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                        style={{
                                            color: isActive ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
                                        }}
                                        aria-current={isActive ? 'page' : undefined}
                                        onMouseEnter={e => {
                                            if (!isActive) e.currentTarget.style.color = 'hsl(var(--foreground))';
                                        }}
                                        onMouseLeave={e => {
                                            if (!isActive) e.currentTarget.style.color = 'hsl(var(--muted-foreground))';
                                        }}
                                    >
                                        {isActive && (
                                            <motion.span
                                                layoutId="nav-pill"
                                                className="absolute inset-0 rounded-xl"
                                                style={{ background: 'hsl(var(--primary) / 0.10)' }}
                                                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                                            />
                                        )}
                                        <span className="relative z-10">{label}</span>
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>

                    {/* ── Right actions ── */}
                    <div className="flex items-center gap-2">

                        {/* Theme toggle */}
                        <button
                            onClick={toggleTheme}
                            aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
                            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-white/20 dark:hover:bg-white/10 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            <motion.span
                                key={theme}
                                initial={{ rotate: -20, opacity: 0 }}
                                animate={{ rotate: 0, opacity: 1 }}
                                transition={{ duration: 0.2 }}
                                className="block"
                            >
                                {isDark ? <SunIcon /> : <MoonIcon />}
                            </motion.span>
                        </button>

                        {/* Sign In */}
                        <Link
                            to="/login"
                            className="hidden md:inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-foreground border border-border/60 hover:bg-white/20 dark:hover:bg-white/10 backdrop-blur-sm transition-all duration-200 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            Sign In
                        </Link>

                        {/* Get Started */}
                        <Link
                            to="/register"
                            className="hidden md:inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white shadow-md hover:opacity-90 hover:-translate-y-px transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            style={{ background: 'var(--gradient-primary)' }}
                        >
                            Get Started
                        </Link>

                        {/* Mobile hamburger */}
                        <button
                            onClick={() => setMobileOpen((o) => !o)}
                            aria-expanded={mobileOpen}
                            aria-label="Toggle mobile menu"
                            className="md:hidden p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-white/20 dark:hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                {mobileOpen
                                    ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    : <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                                }
                            </svg>
                        </button>
                    </div>
                </div>

                {/* ── Mobile Menu ── */}
                <AnimatePresence>
                    {mobileOpen && (
                        <motion.div
                            key="mobile-menu"
                            initial={{ opacity: 0, y: -8, scale: 0.97 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -8, scale: 0.97 }}
                            transition={{ duration: 0.2, ease: 'easeOut' }}
                            className="mt-2 rounded-2xl overflow-hidden"
                            style={{
                                background: isDark ? 'rgba(15,15,25,0.80)' : 'rgba(255,255,255,0.80)',
                                backdropFilter: 'blur(24px) saturate(180%)',
                                WebkitBackdropFilter: 'blur(24px) saturate(180%)',
                                border: isDark ? '1px solid rgba(255,255,255,0.10)' : '1px solid rgba(255,255,255,0.70)',
                                boxShadow: '0 12px 32px rgba(0,0,0,0.15)',
                            }}
                        >
                            <div className="px-4 py-4 flex flex-col gap-1">
                                {NAV_LINKS.map(({ label, href }) => {
                                    const isActive = location.pathname === href;
                                    return (
                                        <Link
                                            key={href}
                                            to={href}
                                            className="px-4 py-3 rounded-xl text-sm font-medium transition-colors"
                                            style={{
                                                color: isActive ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
                                                background: isActive ? 'hsl(var(--primary) / 0.08)' : 'transparent',
                                            }}
                                        >
                                            {label}
                                        </Link>
                                    );
                                })}
                                <div
                                    className="flex flex-col gap-2 mt-3 pt-3"
                                    style={{ borderTop: '1px solid hsl(var(--border))' }}
                                >
                                    <Link to="/login" className="px-4 py-3 rounded-xl text-sm font-semibold text-center border border-border/60 hover:bg-white/20 dark:hover:bg-white/10 transition-colors text-foreground">
                                        Sign In
                                    </Link>
                                    <Link to="/register" className="px-4 py-3 rounded-xl text-sm font-semibold text-center text-white hover:opacity-90 transition-opacity shadow-sm" style={{ background: 'var(--gradient-primary)' }}>
                                        Get Started
                                    </Link>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </header>
    );
};

export default Navbar;
