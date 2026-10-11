/**
 * Invoice refund-details rows — preview components must mirror the PDF.
 *
 * Contract (pdf.service.js REFUND DETAILS):
 *  - Method row always present, labelled via METHOD_LABELS ("Cash", …);
 *  - Reference row appears ONLY for gateway payouts (real txn id) —
 *    cash refunds have none. Regression: the preview used to print the
 *    raw Mongo _id ("6acba14a…") as "Reference" for every cash refund.
 */
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';

/* jsdom has no matchMedia — both components use useMediaQuery. */
beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

vi.mock('../../src/modules/payment/services/invoice.service', () => ({
  default: {
    downloadInvoice: vi.fn(),
    sendInvoiceEmail: vi.fn(),
    emailAllInvoices: vi.fn(),
  },
}));

import InvoicePreview from '../../src/modules/payment/components/InvoicePreview/InvoicePreview';
import MessBillInvoice from '../../src/modules/payment/components/MessBillInvoice/MessBillInvoice';

/* Nayan's real September 2026 shape (panel cash refund). */
const cashRefundInvoice = {
  _id: '6acba14a636dbb642e5b3acb',
  user: 'u1',
  month: 9,
  year: 2026,
  monthName: 'September 2026',
  status: 'refunded',
  totalPayable: -231.84,
  paidAmount: 0,
  mealCount: 20,
  messCost: 1071.16,
  mealRate: 53.56,
  marketAmountSpent: 1774,
  guestMealCount: 0,
  guestMealRevenue: 0,
  fixedCosts: { waterBill: 66, cookingCharge: 400, platformFee: 5 },
  _messGrandTotalMarket: 15986,
  _messGrandTotalMeal: 298,
  _messGrandTotalGuest: 4,
  refundSettled: true,
  _refundAmount: 231.84,
  _refundAt: '2026-10-11T14:46:00.000Z',
  _refundMethod: 'cash',
  // _refundReference intentionally absent — cash payout
};

const gatewayRefundInvoice = {
  ...cashRefundInvoice,
  _refundMethod: 'razorpay',
  _refundReference: 'rfn_NxK9Qp2vLm',
};

const renderPreview = (invoice) =>
  render(
    <InvoicePreview
      invoice={invoice}
      user={{ chargePerGuestMeal: 60 }}
      paymentRecord={null}
      onPayNow={vi.fn()}
      isPaying={false}
      userId="u1"
    />
  );

const renderBill = (invoice) =>
  render(
    <MessBillInvoice
      data={{ ...invoice, payableAmount: invoice.totalPayable }}
      isAdmin={false}
      user={{}}
      onPayNow={vi.fn()}
      isPaying={false}
      paymentStatus="pending"
      paymentRecord={null}
      autoExpand
      userId="u1"
    />
  );

describe('InvoicePreview — refund details', () => {
  it('cash payout: shows Method "Cash" and NO Reference row', () => {
    renderPreview(cashRefundInvoice);
    expect(screen.getByText('Method')).toBeInTheDocument();
    expect(screen.getByText('Cash')).toBeInTheDocument();
    expect(screen.getByText('Refund amount')).toBeInTheDocument();
    expect(screen.queryByText('Reference')).not.toBeInTheDocument();
  });

  it('gateway payout: Method label and Reference txn id both shown', () => {
    renderPreview(gatewayRefundInvoice);
    expect(screen.getByText('Method')).toBeInTheDocument();
    expect(screen.getByText('Online (Razorpay)')).toBeInTheDocument();
    expect(screen.getByText('rfn_NxK9Qp2vLm')).toBeInTheDocument();
  });
});

describe('MessBillInvoice — refund details', () => {
  it('cash payout: shows Method "Cash" and NO Reference row', () => {
    renderBill(cashRefundInvoice);
    expect(screen.getByText('Method')).toBeInTheDocument();
    expect(screen.getByText('Cash')).toBeInTheDocument();
    expect(screen.getByText('Refund amount')).toBeInTheDocument();
    expect(screen.queryByText('Reference')).not.toBeInTheDocument();
  });

  it('gateway payout: Method label and Reference txn id both shown', () => {
    renderBill(gatewayRefundInvoice);
    expect(screen.getByText('Method')).toBeInTheDocument();
    expect(screen.getByText('Online (Razorpay)')).toBeInTheDocument();
    expect(screen.getByText('rfn_NxK9Qp2vLm')).toBeInTheDocument();
  });
});
