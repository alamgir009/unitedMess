import { StrictMode } from 'react';
import html from '../../index.html?raw';
import { runInNewContext } from 'node:vm';
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ThemeProvider, { useTheme } from '@/app/providers/ThemeProvider';
import ThemeToggle from '@/shared/components/ui/ThemeToggle/ThemeToggle';
import { startThemeSync, themeActions } from '@/core/theme/themeStore';

let frames;
let frameId;

function paintFrame() {
    const pending = [...frames.values()];
    frames.clear();
    pending.forEach(callback => callback(performance.now()));
}

beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = 'light';
    document.documentElement.dataset.theme = 'light';
    document.documentElement.style.colorScheme = 'light';
    frames = new Map();
    frameId = 0;
    vi.stubGlobal('requestAnimationFrame', callback => {
        frames.set(++frameId, callback);
        return frameId;
    });
    vi.stubGlobal('cancelAnimationFrame', id => frames.delete(id));
});

afterEach(() => {
    cleanup();
    paintFrame();
    paintFrame();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    localStorage.clear();
});

describe('theme interaction performance regressions', () => {
    it('switches immediately without reading layout or computed styles', () => {
        const layout = vi.spyOn(document.documentElement, 'offsetHeight', 'get');
        const styles = vi.spyOn(window, 'getComputedStyle');
        themeActions.toggleTheme();
        expect(document.documentElement).toHaveClass('dark');
        expect(document.documentElement.dataset.theme).toBe('dark');
        expect(document.documentElement.style.colorScheme).toBe('dark');
        expect(layout).not.toHaveBeenCalled();
        expect(styles).not.toHaveBeenCalled();
    });

    it('handles multiple toggles within one React batch without stale state', () => {
        let actions;
        function Consumer() { actions = useTheme(); return <ThemeToggle />; }
        render(<ThemeProvider><Consumer /></ThemeProvider>);
        const toggle = actions.toggleTheme;
        act(() => {
            for (let i = 0; i < 21; i++) toggle();
        });
        expect(screen.getByRole('button', { name: 'Switch to light mode' })).toHaveAttribute('aria-pressed', 'true');
        expect(localStorage.getItem('um-theme')).toBe('dark');
        expect(actions.toggleTheme).toBe(toggle);
    });

    it('keeps suppression through the next paint and cancels obsolete cleanup on another click', () => {
        themeActions.toggleTheme();
        paintFrame();
        expect(document.documentElement).toHaveClass('no-transitions');
        themeActions.toggleTheme();
        expect(frames.size).toBe(1);
        paintFrame();
        expect(document.documentElement).toHaveClass('no-transitions');
        paintFrame();
        expect(document.documentElement).not.toHaveClass('no-transitions');
        expect(frames.size).toBe(0);
    });

    it('does not schedule more paint work when the requested theme is already applied', () => {
        themeActions.setTheme('light');
        themeActions.setTheme('invalid');
        expect(frames.size).toBe(0);
        expect(document.documentElement).not.toHaveClass('no-transitions');
    });

    it('supports keyboard switching and retains focus', async () => {
        const user = userEvent.setup();
        render(<ThemeProvider><ThemeToggle /></ThemeProvider>);
        const button = screen.getByRole('button', { name: 'Switch to dark mode' });
        await user.tab();
        await user.keyboard('{Enter}');
        expect(button).toHaveFocus();
        expect(button).toHaveAccessibleName('Switch to light mode');
        await user.keyboard(' ');
        expect(button).toHaveAccessibleName('Switch to dark mode');
    });

    it('honors an explicit choice even when storage writes fail, then restores system following on reset', () => {
        let systemIsDark = false;
        const media = new EventTarget();
        Object.defineProperty(media, 'matches', { get: () => systemIsDark });
        vi.spyOn(window, 'matchMedia').mockReturnValue(media);
        const stop = startThemeSync();
        try {
            vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
            themeActions.setTheme('light');
            systemIsDark = true;
            media.dispatchEvent(new Event('change'));
            expect(document.documentElement).toHaveClass('light');
            themeActions.resetTheme();
            expect(document.documentElement).toHaveClass('dark');
            systemIsDark = false;
            media.dispatchEvent(new Event('change'));
            expect(document.documentElement).toHaveClass('light');
        } finally {
            stop();
        }
    });

    it('cleans up synchronization listeners in StrictMode', () => {
        const { unmount } = render(<StrictMode><ThemeProvider><ThemeToggle /></ThemeProvider></StrictMode>);
        fireEvent(window, new StorageEvent('storage', { key: 'um-theme', newValue: 'dark' }));
        expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true');
        unmount();
        fireEvent(window, new StorageEvent('storage', { key: 'um-theme', newValue: 'light' }));
        expect(document.documentElement).toHaveClass('dark');
    });

    it('ignores sessionStorage events for the same key', () => {
        render(<ThemeProvider><ThemeToggle /></ThemeProvider>);
        fireEvent(window, new StorageEvent('storage', {
            key: 'um-theme', newValue: 'dark', storageArea: sessionStorage,
        }));
        expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'false');
    });
});

describe('theme before first paint', () => {
    const bootstrap = html.match(/<script>([\s\S]*?)<\/script>/)[1];

    it.each([
        ['dark', false, 'dark'],
        ['light', true, 'light'],
        [null, true, 'dark'],
        ['invalid', false, 'light'],
    ])('resolves stored=%s, system dark=%s to %s', (stored, dark, expected) => {
        runInNewContext(bootstrap, {
            document,
            localStorage: { getItem: () => stored },
            window: { matchMedia: () => ({ matches: dark }) },
        });
        expect(document.documentElement.dataset.theme).toBe(expected);
        expect(document.documentElement.style.colorScheme).toBe(expected);
    });

    it('uses the system theme when accessing storage throws', () => {
        runInNewContext(bootstrap, {
            document,
            localStorage: { getItem: () => { throw new Error('blocked'); } },
            window: { matchMedia: () => ({ matches: true }) },
        });
        expect(document.documentElement).toHaveClass('dark');
    });
});
