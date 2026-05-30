import { useState, useEffect, useMemo, memo, useCallback, useRef } from 'react';
import { toast } from 'react-hot-toast';
import {
  HiOutlineXMark,
  HiOutlineCheckCircle,
  HiOutlineClipboard,
  HiOutlinePencil,
  HiOutlineArrowRight,
  HiOutlineArrowLeft,
  HiOutlinePhoto,
  HiOutlineShieldCheck,
  HiOutlineCheck,
  HiOutlineLockClosed,
  HiOutlineReceiptRefund,
  HiOutlineCreditCard,
  HiOutlineDevicePhoneMobile,
  HiOutlineBanknotes,
} from 'react-icons/hi2';
import { SiGooglepay } from 'react-icons/si';
import { BsCreditCard2Front } from 'react-icons/bs';
import { cn } from '@/core/utils/helpers/string.helper';
import { Button, Input, Badge, Spinner } from '@/shared/components/ui';
import paymentService from '../../services/payment.service';

// ─── Helpers ────────────────────────────────────────────────────────────────
const fmt = (n) =>
  Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

const UTR_PATTERN = /^[a-zA-Z0-9]{6,30}$/;

const STEP_LABELS = ['Months', 'Method', 'Pay'];

// ─── Sub‑components (memoised) ──────────────────────────────────────────────

const StepIndicator = memo(({ payStep }) => (
  <div
    className="flex items-center justify-between px-1"
    role="progressbar"
    aria-valuenow={Math.min(payStep, 3)}
    aria-valuemin={1}
    aria-valuemax={3}
  >
    {STEP_LABELS.map((label, i) => {
      const num = i + 1;
      return (
        <div key={num} className="flex items-center flex-1 last:flex-none">
          <div className="flex flex-col items-center gap-1 min-w-0">
            <div
              className={cn(
                'w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 transition-colors duration-200',
                payStep > num && 'bg-primary text-primary-foreground',
                payStep === num && 'bg-primary text-primary-foreground ring-2 ring-primary/20',
                payStep < num && 'bg-muted text-muted-foreground'
              )}
            >
              {payStep > num ? <HiOutlineCheck className="w-4 h-4" /> : num}
            </div>
            <span
              className={cn(
                'text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap',
                payStep >= num ? 'text-foreground' : 'text-muted-foreground'
              )}
            >
              {label}
            </span>
          </div>
          {i < STEP_LABELS.length - 1 && (
            <div
              className={cn(
                'flex-1 h-0.5 mx-2 rounded-full transition-colors duration-300',
                payStep > num ? 'bg-primary' : 'bg-border'
              )}
            />
          )}
        </div>
      );
    })}
  </div>
));
StepIndicator.displayName = 'StepIndicator';

const MonthCard = memo(({ month, isSelected, onToggle }) => {
  const isPaid = month.status === 'PAID';
  const isPendingVer = month.status === 'PENDING_VERIFICATION';
  const isSelectable = !isPaid && !isPendingVer;

  return (
    <div
      className={cn(
        'relative flex items-center justify-between p-4 rounded-xl border transition-colors duration-150 select-none',
        isSelected && 'border-primary/50 bg-primary/[0.04]',
        !isSelected && isSelectable && 'border-border bg-card hover:bg-muted/30',
        !isSelectable && 'border-border bg-card opacity-50'
      )}
    >
      <label className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer">
        <input
          type="checkbox"
          checked={isSelected}
          disabled={!isSelectable}
          onChange={() => isSelectable && onToggle(month.monthName)}
          className="sr-only"
        />
        <div
          className={cn(
            'w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors',
            isSelected ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/30',
            !isSelectable && 'border-muted-foreground/10'
          )}
        >
          {isSelected && <HiOutlineCheck className="w-3.5 h-3.5" />}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{month.monthName}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isPaid ? 'Fully paid' : isPendingVer ? 'Under review' : `₹${fmt(month.remainingAmount)} remaining`}
          </p>
        </div>
      </label>
      <Badge
        variant={
          isPaid ? 'success' : isPendingVer ? 'warning' : month.status === 'PARTIALLY_PAID' ? 'info' : 'default'
        }
        size="sm"
      >
        {isPaid ? 'Paid' : isPendingVer ? 'Review' : month.status === 'PARTIALLY_PAID' ? 'Partial' : 'Due'}
      </Badge>
    </div>
  );
});
MonthCard.displayName = 'MonthCard';

