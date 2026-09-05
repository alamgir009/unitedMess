import { useState, useEffect, useMemo, memo, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import {
  HiOutlineCheckCircle,
  HiOutlineDocumentDuplicate,
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
  HiOutlineListBullet,
} from 'react-icons/hi2';
import { SiGooglepay } from 'react-icons/si';
import { BsCreditCard2Front } from 'react-icons/bs';
import { cn } from '@/core/utils/helpers/string.helper';
import { fmt } from '@/core/utils/helpers/currency.helper';
import { Modal, Button, Input, Badge, Spinner } from '@/shared/components/ui';
import paymentService from '../../services/payment.service';

const UTR_PATTERN = /^\d{12}$/;

const MESS_STEP_LABELS_FULL = ['Months', 'Method', 'Pay'];
const MESS_STEP_LABELS_AUTO = ['Method', 'Pay'];
const GAS_STEP_LABELS       = ['Method', 'Pay'];

const UpiLogo = memo(({ className, ...props }) => (
  <svg
    viewBox="0 0 333334 199007"
    className={className}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M44732 130924h1856l-1738 7215c-265 1061-206 1885 147 2415 354 530 1001 795 1973 795 942 0 1737-265 2356-795 618-531 1031-1355 1296-2415l1737-7215h1885l-1767 7392c-383 1590-1060 2798-2061 3593-972 795-2268 1208-3858 1208s-2680-383-3269-1179c-589-795-707-2002-324-3592l1767-7421zm223507 11868l2826-11868h6449l-383 1649h-4564l-706 2974h4564l-413 1679h-4564l-913 3827h4565l-412 1738h-6449zm-177-8982c-413-470-913-824-1443-1031-531-235-1119-353-1797-353-1266 0-2385 412-3386 1237s-1649 1915-1973 3239c-295 1267-177 2327 413 3181 559 824 1442 1237 2620 1237 677 0 1355-118 2031-383 678-235 1356-619 2062-1119l-530 2179c-589 382-1207 648-1856 825-648 176-1296 265-2002 265-883 0-1679-148-2356-443-678-294-1236-736-1679-1324-441-560-706-1237-824-2002-117-766-88-1590 148-2474 206-883 559-1680 1031-2445 471-766 1089-1443 1796-2002 706-589 1472-1030 2297-1325 824-294 1648-441 2503-441 677 0 1295 88 1885 294 559 207 1089 500 1560 913l-500 1972zm-18317 4300h3209l-530-2710c-29-176-59-383-59-589-30-235-30-471-30-736-118 265-235 500-383 736-118 235-235 442-353 619l-1855 2680zm4093 4682l-589-3062h-4594l-2062 3062h-1972l8539-12338 2650 12338h-1972zm-15548 0l2827-11868h6449l-383 1649h-4565l-706 2945h4563l-412 1679h-4564l-1325 5565h-1885v30zm-5566-6832h353c1001 0 1679-118 2062-354 382-236 648-648 795-1267 146-648 88-1119-207-1384-293-265-913-413-1855-413h-354l-795 3417zm-471 1502l-1267 5300h-1767l2828-11867h2621c766 0 1354 59 1737 148 411 89 736 265 971 500 295 295 471 648 559 1119 89 443 59 943-59 1502-235 943-619 1709-1207 2238-589 530-1326 854-2209 972l2680 5387h-2121l-2562-5300h-206zm-11632 5330l2828-11868h6478l-382 1649h-4565l-706 2974h4564l-411 1679h-4565l-912 3827h4564l-413 1738h-6479zm-2031-10248l-2444 10218h-1884l2444-10218h-3063l383-1649h8010l-382 1649h-3063zm-19170 10248l2945-12338 5595 7244c148 206 294 413 441 648s295 501 471 794l1974-8216h1737l-2945 12310-5713-7392c-147-206-295-412-441-619-147-235-265-442-354-707l-1972 8245h-1737v30zm-4594 0l2827-11868h1884l-2827 11868h-1884zm8010 0l2945-12338 5595 7244c148 206 294 413 441 648s295 501 471 794l1974-8216h1737l-2945 12310-5713-7392c-147-206-295-412-441-619-147-235-265-442-354-707l-1972 8245h-1737v30z"
      fill="currentColor"
    />
    <path
      d="M233961 120588h-12927l17963-64873h12927l-17963 64873zm-107424-4064c-707 2562-3063 4358-5713 4358H54185c-1826 0-3180-619-4064-1855-883-1238-1089-2769-559-4594l16255-58541h12928l-14518 52298h51710l14517-52298h12928l-16844 60632zm100710-58777c-883-1237-2268-1855-4152-1855h-71027l-3504 12721h64608l-3769 13576h-51680v-30h-12927l-10719 38724h12927l7185-25973h58100c1826 0 3534-619 5124-1855 1590-1237 2651-2768 3151-4594l7185-25972c559-1943 383-3504-501-4741z"
      fill="currentColor"
    />
    <path
      fill="#008b43"
      d="M274245 55833l16344 32510-34365 32510 4087-14747 18794-17763-8941-17785z"
    />
    <path fill="#e97208" d="M262762 55833l16343 32510-34395 32510z" />
  </svg>
));
UpiLogo.displayName = 'UpiLogo';

const NpciLogo = memo(({ className, ...props }) => (
  <svg
    viewBox="0 0 130 39.858246"
    className={className}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <g transform="translate(-77.135821,-95.160455)">
      <g transform="matrix(0.22639012,0,0,0.22639012,14.982675,25.070072)">
        <g transform="translate(452.06,309.60001)">
          <path
            d="M 0,0 H -21.629999 L -41.490002,71.519997 -128.64999,0.16 l -30.28,109.36 H -137.14 L -117.6,38.490002 -30.440001,109.84 Z"
            fill="currentColor"
          />
        </g>
        <g transform="translate(593.53998,312.81)">
          <path
            d="m 0,0 c -1.44,-2.08 -3.69,-3.05 -6.89,-3.05 h -119.2 l -5.93,21.330001 h 108.470001 l -6.41,22.769998 H -138.27 L -156.38,106.15 h 21.63 l 12.18,-43.780001 h 97.58 c 3.039999,0 5.92,-0.959999 8.65,-3.039997 2.56,-2.09 4.32,-4.650002 5.28,-7.700001 L 0.96,7.86 C 1.92,4.81 1.6,2.09 0,0 Z"
            fill="currentColor"
          />
        </g>
        <g transform="translate(715.95001,408.04999)">
          <path
            d="m 0,0 c -0.8,3.05 -2.56,5.62 -5.29,7.7 -2.72,2.09 -5.45,3.21 -8.49,3.21 h -108.79 c -3.04,0 -5.29,-1.12 -6.73,-3.21 -1.59999,-2.08 -1.92,-4.65 -0.95999,-7.7 L -106.07,-87.379997 c 0.8,-3.050003 2.57,-5.610001 5.13,-7.700005 2.719999,-2.239998 5.609998,-3.209999 8.649999,-3.209999 H 16.34 c 3.209999,0 5.450001,0.970001 7.049999,3.050003 C 24.83,-93.150002 25.15,-90.43 24.190001,-87.379997 l -2.880002,10.419998 H -87.32 L -105.75,-10.58 H 3.04 Z"
            fill="currentColor"
          />
        </g>
        <g>
          <path
            d="m 750.08002,418.95999 h -21.79004 l 30.28003,-109.03998 h 21.63 z"
            fill="currentColor"
          />
        </g>
        <g>
          <path
            d="m 821.21002,309.76001 27.56,54.67999 -57.67999,54.68 z"
            fill="#008B43"
          />
        </g>
        <g>
          <path
            d="m 801.98999,309.76001 27.56,54.67999 -57.83997,54.68 z"
            fill="#F47921"
          />
        </g>
      </g>
    </g>
  </svg>
));
NpciLogo.displayName = 'NpciLogo';

const StepIndicator = memo(({ payStep, labels = MESS_STEP_LABELS_AUTO }) => (
  <div
    className="flex items-center justify-between px-1"
    role="progressbar"
    aria-valuenow={Math.min(payStep, labels.length)}
    aria-valuemin={1}
    aria-valuemax={labels.length}
  >
    {labels.map((label, i) => {
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
          {i < labels.length - 1 && (
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
          <div className="flex flex-col items-center mt-3.5">
            <div className="flex items-center gap-1.5 px-3 py-1 bg-muted/40 rounded-full border border-border/30 text-[10px] font-bold text-muted-foreground uppercase tracking-wider select-none">
              <HiOutlineDevicePhoneMobile className="w-3.5 h-3.5 text-primary shrink-0" aria-hidden="true" />
              <span>Scan with any UPI app</span>
            </div>
          </div>
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
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 active:scale-95 transition-all duration-150 shrink-0"
          aria-label="Copy UPI ID"
        >
          <HiOutlineDocumentDuplicate className="w-4 h-4 shrink-0" />
          Copy
        </button>
      </div>

      <div className="flex items-center justify-center gap-3 pt-3.5 border-t border-border/40 select-none">
        <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/40">Secured by</span>
        <UpiLogo className="h-3.5 w-auto text-[#1C1C1C] dark:text-white opacity-40 dark:opacity-60 hover:opacity-90 transition-opacity duration-200" aria-hidden="true" />
        <span className="h-2.5 w-[1px] bg-border/40" />
        <NpciLogo className="h-3.5 w-auto text-[#1C1C1C] dark:text-white opacity-40 dark:opacity-60 hover:opacity-90 transition-opacity duration-200" aria-hidden="true" />
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
      <Button variant="glass" size="md" fullWidth onClick={onCancel}>
        Cancel
      </Button>
      <Button variant="premium" size="md" fullWidth isLoading={savingUpiConfig}>
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
    <Button variant="glass" size="md" onClick={onClose}>
      Close
    </Button>
  </div>
);

const PaymentSummary = ({ total, months, compact }) => (
  <div className={cn(
    'bg-card border border-border rounded-xl p-4 flex items-center justify-between gap-4',
    compact && 'p-3 rounded-lg'
  )}>
    <div className="min-w-0">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Amount Payable</p>
      <p className={cn('font-bold text-foreground tabular-nums', compact ? 'text-xl' : 'text-2xl')}>
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

const PaymentFlowModal = ({ isOpen, onClose, isAdmin, activeInvoiceMonth, onRazorpayPay, onSuccess, paymentType = 'mess_bill', gasBillAmount = 0 }) => {
  const isGasBill = paymentType === 'gas_bill';

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
  const [autoSkippedMonths, setAutoSkippedMonths] = useState(false);

  const STEP_LABELS = isGasBill
    ? GAS_STEP_LABELS
    : autoSkippedMonths
      ? MESS_STEP_LABELS_AUTO
      : MESS_STEP_LABELS_FULL;

  const totalSteps = STEP_LABELS.length;
  const isStepFlow = payStep <= totalSteps && !isAdminUpiEdit;

  const resetState = useCallback(() => {
    setPayStep(1);
    setUtr('');
    setSelectedMonths(isGasBill && activeInvoiceMonth ? [activeInvoiceMonth] : []);
    setIsAdminUpiEdit(false);
    setQrFile(null);
    setAutoSkippedMonths(false);
  }, [isGasBill, activeInvoiceMonth]);

  useEffect(() => {
    if (!isOpen) {
      resetState();
    }
  }, [isOpen, resetState]);

  const fetchMonths = useCallback(async () => {
    setLoadingMonths(true);
    try {
      const res = await paymentService.getPayableMonths();
      if (res?.success && Array.isArray(res?.data)) {
        setPayableMonths(res.data);
        const unpaidMonths = res.data.filter(
          (m) => m.status === 'UNPAID' || m.status === 'PARTIALLY_PAID'
        );

        if (unpaidMonths.length === 1) {
          setSelectedMonths([unpaidMonths[0].monthName]);
          setAutoSkippedMonths(true);
          setPayStep(1);
        } else if (unpaidMonths.length > 1) {
          const activeMonthData = unpaidMonths.find((m) => m.monthName === activeInvoiceMonth);
          if (activeMonthData) {
            setSelectedMonths([activeInvoiceMonth]);
          } else {
            setSelectedMonths([unpaidMonths[0].monthName]);
          }
          setAutoSkippedMonths(false);
        } else {
          setAutoSkippedMonths(false);
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
    if (!isOpen) return;
    if (!isGasBill) fetchMonths();
    fetchUpiDetails();
  }, [isOpen, fetchMonths, fetchUpiDetails, isGasBill]);

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
    () => isGasBill ? gasBillAmount : payableMonths.filter((m) => selectedMonths.includes(m.monthName)).reduce((sum, m) => sum + m.remainingAmount, 0),
    [payableMonths, selectedMonths, isGasBill, gasBillAmount]
  );

  const handleSubmitUtr = useCallback(async () => {
    const trimmed = utr.trim();
    if (!trimmed) {
      toast.error('Please enter the Transaction ID (UTR)');
      return;
    }
    if (!UTR_PATTERN.test(trimmed)) {
      toast.error('UTR must be exactly 12 digits (numbers only).');
      return;
    }
    setSubmittingUpi(true);
    try {
      const months = isGasBill ? [activeInvoiceMonth] : selectedMonths;
      const res = await paymentService.submitUpiManual({
        months,
        transactionId: trimmed,
        remarks: `Manual UPI transfer for ${months.join(', ')}`,
        type: paymentType,
      });
      if (res?.success) {
        toast.success('UTR submitted successfully! Pending verification.');
        setPayStep(totalSteps + 1);
        if (typeof onSuccess === 'function') onSuccess();
      }
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Failed to submit transaction reference');
    } finally {
      setSubmittingUpi(false);
    }
  }, [utr, selectedMonths, onSuccess, paymentType, isGasBill, activeInvoiceMonth, totalSteps]);

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
      const baseAmount = selectedTotalPayable;
      Promise.resolve(onRazorpayPay(baseAmount, paymentType, isGasBill ? null : selectedMonths)).catch(() => {});
    }
  }, [onRazorpayPay, selectedTotalPayable, paymentType, selectedMonths, isGasBill]);

  const handleBackFromPay = useCallback(() => {
    setPayStep(autoSkippedMonths || isGasBill ? 1 : 2);
  }, [autoSkippedMonths, isGasBill]);

  const title = isAdminUpiEdit ? 'Setup UPI Billing' : isGasBill ? 'Gas Bill Payment' : 'Mess Bill Payment';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="lg"
      mobileSheet
      accentColor="blue"
    >
      <div className="space-y-5">
        {isAdminUpiEdit ? (
          <AdminUpiForm
            editUpiId={editUpiId}
            editMerchantName={editMerchantName}
            qrFile={qrFile}
            savingUpiConfig={savingUpiConfig}
            onUpiIdChange={setEditUpiId}
            onMerchantNameChange={setEditMerchantName}
            onQrFileChange={(file) => {
              if (!file) return;
              if (file.size > 5 * 1024 * 1024) {
                toast.error('File size must be less than 5MB');
                return;
              }
              const ext = file.name ? file.name.substring(file.name.lastIndexOf('.')).toLowerCase() : '';
              const EXT_TO_MIME = {
                  '.jpg': 'image/jpeg',
                  '.jpeg': 'image/jpeg',
                  '.png': 'image/png',
                  '.webp': 'image/webp',
                  '.jfif': 'image/jpeg'
              };
              let detectedType = file.type;
              if (!detectedType || detectedType === 'application/octet-stream' || detectedType === 'image/jpg') {
                  detectedType = EXT_TO_MIME[ext] || '';
              }
              const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
              if (!ALLOWED_TYPES.includes(detectedType)) {
                  toast.error('Invalid file type. Only JPEG, PNG, and WEBP images are allowed.');
                  return;
              }
              setQrFile(file);
            }}
            onCancel={() => setIsAdminUpiEdit(false)}
            onSubmit={handleUpdateUpiConfig}
          />
        ) : (
          <>
            {isStepFlow && <StepIndicator payStep={payStep} labels={STEP_LABELS} />}

            {payStep === 1 && (isGasBill || autoSkippedMonths) && (
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
                    description="Pay to Admin QR or UPI ID directly and submit the 12-digit UTR reference."
                    onSelect={setSelectedMethod}
                  />
                </div>

                <Button variant="elevated" size="lg" fullWidth onClick={() => setPayStep(2)} className="mt-1">
                  Continue
                  <HiOutlineArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </div>
            )}

            {payStep === 1 && !isGasBill && !autoSkippedMonths && (
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
                  variant="elevated"
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

            {payStep === 2 && (() => {
              const baseAmount = selectedTotalPayable;
              const gatewayFee = Math.round(baseAmount * 0.02 * 100) / 100;
              const gstOnFee = Math.round(gatewayFee * 0.18 * 100) / 100;
              const totalAmountWithFee = baseAmount + gatewayFee + gstOnFee;

              return (
                <div className="space-y-5">
                  {selectedMethod === 'razorpay' ? (
                    <div className="space-y-5">
                      <div className="bg-card border border-border rounded-xl p-5 space-y-4 shadow-sm relative overflow-hidden">
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
                            <span className="font-semibold text-foreground tabular-nums">₹{fmt(baseAmount)}</span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-muted-foreground font-medium">Gateway Charge (2%)</span>
                            <span className="font-semibold text-foreground tabular-nums">₹{fmt(gatewayFee)}</span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-muted-foreground font-medium">GST on Charges (18%)</span>
                            <span className="font-semibold text-foreground tabular-nums">₹{fmt(gstOnFee)}</span>
                          </div>

                          <div className="h-px bg-border my-2" />

                          <div className="flex justify-between items-center">
                            <span className="text-sm font-bold text-foreground">Total Payable</span>
                            <span className="text-2xl font-bold text-primary tabular-nums">
                              ₹{fmt(totalAmountWithFee)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-card/50 border border-border/60 rounded-2xl p-6 text-center space-y-5">
                        <p className="text-xs text-muted-foreground leading-relaxed max-w-xs mx-auto">
                          You will be redirected to Razorpay&apos;s secure checkout environment to complete the payment.
                        </p>

                        <Button
                          variant="premium"
                          size="xl"
                          fullWidth
                          onClick={handleRazorpayProceed}
                          className="shadow-none transition-[transform] duration-100 will-change-transform"
                        >
                          Pay ₹{fmt(totalAmountWithFee)}
                        </Button>

                        <div className="flex items-center justify-center gap-5 text-[11px] text-muted-foreground/70 pt-2 border-t border-border/30">
                          <span className="flex items-center gap-1.5"><HiOutlineCreditCard className="w-3.5 h-3.5" /> Cards</span>
                          <span className="flex items-center gap-1.5"><HiOutlineDevicePhoneMobile className="w-3.5 h-3.5" /> UPI</span>
                          <span className="flex items-center gap-1.5"><HiOutlineBanknotes className="w-3.5 h-3.5" /> Netbanking</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-5">
                      <div className="bg-card border border-border rounded-xl p-5 space-y-4 shadow-sm relative overflow-hidden">
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
                            <span className="font-semibold text-foreground tabular-nums">₹{fmt(baseAmount)}</span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-muted-foreground font-medium">Gateway Surcharge</span>
                            <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">₹0.00</span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-muted-foreground font-medium">GST on Charges</span>
                            <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">₹0.00</span>
                          </div>

                          <div className="h-px bg-border my-2" />

                          <div className="flex justify-between items-center">
                            <span className="text-sm font-bold text-foreground">Total Payable</span>
                            <span className="text-2xl font-bold text-foreground tabular-nums">₹{fmt(baseAmount)}</span>
                          </div>
                        </div>
                      </div>

                      {loadingUpi ? (
                        <div className="flex justify-center py-10">
                          <Spinner size="md" />
                        </div>
                      ) : (
                        <>
                          <div className="bg-primary/5 border border-primary/10 rounded-xl p-4">
                            <p className="text-xs font-bold text-foreground mb-2.5 flex items-center gap-1.5">
                              <HiOutlineListBullet className="w-3.5 h-3.5 text-primary" />
                              How to pay via UPI
                            </p>
                            <ol className="space-y-1.5 text-[11px] text-muted-foreground leading-relaxed">
                              <li className="flex items-start gap-2">
                                <span className="font-bold text-foreground/70 shrink-0">1.</span>
                                Open any UPI app (GPay, PhonePe, Paytm)
                              </li>
                              <li className="flex items-start gap-2">
                                <span className="font-bold text-foreground/70 shrink-0">2.</span>
                                Scan the QR code or copy the UPI ID below
                              </li>
                              <li className="flex items-start gap-2">
                                <span className="font-bold text-foreground/70 shrink-0">3.</span>
                                Pay exactly <span className="font-bold text-foreground">₹{fmt(baseAmount)}</span>
                              </li>
                              <li className="flex items-start gap-2">
                                <span className="font-bold text-foreground/70 shrink-0">4.</span>
                                Copy the 12-digit UTR from your UPI app
                              </li>
                              <li className="flex items-start gap-2">
                                <span className="font-bold text-foreground/70 shrink-0">5.</span>
                                Paste it in the field below and submit
                              </li>
                            </ol>
                          </div>

                          <div className="bg-muted/30 border border-border rounded-xl p-4 space-y-5">
                            <UpiDisplay
                              upiConfig={upiConfig}
                              qrCodeError={qrCodeError}
                              onCopy={copyToClipboard}
                              onQrError={() => setQrCodeError(true)}
                            />
                            {isAdmin && (
                              <Button
                                variant="glass"
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
                              <label className="text-xs font-semibold text-foreground">Transaction UTR / Reference</label>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                Enter the 12-digit UTR number shown in your UPI app after payment.
                              </p>
                            </div>
                            <Input
                              type="text"
                              value={utr}
                              onChange={(e) => setUtr(e.target.value.replace(/\D/g, ''))}
                              placeholder="e.g. 123456789012"
                              variant="glass"
                              size="lg"
                              maxLength={12}
                              required
                              autoComplete="off"
                            />
                            {utr.length > 0 && UTR_PATTERN.test(utr) && (
                              <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400">
                                <HiOutlineCheckCircle className="w-3.5 h-3.5" />
                                Valid 12-digit UTR
                              </div>
                            )}
                            {utr.length > 0 && !UTR_PATTERN.test(utr) && (
                              <div className="flex items-center gap-1.5 text-[11px] text-red-500 dark:text-red-400">
                                <HiOutlineShieldCheck className="w-3.5 h-3.5" />
                                UTR must be exactly 12 digits (0-9)
                              </div>
                            )}
                            {utr.length === 0 && (
                              <div className="flex items-center gap-2 text-[11px] text-muted-foreground/60">
                                <HiOutlineShieldCheck className="w-3.5 h-3.5" />
                                <span>UTR must be exactly 12 digits</span>
                              </div>
                            )}
                            <Button
                              variant="premium"
                              size="lg"
                              fullWidth
                              onClick={handleSubmitUtr}
                              disabled={submittingUpi || !utr.trim() || !UTR_PATTERN.test(utr)}
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

                  <Button
                    variant="ghost"
                    size="md"
                    fullWidth
                    onClick={handleBackFromPay}
                    className="mt-2"
                  >
                    <HiOutlineArrowLeft className="w-3.5 h-3.5" />
                    Back to methods
                  </Button>
                </div>
              );
            })()}

            {payStep === totalSteps + 1 && <SuccessView onClose={onClose} />}
          </>
        )}
      </div>
    </Modal>
  );
};

export default memo(PaymentFlowModal);
