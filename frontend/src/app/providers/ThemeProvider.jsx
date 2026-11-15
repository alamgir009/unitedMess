import {
    createContext,
    useContext,
    useEffect,
    useState,
    useCallback,
    useMemo,
    useRef,
} from "react";

// ─── Constants ────────────────────────────────────────────────────────────────
const STORAGE_KEY = "um-theme";
const THEMES = Object.freeze({ LIGHT: "light", DARK: "dark" });

// ─── Context ──────────────────────────────────────────────────────────────────
const ThemeContext = createContext(null);

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Reads stored preference — runs once, outside component to avoid closure cost */
function getStoredTheme() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored === THEMES.LIGHT || stored === THEMES.DARK) return stored;
    } catch {
        // localStorage blocked (e.g. private mode, SecurityError) — fail gracefully
    }
    return null;
}

/** Resolves system preference via matchMedia */
function getSystemTheme() {
    if (typeof window === "undefined") return THEMES.LIGHT;
    return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? THEMES.DARK
        : THEMES.LIGHT;
}

/** Single source of truth for initial theme — called once by useState initializer */
function getInitialTheme() {
    return getStoredTheme() ?? getSystemTheme();
}

/** Applies theme to <html> with instant style recalculation and zero transition jank */
function applyThemeToDOM(theme, withTransitionSuppression = true) {
    if (typeof document === "undefined") return;
    const root = document.documentElement;

    if (withTransitionSuppression) {
        root.classList.add("no-theme-transitions");
    }

    root.classList.remove(THEMES.LIGHT, THEMES.DARK);
    root.classList.add(theme);
    // Also set color-scheme for native UI elements (scrollbars, inputs, etc.)
    root.style.colorScheme = theme;

    if (withTransitionSuppression) {
        // Force synchronous style flush so theme applies in a single frame
        void root.offsetHeight;
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                root.classList.remove("no-theme-transitions");
            });
        });
    }
}

// ─── Provider ─────────────────────────────────────────────────────────────────
export function ThemeProvider({ children }) {
ThemeProvider.displayName = 'ThemeProvider';
    const [theme, setTheme] = useState(getInitialTheme);

    // Track whether user has set an explicit preference — ref avoids extra renders
    const hasUserPreference = useRef(Boolean(getStoredTheme()));

    // Apply theme to DOM synchronously-ish on every theme change
    useEffect(() => {
        applyThemeToDOM(theme);
    }, [theme]);

    // Listen for OS-level theme changes — only honour them when user hasn't overridden
    useEffect(() => {
        if (typeof window === "undefined") return;

        const media = window.matchMedia("(prefers-color-scheme: dark)");

        const handleSystemChange = (e) => {
            // Respect user preference — don't overwrite it with system change
            if (hasUserPreference.current) return;
            setTheme(e.matches ? THEMES.DARK : THEMES.LIGHT);
        };

        media.addEventListener("change", handleSystemChange);
        return () => media.removeEventListener("change", handleSystemChange);
    }, []);

    // Sync theme across browser tabs / windows
    useEffect(() => {
        const handleStorageSync = (e) => {
            if (e.key !== STORAGE_KEY) return;
            if (e.newValue === THEMES.LIGHT || e.newValue === THEMES.DARK) {
                hasUserPreference.current = true;
                setTheme(e.newValue);
            } else if (e.newValue === null) {
                // Preference was cleared in another tab — fall back to system
                hasUserPreference.current = false;
                setTheme(getSystemTheme());
            }
        };

        window.addEventListener("storage", handleStorageSync);
        return () => window.removeEventListener("storage", handleStorageSync);
    }, []);

    /** Toggle between light and dark — 60fps ultra smooth & fast */
    const toggleTheme = useCallback(() => {
        const next = theme === THEMES.DARK ? THEMES.LIGHT : THEMES.DARK;

        const prefersReducedMotion =
            typeof window !== "undefined" &&
            window.matchMedia("(prefers-reduced-motion: reduce)").matches;

        if (typeof document !== "undefined" && "startViewTransition" in document && !prefersReducedMotion) {
            document.startViewTransition(() => {
                applyThemeToDOM(next, false);
                setTheme(next);
            });
        } else {
            applyThemeToDOM(next, true);
            setTheme(next);
        }

        try {
            localStorage.setItem(STORAGE_KEY, next);
            hasUserPreference.current = true;
        } catch {
            // Silently ignore write failures (storage quota, private mode)
        }
    }, [theme]);

    /** Explicitly set a theme (e.g. from a settings dropdown) */
    const setThemeExplicit = useCallback((newTheme) => {
        if (newTheme !== THEMES.LIGHT && newTheme !== THEMES.DARK) return;

        const prefersReducedMotion =
            typeof window !== "undefined" &&
            window.matchMedia("(prefers-reduced-motion: reduce)").matches;

        if (typeof document !== "undefined" && "startViewTransition" in document && !prefersReducedMotion) {
            document.startViewTransition(() => {
                applyThemeToDOM(newTheme, false);
                setTheme(newTheme);
            });
        } else {
            applyThemeToDOM(newTheme, true);
            setTheme(newTheme);
        }

        try {
            localStorage.setItem(STORAGE_KEY, newTheme);
            hasUserPreference.current = true;
        } catch {
            // Silently ignore
        }
    }, []);

    /** Clear user preference and revert to system theme */
    const resetTheme = useCallback(() => {
        try {
            localStorage.removeItem(STORAGE_KEY);
            hasUserPreference.current = false;
        } catch {
            // Silently ignore
        }
        setTheme(getSystemTheme());
    }, []);

    // Memoized context value — only re-computes when theme changes
    // toggleTheme / setThemeExplicit / resetTheme are stable (useCallback) so excluded from deps
    const value = useMemo(
        () => ({
            theme,
            isDark: theme === THEMES.DARK,
            isLight: theme === THEMES.LIGHT,
            toggleTheme,
            setTheme: setThemeExplicit,
            resetTheme,
            THEMES,
        }),
        [theme, toggleTheme, setThemeExplicit, resetTheme]
    );

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
// eslint-disable-next-line react-refresh/only-export-components
export function useTheme() {
    const ctx = useContext(ThemeContext);
    if (ctx === null) {
        throw new Error(
            "[useTheme] must be used inside <ThemeProvider>. " +
            "Wrap your app: <ThemeProvider><App /></ThemeProvider>"
        );
    }
    return ctx;
}

export default ThemeProvider;