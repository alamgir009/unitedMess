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
    HiOutlineCheck
} from 'react-icons/hi2';
import { SiGooglepay } from 'react-icons/si';
import { BsCreditCard2Front } from 'react-icons/bs';
import { Spinner } from '@/shared/components/ui';
import paymentService from '../../services/payment.service';

const fmt = (n) =>
    Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

const PaymentFlowModal = ({
    isOpen,
    onClose,
    isAdmin,
    activeInvoiceMonth,
    onRazorpayPay,
    onSuccess
}) => {
    // ── Animation & Focus Management (CSS transitions replace framer-motion) ──
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
            }, 200);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    // Focus trap and Escape key
    useEffect(() => {
        if (!shouldRender || exiting) return;
        const dialog = dialogRef.current;
        if (!dialog) return;

        requestAnimationFrame(() => {
            const focusable = dialog.querySelectorAll(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            if (focusable.length > 0) {
                focusable[0].focus();
            } else {
                dialog.focus();
            }
        });

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                onClose();
                return;
            }
            if (e.key === 'Tab') {
                const focusable = dialog.querySelectorAll(
                    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                );
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

    // ── State ──
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

    // ── Data Fetching ──
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

    // Lock scroll when open
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

    // ── Handlers ──
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
            className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none ${exiting ? 'opacity-0' : 'opacity-100'}`}
        >
            {/* Backdrop: solid color, no blur — GPU-friendly */}
            <div
                onClick={onClose}
                className={`fixed inset-0 bg-slate-950/70 transition-opacity duration-200 motion-reduce:transition-none ${exiting ? 'opacity-0' : 'opacity-100'}`}
            />

            {/* Modal box: CSS transitions only, GPU composited via translateZ(0) */}
            <div
                className={`relative w-full max-w-md bg-white dark:bg-slate-900 shadow-2xl rounded-3xl overflow-hidden z-10 max-h-[92vh] flex flex-col border border-slate-100 dark:border-slate-800 transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none motion-reduce:scale-100 motion-reduce:translate-y-0 motion-reduce:opacity-100 ${exiting ? 'opacity-0 scale-95 translate-y-2' : 'opacity-100 scale-100 translate-y-0'}`}
                style={{ transform: 'translateZ(0)' }}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
                    <div>
                        <h3 id="payment-dialog-title" className="text-base font-bold text-slate-950 dark:text-white">
                            {isAdminUpiEdit ? 'Setup UPI Billing' : 'Mess Bill Payment'}
                        </h3>
                        {!isAdminUpiEdit && payStep <= 3 && (
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                Step {payStep} of 3 · Secure Checkout
                            </p>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        aria-label="Close payment dialog"
                    >
                        <HiOutlineXMark className="w-5 h-5" />
                    </button>
                </div>

                {/* Scrollable Container */}
                <div
                    className="flex-1 overflow-y-auto px-6 py-5 custom-scrollbar space-y-5"
                    style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
                >
                    {isAdminUpiEdit ? (
                        /* Admin UPI settings form */
                        <form onSubmit={handleUpdateUpiConfig} className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">UPI ID</label>
                                <input
                                    type="text"
                                    value={editUpiId}
                                    onChange={(e) => setEditUpiId(e.target.value)}
                                    placeholder="e.g. name@upi"
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-white"
                                    required
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Merchant Name</label>
                                <input
                                    type="text"
                                    value={editMerchantName}
                                    onChange={(e) => setEditMerchantName(e.target.value)}
                                    placeholder="e.g. United Mess"
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-white"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">QR Code Image</label>
                                <label className="flex flex-col items-center justify-center w-full h-28 border border-dashed border-slate-200 dark:border-slate-800 hover:border-indigo-500 rounded-xl cursor-pointer bg-slate-50/20 hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-all">
                                    <div className="flex flex-col items-center justify-center py-4 text-center">
                                        <HiOutlinePhoto className="w-7 h-7 text-slate-400 mb-1" />
                                        <p className="text-xs text-slate-500 font-semibold px-2 truncate max-w-[280px]">
                                            {qrFile ? qrFile.name : 'Upload QR Image'}
                                        </p>
                                    </div>
                                    <input type="file" accept="image/*" onChange={(e) => setQrFile(e.target.files[0])} className="hidden" />
                                </label>
                            </div>
                            <div className="flex gap-3 pt-3">
                                <button
                                    type="button"
                                    onClick={() => setIsAdminUpiEdit(false)}
                                    className="flex-1 py-2.5 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={savingUpiConfig}
                                    className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 flex items-center justify-center gap-1.5 transition-all"
                                >
                                    {savingUpiConfig ? <Spinner size="sm" color="white" /> : 'Save Setup'}
                                </button>
                            </div>
                        </form>
                    ) : (
                        /* User Checkout Steps */
                        <>
                            {/* Stepper Progress Bar */}
                            {payStep <= 3 && (
                                <div className="flex items-center justify-between max-w-xs mx-auto shrink-0 mb-6">
                                    <div className="flex flex-col items-center">
                                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold transition-colors ${payStep >= 1 ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>1</div>
                                        <span className="text-[9px] font-bold text-slate-500 mt-1 uppercase tracking-wide">Months</span>
                                    </div>
                                    <div className={`flex-1 h-0.5 mx-2 transition-colors ${payStep >= 2 ? 'bg-indigo-600' : 'bg-slate-100 dark:bg-slate-800'}`} />
                                    <div className="flex flex-col items-center">
                                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold transition-colors ${payStep >= 2 ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>2</div>
                                        <span className="text-[9px] font-bold text-slate-500 mt-1 uppercase tracking-wide">Method</span>
                                    </div>
                                    <div className={`flex-1 h-0.5 mx-2 transition-colors ${payStep >= 3 ? 'bg-indigo-600' : 'bg-slate-100 dark:bg-slate-800'}`} />
                                    <div className="flex flex-col items-center">
                                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold transition-colors ${payStep >= 3 ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>3</div>
                                        <span className="text-[9px] font-bold text-slate-500 mt-1 uppercase tracking-wide">Pay</span>
                                    </div>
                                </div>
                            )}

                            {/* STEP 1: MONTH SELECTION */}
                            {payStep === 1 && (
                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Select Billing Cycle</h4>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">Choose the monthly bills you wish to clear.</p>
                                    </div>

                                    {loadingMonths ? (
                                        <div className="flex justify-center py-8"><Spinner size="md" /></div>
                                    ) : (
                                        <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                                            {payableMonths.length === 0 ? (
                                                <div className="text-center py-6 text-xs text-slate-400">No pending bills found.</div>
                                            ) : (
                                                payableMonths.map((m) => {
                                                    const isAlreadyPaid = m.status === 'PAID';
                                                    const isPendingVer = m.status === 'PENDING_VERIFICATION';
                                                    const isSelected = selectedMonths.includes(m.monthName);
                                                    const isSelectable = !isAlreadyPaid && !isPendingVer;
                                                    return (
                                                        <div
                                                            key={m.monthName}
                                                            onClick={() => isSelectable && handleToggleMonth(m.monthName)}
                                                            className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${isSelected ? 'border-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/10' : 'border-slate-100 dark:border-slate-700 hover:border-slate-200 dark:hover:border-slate-600 bg-slate-50/20 dark:bg-slate-900/10'} ${isSelectable ? 'cursor-pointer' : 'opacity-55 cursor-not-allowed'}`}
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={isSelected}
                                                                    disabled={!isSelectable}
                                                                    onChange={() => {}}
                                                                    className="w-4 h-4 rounded text-indigo-600 border-slate-300 cursor-pointer disabled:cursor-not-allowed"
                                                                />
                                                                <div>
                                                                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{m.monthName}</p>
                                                                    <p className="text-[10px] text-slate-500 mt-0.5">₹{fmt(m.remainingAmount)} remaining</p>
                                                                </div>
                                                            </div>
                                                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase ${isAlreadyPaid ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20' : isPendingVer ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20' : m.status === 'PARTIALLY_PAID' ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20' : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800'}`}>
                                                                {isAlreadyPaid ? 'Paid' : isPendingVer ? 'Reviewing' : m.status === 'PARTIALLY_PAID' ? 'Partial' : 'Unpaid'}
                                                            </span>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                    )}

                                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-between border border-slate-100 dark:border-slate-700 mt-4 shrink-0">
                                        <div>
                                            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Amount due</p>
                                            <p className="text-xl font-black text-slate-950 dark:text-white mt-0.5">₹{fmt(selectedTotalPayable)}</p>
                                        </div>
                                        <button
                                            onClick={() => setPayStep(2)}
                                            disabled={selectedMonths.length === 0}
                                            className="flex items-center gap-1.5 px-4.5 py-2.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/15 hover:shadow-lg disabled:opacity-50 transition-all duration-200"
                                        >
                                            <span>Next</span>
                                            <HiOutlineArrowRight className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* STEP 2: METHOD SELECTION */}
                            {payStep === 2 && (
                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Choose Gateway</h4>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">Select payment channel method.</p>
                                    </div>
                                    <div className="space-y-2">
                                        {/* Razorpay Option */}
                                        <div
                                            onClick={() => setSelectedMethod('razorpay')}
                                            className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${selectedMethod === 'razorpay' ? 'border-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/10' : 'border-slate-100 dark:border-slate-700 hover:border-slate-200 dark:hover:border-slate-600'}`}
                                        >
                                            <div className={`p-2.5 rounded-xl ${selectedMethod === 'razorpay' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'} dark:bg-slate-800`}>
                                                <BsCreditCard2Front className="w-4 h-4" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-1.5">
                                                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Secure Online Pay</p>
                                                    <span className="text-[8px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-full border border-indigo-100 dark:bg-indigo-950/25">Instant</span>
                                                </div>
                                                <p className="text-[11px] text-slate-500 mt-0.5 leading-normal">Cards, Netbanking, GooglePay/PhonePe via Razorpay SDK checkout.</p>
                                            </div>
                                        </div>
                                        {/* Manual UPI Option */}
                                        <div
                                            onClick={() => setSelectedMethod('upi')}
                                            className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${selectedMethod === 'upi' ? 'border-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/10' : 'border-slate-100 dark:border-slate-700 hover:border-slate-200 dark:hover:border-slate-600'}`}
                                        >
                                            <div className={`p-2.5 rounded-xl ${selectedMethod === 'upi' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'} dark:bg-slate-800`}>
                                                <SiGooglepay className="w-4.5 h-4.5" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Direct Manual UPI</p>
                                                <p className="text-[11px] text-slate-500 mt-0.5 leading-normal">Pay to Admin QR or UPI ID directly and paste the 12-digit UTR ref.</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-3 pt-3 shrink-0">
                                        <button
                                            onClick={() => setPayStep(1)}
                                            className="flex-1 flex items-center justify-center gap-1 py-2.5 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-all"
                                        >
                                            <HiOutlineArrowLeft className="w-3.5 h-3.5" /><span>Back</span>
                                        </button>
                                        <button
                                            onClick={() => setPayStep(3)}
                                            className="flex-1 flex items-center justify-center gap-1 py-2.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/15 hover:shadow-lg transition-all"
                                        >
                                            <span>Continue</span><HiOutlineArrowRight className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* STEP 3: PAY SUMMARY & DETAILS */}
                            {payStep === 3 && (
                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Complete Settlement</h4>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">Total payable amount: ₹{fmt(selectedTotalPayable)}</p>
                                    </div>

                                    {selectedMethod === 'razorpay' ? (
                                        /* Razorpay Checkout Trigger */
                                        <div className="p-4.5 rounded-2xl bg-slate-50/50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-center space-y-4">
                                            <div className="space-y-1">
                                                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Payable amount</p>
                                                <p className="text-2xl font-black text-slate-950 dark:text-white">₹{fmt(selectedTotalPayable)}</p>
                                            </div>
                                            <p className="text-xs text-slate-500 leading-normal max-w-xs mx-auto">Click below to trigger the secure Razorpay Checkout SDK and complete your transaction.</p>
                                            <button onClick={handleRazorpayProceed} className="w-full flex items-center justify-center gap-1.5 py-3 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 transition-all">
                                                <HiOutlineShieldCheck className="w-4 h-4" /><span>Pay Online ₹{fmt(selectedTotalPayable)}</span>
                                            </button>
                                        </div>
                                    ) : (
                                        /* Manual UPI Transfer */
                                        <div className="space-y-4">
                                            {loadingUpi ? (
                                                <div className="flex justify-center py-8"><Spinner size="md" /></div>
                                            ) : (
                                                <div className="space-y-4">
                                                    <div className="p-3.5 rounded-2xl border border-slate-100 dark:border-slate-700 bg-slate-50/20 dark:bg-slate-900/10 space-y-3.5">
                                                        {upiConfig ? (
                                                            <>
                                                                {upiConfig.qrCodeUrl && !qrCodeError ? (
                                                                    <div className="flex flex-col items-center">
                                                                        <img
                                                                            src={upiConfig.qrCodeUrl}
                                                                            alt="Direct UPI QR Code"
                                                                            onError={() => setQrCodeError(true)}
                                                                            loading="lazy"
                                                                            className="w-40 h-40 rounded-xl object-contain border border-slate-100 dark:border-slate-800 bg-white p-1"
                                                                        />
                                                                        <span className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-wide">Scan with GPay/PhonePe</span>
                                                                    </div>
                                                                ) : (
                                                                    <div className="p-2.5 text-center text-xs text-slate-400 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/20">Scan QR image not configured by admin.</div>
                                                                )}
                                                                <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
                                                                    <div className="min-w-0 pr-2">
                                                                        <p className="text-[8px] font-bold text-slate-400 uppercase">UPI ID</p>
                                                                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 select-all truncate">{upiConfig.upiId}</p>
                                                                        <p className="text-[9px] text-slate-500 mt-0.5 truncate">{upiConfig.merchantName}</p>
                                                                    </div>
                                                                    <button onClick={() => copyToClipboard(upiConfig.upiId)} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-600 transition-colors">
                                                                        <HiOutlineClipboard className="w-4 h-4" />
                                                                    </button>
                                                                </div>
                                                            </>
                                                        ) : (
                                                            <div className="text-center py-4 text-xs text-slate-400 border rounded-xl">UPI config not available. Contact admin.</div>
                                                        )}
                                                        {isAdmin && (
                                                            <button type="button" onClick={() => setIsAdminUpiEdit(true)} className="w-full flex items-center justify-center gap-1 py-2 px-3 rounded-lg text-xs font-semibold border border-indigo-200 dark:border-indigo-900 text-indigo-600 dark:text-indigo-400 bg-indigo-50/20 hover:bg-indigo-50/50 transition-colors">
                                                                <HiOutlinePencil className="w-3.5 h-3.5" /><span>Setup UPI ID & QR (Admin)</span>
                                                            </button>
                                                        )}
                                                    </div>
                                                    <div className="space-y-2.5">
                                                        <div className="space-y-0.5">
                                                            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Transaction UTR (12 Digits)</label>
                                                            <p className="text-[10px] text-slate-500 leading-normal">Enter the 12-digit transaction number after transfer.</p>
                                                        </div>
                                                        <input
                                                            type="text"
                                                            value={utr}
                                                            onChange={(e) => setUtr(e.target.value)}
                                                            placeholder="e.g. 123456789012"
                                                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-white"
                                                            required
                                                        />
                                                        <button
                                                            onClick={handleSubmitUtr}
                                                            disabled={submittingUpi || !utr.trim()}
                                                            className="w-full flex items-center justify-center gap-1.5 py-3 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                                        >
                                                            {submittingUpi ? <Spinner size="sm" color="white" /> : <HiOutlineCheck className="w-4 h-4" />}
                                                            <span>Submit Reference</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    <div className="pt-1">
                                        <button onClick={() => setPayStep(2)} className="w-full flex items-center justify-center gap-1 py-2.5 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-all">
                                            <HiOutlineArrowLeft className="w-3.5 h-3.5" /><span>Back</span>
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* STEP 4: SUCCESS CONFIRMATION */}
                            {payStep === 4 && (
                                <div className="text-center py-6 space-y-3 shrink-0">
                                    <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
                                        <HiOutlineCheckCircle className="w-8 h-8" />
                                    </div>
                                    <div className="space-y-1">
                                        <h4 className="text-sm font-bold text-slate-950 dark:text-white">Reference Submitted!</h4>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 px-4 leading-relaxed">Your payment reference UTR was received. The administrator will review and verify your bill shortly.</p>
                                    </div>
                                    <div className="pt-4">
                                        <div className="inline-flex items-center gap-1.5 text-[10px] text-slate-400 bg-slate-50 dark:bg-slate-800 px-3 py-2 rounded-full border border-slate-100 dark:border-slate-700">
                                            <Spinner size="xs" /><span>Syncing ledger dashboard…</span>
                                        </div>
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
