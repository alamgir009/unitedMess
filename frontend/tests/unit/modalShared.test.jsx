import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import Modal from '@/shared/components/ui/Modal/Modal';
import IconSelect from '@/shared/components/ui/IconSelect/IconSelect';

/**
 * Two shared-component regressions fixed in Phase 0:
 *
 * 1. isLoading used to unmount the ENTIRE dialog (title, close button and the
 *    Cancel escape hatch all vanished, and scroll jumped back to the top on a
 *    failed save). Only the body region may swap to a spinner.
 * 2. Modal and IconSelect both listen for Escape on `document`. Without a
 *    guard, one Esc dismissed the dropdown AND the modal behind it.
 */

const options = [
  { value: '1', label: 'January' },
  { value: '2', label: 'February' },
];

describe('Modal — isLoading keeps the chrome mounted', () => {
  it('keeps the title and footer while only the body is replaced', () => {
    render(
      <Modal
        isOpen
        onClose={vi.fn()}
        title="Edit Member"
        isLoading
        footer={<button type="button">Save Changes</button>}
      >
        <p>Body content</p>
      </Modal>
    );

    expect(screen.getByRole('heading', { name: 'Edit Member' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save Changes' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Close dialog' })).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryByText('Body content')).toBeNull();
  });

  it('announces the loading body politely to assistive tech', () => {
    render(
      <Modal isOpen onClose={vi.fn()} title="Edit Member" isLoading>
        <p>Body content</p>
      </Modal>
    );

    // Spinner itself carries role="status"; the wrapper owns the live region.
    const statuses = screen.getAllByRole('status');
    const liveRegion = statuses.find((el) => el.getAttribute('aria-live') === 'polite');
    expect(liveRegion).toBeTruthy();
    expect(liveRegion.textContent).toBe('');
  });

  it('renders children and no status region when not loading', () => {
    render(
      <Modal isOpen onClose={vi.fn()} title="Edit Member" footer={<button type="button">Save</button>}>
        <p>Body content</p>
      </Modal>
    );

    expect(screen.getByText('Body content')).toBeInTheDocument();
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.getByRole('dialog')).not.toHaveAttribute('aria-busy');
  });
});

describe('Modal — Escape defers to a portaled layer', () => {
  it('closes on Escape when no dropdown layer is open', () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen onClose={onClose} title="Edit Member">
        <p>Body</p>
      </Modal>
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does NOT close while a listbox is mounted, then closes on the next Escape', () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen onClose={onClose} title="Edit Member">
        <p>Body</p>
      </Modal>
    );

    const listbox = document.createElement('div');
    listbox.setAttribute('role', 'listbox');
    document.body.appendChild(listbox);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();

    document.body.removeChild(listbox);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does NOT close while a menu layer is mounted', () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen onClose={onClose} title="Edit Member">
        <p>Body</p>
      </Modal>
    );

    const menu = document.createElement('div');
    menu.setAttribute('role', 'menu');
    document.body.appendChild(menu);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();

    document.body.removeChild(menu);
  });

  it('real IconSelect: first Escape closes the listbox only, second closes the modal', () => {
    const onClose = vi.fn();
    const onChange = vi.fn();
    render(
      <Modal isOpen onClose={onClose} title="Edit Member">
        <IconSelect name="month" value="1" onChange={onChange} options={options} />
      </Modal>
    );

    fireEvent.click(screen.getByRole('button', { name: /January/ }));
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
