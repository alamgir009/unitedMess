import { useState, useEffect, useMemo, memo, useCallback, useRef } from 'react';
import { toast } from 'react-hot-toast';
import {
  HiOutlineXMark,
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

// ─── Brand Logo SVG Components ──────────────────────────────────────────────
const UpiLogo = memo(({ className, ...props }) => (
  <svg
    viewBox="0 0 333334 199007"
    className={className}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M44732 130924h1856l-1738 7215c-265 1061-206 1885 147 2415 354 530 1001 795 1973 795 942 0 1737-265 2356-795 618-531 1031-1355 1296-2415l1737-7215h1885l-1767 7392c-383 1590-1060 2798-2061 3593-972 795-2268 1208-3858 1208s-2680-383-3269-1179c-589-795-707-2002-324-3592l1767-7421zm223507 11868l2826-11868h6449l-383 1649h-4564l-706 2974h4564l-413 1679h-4564l-913 3827h4565l-412 1738h-6449zm-177-8982c-413-470-913-824-1443-1031-531-235-1119-353-1797-353-1266 0-2385 412-3386 1237s-1649 1915-1973 3239c-295 1267-177 2327 413 3181 559 824 1442 1237 2620 1237 677 0 1355-118 2031-383 678-235 1356-619 2062-1119l-530 2179c-589 382-1207 648-1856 825-648 176-1296 265-2002 265-883 0-1679-148-2356-443-678-294-1236-736-1679-1324-441-560-706-1237-824-2002-117-766-88-1590 148-2474 206-883 559-1680 1031-2445 471-766 1089-1443 1796-2002 706-589 1472-1030 2297-1325 824-294 1648-441 2503-441 677 0 1295 88 1885 294 559 207 1089 500 1560 913l-500 1972zm-18317 4300h3209l-530-2710c-29-176-59-383-59-589-30-235-30-471-30-736-118 265-235 500-383 736-118 235-235 442-353 619l-1855 2680zm4093 4682l-589-3062h-4594l-2062 3062h-1972l8539-12338 2650 12338h-1972zm-15548 0l2827-11868h6449l-383 1649h-4565l-706 2945h4563l-412 1679h-4564l-1325 5565h-1885v30zm-5566-6832h353c1001 0 1679-118 2062-354 382-236 648-648 795-1267 146-648 88-1119-207-1384-293-265-913-413-1855-413h-354l-795 3417zm-471 1502l-1267 5300h-1767l2828-11867h2621c766 0 1354 59 1737 148 411 89 736 265 971 500 295 295 471 648 559 1119 89 443 59 943-59 1502-235 943-619 1709-1207 2238-589 530-1326 854-2209 972l2680 5387h-2121l-2562-5300h-206zm-11632 5330l2828-11868h6478l-382 1649h-4565l-706 2974h4564l-411 1679h-4565l-912 3827h4564l-413 1738h-6479zm-2031-10248l-2444 10218h-1884l2444-10218h-3063l383-1649h8010l-382 1649h-3063zm-19170 10248l2945-12338 5595 7244c148 206 294 413 441 648s295 501 471 794l1974-8216h1737l-2945 12310-5713-7392c-147-206-295-412-441-619-147-235-265-442-354-707l-1972 8245h-1737v30zm-4594 0l2827-11868h1884l-2827 11868h-1884zm-13870-2385l1678-707c29 530 176 942 501 1207 324 265 765 413 1354 413 559 0 1031-148 1443-471 412-324 678-736 795-1266 177-707-235-1326-1236-1855-147-89-235-148-325-177-1119-648-1825-1207-2120-1737-294-530-354-1149-176-1884 235-972 736-1738 1530-2356 796-589 1679-913 2740-913 854 0 1530 177 2031 500 501 325 766 825 854 1444l-1648 766c-148-383-325-648-560-825-235-176-530-265-884-265-501 0-942 147-1295 412-354 265-589 619-707 1090-176 707 325 1383 1472 2002 89 59 147 89 207 117 1001 530 1678 1061 1972 1591 295 529 354 1148 178 1943-266 1119-825 2002-1680 2680-853 647-1855 1002-3033 1002-971 0-1737-237-2267-708-589-471-854-1149-824-2002zm-1973-7863l-2444 10218h-1884l2444-10218h-3062l381-1649h8010l-383 1649h-3062zm-19170 10248l2944-12338 5596 7244c147 206 295 413 442 648 146 235 294 501 471 794l1973-8216h1737l-2944 12310-5713-7392c-148-206-294-412-442-619-147-235-265-442-353-707l-1973 8245h-1737v30zm-8599 0l2827-11868h6449l-383 1649h-4564l-707 2974h4564l-412 1679h-4564l-913 3827h4565l-413 1738h-6449zm-3121-5860c0-88 29-354 88-766 30-353 59-618 89-854-118 266-236 530-383 824-147 266-324 560-530 825l-4535 6331-1472-6448c-59-265-118-530-148-766-29-235-59-500-59-736-59 236-147 500-235 794-89 266-206 560-354 855l-2650 5831h-1737l5683-12368 1620 7479c29 118 59 324 89 589 29 266 88 619 147 1031 206-353 471-765 825-1296 88-146 176-235 206-324l5124-7479-177 12368h-1737l148-5890zm-17933 5860l1296-5418-2356-6420h1972l1472 4035c30 117 59 235 118 411 59 178 89 354 147 530 118-176 236-353 354-530 118-176 236-324 353-471l3446-3975h1884l-5506 6390-1296 5417h-1885v30zm-8746-4682h3209l-530-2710c-30-176-59-383-59-589-30-235-30-471-30-736-118 265-236 500-383 736-118 235-235 442-354 619l-1855 2680zm4063 4682l-589-3062h-4594l-2061 3062h-1973l8540-12338 2650 12338h-1973zm-11808-6920h471c1031 0 1767-118 2179-354 412-235 677-647 825-1237 146-618 58-1089-236-1324-324-265-972-383-1943-383h-471l-825 3299zm-501 1590l-1266 5330h-1767l2827-11868h2856c854 0 1443 59 1826 147s678 236 913 471c294 265 500 648 589 1119 88 472 59 972-59 1531-147 560-353 1090-677 1561s-707 854-1119 1119c-353 206-736 382-1148 471-412 88-1060 148-1885 148h-1089v-30zm-17580 3563h1590c854 0 1531-59 2003-176 471-117 883-324 1266-589 530-383 972-854 1325-1443 354-560 619-1237 795-2002 176-766 235-1414 147-1972-88-561-294-1061-648-1444-265-294-589-471-1030-589-442-118-1119-176-2091-176h-1354l-2003 8392zm-2297 1767l2828-11868h2532c1649 0 2798 88 3415 265 619 177 1148 442 1561 854 530 530 884 1208 1031 2002 147 825 88 1767-147 2798-266 1060-648 1972-1178 2796-530 825-1207 1473-2002 2003-589 413-1237 678-1944 854-677 177-1708 265-3063 265h-3033v30zm-8628 0l2827-11868h6449l-383 1649h-4565l-707 2974h4565l-412 1679h-4565l-913 3827h4565l-412 1738h-6449zm-4565 0l2827-11868h1884l-2827 11868h-1885zm-8540 0l2827-11868h6449l-383 1649h-4564l-707 2945h4564l-412 1679h-4565l-1325 5565h-1885v30zm-4565 0l2827-11868h1884l-2827 11868h-1885zm-13015 0l2944-12338 5595 7244c147 206 294 413 442 648 147 235 294 501 471 794l1973-8216h1737l-2944 12310-5713-7392c-147-206-294-412-442-619-147-235-265-442-353-707l-1973 8245h-1737v30z"
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
        {/* N */}
        <g transform="translate(452.06,309.60001)">
          <path
            d="M 0,0 H -21.629999 L -41.490002,71.519997 -128.64999,0.16 l -30.28,109.36 H -137.14 L -117.6,38.490002 -30.440001,109.84 Z"
            fill="currentColor"
          />
        </g>
        {/* P */}
        <g transform="translate(593.53998,312.81)">
          <path
            d="m 0,0 c -1.44,-2.08 -3.69,-3.05 -6.89,-3.05 h -119.2 l -5.93,21.330001 h 108.470001 l -6.41,22.769998 H -138.27 L -156.38,106.15 h 21.63 l 12.18,-43.780001 h 97.58 c 3.039999,0 5.92,-0.959999 8.65,-3.039997 2.56,-2.09 4.32,-4.650002 5.28,-7.700001 L 0.96,7.86 C 1.92,4.81 1.6,2.09 0,0 Z"
            fill="currentColor"
          />
        </g>
        {/* C */}
        <g transform="translate(715.95001,408.04999)">
          <path
            d="m 0,0 c -0.8,3.05 -2.56,5.62 -5.29,7.7 -2.72,2.09 -5.45,3.21 -8.49,3.21 h -108.79 c -3.04,0 -5.29,-1.12 -6.73,-3.21 -1.59999,-2.08 -1.92,-4.65 -0.95999,-7.7 L -106.07,-87.379997 c 0.8,-3.050003 2.57,-5.610001 5.13,-7.700005 2.719999,-2.239998 5.609998,-3.209999 8.649999,-3.209999 H 16.34 c 3.209999,0 5.450001,0.970001 7.049999,3.050003 C 24.83,-93.150002 25.15,-90.43 24.190001,-87.379997 l -2.880002,10.419998 H -87.32 L -105.75,-10.58 H 3.04 Z"
            fill="currentColor"
          />
        </g>
        {/* I */}
        <g>
          <path
            d="m 750.08002,418.95999 h -21.79004 l 30.28003,-109.03998 h 21.63 z"
            fill="currentColor"
          />
        </g>
        {/* Green Emblem Leaf */}
        <g>
          <path
            d="m 821.21002,309.76001 27.56,54.67999 -57.67999,54.68 z"
            fill="#008B43"
          />
        </g>
        {/* Orange Emblem Leaf */}
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
          {/* Centered, clean payment helper pill */}
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

      {/* Copyable UPI Credentials */}
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

      {/* Fintech-grade Trust Footer (UPI & NPCI official compliance logos) */}
      <div className="flex items-center justify-center gap-3 pt-3.5 border-t border-border/40 select-none">
        <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/40">Secured by</span>
        <UpiLogo className="h-3.5 w-auto text-[#1C1C1C] dark:text-white opacity-40 dark:opacity-60 hover:opacity-90 transition-opacity duration-200" aria-hidden="true" />
        <span className="h-2.5 w-[1px] bg-border/40" />
        <NpciLogo className="h-4 w-auto text-[#1C1C1C] dark:text-white opacity-40 dark:opacity-60 hover:opacity-90 transition-opacity duration-200" aria-hidden="true" />
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