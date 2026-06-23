// PLACEHOLDER — confirm against backend
// Composite uniqueness key for dedupe: (memberId, date, category, slot)
// Server updatedAt is source of truth for conflict resolution (last-write-wins by timestamp)

export const CATEGORIES = {
  MEALS: 'meals',
  MARKETS: 'markets',
  PAYMENTS: 'payments',
};

export const SLOTS = {
  DAY: 'day',
  NIGHT: 'night',
  BOTH: 'both',
  OFF: 'off',
};

export const PAYMENT_STATUS = {
  PENDING: 'pending',
  PENDING_VERIFICATION: 'pending_verification',
  COMPLETED: 'completed',
  FAILED: 'failed',
  REFUNDED: 'refunded',
};

export const PAYMENT_METHODS = {
  CASH: 'cash',
  ONLINE: 'online',
  RAZORPAY: 'razorpay',
  UPI_MANUAL: 'upi_manual',
};
