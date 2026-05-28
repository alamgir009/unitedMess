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
    HiOutlineBanknotes
} from 'react-icons/hi2';
import { SiGooglepay } from 'react-icons/si';
import { BsCreditCard2Front } from 'react-icons/bs';
import { cn } from '@/core/utils/helpers/string.helper';
import { Button, Input, Badge, Spinner } from '@/shared/components/ui';
import paymentService from '../../services/payment.service';

const fmt = (n) =>
    Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

const StepLabel = ({ number, label, isActive, isComplete }) => (
    <div className="flex flex-col items-center gap-1">
        <div
            className={cn(
                'w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold transition-all duration-300',
                isComplete && 'bg-primary text-primary-foreground shadow-md shadow-primary/20',
                isActive && 'bg-primary text-primary-foreground shadow-lg shadow-primary/30 ring-2 ring-primary/20',
                !isActive && !isComplete && 'bg-muted text-muted-foreground'
            )}
        >
            {isComplete ? <HiOutlineCheck className="w-4 h-4" /> : <span>{number}</span>}
        </div>
        <span className={cn(
            'text-[10px] font-semibold uppercase tracking-wider transition-colors',
            (isActive || isComplete) ? 'text-foreground' : 'text-muted-foreground'
        )}>
            {label}
        </span>
    </div>
);

