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

/** Applies theme to <html> without triggering reflow — fastest DOM path */
function applyThemeToDOM(theme) {
    const root = document.documentElement;
    root.classList.remove(THEMES.LIGHT, THEMES.DARK);
    root.classList.add(theme);
    // Also set color-scheme for native UI elements (scrollbars, inputs, etc.)
    root.style.colorScheme = theme;
}

// ─── Provider ─────────────────────────────────────────────────────────────────
export function ThemeProvider({ children }) {
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

    /** Toggle between light and dark — stable reference, never re-created */
    const toggleTheme = useCallback(() => {
        setTheme((prev) => {
            const next = prev === THEMES.DARK ? THEMES.LIGHT : THEMES.DARK;
            try {
                localStorage.setItem(STORAGE_KEY, next);
                hasUserPreference.current = true;
            } catch {
                // Silently ignore write failures (storage quota, private mode)
            }
            return next;
        });
    }, []);

    /** Explicitly set a theme (e.g. from a settings dropdown) */
    const setThemeExplicit = useCallback((newTheme) => {
        if (newTheme !== THEMES.LIGHT && newTheme !== THEMES.DARK) return;
        try {
            localStorage.setItem(STORAGE_KEY, newTheme);
            hasUserPreference.current = true;
        } catch {
            // Silently ignore
        }
        setTheme(newTheme);
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