const PayMethodCard = ({ method, selected, icon, title, description, badge, onSelect }) => {
  const isSelected = selected === method;
  return (
    <div
      role="radio"
      aria-checked={isSelected}
      tabIndex={0}
      onClick={() => onSelect(method)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(method);
        }
      }}
      className={cn(
        'relative flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        isSelected ? 'border-primary bg-primary/[0.04]' : 'border-border hover:border-muted-foreground/30 bg-card hover:bg-muted/20'
      )}
    >
      <div
        className={cn(
          'p-3 rounded-xl transition-colors duration-150',
          isSelected ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
        )}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0 pt-0.5">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          {badge && <Badge variant={badge.variant} size="sm" dot>{badge.label}</Badge>}
        </div>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{description}</p>
      </div>
      <div
        className={cn(
          'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-1 transition-all',
          isSelected ? 'border-primary' : 'border-muted-foreground/30'
        )}
      >
        {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
      </div>
    </div>
  );
};

const UpiDisplay = memo(({ upiConfig, qrCodeError, onCopy, onQrError }) => {
  if (!upiConfig) {
    return (
      <div className="text-center py-6">
        <p className="text-sm text-muted-foreground">UPI config not available.</p>
        <p className="text-xs text-muted-foreground/60 mt-0.5">Please contact your admin.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {upiConfig.qrCodeUrl && !qrCodeError ? (
        <div className="flex flex-col items-center">
          <div className="p-3 bg-card rounded-2xl border border-border shadow-sm">
            <img
              src={upiConfig.qrCodeUrl}
              alt="UPI QR Code"
              onError={onQrError}
              loading="lazy"
              className="w-40 h-40 sm:w-44 sm:h-44 object-contain"
            />
          </div>
          <p className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
            <HiOutlineDevicePhoneMobile className="w-3.5 h-3.5" />
            Scan with any UPI app
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center py-4">
          <div className="p-3 rounded-xl bg-muted/30 mb-2">
            <HiOutlinePhoto className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">QR code not available</p>
          <p className="text-xs text-muted-foreground/60 mt-0.5">Use UPI ID below to pay</p>
        </div>
      )}

      <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border">
        <div className="min-w-0 pr-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">UPI ID</p>
          <p className="text-sm font-semibold text-foreground select-all truncate mt-0.5 font-mono">
            {upiConfig.upiId}
          </p>
          {upiConfig.merchantName && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{upiConfig.merchantName}</p>
          )}
        </div>
        <button
          onClick={() => onCopy(upiConfig.upiId)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 transition-colors active:scale-95 touch-target"
          aria-label="Copy UPI ID"
        >
          <HiOutlineClipboard className="w-4 h-4" />
          Copy
        </button>
      </div>
    </div>
  );
});
UpiDisplay.displayName = 'UpiDisplay';

const AdminUpiForm = memo(({
  editUpiId,
  editMerchantName,
  qrFile,
  savingUpiConfig,
  onUpiIdChange,
  onMerchantNameChange,
  onQrFileChange,
  onCancel,
  onSubmit,
}) => (
  <form onSubmit={onSubmit} className="space-y-5">
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-foreground">UPI ID</label>
      <Input
        type="text"
        value={editUpiId}
        onChange={(e) => onUpiIdChange(e.target.value)}
        placeholder="e.g. name@upi"
        variant="glass"
        required
      />
    </div>
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-foreground">Merchant Name</label>
      <Input
        type="text"
        value={editMerchantName}
        onChange={(e) => onMerchantNameChange(e.target.value)}
        placeholder="e.g. United Mess"
        variant="glass"
      />
    </div>
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-foreground">QR Code Image</label>
      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border hover:border-primary/50 rounded-xl cursor-pointer bg-muted/20 hover:bg-muted/40 transition-colors group">
        <div className="flex flex-col items-center justify-center py-4 text-center px-4">
          <div className="p-2.5 rounded-xl bg-muted/50 text-muted-foreground group-hover:text-primary transition-colors mb-2">
            <HiOutlinePhoto className="w-6 h-6" />
          </div>
          <p className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors truncate max-w-[260px]">
            {qrFile ? qrFile.name : 'Upload QR Image'}
          </p>
          <p className="text-xs text-muted-foreground/60 mt-0.5">PNG, JPG up to 5MB</p>
        </div>
        <input type="file" accept="image/*" onChange={(e) => onQrFileChange(e.target.files[0])} className="hidden" />
      </label>
    </div>
    <div className="flex gap-3 pt-2">
      <Button variant="outline" size="md" fullWidth onClick={onCancel}>
        Cancel
      </Button>
      <Button variant="primary" size="md" fullWidth isLoading={savingUpiConfig}>
        Save Setup
      </Button>
    </div>
  </form>
));
AdminUpiForm.displayName = 'AdminUpiForm';

const SuccessView = ({ onClose }) => (
  <div className="text-center py-8 space-y-6">
    <div className="w-16 h-16 rounded-2xl bg-success/10 text-success flex items-center justify-center mx-auto">
      <HiOutlineCheckCircle className="w-10 h-10" />
    </div>
    <div className="space-y-1.5">
      <h4 className="text-lg font-bold text-foreground">Reference Submitted!</h4>
      <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
        Your UTR reference has been received. The admin will verify and update your bill shortly.
      </p>
    </div>
    <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground bg-muted/30 px-4 py-2.5 rounded-full border border-border w-fit mx-auto">
      <Spinner size="xs" color="current" />
      <span>Syncing with ledger dashboard...</span>
    </div>
    <Button variant="outline" size="md" onClick={onClose}>
      Close
    </Button>
  </div>
);

// ─── Payment Summary Card (reusable) ─────────────────────────────────────────
const PaymentSummary = ({ total, months, compact }) => (
  <div className={cn(
    'bg-card border border-border rounded-xl p-4 flex items-center justify-between gap-4',
    compact && 'p-3 rounded-lg'
  )}>
    <div className="min-w-0">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Amount Payable</p>
      <p className={cn('font-bold text-foreground font-mono tabular-nums', compact ? 'text-xl' : 'text-2xl')}>
        ₹{fmt(total)}
      </p>
    </div>
    {months && months.length > 0 && (
      <div className="text-xs text-muted-foreground shrink-0 text-right">
        <p className="truncate max-w-[150px]">{months.join(', ')}</p>
        <p className="mt-0.5">{months.length} month{months.length > 1 ? 's' : ''}</p>
      </div>
    )}
  </div>
);

// ─── Main Component ────────────────────────────────────────────────────────
const PaymentFlowModal = ({ isOpen, onClose, isAdmin, activeInvoiceMonth, onRazorpayPay, onSuccess }) => {
  // State and refs as before – kept identical for no logic change
  const [exiting, setExiting] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const dialogRef = useRef(null);
  const previousFocusRef = useRef(null);
  const focusableRef = useRef([]);

  const [payStep, setPayStep] = useState(1);
  const [payableMonths, setPayableMonths] = useState([]);
  const [selectedMonths, setSelectedMonths] = useState([]);
  const [loadingMonths, setLoadingMonths] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState('upi');
  const [upiConfig, setUpiConfig] = useState(null);
  const [loadingUpi, setLoadingUpi] = useState(false);
  const [utr, setUtr] = useState('');
  const [submittingUpi, setSubmittingUpi] = useState(false);
  const [qrCodeError, setQrCodeError] = useState(false);
  const [isAdminUpiEdit, setIsAdminUpiEdit] = useState(false);
  const [editUpiId, setEditUpiId] = useState('');
  const [editMerchantName, setEditMerchantName] = useState('');
  const [qrFile, setQrFile] = useState(null);
  const [savingUpiConfig, setSavingUpiConfig] = useState(false);

  const isStepFlow = payStep <= 3 && !isAdminUpiEdit;

  const resetState = useCallback(() => {
    setPayStep(1);
    setUtr('');
    setSelectedMonths([]);
    setIsAdminUpiEdit(false);
    setQrFile(null);
  }, []);

  // Open/Close logic – unchanged
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

  const fetchMonths = useCallback(async () => {
    setLoadingMonths(true);
    try {
      const res = await paymentService.getPayableMonths();
      if (res?.success && Array.isArray(res?.data)) {
        setPayableMonths(res.data);
        const activeMonthData = res.data.find((m) => m.monthName === activeInvoiceMonth);
        if (activeMonthData && (activeMonthData.status === 'UNPAID' || activeMonthData.status === 'PARTIALLY_PAID')) {
          setSelectedMonths([activeInvoiceMonth]);
        } else {
          const firstUnpaid = res.data.find((m) => m.status === 'UNPAID' || m.status === 'PARTIALLY_PAID');
          if (firstUnpaid) setSelectedMonths([firstUnpaid.monthName]);
        }
      }
    } catch {
      toast.error('Failed to load payable months');
    } finally {
      setLoadingMonths(false);
    }
  }, [activeInvoiceMonth]);

  const fetchUpiDetails = useCallback(async () => {
    setLoadingUpi(true);
    setQrCodeError(false);
    try {
      const res = await paymentService.getUpiConfig();
      if (res?.success) {
        setUpiConfig(res.data);
        setEditUpiId(res.data.upiId || '');
        setEditMerchantName(res.data.merchantName || '');
      }
    } catch {
      toast.error('Failed to load UPI configuration');
    } finally {
      setLoadingUpi(false);
    }
  }, []);

  useEffect(() => {
    if (!shouldRender || exiting) return;
    fetchMonths();
    fetchUpiDetails();

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
  }, [shouldRender, exiting, fetchMonths, fetchUpiDetails]);

  const rebuildFocusable = useCallback(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const elements = dialog.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    focusableRef.current = Array.from(elements);
  }, []);

  useEffect(() => {
    if (shouldRender && !exiting) {
      rebuildFocusable();
      if (focusableRef.current.length > 0) {
        focusableRef.current[0].focus();
      } else {
        dialogRef.current?.focus();
      }
    }
  }, [shouldRender, exiting, payStep, isAdminUpiEdit, rebuildFocusable]);

  useEffect(() => {
    if (!shouldRender || exiting) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key === 'Tab') {
        const focusable = focusableRef.current;
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [shouldRender, exiting, onClose]);

  const copyToClipboard = useCallback(async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('UPI ID copied!');
    } catch {
      toast.error('Failed to copy. Please select and copy manually.');
    }
  }, []);

  const handleToggleMonth = useCallback((monthName) => {
    setSelectedMonths((prev) =>
      prev.includes(monthName) ? prev.filter((m) => m !== monthName) : [...prev, monthName]
    );
  }, []);

  const selectedTotalPayable = useMemo(
    () => payableMonths.filter((m) => selectedMonths.includes(m.monthName)).reduce((sum, m) => sum + m.remainingAmount, 0),
    [payableMonths, selectedMonths]
  );

  const handleSubmitUtr = useCallback(async () => {
    const trimmed = utr.trim();
    if (!trimmed) {
      toast.error('Please enter the Transaction ID (UTR)');
      return;
    }
    if (!UTR_PATTERN.test(trimmed)) {
      toast.error('UTR must be 6-30 alphanumeric characters.');
      return;
    }
    setSubmittingUpi(true);
    try {
      const res = await paymentService.submitUpiManual({
        months: selectedMonths,
        transactionId: trimmed,
        remarks: `Manual UPI transfer for ${selectedMonths.join(', ')}`,
      });
      if (res?.success) {
        toast.success('UTR submitted successfully! Pending verification.');
        setPayStep(4);
        if (typeof onSuccess === 'function') onSuccess();
      }
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Failed to submit transaction reference');
    } finally {
      setSubmittingUpi(false);
    }
  }, [utr, selectedMonths, onSuccess]);

  const handleUpdateUpiConfig = useCallback(
    async (e) => {
      e.preventDefault();
      if (!editUpiId) {
        toast.error('UPI ID is required');
        return;
      }
      if (!/^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(editUpiId)) {
        toast.error('Invalid UPI ID format.');
        return;
      }
      setSavingUpiConfig(true);
      try {
        const configRes = await paymentService.updateUpiConfig({
          upiId: editUpiId,
          merchantName: editMerchantName,
        });
        if (qrFile && configRes?.success) {
          const formData = new FormData();
          formData.append('qrcode', qrFile);
          await paymentService.uploadQrCode(formData);
        }
        toast.success('UPI configuration updated!');
        setIsAdminUpiEdit(false);
        setQrFile(null);
        fetchUpiDetails();
      } catch (err) {
        toast.error(err?.response?.data?.message ?? 'Failed to update config');
      } finally {
        setSavingUpiConfig(false);
      }
    },
    [editUpiId, editMerchantName, qrFile, fetchUpiDetails]
  );

  const handleRazorpayProceed = useCallback(() => {
    if (typeof onRazorpayPay === 'function') {
      onClose();
      const baseAmount = selectedTotalPayable;
      const gatewayFee = Math.round(baseAmount * 0.02 * 100) / 100;
      const gstOnFee = Math.round(gatewayFee * 0.18 * 100) / 100;
      const totalAmountWithFee = baseAmount + gatewayFee + gstOnFee;
      onRazorpayPay(totalAmountWithFee, 'mess_bill', selectedMonths);
    }
  }, [onRazorpayPay, onClose, selectedTotalPayable, selectedMonths]);

  const handleBackFromPay = useCallback(() => setPayStep(2), []);

  if (!shouldRender) return null;

  const title = isAdminUpiEdit ? 'Setup UPI Billing' : 'Mess Bill Payment';

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-dialog-title"
      tabIndex={-1}
      className={cn(
        'fixed inset-0 z-50 flex items-end sm:items-center justify-center',
        'transition-opacity duration-200 ease-out motion-reduce:transition-none',
        exiting ? 'opacity-0' : 'opacity-100'
      )}
    >
      {/* Overlay */}
      <div
        onClick={onClose}
        aria-hidden="true"
        className={cn(
          'fixed inset-0 bg-black/40',
          'transition-opacity duration-200 motion-reduce:transition-none',
          exiting ? 'opacity-0' : 'opacity-100'
        )}
      />

      {/* Modal Container */}
      <div
        className={cn(
          'relative w-full sm:max-w-lg lg:max-w-xl bg-background',
          'sm:rounded-2xl rounded-t-2xl',
          'shadow-[0_8px_30px_rgba(0,0,0,0.06)] border border-border',
          'overflow-hidden z-10',
          'max-h-[90dvh] sm:max-h-[85dvh] flex flex-col',
          'transition-all duration-200 ease-out motion-reduce:transition-none',
          exiting ? 'opacity-0 translate-y-4 sm:translate-y-2' : 'opacity-100 translate-y-0'
        )}
      >
        {/* Header with accent */}
        <div className="h-1 bg-primary/80 shrink-0" />

        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="min-w-0 pr-2">
            <h3 id="payment-dialog-title" className="text-lg font-bold text-foreground truncate flex items-center gap-2">
              {title}
              {isStepFlow && (
                <span className="text-xs font-normal text-muted-foreground ml-1">
                  · Step {payStep}/3
                </span>
              )}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Close payment dialog"
          >
            <HiOutlineXMark className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div
          className="flex-1 overflow-y-auto px-5 py-5 space-y-5 custom-scrollbar"
          style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
        >
          {isAdminUpiEdit ? (
            <AdminUpiForm
              editUpiId={editUpiId}
              editMerchantName={editMerchantName}
              qrFile={qrFile}
              savingUpiConfig={savingUpiConfig}
              onUpiIdChange={setEditUpiId}
              onMerchantNameChange={setEditMerchantName}
              onQrFileChange={setQrFile}
              onCancel={() => setIsAdminUpiEdit(false)}
              onSubmit={handleUpdateUpiConfig}
            />
          ) : (
            <>
              {isStepFlow && <StepIndicator payStep={payStep} />}

              {/* Step 1: Select Months */}
              {payStep === 1 && (
                <div className="space-y-5">
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">Select Billing Cycle</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Choose the monthly bills you wish to clear.
                    </p>
                  </div>

                  {loadingMonths ? (
                    <div className="flex justify-center py-12">
                      <Spinner size="md" />
                    </div>
                  ) : payableMonths.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="p-3 rounded-xl bg-muted/30 inline-flex mb-3">
                        <HiOutlineReceiptRefund className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <p className="text-sm font-medium text-foreground">No pending bills</p>
                      <p className="text-xs text-muted-foreground mt-0.5">All your bills are paid up to date.</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1 -mr-1 custom-scrollbar">
                      {payableMonths.map((m) => (
                        <MonthCard
                          key={m.monthName}
                          month={m}
                          isSelected={selectedMonths.includes(m.monthName)}
                          onToggle={handleToggleMonth}
                        />
                      ))}
                    </div>
                  )}

                  <PaymentSummary total={selectedTotalPayable} months={selectedMonths} />

                  <Button
                    variant="primary"
                    size="lg"
                    fullWidth
                    onClick={() => setPayStep(2)}
                    disabled={selectedMonths.length === 0}
                    className="mt-1"
                  >
                    Continue to Payment Method
                    <HiOutlineArrowRight className="w-4 h-4 ml-1.5" />
                  </Button>
                </div>
              )}

              {/* Step 2: Choose Method */}
              {payStep === 2 && (
                <div className="space-y-5">
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">Choose Payment Method</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">Select how you want to pay.</p>
                  </div>

                  <PaymentSummary total={selectedTotalPayable} months={selectedMonths} compact />

                  <div className="space-y-3" role="radiogroup" aria-label="Payment methods">
                    <PayMethodCard
                      method="razorpay"
                      selected={selectedMethod}
                      icon={<BsCreditCard2Front className="w-5 h-5" />}
                      title="Secure Online Pay"
                      description="Credit/Debit Cards, Netbanking, GPay/PhonePe via Razorpay SDK."
                      badge={{ variant: 'primary', label: 'Instant' }}
                      onSelect={setSelectedMethod}
                    />
                    <PayMethodCard
                      method="upi"
                      selected={selectedMethod}
                      icon={<SiGooglepay className="w-5 h-5" />}
                      title="Direct Manual UPI"
                      description="Pay to Admin QR or UPI ID directly and submit the 12‑digit UTR reference."
                      onSelect={setSelectedMethod}
                    />
                  </div>

                  <div className="flex gap-3 pt-1">
                    <Button variant="outline" size="md" fullWidth onClick={() => setPayStep(1)}>
                      <HiOutlineArrowLeft className="w-4 h-4 mr-1" />
                      Back
                    </Button>
                    <Button variant="primary" size="md" fullWidth onClick={() => setPayStep(3)}>
                      Continue
                      <HiOutlineArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 3: Complete Payment */}
              {payStep === 3 && (() => {
                const baseAmount = selectedTotalPayable;
                const gatewayFee = Math.round(baseAmount * 0.02 * 100) / 100;
                const gstOnFee = Math.round(gatewayFee * 0.18 * 100) / 100;
                const totalAmountWithFee = baseAmount + gatewayFee + gstOnFee;

                return (
                  <div className="space-y-5">
                    {selectedMethod === 'razorpay' ? (
                      <div className="space-y-5">
                        {/* Premium Fintech Breakdown Card */}
                        <div className="bg-card border border-border rounded-2xl p-5 space-y-4 shadow-sm relative overflow-hidden">
                          <div className="flex items-center gap-3 pb-3 border-b border-border">
                            <div className="p-2 rounded-xl bg-primary/10 text-primary">
                              <HiOutlineCreditCard className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-foreground">Razorpay Secure Gate</p>
                              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Gateway charges apply</p>
                            </div>
                          </div>

                          <div className="space-y-2.5 pt-1">
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-muted-foreground font-medium">Bill Amount</span>
                              <span className="font-semibold text-foreground font-mono tabular-nums">₹{fmt(baseAmount)}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-muted-foreground font-medium">Gateway Charge (2%)</span>
                              <span className="font-semibold text-foreground font-mono tabular-nums">₹{fmt(gatewayFee)}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-muted-foreground font-medium">GST on Charges (18%)</span>
                              <span className="font-semibold text-foreground font-mono tabular-nums">₹{fmt(gstOnFee)}</span>
                            </div>
                            
                            <div className="h-px bg-border my-2" />
                            
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-bold text-foreground">Total Payable</span>
                              <span className="text-xl font-black text-primary font-mono tabular-nums">
                                ₹{fmt(totalAmountWithFee)}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="bg-muted/30 border border-border rounded-xl p-5 text-center space-y-4">
                          <p className="text-xs text-muted-foreground leading-relaxed max-w-xs mx-auto">
                            You will be redirected to Razorpay&apos;s secure checkout environment to complete the payment.
                          </p>
                          
                          <Button
                            variant="primary"
                            size="lg"
                            fullWidth
                            onClick={handleRazorpayProceed}
                            className="h-12 text-base font-bold shadow-md hover:shadow-lg transition-all"
                          >
                            <HiOutlineLockClosed className="w-4 h-4 mr-2" />
                            Pay ₹{fmt(totalAmountWithFee)} Securely
                          </Button>

                          <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground opacity-80 pt-1">
                            <span className="flex items-center gap-1.5"><HiOutlineCreditCard className="w-3.5 h-3.5" /> Cards</span>
                            <span className="flex items-center gap-1.5"><HiOutlineDevicePhoneMobile className="w-3.5 h-3.5" /> UPI</span>
                            <span className="flex items-center gap-1.5"><HiOutlineBanknotes className="w-3.5 h-3.5" /> Netbanking</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-5">
                        {/* Premium UPI Breakdown Card */}
                        <div className="bg-card border border-border rounded-2xl p-5 space-y-4 shadow-sm relative overflow-hidden">
                          <div className="flex items-center gap-3 pb-3 border-b border-border">
                            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                              <SiGooglepay className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-foreground">Direct UPI Transfer</p>
                              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider">100% Free · Zero Gateway Fees</p>
                            </div>
                          </div>

                          <div className="space-y-2.5 pt-1">
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-muted-foreground font-medium">Bill Amount</span>
                              <span className="font-semibold text-foreground font-mono tabular-nums">₹{fmt(baseAmount)}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-muted-foreground font-medium">Gateway Surcharge</span>
                              <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">₹0.00</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-muted-foreground font-medium">GST on Charges</span>
                              <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">₹0.00</span>
                            </div>
                            
                            <div className="h-px bg-border my-2" />
                            
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-bold text-foreground">Total Payable</span>
                              <span className="text-xl font-black text-foreground font-mono tabular-nums">₹{fmt(baseAmount)}</span>
                            </div>
                          </div>
                        </div>

                        {loadingUpi ? (
                          <div className="flex justify-center py-10">
                            <Spinner size="md" />
                          </div>
                        ) : (
                          <>
                            <div className="bg-muted/30 border border-border rounded-xl p-4 space-y-5">
                              <UpiDisplay
                                upiConfig={upiConfig}
                                qrCodeError={qrCodeError}
                                onCopy={copyToClipboard}
                                onQrError={() => setQrCodeError(true)}
                              />
                              {isAdmin && (
                                <Button
                                  variant="outline"
                                  size="md"
                                  fullWidth
                                  onClick={() => setIsAdminUpiEdit(true)}
                                >
                                  <HiOutlinePencil className="w-4 h-4 mr-1.5" />
                                  Setup UPI ID & QR (Admin)
                                </Button>
                              )}
                            </div>

                            <div className="space-y-3">
                              <div>
                                <label className="text-xs font-semibold text-foreground">Transaction UTR</label>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  Enter the reference ID (UTR) from your UPI app.
                                </p>
                              </div>
                              <Input
                                type="text"
                                value={utr}
                                onChange={(e) => setUtr(e.target.value)}
                                placeholder="e.g. HDFC12345678"
                                variant="glass"
                                size="lg"
                                required
                              />
                              <Button
                                variant="primary"
                                size="lg"
                                fullWidth
                                onClick={handleSubmitUtr}
                                disabled={submittingUpi || !utr.trim()}
                                isLoading={submittingUpi}
                              >
                                {!submittingUpi && <HiOutlineCheck className="w-4 h-4 mr-1.5" />}
                                Submit Reference
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={handleBackFromPay}
                      className="mt-2 w-full flex items-center justify-center gap-1.5 h-11 rounded-xl text-xs font-bold uppercase tracking-wider
                                 text-muted-foreground hover:text-foreground bg-muted/30 hover:bg-muted/60 dark:bg-slate-800/30 dark:hover:bg-slate-800/60
                                 border border-border/40 hover:border-border/80 transition-all duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                    >
                      <HiOutlineArrowLeft className="w-3.5 h-3.5" />
                      Back to methods
                    </button>
                  </div>
                );
              })()}

              {payStep === 4 && <SuccessView onClose={onClose} />}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default memo(PaymentFlowModal);