import { isMemberEditablePayment, isMemberEditablePaymentAmount } from '@shared/utils/paymentStatus';

export const canEditDayEntry = (entry, category, user) => {
  if (!entry._id || entry.__optimistic || !['markets', 'meals', 'payments'].includes(category)) return false;
  if (user?.role === 'admin') return true;

  const userId = user?._id || user?.id;
  const ownerId = entry.user?._id || entry.user;
  return Boolean(userId && ownerId === userId && (category !== 'payments' || isMemberEditablePayment(entry)));
};

export const canDeleteDayEntry = (entry, category, user) =>
  canEditDayEntry(entry, category, user) &&
  (category !== 'payments' || (user?.role === 'admin'
    ? entry.paymentMethod !== 'razorpay' || entry.status !== 'completed'
    : isMemberEditablePaymentAmount(entry)));
