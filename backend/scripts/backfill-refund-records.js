/**
 * backfill-refund-records.js
 * 
 * Migration: Creates missing refund Payment records for invoices with
 * negative totalPayable but no corresponding refund Payment record.
 * Also updates invoice statuses to 'refunded'.
 *
 * Run: node scripts/backfill-refund-records.js
 */
const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const Invoice = require('../src/models/Invoice.model');
const Payment = require('../src/models/Payment.model');
const User = require('../src/models/User.model');

(async () => {
  await mongoose.connect(process.env.MONGO_URL);
  console.log('Connected to DB\n');

  // Resolve an admin user for the createdBy field
  const admin = await User.findOne({ role: 'admin' }).select('_id name').lean();
  if (!admin) { console.error('No admin user found. Aborting.'); process.exit(1); }
  console.log('Using admin:', admin.name, '(' + admin._id + ')\n');

  // Find all invoices with negative totalPayable
  const negativeInvoices = await Invoice.find({ totalPayable: { $lt: 0 } }).populate('user', 'name email').lean();
  console.log('Found ' + negativeInvoices.length + ' invoices with negative totalPayable\n');

  let created = 0;
  let skipped = 0;
  let statusFixed = 0;

  for (const inv of negativeInvoices) {
    const email = inv.user?.email || 'unknown';
    const label = email + ' | ' + inv.monthName;

    // Check if refund Payment record already exists
    const existingRefund = await Payment.findOne({
      user: inv.user._id,
      month: inv.monthName,
      status: 'refunded',
    }).lean();

    if (existingRefund) {
      console.log('[SKIP] ' + label + ' — refund Payment record already exists');
      skipped++;
      continue;
    }

    // Detect the original payment type
    const originalPayment = await Payment.findOne({
      user: inv.user._id,
      month: inv.monthName,
      status: 'completed',
    }).sort({ paymentDate: -1 }).lean();
    const refundType = originalPayment?.type || 'mess_bill';

    // Create the refund Payment record
    await Payment.create({
      user: inv.user._id,
      amount: inv.totalPayable,
      month: inv.monthName,
      type: refundType,
      status: 'refunded',
      paymentMethod: 'cash',
      createdBy: admin._id,
      remarks: 'Backfill: Refund of Rs ' + Math.abs(inv.totalPayable).toLocaleString('en-IN', { maximumFractionDigits: 2 }) + ' for ' + inv.monthName,
    });
    console.log('[CREATED] ' + label + ' — Payment record: ' + refundType + ', amount: ' + inv.totalPayable);
    created++;

    // Update invoice status to 'refunded' if not already
    if (inv.status !== 'refunded') {
      await Invoice.updateOne(
        { _id: inv._id },
        { $set: { status: 'refunded', paidAmount: inv.totalPayable } }
      );
      console.log('[FIXED] ' + label + ' — Invoice status: ' + inv.status + ' -> refunded, paidAmount: ' + inv.totalPayable);
      statusFixed++;
    }

    // Sync user payment status
    const { syncUserPaymentStatus } = require('../src/services/payment.service');
    await syncUserPaymentStatus(inv.user._id, refundType, 'refunded', inv.monthName);
  }

  console.log('\n=== Migration Complete ===');
  console.log('Total invoices checked: ' + negativeInvoices.length);
  console.log('Refund records created: ' + created);
  console.log('Invoice statuses fixed: ' + statusFixed);
  console.log('Already had records (skipped): ' + skipped);

  await mongoose.disconnect();
})().catch(e => { console.error(e); process.exit(1); });
