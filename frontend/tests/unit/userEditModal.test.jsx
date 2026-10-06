import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

vi.mock('@/modules/members/services/members.service', () => ({
  default: {
    getInvoiceExemptionStatus: vi.fn(),
    updateInvoiceExemption: vi.fn(),
  },
}));

vi.mock('@/modules/members/store/members.slice', () => ({
  fetchUsers: vi.fn(() => ({ type: 'users/fetchUsers' })),
}));

import membersService from '@/modules/members/services/members.service';
import UserEditModal from '@/modules/dashboard/components/MembersTable/UserEditModal';

const store = configureStore({ reducer: { noop: (state = {}) => state } });

const baseUser = {
  _id: '507f1f77bcf86cd799439011',
  name: 'Aman Verma',
  email: 'aman@example.com',
  phone: '9999999999',
  role: 'user',
  userStatus: 'approved',
  isActive: true,
  payment: 'success',
  gasBill: 'success',
  createdAt: '2026-01-15T00:00:00.000Z',
};

const openInvoice = {
  data: {
    exists: true,
    invoiceId: 'inv_1',
    override: 'none',
    isExempt: false,
    exemptSource: null,
    exemptReason: null,
    isFinalized: false,
    paidAmount: 0,
  },
};

const renderModal = async (userOverrides = {}) => {
  const onClose = vi.fn();
  render(
    <Provider store={store}>
      <UserEditModal isOpen onClose={onClose} user={{ ...baseUser, ...userOverrides }} />
    </Provider>
  );
  // Flush loadExemption() inside act() so the mocked promise settling does not
  // warn about a state update outside act().
  await act(async () => {});
  return { onClose };
};

beforeEach(() => {
  vi.clearAllMocks();
  membersService.getInvoiceExemptionStatus.mockResolvedValue({ ...openInvoice });
});

describe('UserEditModal — layout contract', () => {
  it('renders the Billing Exemption card ABOVE the Identity form section', async () => {
    await renderModal();

    const dialog = screen.getByRole('dialog');
    const inDomOrder = Array.from(dialog.querySelectorAll('*'));
    const exemptionIndex = inDomOrder.indexOf(screen.getByRole('heading', { name: 'Billing exemption' }));
    const identityIndex = inDomOrder.indexOf(screen.getByText('Identity'));

    expect(exemptionIndex).toBeGreaterThan(-1);
    expect(identityIndex).toBeGreaterThan(-1);
    expect(exemptionIndex).toBeLessThan(identityIndex);
  });

  it('uses the wide desktop dialog instead of the old 576px cap', async () => {
    await renderModal();
    expect(screen.getByRole('dialog').className).toContain('max-w-2xl');
  });

  it('drops the fixed sidebar and uses single-column→2-column field grids', async () => {
    await renderModal();
    const dialog = screen.getByRole('dialog');
    expect(dialog.querySelector('.w-56')).toBeNull();
    expect(dialog.innerHTML).toContain('grid-cols-1');
    expect(dialog.innerHTML).toContain('sm:grid-cols-2');
  });

  it('shows the member status as a success badge when approved', async () => {
    renderModal({ userStatus: 'approved' });
    const [badge] = screen.getAllByText('Approved');
    expect(badge).toHaveClass('bg-success-bg');
  });

  it('shows the member status as a warning badge when pending', async () => {
    renderModal({ userStatus: 'pending' });
    const [badge] = screen.getAllByText('Pending');
    expect(badge).toHaveClass('bg-warning-bg');
  });

  it('shows the member status as an error badge when denied', async () => {
    renderModal({ userStatus: 'denied' });
    const [badge] = screen.getAllByText('Denied');
    expect(badge).toHaveClass('bg-danger-bg');
  });
});

describe('UserEditModal — Save Exemption enablement', () => {
  it('is disabled while nothing has changed', async () => {
    await renderModal();

    const save = await screen.findByRole('button', { name: 'Save Exemption' });
    expect(save).toBeDisabled();
  });

  it('stays disabled until an Exempt reason of at least 5 characters is typed', async () => {
    await renderModal();

    fireEvent.click(await screen.findByRole('radio', { name: 'Exempt' }));
    expect(screen.getByPlaceholderText('Why is this member exempt for this period?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save Exemption' })).toBeDisabled();

    fireEvent.change(
      screen.getByPlaceholderText('Why is this member exempt for this period?'),
      { target: { value: 'Med' } },
    );
    expect(screen.getByRole('button', { name: 'Save Exemption' })).toBeDisabled();

    fireEvent.change(
      screen.getByPlaceholderText('Why is this member exempt for this period?'),
      { target: { value: 'Medical leave' } },
    );
    expect(screen.getByRole('button', { name: 'Save Exemption' })).toBeEnabled();
  });

  it('becomes disabled again once the control is back to its saved state', async () => {
    await renderModal();

    fireEvent.click(await screen.findByRole('radio', { name: 'Exempt' }));
    fireEvent.change(
      screen.getByPlaceholderText('Why is this member exempt for this period?'),
      { target: { value: 'Medical leave' } },
    );
    expect(screen.getByRole('button', { name: 'Save Exemption' })).toBeEnabled();

    fireEvent.click(screen.getByRole('radio', { name: 'Auto' }));
    expect(screen.queryByPlaceholderText('Why is this member exempt for this period?')).toBeNull();
    expect(screen.getByRole('button', { name: 'Save Exemption' })).toBeDisabled();
  });

  it('sends the invoice id plus the override and reason to the backend', async () => {
    membersService.updateInvoiceExemption.mockResolvedValue({ data: {} });
    const { onClose } = await renderModal();

    fireEvent.click(await screen.findByRole('radio', { name: 'Exempt' }));
    fireEvent.change(
      screen.getByPlaceholderText('Why is this member exempt for this period?'),
      { target: { value: 'Medical leave' } },
    );
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save Exemption' }));
    });

    expect(membersService.updateInvoiceExemption).toHaveBeenCalledTimes(1);
    expect(membersService.updateInvoiceExemption).toHaveBeenCalledWith('inv_1', {
      override: 'force_exempt',
      reason: 'Medical leave',
    });
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe('UserEditModal — payment guard', () => {
  it('locks the Exempt segment when money is already recorded', async () => {
    membersService.getInvoiceExemptionStatus.mockResolvedValue({
      data: { ...openInvoice.data, invoiceId: 'inv_2', paidAmount: 500 },
    });
    await renderModal();

    const exempt = await screen.findByRole('radio', { name: 'Exempt' });
    expect(exempt).toBeDisabled();
    expect(exempt.getAttribute('title')).toMatch(/refund/i);
    expect(screen.getByRole('radio', { name: 'Auto' })).toBeEnabled();
    expect(screen.getByRole('radio', { name: 'Bill anyway' })).toBeEnabled();
  });

  it('does not lock Exempt when the bill has no payment recorded', async () => {
    await renderModal();

    expect(await screen.findByRole('radio', { name: 'Exempt' })).toBeEnabled();
  });
});

describe('UserEditModal — unsaved-changes guard', () => {
  it('swaps the footer into an inline confirm row instead of closing', async () => {
    const { onClose } = await renderModal();

    fireEvent.change(screen.getByDisplayValue('Aman Verma'), {
      target: { value: 'Aman Verma II' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Keep editing' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Discard' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes straight from Cancel when nothing changed', async () => {
    const { onClose } = await renderModal();

    fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
