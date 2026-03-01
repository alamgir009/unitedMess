const Payment = require('../models/Payment.model');
const User = require('../models/User.model');
const AppError = require('../utils/errors/AppError');
const razorpayService = require('./razorpay.service');

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const PAYMENT_TO_USER_STATUS = {
  completed: 'success',
  failed: 'failed',
  refunded: 'refunded',
  pending: 'pending',
};

const getUserFieldByType = (paymentType) =>
  paymentType === 'gas_bill' ? 'gasBill' : 'payment';

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

const syncUserPaymentStatus = async (userId, paymentType, paymentStatus) => {
  const userStatus = PAYMENT_TO_USER_STATUS[paymentStatus];
  if (!userStatus) return;

  const userField = getUserFieldByType(paymentType);

  await User.findByIdAndUpdate(
    userId,
    { [userField]: userStatus },
    { new: false }
  );
};

const verifyUserExists = async (userId) => {
  const exists = await User.exists({ _id: userId });
  if (!exists) throw new AppError('User not found', 404);
};

// ─────────────────────────────────────────────────────────────
// Create Payment
// ─────────────────────────────────────────────────────────────

const createPayment = async (paymentBody) => {
  await verifyUserExists(paymentBody.user);

  // Enforce business rule: cash payments auto-complete
  if (paymentBody.paymentMethod === 'cash') {
    paymentBody.status = 'completed';
  }

  const payment = await Payment.create(paymentBody);

  if (payment.status === 'completed') {
    await syncUserPaymentStatus(payment.user, payment.type, payment.status);
  }

  return payment;
};

const createOnlinePaymentOrder = async (userId, amount, type) => {
  await verifyUserExists(userId);

  if (!amount || amount <= 0) {
    throw new AppError('Invalid payment amount', 400);
  }

  const amountInPaise = Math.round(amount * 100);
  const order = await razorpayService.createOrder(amountInPaise);

  const payment = await Payment.create({
    user: userId,
    amount,
    paymentDate: new Date(),
    month: new Date().toLocaleString('default', {
      month: 'long',
      year: 'numeric',
    }),
    type,
    status: 'pending',
    paymentMethod: 'razorpay',
    transactionId: order.id, // Razorpay order ID
  });

  return { order, payment };
};

// ─────────────────────────────────────────────────────────────
// Verify Online Payment (Atomic + Idempotent Safe)
// ─────────────────────────────────────────────────────────────

const verifyOnlinePayment = async ({ orderId, paymentId, signature }) => {
  const isValid = razorpayService.verifyPaymentSignature(
    orderId,
    paymentId,
    signature
  );

  if (!isValid) throw new AppError('Invalid payment signature', 400);

  // Atomic update prevents race condition
  const payment = await Payment.findOneAndUpdate(
    { transactionId: orderId, status: 'pending' },
    {
      status: 'completed',
      transactionId: paymentId, // replace with actual Razorpay payment ID
      paymentDate: new Date(),
    },
    { new: true }
  );

  if (!payment) {
    const existing = await Payment.findOne({ transactionId: orderId });

    if (!existing)
      throw new AppError('Payment record not found for this order', 404);

    if (existing.status === 'completed')
      throw new AppError('Payment already verified', 409);

    throw new AppError('Unable to verify payment', 500);
  }

  await syncUserPaymentStatus(payment.user, payment.type, payment.status);

  return payment;
};

// ─────────────────────────────────────────────────────────────
// Query Payments (Full Pagination Metadata)
// ─────────────────────────────────────────────────────────────

const queryPayments = async (filter, options = {}, populateUser = false) => {
  let sort = { paymentDate: -1 };

  if (options.sortBy) {
    const [field, order] = options.sortBy.split(':');
    sort = { [field]: order === 'asc' ? 1 : -1 };
  }

  const limit = parseInt(options.limit, 10) || 10;
  const page = parseInt(options.page, 10) || 1;
  const skip = (page - 1) * limit;

  const [totalResults, results] = await Promise.all([
    Payment.countDocuments(filter),
    Payment.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate(
        populateUser ? { path: 'user', select: 'name email' } : ''
      )
      .lean(),
  ]);

  return {
    results,
    page,
    limit,
    totalPages: Math.ceil(totalResults / limit),
    totalResults,
  };
};

const getPaymentById = async (id) => {
  const payment = await Payment.findById(id)
    .populate('user', 'name email')
    .lean();

  if (!payment) throw new AppError('Payment not found', 404);

  return payment;
};

// ─────────────────────────────────────────────────────────────
// Update
// ─────────────────────────────────────────────────────────────

const updatePaymentById = async (paymentId, updateBody) => {
  const payment = await Payment.findById(paymentId);
  if (!payment) throw new AppError('Payment not found', 404);

  if (
    payment.paymentMethod === 'razorpay' &&
    payment.status === 'completed' &&
    updateBody.status === 'pending'
  ) {
    throw new AppError(
      'Cannot revert a completed Razorpay payment to pending',
      400
    );
  }

  const oldStatus = payment.status;

  Object.assign(payment, updateBody);
  await payment.save();

  if (updateBody.status && updateBody.status !== oldStatus) {
    await syncUserPaymentStatus(payment.user, payment.type, payment.status);
  }

  return payment;
};

// ─────────────────────────────────────────────────────────────
// Delete
// ─────────────────────────────────────────────────────────────

const deletePaymentById = async (paymentId) => {
  const payment = await Payment.findById(paymentId);
  if (!payment) throw new AppError('Payment not found', 404);

  if (payment.paymentMethod === 'razorpay' && payment.status === 'completed') {
    throw new AppError('Cannot delete a completed Razorpay payment', 400);
  }

  await Promise.all([
    payment.deleteOne(),
    syncUserPaymentStatus(payment.user, payment.type, 'pending'),
  ]);

  return payment;
};

module.exports = {
  createPayment,
  createOnlinePaymentOrder,
  verifyOnlinePayment,
  queryPayments,
  getPaymentById,
  updatePaymentById,
  deletePaymentById,
};