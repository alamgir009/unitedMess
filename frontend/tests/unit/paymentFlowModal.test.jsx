import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../../src/modules/payment/services/payment.service', () => ({
  default: {
    getPayableMonths: vi.fn(),
    getUpiConfig: vi.fn(),
    submitUpiManual: vi.fn(),
    updateUpiConfig: vi.fn(),
    uploadQrCode: vi.fn(),
  },
}));

import paymentService from '../../src/modules/payment/services/payment.service';
import PaymentFlowModal from '../../src/modules/payment/components/PaymentFlowModal/PaymentFlowModal';

const MONTHS = [
  { monthName: 'June 2026', month: 6, year: 2026, totalPayable: 3000, paidAmount: 3000, remainingAmount: 0, status: 'PAID' },
  { monthName: 'July 2026', month: 7, year: 2026, totalPayable: 3000, paidAmount: 1500, remainingAmount: 1500, status: 'PARTIALLY_PAID' },
  { monthName: 'August 2026', month: 8, year: 2026, totalPayable: 3000, paidAmount: 0, remainingAmount: 3000, status: 'UNPAID' },
  { monthName: 'September 2026', month: 9, year: 2026, totalPayable: 3000, paidAmount: 0, remainingAmount: 3000, status: 'PENDING_VERIFICATION' },
];

const UPI_CONFIG = { upiId: 'unitedmess@upi', merchantName: 'United Mess', qrCodeUrl: '' };

const renderModal = (props = {}) =>
  render(
    <PaymentFlowModal
      isOpen
      onClose={vi.fn()}
      isAdmin={false}
      activeInvoiceMonth="July 2026"
      onRazorpayPay={vi.fn()}
      onSuccess={vi.fn()}
      {...props}
    />
  );

beforeEach(() => {
  vi.clearAllMocks();
  paymentService.getPayableMonths.mockResolvedValue({ success: true, data: MONTHS });
  paymentService.getUpiConfig.mockResolvedValue({ success: true, data: UPI_CONFIG });
  paymentService.submitUpiManual.mockResolvedValue({ success: true, data: {} });
});

/* Flush in-flight mocked requests so their state updates land inside act(). */
afterEach(async () => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
});

