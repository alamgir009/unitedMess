import { useState, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import {
  HiOutlineCheckCircle,
  HiOutlineIdentification,
  HiOutlineUser,
  HiOutlineCurrencyRupee,
  HiOutlineCalendarDays,
  HiOutlineClock,
  HiOutlineExclamationTriangle,
} from 'react-icons/hi2';
import { Modal, Button } from '@/shared/components/ui';
import { fmt } from '@/core/utils/helpers/currency.helper';
import { formatSmartDate } from '@/core/utils/helpers/date.helper';
import paymentService from '../../services/payment.service';

const UpiVerificationModal = ({ isOpen, onClose, payment, onVerified }) => {
  const [adminRemarks, setAdminRemarks] = useState('');
  const [verifying, setVerifying] = useState(false);

  const resetState = useCallback(() => {
    setAdminRemarks('');
    setVerifying(false);
  }, []);

  const handleClose = useCallback(() => {
    resetState();
    onClose();
  }, [resetState, onClose]);

  const handleVerify = useCallback(async (status) => {
    if (!payment?._id) return;
    setVerifying(true);
    try {
      const res = await paymentService.verifyUpiManual(payment._id, {
        status,
        remarks: adminRemarks.trim(),
      });
      if (res?.success) {
        toast.success(
          status === 'completed'
            ? 'Payment approved successfully!'
            : 'Payment has been declined.'
        );
        onVerified?.();
        onClose();
      }
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Verification failed. Please try again.');
    } finally {
      setVerifying(false);
    }
  }, [payment, adminRemarks, onVerified, onClose]);

  const userObj = payment?.user;
  const userName = typeof userObj === 'object' ? userObj?.name : 'Member';
  const userEmail = typeof userObj === 'object' ? userObj?.email : '';
  const date = payment?.createdAt ? formatSmartDate(payment.createdAt) : { primary: '', secondary: '' };

  return (
    <Modal
      isOpen={isOpen}
      onClose={verifying ? undefined : handleClose}
      title="Verify UPI Payment"
      size="md"
      mobileSheet
      accentColor="blue"
      isLoading={verifying}
      footer={
        <div className="flex gap-2.5 w-full">
          <Button
            variant="warning"
            size="sm"
            className="flex-1"
            onClick={() => handleVerify('failed')}
            disabled={verifying}
            isLoading={verifying}
          >
            {!verifying && <HiOutlineExclamationTriangle className="w-4 h-4" />}
            Decline
          </Button>
          <Button
            variant="success"
            size="sm"
            className="flex-[2]"
            onClick={() => handleVerify('completed')}
            disabled={verifying}
            isLoading={verifying}
          >
            {!verifying && <HiOutlineCheckCircle className="w-4 h-4" />}
            Approve
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="bg-card border border-border rounded-xl p-4 space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-border">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <HiOutlineIdentification className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">UTR / Reference</p>
              <p className="text-sm font-bold font-mono text-foreground mt-0.5 break-all select-all">
                {payment?.transactionId || 'N/A'}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted/50 text-muted-foreground">
                <HiOutlineUser className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Submitted by</p>
                <p className="text-sm font-semibold text-foreground truncate">{userName}</p>
                {userEmail && <p className="text-xs text-muted-foreground/70 truncate">{userEmail}</p>}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted/50 text-muted-foreground">
                <HiOutlineCurrencyRupee className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Amount</p>
                <p className="text-sm font-bold font-mono text-foreground">₹{fmt(payment?.amount)}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted/50 text-muted-foreground">
                <HiOutlineCalendarDays className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Billing Month</p>
                <p className="text-sm font-semibold text-foreground">{payment?.month || 'N/A'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted/50 text-muted-foreground">
                <HiOutlineClock className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Submitted on</p>
                <p className="text-sm font-semibold text-foreground">{date.primary} · {date.secondary}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground">Admin Remarks (Optional)</label>
          <textarea
            value={adminRemarks}
            onChange={(e) => setAdminRemarks(e.target.value)}
            placeholder="Add a note about this verification..."
            rows={2}
            maxLength={200}
            disabled={verifying}
            className="w-full h-11 min-h-[56px] px-3 py-2 rounded-lg surface-elevated border border-border
              focus:ring-2 focus:ring-ring/30 focus:border-ring
              outline-none transition-[border-color,box-shadow] duration-150
              text-sm text-foreground placeholder:text-muted-foreground
              resize-none disabled:opacity-60"
          />
        </div>
      </div>
    </Modal>
  );
};

export default UpiVerificationModal;