const PaymentFlowModal = ({
    isOpen,
    onClose,
    isAdmin,
    activeInvoiceMonth,
    onRazorpayPay,
    onSuccess
}) => {
    const [exiting, setExiting] = useState(false);
    const [shouldRender, setShouldRender] = useState(false);
    const dialogRef = useRef(null);
    const previousFocusRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            previousFocusRef.current = document.activeElement;
            setExiting(false);
            setShouldRender(true);
        } else {
            setExiting(true);
            const timer = setTimeout(() => {
                setShouldRender(false);
                setPayStep(1);
                setUtr('');
                setSelectedMonths([]);
                setIsAdminUpiEdit(false);
                setQrFile(null);
                if (previousFocusRef.current && typeof previousFocusRef.current.focus === 'function') {
                    previousFocusRef.current.focus();
                }
            }, 250);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    useEffect(() => {
        if (!shouldRender || exiting) return;
        const dialog = dialogRef.current;
        if (!dialog) return;

        requestAnimationFrame(() => {
            const focusable = dialog.querySelectorAll(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            if (focusable.length > 0) focusable[0].focus();
            else dialog.focus();
        });

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') { onClose(); return; }
            if (e.key === 'Tab') {
                const focusable = dialog.querySelectorAll(
                    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                );
                if (focusable.length === 0) return;
                const first = focusable[0], last = focusable[focusable.length - 1];
                if (e.shiftKey) {
                    if (document.activeElement === first) { e.preventDefault(); last.focus(); }
                } else {
                    if (document.activeElement === last) { e.preventDefault(); first.focus(); }
                }
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [shouldRender, exiting, onClose]);

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

    const fetchMonths = useCallback(async () => {
        setLoadingMonths(true);
        try {
            const res = await paymentService.getPayableMonths();
            if (res?.success && Array.isArray(res?.data)) {
                setPayableMonths(res.data);
                const activeMonthData = res.data.find(m => m.monthName === activeInvoiceMonth);
                if (activeMonthData && (activeMonthData.status === 'UNPAID' || activeMonthData.status === 'PARTIALLY_PAID')) {
                    setSelectedMonths([activeInvoiceMonth]);
                } else {
                    const firstUnpaid = res.data.find(m => m.status === 'UNPAID' || m.status === 'PARTIALLY_PAID');
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

        const preventZoom = (e) => {
            if (e.touches && e.touches.length > 1) e.preventDefault();
        };
        document.addEventListener('touchmove', preventZoom, { passive: false });

        return () => {
            html.style.overflow = '';
            html.style.position = '';
            html.style.width = '';
            html.style.top = '';
            window.scrollTo(0, scrollY);
            document.removeEventListener('touchmove', preventZoom);
        };
    }, [shouldRender, exiting, fetchMonths, fetchUpiDetails]);

    const copyToClipboard = useCallback(async (text) => {
        try {
            await navigator.clipboard.writeText(text);
            toast.success('UPI ID copied!');
        } catch {
            toast.error('Failed to copy. Please select and copy manually.');
        }
    }, []);

    const handleToggleMonth = useCallback((monthName) => {
        setSelectedMonths(prev =>
            prev.includes(monthName) ? prev.filter(m => m !== monthName) : [...prev, monthName]
        );
    }, []);

    const selectedTotalPayable = useMemo(() =>
        payableMonths
            .filter(m => selectedMonths.includes(m.monthName))
            .reduce((sum, m) => sum + m.remainingAmount, 0)
    , [payableMonths, selectedMonths]);

    const handleSubmitUtr = useCallback(async () => {
        if (!utr.trim()) {
            toast.error('Please enter the Transaction ID (UTR)');
            return;
        }
        if (!/^[a-zA-Z0-9]{8,20}$/.test(utr.trim())) {
            toast.error('UTR must be 8-20 alphanumeric characters.');
            return;
        }
        setSubmittingUpi(true);
        try {
            const res = await paymentService.submitUpiManual({
                months: selectedMonths,
                transactionId: utr.trim(),
                remarks: `Manual UPI transfer for ${selectedMonths.join(', ')}`
            });
            if (res?.success) {
                toast.success('UTR submitted successfully! Pending verification.');
                setPayStep(4);
                if (typeof onSuccess === 'function') onSuccess();
                setTimeout(() => onClose(), 2500);
            }
        } catch (err) {
            toast.error(err?.response?.data?.message ?? 'Failed to submit transaction reference');
        } finally {
            setSubmittingUpi(false);
        }
    }, [utr, selectedMonths, onSuccess, onClose]);

    const handleUpdateUpiConfig = useCallback(async (e) => {
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
                merchantName: editMerchantName
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
    }, [editUpiId, editMerchantName, qrFile, fetchUpiDetails]);

    const handleRazorpayProceed = useCallback(() => {
        if (typeof onRazorpayPay === 'function') {
            onClose();
            onRazorpayPay(selectedTotalPayable, 'mess_bill', selectedMonths);
        }
    }, [onRazorpayPay, onClose, selectedTotalPayable, selectedMonths]);

    if (!shouldRender) return null;

    return (
        <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="payment-dialog-title"
            tabIndex={-1}
            className={cn(
                'fixed inset-0 z-50 flex items-end sm:items-center justify-center',
                'transition-all duration-250 ease-out motion-reduce:transition-none',
                exiting ? 'opacity-0' : 'opacity-100'
            )}
        >
            {/* Backdrop with blur */}
            <div
                onClick={onClose}
                className={cn(
                    'fixed inset-0 bg-black/50 backdrop-blur-sm',
                    'transition-opacity duration-250 motion-reduce:transition-none',
                    exiting ? 'opacity-0' : 'opacity-100'
                )}
            />

            {/* Modal */}
            <div
                className={cn(
                    'relative w-full sm:max-w-lg bg-background',
                    'sm:rounded-2xl rounded-t-2xl',
                    'shadow-2xl border border-border',
                    'overflow-hidden z-10',
                    'max-h-[96vh] sm:max-h-[92vh] flex flex-col',
                    'transition-all duration-250 ease-out motion-reduce:transition-none',
                    'motion-reduce:opacity-100',
                    exiting
                        ? 'opacity-0 translate-y-4 sm:translate-y-2 sm:scale-98'
                        : 'opacity-100 translate-y-0 sm:scale-100'
                )}
                style={{ transform: 'translateZ(0)' }}
            >
                {/* Gradient header strip */}
                <div className="h-1 bg-gradient-to-r from-primary via-primary/80 to-primary/60 shrink-0" />

                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
                    <div className="min-w-0 pr-2">
                        <h3 id="payment-dialog-title" className="text-base font-semibold text-foreground truncate">
                            {isAdminUpiEdit ? 'Setup UPI Billing' : 'Mess Bill Payment'}
                        </h3>
                        {!isAdminUpiEdit && payStep <= 3 && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Step {payStep} of 3 &middot; Secure Checkout
                            </p>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="touch-target flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        aria-label="Close payment dialog"
                    >
                        <HiOutlineXMark className="w-5 h-5" />
                    </button>
                </div>

                {/* Scrollable Body */}
                <div
                    className="flex-1 overflow-y-auto px-5 py-5 space-y-5 no-scrollbar"
                    style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
                >
                    {isAdminUpiEdit ? (
                        <form onSubmit={handleUpdateUpiConfig} className="space-y-5">
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-foreground">UPI ID</label>
                                <Input
                                    type="text"
                                    value={editUpiId}
                                    onChange={(e) => setEditUpiId(e.target.value)}
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
                                    onChange={(e) => setEditMerchantName(e.target.value)}
                                    placeholder="e.g. United Mess"
                                    variant="glass"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-foreground">QR Code Image</label>
                                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border hover:border-primary/50 rounded-xl cursor-pointer bg-muted/20 hover:bg-muted/40 transition-all group">
                                    <div className="flex flex-col items-center justify-center py-4 text-center px-4">
                                        <div className="p-2.5 rounded-xl bg-muted/50 text-muted-foreground group-hover:text-primary transition-colors mb-2">
                                            <HiOutlinePhoto className="w-6 h-6" />
                                        </div>
                                        <p className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors truncate max-w-[260px]">
                                            {qrFile ? qrFile.name : 'Upload QR Image'}
                                        </p>
                                        <p className="text-xs text-muted-foreground/60 mt-0.5">PNG, JPG up to 5MB</p>
                                    </div>
                                    <input type="file" accept="image/*" onChange={(e) => setQrFile(e.target.files[0])} className="hidden" />
                                </label>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <Button
                                    variant="outline"
                                    size="md"
                                    fullWidth
                                    onClick={() => setIsAdminUpiEdit(false)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="primary"
                                    size="md"
                                    fullWidth
                                    isLoading={savingUpiConfig}
                                >
                                    Save Setup
                                </Button>
                            </div>
                        </form>
                    ) : (
                        <>
                            {/* Stepper */}
                            {payStep <= 3 && (
                                <div className="flex items-center justify-between px-1 shrink-0">
                                    <StepLabel number={1} label="Months" isActive={payStep === 1} isComplete={payStep > 1} />
                                    <div className={cn('flex-1 h-0.5 mx-2 rounded-full transition-colors duration-500', payStep > 1 ? 'bg-primary' : 'bg-border')} />
                                    <StepLabel number={2} label="Method" isActive={payStep === 2} isComplete={payStep > 2} />
                                    <div className={cn('flex-1 h-0.5 mx-2 rounded-full transition-colors duration-500', payStep > 2 ? 'bg-primary' : 'bg-border')} />
                                    <StepLabel number={3} label="Pay" isActive={payStep === 3} isComplete={payStep > 3} />
                                </div>
                            )}

                            {/* STEP 1: Month Selection */}
                            {payStep === 1 && (
                                <div className="space-y-4 animate-fade-in">
                                    <div>
                                        <h4 className="text-sm font-semibold text-foreground">Select Billing Cycle</h4>
                                        <p className="text-xs text-muted-foreground mt-0.5">Choose the monthly bills you wish to clear.</p>
                                    </div>

                                    {loadingMonths ? (
                                        <div className="flex justify-center py-10">
                                            <Spinner size="md" />
                                        </div>
                                    ) : (
                                        <div className="space-y-2 max-h-56 overflow-y-auto pr-1 -mr-1">
                                            {payableMonths.length === 0 ? (
                                                <div className="text-center py-8">
                                                    <div className="p-3 rounded-xl bg-muted/30 inline-flex mb-3">
                                                        <HiOutlineReceiptRefund className="w-6 h-6 text-muted-foreground" />
                                                    </div>
                                                    <p className="text-sm font-medium text-foreground">No pending bills</p>
                                                    <p className="text-xs text-muted-foreground mt-0.5">All your bills are paid up to date.</p>
                                                </div>
                                            ) : (
                                                payableMonths.map((m) => {
                                                    const isPaid = m.status === 'PAID';
                                                    const isPendingVer = m.status === 'PENDING_VERIFICATION';
                                                    const isSelected = selectedMonths.includes(m.monthName);
                                                    const isSelectable = !isPaid && !isPendingVer;
                                                    return (
                                                        <div
                                                            key={m.monthName}
                                                            onClick={() => isSelectable && handleToggleMonth(m.monthName)}
                                                            className={cn(
                                                                'group relative flex items-center justify-between p-4 rounded-xl border transition-all duration-200',
                                                                isSelected
                                                                    ? 'border-primary/50 bg-primary/5 shadow-sm shadow-primary/5'
                                                                    : 'border-border hover:border-border/80 bg-card hover:bg-muted/30',
                                                                isSelectable ? 'cursor-pointer' : 'opacity-50 cursor-not-allowed'
                                                            )}
                                                        >
                                                            <div className="flex items-center gap-3 min-w-0">
                                                                <div className={cn(
                                                                    'w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all duration-200',
                                                                    isSelected
                                                                        ? 'border-primary bg-primary text-primary-foreground'
                                                                        : 'border-muted-foreground/30',
                                                                    !isSelectable && 'border-muted-foreground/10'
                                                                )}>
                                                                    {isSelected && <HiOutlineCheck className="w-3.5 h-3.5" />}
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <p className="text-sm font-semibold text-foreground truncate">{m.monthName}</p>
                                                                    <p className="text-xs text-muted-foreground mt-0.5">
                                                                        {isPaid ? 'Fully paid' : isPendingVer ? 'Under review' : `₹${fmt(m.remainingAmount)} remaining`}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <Badge
                                                                variant={
                                                                    isPaid ? 'success' :
                                                                    isPendingVer ? 'warning' :
                                                                    m.status === 'PARTIALLY_PAID' ? 'info' : 'default'
                                                                }
                                                                size="sm"
                                                            >
                                                                {isPaid ? 'Paid' : isPendingVer ? 'Review' : m.status === 'PARTIALLY_PAID' ? 'Partial' : 'Due'}
                                                            </Badge>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                    )}

                                    {/* Amount Summary */}
                                    <div className="glass rounded-xl p-4 flex items-center justify-between gap-4 shrink-0">
                                        <div className="min-w-0">
                                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Amount Due</p>
                                            <p className="text-2xl font-bold text-foreground mt-0.5 font-mono tabular-nums">
                                                ₹{fmt(selectedTotalPayable)}
                                            </p>
                                        </div>
                                        <Button
                                            variant="primary"
                                            size="lg"
                                            onClick={() => setPayStep(2)}
                                            disabled={selectedMonths.length === 0}
                                            className="shrink-0"
                                        >
                                            <span>Next</span>
                                            <HiOutlineArrowRight className="w-4 h-4 ml-1" />
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* STEP 2: Method Selection */}
                            {payStep === 2 && (
                                <div className="space-y-4 animate-fade-in">
                                    <div>
                                        <h4 className="text-sm font-semibold text-foreground">Choose Payment Method</h4>
                                        <p className="text-xs text-muted-foreground mt-0.5">Select how you want to pay.</p>
                                    </div>

                                    <div className="space-y-3">
                                        {/* Razorpay */}
                                        <div
                                            onClick={() => setSelectedMethod('razorpay')}
                                            className={cn(
                                                'relative flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200',
                                                selectedMethod === 'razorpay'
                                                    ? 'border-primary bg-primary/5 shadow-sm shadow-primary/5'
                                                    : 'border-border hover:border-muted-foreground/30 bg-card hover:bg-muted/20'
                                            )}
                                        >
                                            <div className={cn(
                                                'p-3 rounded-xl transition-all duration-200',
                                                selectedMethod === 'razorpay' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                                            )}>
                                                <BsCreditCard2Front className="w-5 h-5" />
                                            </div>
                                            <div className="flex-1 min-w-0 pt-0.5">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <p className="text-sm font-semibold text-foreground">Secure Online Pay</p>
                                                    <Badge variant="primary" size="sm" dot>Instant</Badge>
                                                </div>
                                                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                                    Credit/Debit Cards, Netbanking, GPay/PhonePe via Razorpay SDK.
                                                </p>
                                            </div>
                                            <div className={cn(
                                                'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-1 transition-all',
                                                selectedMethod === 'razorpay' ? 'border-primary' : 'border-muted-foreground/30'
                                            )}>
                                                {selectedMethod === 'razorpay' && (
                                                    <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                                                )}
                                            </div>
                                        </div>

                                        {/* Manual UPI */}
                                        <div
                                            onClick={() => setSelectedMethod('upi')}
                                            className={cn(
                                                'relative flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200',
                                                selectedMethod === 'upi'
                                                    ? 'border-primary bg-primary/5 shadow-sm shadow-primary/5'
                                                    : 'border-border hover:border-muted-foreground/30 bg-card hover:bg-muted/20'
                                            )}
                                        >
                                            <div className={cn(
                                                'p-3 rounded-xl transition-all duration-200',
                                                selectedMethod === 'upi' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                                            )}>
                                                <SiGooglepay className="w-5 h-5" />
                                            </div>
                                            <div className="flex-1 min-w-0 pt-0.5">
                                                <p className="text-sm font-semibold text-foreground">Direct Manual UPI</p>
                                                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                                    Pay to Admin QR or UPI ID directly and submit the 12-digit UTR reference.
                                                </p>
                                            </div>
                                            <div className={cn(
                                                'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-1 transition-all',
                                                selectedMethod === 'upi' ? 'border-primary' : 'border-muted-foreground/30'
                                            )}>
                                                {selectedMethod === 'upi' && (
                                                    <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex gap-3 pt-2 shrink-0">
                                        <Button
                                            variant="outline"
                                            size="md"
                                            fullWidth
                                            onClick={() => setPayStep(1)}
                                        >
                                            <HiOutlineArrowLeft className="w-4 h-4 mr-1" />
                                            Back
                                        </Button>
                                        <Button
                                            variant="primary"
                                            size="md"
                                            fullWidth
                                            onClick={() => setPayStep(3)}
                                        >
                                            Continue
                                            <HiOutlineArrowRight className="w-4 h-4 ml-1" />
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* STEP 3: Pay */}
                            {payStep === 3 && (
                                <div className="space-y-4 animate-fade-in">
                                    <div>
                                        <h4 className="text-sm font-semibold text-foreground">Complete Payment</h4>
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            Total: <span className="font-semibold font-mono text-foreground">₹{fmt(selectedTotalPayable)}</span>
                                        </p>
                                    </div>

                                    {selectedMethod === 'razorpay' ? (
                                        <div className="glass rounded-xl p-6 text-center space-y-5">
                                            <div className="p-4 rounded-2xl bg-primary/5 inline-flex mx-auto">
                                                <HiOutlineShieldCheck className="w-10 h-10 text-primary" />
                                            </div>
                                            <div>
                                                <p className="text-3xl font-bold text-foreground font-mono tabular-nums">₹{fmt(selectedTotalPayable)}</p>
                                                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed max-w-xs mx-auto">
                                                    You will be redirected to Razorpay&apos;s secure checkout to complete the transaction.
                                                </p>
                                            </div>
                                            <Button
                                                variant="primary"
                                                size="lg"
                                                fullWidth
                                                onClick={handleRazorpayProceed}
                                                className="h-12"
                                            >
                                                <HiOutlineLockClosed className="w-4 h-4 mr-1.5" />
                                                Pay ₹{fmt(selectedTotalPayable)} Securely
                                            </Button>
                                            <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                                                <span className="flex items-center gap-1"><HiOutlineCreditCard className="w-3.5 h-3.5" /> Cards</span>
                                                <span className="flex items-center gap-1"><HiOutlineDevicePhoneMobile className="w-3.5 h-3.5" /> UPI</span>
                                                <span className="flex items-center gap-1"><HiOutlineBanknotes className="w-3.5 h-3.5" /> Netbanking</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {loadingUpi ? (
                                                <div className="flex justify-center py-10">
                                                    <Spinner size="md" />
                                                </div>
                                            ) : (
                                                <>
                                                    {/* QR + UPI Info */}
                                                    <div className="glass rounded-xl p-4 space-y-4">
                                                        {upiConfig ? (
                                                            <>
                                                                {upiConfig.qrCodeUrl && !qrCodeError ? (
                                                                    <div className="flex flex-col items-center">
                                                                        <div className="p-2 bg-white rounded-xl shadow-sm border border-border">
                                                                            <img
                                                                                src={upiConfig.qrCodeUrl}
                                                                                alt="UPI QR Code"
                                                                                onError={() => setQrCodeError(true)}
                                                                                loading="lazy"
                                                                                className="w-36 h-36 object-contain"
                                                                            />
                                                                        </div>
                                                                        <div className="flex items-center gap-1.5 mt-2">
                                                                            <HiOutlineDevicePhoneMobile className="w-3.5 h-3.5 text-muted-foreground" />
                                                                            <span className="text-xs text-muted-foreground">Scan with any UPI app</span>
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

                                                                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
                                                                    <div className="min-w-0 pr-2">
                                                                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">UPI ID</p>
                                                                        <p className="text-sm font-semibold text-foreground select-all truncate mt-0.5 font-mono">{upiConfig.upiId}</p>
                                                                        {upiConfig.merchantName && (
                                                                            <p className="text-xs text-muted-foreground mt-0.5 truncate">{upiConfig.merchantName}</p>
                                                                        )}
                                                                    </div>
                                                                    <button
                                                                        onClick={() => copyToClipboard(upiConfig.upiId)}
                                                                        className="touch-target flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                                                        aria-label="Copy UPI ID"
                                                                    >
                                                                        <HiOutlineClipboard className="w-4 h-4" />
                                                                    </button>
                                                                </div>
                                                            </>
                                                        ) : (
                                                            <div className="text-center py-6">
                                                                <p className="text-sm text-muted-foreground">UPI config not available.</p>
                                                                <p className="text-xs text-muted-foreground/60 mt-0.5">Please contact your admin.</p>
                                                            </div>
                                                        )}

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

                                                    {/* UTR Input */}
                                                    <div className="space-y-3">
                                                        <div>
                                                            <label className="text-xs font-semibold text-foreground">Transaction UTR</label>
                                                            <p className="text-xs text-muted-foreground mt-0.5">Enter the 12-digit reference number after payment.</p>
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

                                    <div className="pt-1">
                                        <Button
                                            variant="ghost"
                                            size="md"
                                            fullWidth
                                            onClick={() => setPayStep(2)}
                                        >
                                            <HiOutlineArrowLeft className="w-4 h-4 mr-1" />
                                            Back to methods
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* STEP 4: Success */}
                            {payStep === 4 && (
                                <div className="text-center py-8 space-y-4 animate-fade-in">
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
                                    <div className="pt-2">
                                        <Button variant="outline" size="md" onClick={onClose}>
                                            Close
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default memo(PaymentFlowModal);