describe('PaymentFlowModal — 2-step flow', () => {
  it('renders exactly two steps (Method → Pay)', async () => {
    renderModal();
    const indicator = await screen.findByRole('progressbar');
    expect(indicator).toHaveAttribute('aria-valuemax', '2');
    expect(indicator).toHaveAttribute('aria-valuenow', '1');
    expect(within(indicator).getByText('Method')).toBeInTheDocument();
    expect(within(indicator).getByText('Pay')).toBeInTheDocument();
  });

  it('shows both payment options (Razorpay + UPI) on the first step', async () => {
    renderModal();
    expect(await screen.findByText('Secure Online Pay')).toBeInTheDocument();
    expect(screen.getByText('Direct Manual UPI')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /direct manual upi/i })).toHaveAttribute('aria-checked', 'true');
  });

  it('auto-selects payable months only — partial month contributes its remaining amount', async () => {
    renderModal();
    const list = await screen.findByRole('list', { name: /bills included/i });

    expect(within(list).getByText('July 2026')).toBeInTheDocument();
    expect(within(list).getByText('August 2026')).toBeInTheDocument();
    expect(within(list).queryByText('June 2026')).not.toBeInTheDocument();
    expect(within(list).queryByText('September 2026')).not.toBeInTheDocument();

    // July is partially paid: ₹1500 of ₹3000 → total = 1500 + 3000, no carry-forward of the paid ₹1500
    expect(within(list).getByText('₹1,500 remaining')).toBeInTheDocument();
    expect(screen.getByText('₹4,500')).toBeInTheDocument();

    expect(screen.getByText(/Not included: June 2026 \(paid\), September 2026 \(under review\)/)).toBeInTheDocument();
  });

  it('generic flow hides partial months entirely (no row, no contribution to total)', async () => {
    renderModal({ activeInvoiceMonth: 'October 2026' });
    const list = await screen.findByRole('list', { name: /bills included/i });

    // Only the fully-unpaid month is offered
    expect(within(list).queryByText('July 2026')).not.toBeInTheDocument();
    expect(within(list).getByText('August 2026')).toBeInTheDocument();
    expect(within(list).queryByText('₹1,500 remaining')).not.toBeInTheDocument();

    // Total = August only — the partial's ₹1,500 remaining is NOT charged
    expect(screen.getByText('₹3,000')).toBeInTheDocument();

    // The partial surfaces under "Not included" with an honest tag
    expect(
      screen.getByText(/Not included: June 2026 \(paid\), July 2026 \(partial\), September 2026 \(under review\)/)
    ).toBeInTheDocument();
  });

  it('empty state does not claim everything is paid when a partial balance remains', async () => {
    paymentService.getPayableMonths.mockResolvedValue({
      success: true,
      data: [MONTHS[0], MONTHS[1]], // June (paid) + July (partial)
    });
    renderModal({ activeInvoiceMonth: 'October 2026' });

    expect(await screen.findByText('No pending bills')).toBeInTheDocument();
    expect(screen.getByText('Partial balances are collected by the administrator.')).toBeInTheDocument();
    expect(screen.queryByText('All your bills are paid up to date.')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /continue/i })).not.toBeInTheDocument();
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  });

  it('back button returns from the Pay step to the Method step', async () => {
    const user = userEvent.setup();
    renderModal();

    await user.click(await screen.findByRole('button', { name: /continue/i }));
    expect(await screen.findByText('How to pay via UPI')).toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: /secure online pay/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /back to methods/i }));

    expect(await screen.findByText('Choose Payment Method')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /secure online pay/i })).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
  });

  it('switches to the Razorpay breakdown when Secure Online Pay is chosen', async () => {
    const user = userEvent.setup();
    renderModal();

    await user.click(await screen.findByRole('radio', { name: /secure online pay/i }));
    await user.click(screen.getByRole('button', { name: /continue/i }));

    expect(await screen.findByText('Razorpay Secure Gate')).toBeInTheDocument();
    expect(screen.getByText('Gateway Charge (2%)')).toBeInTheDocument();
    // 4500 + 2% (90) + 18% GST on fee (16.2) — matches backend calculation
    expect(screen.getByRole('button', { name: /pay ₹4,606\.2/i })).toBeInTheDocument();
  });

  it('never flashes the empty state while bills are loading', async () => {
    paymentService.getPayableMonths.mockReturnValue(new Promise(() => {}));
    renderModal();

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.queryByText('No pending bills')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /continue/i })).not.toBeInTheDocument();
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  });

  it('shows the empty state when nothing is payable and hides Continue', async () => {
    paymentService.getPayableMonths.mockResolvedValue({
      success: true,
      data: [MONTHS[0], MONTHS[3]],
    });
    renderModal();

    expect(await screen.findByText('No pending bills')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /continue/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  });

  it('offers a retry when loading bills fails instead of claiming everything is paid', async () => {
    paymentService.getPayableMonths.mockRejectedValue(new Error('network down'));
    renderModal();

    expect(await screen.findByText("Couldn't load pending bills")).toBeInTheDocument();
    expect(screen.queryByText('No pending bills')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('gas bill keeps the same 2 steps without a month list', async () => {
    renderModal({ paymentType: 'gas_bill', gasBillAmount: 1200, activeInvoiceMonth: 'July 2026' });

    expect(await screen.findByText('Secure Online Pay')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuemax', '2');
    expect(screen.queryByRole('list', { name: /bills included/i })).not.toBeInTheDocument();
    expect(screen.getByText('₹1,200')).toBeInTheDocument();
    expect(paymentService.getPayableMonths).not.toHaveBeenCalled();
  });

  it('submits a valid 12-digit UTR and shows the success step', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    renderModal({ onSuccess });

    await user.click(await screen.findByRole('button', { name: /continue/i }));
    const input = await screen.findByPlaceholderText('e.g. 123456789012');

    await user.type(input, '123');
    expect(screen.getByRole('button', { name: /submit reference/i })).toBeDisabled();

    await user.type(input, '456789012');
    await user.click(screen.getByRole('button', { name: /submit reference/i }));

    expect(await screen.findByText('Reference Submitted!')).toBeInTheDocument();
    expect(paymentService.submitUpiManual).toHaveBeenCalledWith(
      expect.objectContaining({ transactionId: '123456789012', months: ['July 2026', 'August 2026'], type: 'mess_bill' })
    );
    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
  });
});
