import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ThemeProvider from '@/app/providers/ThemeProvider';
import ThemeToggle from '@/shared/components/ui/ThemeToggle/ThemeToggle';
import Form from '@/shared/components/ui/Form/Form';
import Input from '@/shared/components/ui/Input/Input';
import Modal from '@/shared/components/ui/Modal/Modal';
import IconSelect from '@/shared/components/ui/IconSelect/IconSelect';
import { themeActions } from '@/core/theme/themeStore';

afterEach(() => {
    localStorage.clear();
    document.documentElement.className = 'light';
    document.documentElement.dataset.theme = 'light';
    vi.restoreAllMocks();
});

describe('theme switching', () => {
    it('updates only subscribers, persists rapid toggles, and releases suppression', async () => {
        let renders = 0;
        function Content() { renders++; return <p>Stable content</p>; }
        render(<ThemeProvider><ThemeToggle /><Content /></ThemeProvider>);
        const before = renders;
        for (let i = 0; i < 10; i++) fireEvent.click(screen.getByRole('button'));
        expect(renders).toBe(before);
        expect(document.documentElement.dataset.theme).toBe('light');
        expect(localStorage.getItem('um-theme')).toBe('light');
        await waitFor(() => expect(document.documentElement).not.toHaveClass('no-transitions'));
    });

    it('syncs valid preferences and storage.clear across tabs', () => {
        render(<ThemeProvider><ThemeToggle /></ThemeProvider>);
        fireEvent(window, new StorageEvent('storage', { key: 'um-theme', newValue: 'dark' }));
        expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true');
        fireEvent(window, new StorageEvent('storage', { key: null }));
        expect(document.documentElement.style.colorScheme).toBe('light');
    });

    it('keeps switching when persistence is unavailable', () => {
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
        expect(() => themeActions.setTheme('dark')).not.toThrow();
        expect(document.documentElement).toHaveClass('dark');
    });
});

describe('form accessibility', () => {
    it('shows native constraint errors on blur and clears them on change', () => {
        render(<Form><label>Email<input type="email" required /></label></Form>);
        const field = screen.getByRole('textbox', { name: 'Email' });
        expect(field).not.toHaveAttribute('aria-invalid');
        fireEvent.blur(field);
        expect(field).toHaveAttribute('aria-invalid', 'true');
        const feedbackId = field.getAttribute('aria-describedby');
        expect(document.getElementById(feedbackId)).toBeVisible();
        fireEvent.change(field, { target: { value: 'member@example.com' } });
        expect(field).toHaveAttribute('aria-invalid', 'false');
        expect(document.getElementById(feedbackId)).not.toBeVisible();
    });

    it('keeps generated field IDs and described messages stable on rerender', () => {
        const { rerender } = render(<Input label="Amount" error="Required" aria-describedby="details" />);
        const field = screen.getByRole('textbox');
        const id = field.id;
        expect(field).toHaveAttribute('aria-describedby', `details ${id}-error`);
        rerender(<Input label="Amount" success="Saved" aria-describedby="details" />);
        expect(field.id).toBe(id);
        expect(field).toHaveAttribute('aria-describedby', `details ${id}-success`);
    });

    it('links dynamically added labels with unique field IDs', async () => {
        const { rerender } = render(<Form><div><label>First</label><input /></div></Form>);
        const firstId = screen.getByRole('textbox', { name: 'First' }).id;
        rerender(<Form><div><label>First</label><input /></div><div><label>Second</label><input /></div></Form>);
        await waitFor(() => expect(screen.getByRole('textbox', { name: 'Second' }).id).not.toBe(firstId));
    });
});

describe('dialog focus', () => {
    it('autofocuses the first enabled field and traps Tab around enabled controls', async () => {
        render(<Modal isOpen title="Edit" onClose={vi.fn()} footer={<button>Save</button>}>
            <input disabled aria-label="Disabled" /><input aria-label="Name" />
        </Modal>);
        const name = screen.getByRole('textbox', { name: 'Name' });
        await waitFor(() => expect(name).toHaveFocus());
        screen.getByRole('button', { name: 'Save' }).focus();
        fireEvent.keyDown(document, { key: 'Tab' });
        expect(screen.getByRole('button', { name: 'Close dialog' })).toHaveFocus();
    });

    it('preserves field focus during a parent rerender and restores the opener on close', async () => {
        const opener = document.createElement('button');
        document.body.append(opener);
        opener.focus();
        const { rerender, unmount } = render(<Modal isOpen title="Edit" onClose={() => {}}><input aria-label="Name" /></Modal>);
        await waitFor(() => expect(screen.getByRole('textbox')).toHaveFocus());
        rerender(<Modal isOpen title="Edit" onClose={() => {}}><input aria-label="Name" /></Modal>);
        expect(screen.getByRole('textbox')).toHaveFocus();
        unmount();
        expect(opener).toHaveFocus();
        opener.remove();
    });

    it('uses unique labels when dialogs are nested and only closes the top dialog', () => {
        const outerClose = vi.fn(), innerClose = vi.fn();
        render(<><Modal isOpen title="Outer" onClose={outerClose}><p>Outer body</p></Modal><Modal isOpen title="Inner" onClose={innerClose}><p>Inner body</p></Modal></>);
        const dialogs = screen.getAllByRole('dialog');
        expect(dialogs[0].getAttribute('aria-labelledby')).not.toBe(dialogs[1].getAttribute('aria-labelledby'));
        fireEvent.keyDown(document, { key: 'Escape' });
        expect(innerClose).toHaveBeenCalledOnce();
        expect(outerClose).not.toHaveBeenCalled();
    });

    it('retains the page scroll lock when a select closes inside a dialog', () => {
        const { unmount } = render(<Modal isOpen title="Edit" onClose={vi.fn()}>
            <IconSelect name="month" value="1" options={[{ value: '1', label: 'January' }]} onChange={vi.fn()} />
        </Modal>);
        fireEvent.click(screen.getByRole('button', { name: 'January' }));
        fireEvent.keyDown(document, { key: 'Escape' });
        expect(document.body.style.overflow).toBe('hidden');
        unmount();
        expect(document.body.style.overflow).toBe('');
    });
});
