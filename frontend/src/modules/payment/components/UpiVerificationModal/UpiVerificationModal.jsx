import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import {
  HiOutlineXMark,
  HiOutlineCheckCircle,
  HiOutlineIdentification,
  HiOutlineUser,
  HiOutlineCurrencyRupee,
  HiOutlineCalendarDays,
  HiOutlineShieldCheck,
  HiOutlineClock,
  HiOutlineChatBubbleBottomCenterText,
  HiOutlineExclamationTriangle,
} from 'react-icons/hi2';
import { Button } from '@/shared/components/ui';
import { cn } from '@/core/utils/helpers/string.helper';
import { formatSmartDate } from '@/core/utils/helpers/date.helper';
import paymentService from '../../services/payment.service';

const fmt = (n) =>
  Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

const UpiVerificationModal = ({ isOpen, onClose, payment, onVerified }) => {
  const [exiting, setExiting] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const dialogRef = useRef(null);
  const previousFocusRef = useRef(null);
  const [adminRemarks, setAdminRemarks] = useState('');
  const [verifying, setVerifying] = useState(false);

  const resetState = useCallback(() => {
    setAdminRemarks('');
    setVerifying(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement;
      setExiting(false);
      setShouldRender(true);
    } else {
      setExiting(true);
      const timer = setTimeout(() => {
        setShouldRender(false);
        resetState();
        if (previousFocusRef.current && typeof previousFocusRef.current.focus === 'function') {
          previousFocusRef.current.focus();
        }
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen, resetState]);

  useEffect(() => {
    if (!shouldRender || exiting) return;
    const scrollY = window.scrollY;
    const html = document.documentElement;
    html.style.overflow = 'hidden';
    html.style.position = 'fixed';
    html.style.width = '100%';
    html.style.top = `-${scrollY}px`;
    return () => {
      html.style.overflow = '';
      html.style.position = '';
      html.style.width = '';
      html.style.top = '';
      window.scrollTo(0, scrollY);
    };
  }, [shouldRender, exiting]);

  useEffect(() => {
    if (!shouldRender || exiting) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [shouldRender, exiting, onClose]);

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

  if (!shouldRender) return null;

  const userObj = payment?.user;
  const userName = typeof userObj === 'object' ? userObj?.name : 'Member';
  const userEmail = typeof userObj === 'object' ? userObj?.email : '';
  const date = payment?.createdAt ? formatSmartDate(payment.createdAt) : { primary: '', secondary: '' };

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="upi-verify-title"
      tabIndex={-1}
      className={cn(
        'fixed inset-0 z-50 flex items-end sm:items-center justify-center',
        'transition-opacity duration-200 ease-out motion-reduce:transition-none',
        exiting ? 'opacity-0' : 'opacity-100'
      )}
    >
      <div
        onClick={onClose}
        aria-hidden="true"
        className={cn(
          'fixed inset-0 bg-black/40',
          'transition-opacity duration-200 motion-reduce:transition-none',
          exiting ? 'opacity-0' : 'opacity-100'
        )}
      />

      <div
        className={cn(
          'relative w-full sm:max-w-md bg-background',
          'sm:rounded-2xl rounded-t-2xl',
          'shadow-[0_8px_30px_rgba(0,0,0,0.06)] border border-border',
          'overflow-hidden z-10',
          'max-h-[90dvh] flex flex-col',
          'transition-all duration-200 ease-out motion-reduce:transition-none',
          exiting ? 'opacity-0 translate-y-4 sm:translate-y-2' : 'opacity-100 translate-y-0'
        )}
      >
        <div className="h-1 bg-primary/80 shrink-0" />

        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="min-w-0 pr-2">
            <h3 id="upi-verify-title" className="text-lg font-bold text-foreground truncate flex items-center gap-2">
              <HiOutlineShieldCheck className="w-5 h-5 text-primary" />
              Verify UPI Payment
            </h3>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Close"
          >
            <HiOutlineXMark className="w-5 h-5" />
          </button>
        </div>

        <div
          className="flex-1 overflow-y-auto px-5 py-5 space-y-5 custom-scrollbar"
          style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
        >
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-xl p-4 space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-border">
                <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <HiOutlineIdentification className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">UTR / Reference</p>
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

            <div className="space-y-2">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <HiOutlineChatBubbleBottomCenterText className="w-3.5 h-3.5" />
                Admin Remarks (Optional)
              </label>
              <textarea
                value={adminRemarks}
                onChange={(e) => setAdminRemarks(e.target.value)}
                placeholder="Add a note about this verification..."
                rows={2}
                maxLength={200}
                disabled={verifying}
                className="w-full px-3 py-2 rounded-xl border border-border/60 bg-background/70 backdrop-blur-md
                  focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/60
                  outline-none transition-all duration-200
                  text-sm text-foreground placeholder:text-muted-foreground/50
                  resize-none disabled:opacity-60"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2 border-t border-border/30">
            <Button
              variant="danger"
              size="md"
              fullWidth
              onClick={() => handleVerify('failed')}
              disabled={verifying}
              isLoading={verifying}
            >
              {!verifying && <HiOutlineExclamationTriangle className="w-4 h-4 mr-1.5" />}
              Decline
            </Button>
            <Button
              variant="success"
              size="md"
              fullWidth
              onClick={() => handleVerify('completed')}
              disabled={verifying}
              isLoading={verifying}
            >
              {!verifying && <HiOutlineCheckCircle className="w-4 h-4 mr-1.5" />}
              Approve
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpiVerificationModal;