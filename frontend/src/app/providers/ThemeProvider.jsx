import { createContext, useContext, useEffect, useSyncExternalStore } from 'react';
import { getTheme, subscribeTheme, startThemeSync, themeActions } from '@/core/theme/themeStore';

const ThemeContext = createContext(false);
const getServerTheme = () => 'light';

export function ThemeProvider({ children }) {
    useEffect(startThemeSync, []);

    // Only useTheme subscribers update; the provider and layout trees stay stable.
    return <ThemeContext.Provider value={true}>{children}</ThemeContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme() {
    const hasProvider = useContext(ThemeContext);
    const theme = useSyncExternalStore(subscribeTheme, getTheme, getServerTheme);

    if (!hasProvider) {
        throw new Error('[useTheme] must be used inside <ThemeProvider>.');
    }

    return {
        ...themeActions,
        theme,
        isDark: theme === 'dark',
        isLight: theme === 'light',
    };
}

export default ThemeProvider;
