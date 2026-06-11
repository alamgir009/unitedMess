import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '@/app/providers/ThemeProvider';
import { cn } from '@/core/utils/helpers/string.helper';

const NAV_LINKS = [
  { label: 'Home', href: '/' },
  { label: 'About', href: '/about' },
  { label: 'Food Gallery', href: '/food-gallery' },
];

const SunIcon = () => {
SunIcon.displayName = 'SunIcon';
return (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
  </svg>
  );
};

const MoonIcon = () => {
MoonIcon.displayName = 'MoonIcon';
return (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
  </svg>
  );
};

const Navbar = () => {
  const { toggleTheme, isDark } = useTheme();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const menuRef = useRef(null);
  const hamburgerRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location]);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  useEffect(() => {
    if (!mobileOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setMobileOpen(false);
        hamburgerRef.current?.focus();
      }
    };

    const handleClickOutside = (e) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target) &&
        hamburgerRef.current && !hamburgerRef.current.contains(e.target)
      ) {
        setMobileOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [mobileOpen]);

  useEffect(() => {
    if (mobileOpen && menuRef.current) {
      const firstLink = menuRef.current.querySelector('a');
      firstLink?.focus();
    }
  }, [mobileOpen]);

  const handleMenuKeyDown = (e) => {
    const focusable = menuRef.current?.querySelectorAll('a, button');
    if (!focusable || focusable.length < 2) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.key === 'Tab') {
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-sticky transition-[padding] duration-[var(--duration-base)] ease-out',
        scrolled ? 'py-2.5' : 'py-4',
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <nav
          className={cn(
            'relative flex items-center justify-between px-5 py-2.5 rounded-2xl',
              'transition-colors duration-150',
              scrolled
                ? 'bg-card/80 backdrop-blur-md border-border shadow-sm'
                : 'bg-transparent border-transparent shadow-none',
          )}
          aria-label="Main navigation"
        >
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 shrink-0 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
            aria-label="UnitedMess home"
          >
            <img
              src="/assets/icons/resize_logo.png"
              alt=""
              className="w-8 h-8 object-contain shrink-0"
              fetchPriority="high"
            />
            <span className="font-bold text-base tracking-tight text-foreground">
              United<span className="text-gradient">Mess</span>
            </span>
          </Link>

          <ul className="hidden md:flex items-center gap-0.5">
            {NAV_LINKS.map(({ label, href }) => {
              const isActive = location.pathname === href;
              return (
                <li key={href}>
                  <Link
                    to={href}
                    className={cn(
                      'relative px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-150',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      isActive
                        ? 'text-primary'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
                    )}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {label}
                    {isActive && (
                      <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-0.5 bg-primary rounded-full" />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="flex items-center gap-1.5">
            <button
              onClick={toggleTheme}
              aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
              className="touch-target flex items-center justify-center w-10 h-10 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="block transition-transform duration-[var(--duration-base)] motion-reduce:transition-none">
                {isDark ? <SunIcon /> : <MoonIcon />}
              </span>
            </button>

            <Link
              to="/login"
              className="hidden md:inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium text-foreground border border-border hover:bg-muted/50 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Sign In
            </Link>

            <Link
              to="/register"
              className="hidden md:inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              style={{ background: 'var(--gradient-primary)' }}
            >
              Get Started
            </Link>

            <button
              ref={hamburgerRef}
              onClick={() => setMobileOpen((o) => !o)}
              aria-expanded={mobileOpen}
              aria-controls="mobile-menu"
              aria-label="Toggle mobile menu"
              className="touch-target md:hidden flex items-center justify-center w-10 h-10 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                {mobileOpen
                  ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  : <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                }
              </svg>
            </button>
          </div>
        </nav>

        {mobileOpen && (
          <div
            id="mobile-menu"
            ref={menuRef}
            className="mt-2 rounded-xl overflow-hidden md:hidden bg-card border border-border shadow-lg animate-fade-in-up"
            onKeyDown={handleMenuKeyDown}
          >
            <div className="px-3 py-3 flex flex-col gap-1">
              {NAV_LINKS.map(({ label, href }) => {
                const isActive = location.pathname === href;
                return (
                  <Link
                    key={href}
                    to={href}
                    className={cn(
                      'px-4 py-2.5 min-h-[44px] rounded-lg text-sm font-medium transition-colors block',
                      isActive
                        ? 'text-primary bg-primary/10'
                        : 'text-muted-foreground hover:bg-muted/50',
                    )}
                  >
                    {label}
                  </Link>
                );
              })}
              <div className="flex flex-col gap-2 mt-2 pt-3 border-t border-border">
                <Link
                  to="/login"
                  className="px-4 py-2.5 rounded-lg text-sm font-semibold text-center border border-border hover:bg-muted/50 transition-colors text-foreground"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2.5 rounded-lg text-sm font-semibold text-center text-white transition-opacity shadow-sm"
                  style={{ background: 'var(--gradient-primary)' }}
                >
                  Get Started
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

Navbar.displayName = 'Navbar';
export default Navbar;
