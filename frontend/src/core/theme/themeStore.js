const STORAGE_KEY = 'um-theme';
const THEMES = Object.freeze({ LIGHT: 'light', DARK: 'dark' });
const listeners = new Set();
let releaseFrame;
let paintFrame;
let explicitPreference = false;

const validTheme = (value) => value === 'light' || value === 'dark';
const systemTheme = () => window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

export const getTheme = () => typeof document === 'undefined' ? 'light'
    : document.documentElement.classList.contains('dark') ? 'dark' : 'light';

export function subscribeTheme(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

function applyTheme(theme) {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    const changed = getTheme() !== theme;
    if (!changed && root.dataset.theme === theme && root.style.colorScheme === theme) return;
    cancelAnimationFrame(paintFrame);
    cancelAnimationFrame(releaseFrame);
    root.classList.add('no-transitions');
    root.classList.toggle('dark', theme === 'dark');
    root.classList.toggle('light', theme === 'light');
    root.dataset.theme = theme;
    root.style.colorScheme = theme;
    if (changed) listeners.forEach(listener => listener());
    // Suppress through the first painted frame without a synchronous layout read.
    paintFrame = requestAnimationFrame(() => {
        releaseFrame = requestAnimationFrame(() => root.classList.remove('no-transitions'));
    });
}

function setTheme(theme) {
    if (!validTheme(theme)) return;
    explicitPreference = true;
    applyTheme(theme);
    try { localStorage.setItem(STORAGE_KEY, theme); } catch { /* Storage may be blocked. */ }
}

export const themeActions = Object.freeze({
    THEMES,
    setTheme,
    toggleTheme: () => setTheme(getTheme() === 'dark' ? 'light' : 'dark'),
    resetTheme: () => {
        explicitPreference = false;
        try { localStorage.removeItem(STORAGE_KEY); } catch { /* Storage may be blocked. */ }
        applyTheme(systemTheme());
    },
});

export function startThemeSync() {
    if (typeof window === 'undefined') return;
    let stored;
    try { stored = localStorage.getItem(STORAGE_KEY); } catch { /* Storage may be blocked. */ }
    explicitPreference = validTheme(stored);
    const initial = explicitPreference ? stored : systemTheme();
    applyTheme(initial);
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onSystem = () => { if (!explicitPreference) applyTheme(systemTheme()); };
    const onStorage = (event) => {
        if (event.key !== STORAGE_KEY && event.key !== null) return;
        if (event.storageArea && event.storageArea !== window.localStorage) return;
        explicitPreference = validTheme(event.newValue);
        applyTheme(explicitPreference ? event.newValue : systemTheme());
    };
    media.addEventListener('change', onSystem);
    window.addEventListener('storage', onStorage);
    return () => {
        media.removeEventListener('change', onSystem);
        window.removeEventListener('storage', onStorage);
    };
}
