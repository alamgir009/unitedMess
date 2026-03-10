import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@/app/providers/ThemeProvider';
import Button from '@/shared/ui/Button/Button';

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
            <div
                className="mx-auto transition-all duration-500"
                style={{
                    maxWidth: scrolled ? '860px' : '100%',
                    padding: scrolled ? '0 16px' : '0 24px',
                }}
            >
                <div
                    // Shifted to rounded-full on scroll for a pill-like floating effect, or keeps rounded-2xl
                    className={`relative flex items-center justify-between px-5 py-3 transition-all duration-500 ${scrolled ? 'rounded-xl' : 'rounded-2xl'}`}
                    style={{
                        // Liquid glass surface
                        background: scrolled
                            ? isDark
                                ? 'rgba(10, 10, 20, 0.6)'
                                : 'rgba(255, 255, 255, 0.6)'
                            : 'transparent',
                        backdropFilter: scrolled ? 'blur(24px) saturate(200%)' : 'none',
                        WebkitBackdropFilter: scrolled ? 'blur(24px) saturate(200%)' : 'none',
                        border: scrolled
                            ? isDark
                                ? '1px solid rgba(255,255,255,0.12)'
                                : '1px solid rgba(255,255,255,0.8)'
                            : '1px solid transparent',
                        boxShadow: scrolled
                            ? isDark
                                ? '0 10px 40px -10px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)'
                                : '0 10px 40px -10px rgba(99,102,241,0.2), inset 0 1px 0 rgba(255,255,255,0.9)'
                            : 'none',
                    }}
                >
                    {/* Animated liquid shimmer overlay (only when scrolled) */}
                    {scrolled && (
                        <motion.div
                            aria-hidden="true"
                            className="pointer-events-none absolute inset-0 rounded-xl overflow-hidden"
                        >
                            <motion.div
                                className="absolute inset-0"
                                style={{
                                    background: isDark
                                        ? 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08) 30%, rgba(255,255,255,0.03) 60%, transparent)'
                                        : 'linear-gradient(90deg, transparent, rgba(255,255,255,0.7) 30%, rgba(255,255,255,0.3) 60%, transparent)',
                                    filter: 'blur(4px)',
                                }}
                                animate={{ x: ['-100%', '200%'] }}
                                transition={{ repeat: Infinity, duration: 6, ease: 'linear' }}
                            />
                        </motion.div>
                    )}

                    {/* Logo with subtle glow on hover */}
                    <Link
                        to="/"
                        className="flex items-center gap-2.5 shrink-0 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl relative"
                        aria-label="UnitedMess home"
                    >
                        <div className="relative shrink-0">
                            <img
                                src="/assets/icons/new_logo.png"
                                alt="UnitedMess Logo"
                                className="w-9 h-9 object-contain rounded-sm transition-all duration-300 group-hover:scale-105 border-2 border-foreground/30"
                                style={{
                                    filter: 'drop-shadow(0 2px 8px rgba(99,102,241,0.5))',
                                }}
                            />
                            {/* Hover glow ring */}
                            <motion.div
                                className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100"
                                style={{
                                    boxShadow: isDark
                                        ? '0 0 15px 2px rgba(255,255,255,0.3)'
                                        : '0 0 15px 2px rgba(99,102,241,0.5)',
                                }}
                                animate={{ scale: [1, 1.1, 1] }}
                                transition={{ repeat: Infinity, duration: 2 }}
                            />
                        </div>
                        <span className="font-bold text-base tracking-tight text-foreground leading-none">
                            United<span className="text-gradient">Mess</span>
                        </span>
                    </Link>

                    {/* Desktop Nav Links with animated underline */}
                    <ul className="hidden md:flex items-center gap-1" role="list">
                        {NAV_LINKS.map(({ label, href }) => {
                            const isActive = location.pathname === href;
                            return (
                                <li key={href} className="relative">
                                    <Link
                                        to={href}
                                        className="relative px-4 py-2 rounded-xl text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group/link"
                                        style={{
                                            color: isActive ? '#0ea5e9' : 'hsl(var(--muted-foreground))',
                                            backgroundColor: isActive ? 'rgba(56,189,248,0.15)' : 'transparent'
                                        }}
                                        aria-current={isActive ? 'page' : undefined}
                                    >
                                        <span className="relative z-10">{label}</span>
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>

                    {/* Right actions */}
                    <div className="flex items-center gap-2">
                        {/* Theme toggle */}
                        <button
                            onClick={toggleTheme}
                            aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
                            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-white/20 dark:hover:bg-white/10 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring relative overflow-hidden group/theme"
                        >
                            <motion.span
                                key={theme}
                                initial={{ rotate: -20, opacity: 0 }}
                                animate={{ rotate: 0, opacity: 1 }}
                                transition={{ duration: 0.2 }}
                                className="block relative z-10"
                            >
                                {isDark ? <SunIcon /> : <MoonIcon />}
                            </motion.span>
                            {/* Shimmer on hover */}
                            <motion.span
                                className="absolute inset-0 opacity-0 group-hover/theme:opacity-100"
                                style={{
                                    background: isDark
                                        ? 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)'
                                        : 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
                                }}
                                animate={{ x: ['-100%', '200%'] }}
                                transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                            />
                        </button>

                        {/* Sign In */}
                        <Link
                            to="/login"
                            className="hidden md:inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-foreground border border-border/60 hover:bg-white/20 dark:hover:bg-white/10 backdrop-blur-sm transition-all duration-200 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring relative overflow-hidden group/signin"
                        >
                            Sign In
                            <motion.span
                                className="absolute inset-0 opacity-0 group-hover/signin:opacity-100"
                                style={{
                                    background: isDark
                                        ? 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)'
                                        : 'linear-gradient(90deg, transparent, rgba(255,200,125,0.3), transparent)',
                                }}
                                animate={{ x: ['-100%', '200%'] }}
                                transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                            />
                        </Link>

                        {/* Get Started with shine effect */}
                        <Link
                            to="/register"
                            className="hidden md:inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white shadow-md hover:opacity-90 hover:-translate-y-px transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring relative overflow-hidden group/start"
                            style={{ background: 'var(--gradient-primary)' }}
                        >
                            <span className="relative z-10">Get Started</span>
                            <motion.span
                                className="absolute inset-0"
                                style={{
                                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
                                }}
                                animate={{ x: ['-100%', '200%'] }}
                                transition={{ repeat: Infinity, duration: 1.8, ease: 'linear' }}
                            />
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

                {/* Mobile Menu with staggered animation */}
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
                                background: isDark ? 'rgba(15,15,25,0.85)' : 'rgba(255,255,255,0.85)',
                                backdropFilter: 'blur(24px) saturate(180%)',
                                WebkitBackdropFilter: 'blur(24px) saturate(180%)',
                                border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(255,255,255,0.8)',
                                boxShadow: '0 12px 40px rgba(0,0,0,0.2)',
                            }}
                        >
                            <motion.div
                                className="px-4 py-4 flex flex-col gap-1"
                                variants={{
                                    hidden: { opacity: 0 },
                                    visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
                                }}
                                initial="hidden"
                                animate="visible"
                                exit="hidden"
                            >
                                {NAV_LINKS.map(({ label, href }) => {
                                    const isActive = location.pathname === href;
                                    return (
                                        <motion.div
                                            key={href}
                                            variants={{
                                                hidden: { opacity: 0, x: -10, rotate: -1 },
                                                visible: { opacity: 1, x: 0, rotate: 0 }
                                            }}
                                        >
                                            <Link
                                                to={href}
                                                className="px-4 py-3 rounded-xl text-sm font-medium transition-colors block"
                                                style={{
                                                    color: isActive ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
                                                    background: isActive ? 'hsl(var(--primary) / 0.08)' : 'transparent',
                                                }}
                                            >
                                                {label}
                                            </Link>
                                        </motion.div>
                                    );
                                })}
                                <motion.div
                                    variants={{
                                        hidden: { opacity: 0, y: 10 },
                                        visible: { opacity: 1, y: 0 }
                                    }}
                                    className="flex flex-col gap-2 mt-3 pt-3"
                                    style={{ borderTop: '1px solid hsl(var(--border))' }}
                                >
                                    <Link to="/login" className="px-4 py-3 rounded-xl text-sm font-semibold text-center border border-border/60 hover:bg-white/20 dark:hover:bg-white/10 transition-colors text-foreground">
                                        Sign In
                                    </Link>
                                    <Link to="/register" className="px-4 py-3 rounded-xl text-sm font-semibold text-center text-white hover:opacity-90 transition-opacity shadow-sm" style={{ background: 'var(--gradient-primary)' }}>
                                        Get Started
                                    </Link>
                                </motion.div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </header>
    );
};

export default Navbar;