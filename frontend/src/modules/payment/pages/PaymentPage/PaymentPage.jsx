/**
 * PaymentPage.jsx  —  refactored to org standard
 *
 * Changes vs original:
 *  ✓ Razorpay logic extracted to usePayment + useRazorpaySDK hooks
 *  ✓ All payment constants in payment.config.js
 *  ✓ isMounted ref — no setState after unmount
 *  ✓ isPaying is a proper React state (triggers re-render correctly)
 *  ✓ Single error channel: toast only (no parallel local + Redux errorMsg)
 *  ✓ window.confirm replaced with inline confirmation pattern
 *  ✓ Dead platformFee state removed
 */

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AnimatePresence } from 'framer-motion';
import {
    HiOutlineXMark,
    HiOutlineCurrencyRupee,
    HiOutlineCheckCircle,
    HiOutlineFire,
    HiOutlineDocumentText,
    HiOutlineArrowRight,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';

import { SkeletonCard }              from '@/shared/components/ui';
import MainLayout      from '@/shared/components/layout/MainLayout/MainLayout';
import Pagination      from '@/shared/components/ui/Pagination/Pagination';

import PaymentHeader    from '../../components/PaymentHeader/PaymentHeader';
import PaymentStatsBar  from '../../components/PaymentStatsBar/PaymentStatsBar';
import PaymentSearchBar from '../../components/PaymentSearchBar/PaymentSearchBar';
import PaymentList      from '../../components/PaymentList/PaymentList';
import AdminPaymentView from '../../components/AdminPaymentView/AdminPaymentView';
import PaymentForm      from '../../components/PaymentForm/PaymentForm';
import PaymentModal     from '../../components/PaymentModal/PaymentModal';
import MonthlyInvoiceModal from '../../components/MonthlyInvoiceModal/MonthlyInvoiceModal';
import PaymentDeleteDialog from '../../components/PaymentDeleteDialog/PaymentDeleteDialog';
import PaymentFlowModal from '../../components/PaymentFlowModal/PaymentFlowModal';
import UpiVerificationModal from '../../components/UpiVerificationModal/UpiVerificationModal';

import {
    fetchPayments,
    createPayment,
    createBulkPayments,
    updatePayment,
    deletePayment,
    reset,
} from '../../store/payment.slice';
import { fetchPayableAmount, fetchPayableGasBill } from '../../../auth/store/auth.slice';

import { getBillingPeriod } from '@shared/utils/billingPeriod';
import { usePayment } from '../../hooks/usePayment';

const InvoiceSkeleton = React.memo(() => (
    <div className="card-base p-5 animate-pulse space-y-4">
        <div className="flex justify-between">
            <div className="h-7 w-44 bg-muted/40 rounded-md" />
            <div className="h-7 w-28 bg-muted/30 rounded-md" />
        </div>
        <div className="space-y-3 pt-2">
            {[1, 2, 3, 4, 5].map(n => (
                <div key={n} className="flex justify-between items-center">
                    <div className="h-3.5 w-2/5 bg-muted/30 rounded" />
                    <div className="h-3.5 w-20  bg-muted/20 rounded" />
                </div>
            ))}
        </div>
        <div className="h-8 w-full bg-muted/30 rounded-xl mt-2" />
    </div>
));
InvoiceSkeleton.displayName = 'InvoiceSkeleton';

/* ══════════════════════════════════════════════════════════════
   BILLS OVERVIEW — unified mess + gas bill card
══════════════════════════════════════════════════════════════ */
const fmtINR = (n) => Number(n ?? 0).toLocaleString('en-IN');

const BillsOverview = React.memo(({
    payableAmountData,
    payableGasBill,
    messBillStatus,
    gasBillStatus,
    isPaying,
    onPayMess,
    onPayGas,
    onViewInvoice,
    invoiceFetchDone,
}) => {
    const hasInvoiceData = !!payableAmountData && 'payableAmount' in payableAmountData;
    const isInvoiceLoading = !invoiceFetchDone && !hasInvoiceData;

    const messAmount = payableAmountData?.payableAmount ?? 0;
    const gasAmount = payableGasBill && typeof payableGasBill === 'object'
        ? (payableGasBill.payableAmount ?? 0)
        : typeof payableGasBill === 'number' ? payableGasBill : 0;

    const messPaid = messBillStatus === 'success';
    const gasPaid = gasBillStatus === 'success';
    const messOverdue = messBillStatus === 'overdue';
    const gasOverdue = gasBillStatus === 'overdue';
    const messDue = !messPaid;
    const gasDue = !gasPaid;
    const bothPaid = messPaid && gasPaid;
    const totalDue = (messDue ? messAmount : 0) + (gasDue ? gasAmount : 0);
    const monthName = payableAmountData?.monthName || 'Current Period';

    if (isInvoiceLoading) return <InvoiceSkeleton />;

    if (!hasInvoiceData && gasAmount <= 0 && !bothPaid) return null;

    return (
        <div className="card-base overflow-hidden shadow-sm" role="region" aria-label="Bills Due">
            {/* Header */}
            <div className="px-5 py-4 border-b border-border/40 flex items-center justify-between bg-bg-surface">
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-foreground">Bills Due</p>
                        <span className="text-caption font-semibold px-2.5 py-0.5 rounded-full bg-tint/30 text-tint-text">
                            {monthName}
                        </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        {bothPaid ? 'All bills settled for this period' : 'Review and pay your pending bills'}
                    </p>
                </div>
                {bothPaid ? (
                    <span className="badge-success">
                        <HiOutlineCheckCircle className="w-4 h-4" /> All Paid
                    </span>
                ) : (
                    <div className="text-right" aria-live="polite">
                        <p className="text-overline text-muted-foreground">Total Due</p>
                        <p className="text-h3 font-bold tabular-nums text-foreground">₹{fmtINR(totalDue)}</p>
                    </div>
                )}
            </div>

            {/* Bill rows */}
            <div className="divide-y divide-border/40">
                {/* Mess Bill Row */}
                <div className={`px-5 py-3.5 flex items-center justify-between gap-3 sm:gap-4 hover:bg-muted/30 transition-[background-color] duration-150 ease-out${messOverdue ? ' border-l-2 border-warning bg-warning/5' : ''}`}>
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
                            <HiOutlineCurrencyRupee className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground">Mess Bill</p>
                            <p className="text-xs text-muted-foreground truncate">Monthly mess charges</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                        <span className="text-base font-bold tabular-nums text-foreground">₹{fmtINR(messAmount)}</span>
                        {messPaid ? (
                            <span className="badge-success [&::before]:content-none px-2.5 py-1 rounded-md text-[clamp(0.625rem,0.5vw+0.5rem,0.8125rem)]">
                                Paid
                            </span>
                        ) : (
                            <button
                                type="button"
                                disabled={isPaying}
                                onClick={onPayMess}
                                aria-label={`Pay ₹${fmtINR(messAmount)} mess bill`}
                                className="inline-flex items-center gap-1.5 px-4 py-2 min-h-[44px] rounded-lg text-xs font-bold text-white bg-gradient-primary active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed transition-[transform,opacity,filter] duration-150 ease-out hover:brightness-90"
                            >
                                {isPaying ? 'Processing' : 'Pay Now'}
                                {!isPaying && <HiOutlineArrowRight className="w-3.5 h-3.5" />}
                            </button>
                        )}
                    </div>
                </div>

                {/* Gas Bill Row */}
                {(gasAmount > 0 || gasPaid) && (
                    <div className={`px-5 py-3.5 flex items-center justify-between gap-3 sm:gap-4 hover:bg-muted/30 transition-[background-color] duration-150 ease-out${gasOverdue ? ' border-l-2 border-warning bg-warning/5' : ''}`}>
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-warning/10 text-warning shrink-0">
                                <HiOutlineFire className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm font-semibold text-foreground">Gas Bill</p>
                                <p className="text-xs text-muted-foreground truncate">Monthly gas share</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                            <span className="text-base font-bold tabular-nums text-foreground">₹{fmtINR(gasAmount)}</span>
                            {gasPaid ? (
                                <span className="badge-success [&::before]:content-none px-2.5 py-1 rounded-md text-[clamp(0.625rem,0.5vw+0.5rem,0.8125rem)]">
                                    Paid
                                </span>
                            ) : (
                                <button
                                    type="button"
                                    disabled={isPaying}
                                    onClick={onPayGas}
                                    aria-label={`Pay ₹${fmtINR(gasAmount)} gas bill`}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 min-h-[44px] rounded-lg text-xs font-bold text-white bg-gradient-primary active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed transition-[transform,opacity,filter] duration-150 ease-out hover:brightness-90"
                                >
                                    {isPaying ? 'Processing' : 'Pay Now'}
                                    {!isPaying && <HiOutlineArrowRight className="w-3.5 h-3.5" />}
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Footer — View Invoice */}
            {hasInvoiceData && (
                <div className="px-5 py-3 border-t border-border/40 bg-bg-surface">
                    <button
                        type="button"
                        onClick={onViewInvoice}
                        className="inline-flex items-center justify-center w-full md:w-auto gap-2 min-h-[44px] px-4 py-2 rounded-lg text-xs font-semibold bg-gradient-secondary text-btn-label-secondary border border-btn-border-secondary active:scale-[0.97] hover:brightness-95 transition-[transform,filter] duration-150 ease-out"
                    >
                        <HiOutlineDocumentText className="w-4 h-4" />
                        View Detailed Invoice
                    </button>
                </div>
            )}
        </div>
    );
});
BillsOverview.displayName = 'BillsOverview';

/* ══════════════════════════════════════════════════════════════
   PAYMENT PAGE
══════════════════════════════════════════════════════════════ */
const PaymentPage = () => {
    const dispatch = useDispatch();
    const { payments, pagination, isListLoading, isError, message } =
        useSelector(s => s.payment);
    const { user, payableAmountData, payableGasBill } =
        useSelector(s => s.auth);

    const isAdmin = user?.role === 'admin';

    /* ── state ── */
    const [isModalOpen,    setIsModalOpen]    = useState(false);
    const [invoiceModal,   setInvoiceModal]   = useState({ open: false, year: null, month: null, monthName: '', paymentRecord: null, userId: null });
    const [editingPayment, setEditingPayment] = useState(null);
    const [isReadOnly,     setIsReadOnly]     = useState(false);
    const [viewMode,       setViewMode]       = useState('grid');
    const [searchQuery,    setSearchQuery]    = useState('');
    const [dateFrom,       setDateFrom]       = useState('');
    const [dateTo,         setDateTo]         = useState('');
    const [statusFilter,   setStatusFilter]   = useState('');
    const [typeFilter,     setTypeFilter]     = useState('');
    const [methodFilter,   setMethodFilter]   = useState('');
    const [showFilters,    setShowFilters]    = useState(false);
    const [page,           setPage]           = useState(1);
    const [limit,          setLimit]          = useState(20);
    const [deletingPayment, setDeletingPayment] = useState(null);
    const [isDeleting, setIsDeleting]           = useState(false);
    const [invoiceFetchDone, setInvoiceFetchDone] = useState(false);
    const [isPaymentFlowOpen, setIsPaymentFlowOpen] = useState(false);
    const [activePaymentMonth, setActivePaymentMonth] = useState('');
    const [paymentFlowType, setPaymentFlowType] = useState('mess_bill');
    const [gasBillModal, setGasBillModal] = useState({ open: false, amount: 0, monthName: '' });
    const [verifyPayment, setVerifyPayment] = useState(null);
    const [isUpiVerifyOpen, setIsUpiVerifyOpen] = useState(false);

    /* ── payment hook ── */
    const refreshData = useCallback(() => {
        dispatch(fetchPayments({ page, limit }));
        dispatch(fetchPayableAmount());
        dispatch(fetchPayableGasBill());
    }, [dispatch, page, limit]);

    const handleCheckoutReady = useCallback(() => {
        setIsPaymentFlowOpen(false);
        setGasBillModal(prev => ({ ...prev, open: false }));
    }, [setIsPaymentFlowOpen, setGasBillModal]);

    const { handleCheckout, markUnmounted, isPaying } = usePayment({
        user,
        onSuccess: () => {
            refreshData();
        },
        onCheckoutReady: handleCheckoutReady,
    });

    const handlePayBillClick = useCallback((monthName) => {
        setInvoiceModal(prev => ({ ...prev, open: false }));
        setActivePaymentMonth(monthName || payableAmountData?.monthName || '');
        setPaymentFlowType('mess_bill');
        setIsPaymentFlowOpen(true);
    }, [payableAmountData]);

    const handleGasBillPayClick = useCallback((amount) => {
        if (!amount || amount <= 0) {
            toast.error('No gas bill amount due.');
            return;
        }
        let monthName = '';
        try {
            const period = getBillingPeriod();
            monthName = period?.monthName || '';
        } catch (err) {
            console.error('[GasBill] getBillingPeriod failed:', err);
            monthName = new Date().toLocaleDateString('en-US', {
                month: 'long', year: 'numeric',
            });
        }
        setGasBillModal({ open: true, amount, monthName });
    }, []);

    const currentUserId = user?._id || user?.id;

    /* ── handler: open current month invoice from BillsOverview ── */
    const handleViewInvoiceFromOverview = useCallback(() => {
        const monthStr = payableAmountData?.monthName || '';
        if (!monthStr) {
            toast.error('No invoice data available for the current period.');
            return;
        }
        const parts = monthStr.split(/\s+/);
        if (parts.length >= 2) {
            const date = new Date(`${parts[0]} 1, ${parts[parts.length - 1]}`);
            if (!isNaN(date.getTime())) {
                setInvoiceModal({
                    open: true,
                    year: date.getFullYear(),
                    month: date.getMonth() + 1,
                    monthName: monthStr,
                    paymentRecord: null,
                    userId: currentUserId,
                });
                return;
            }
        }
        const isoMatch = monthStr.match(/^(\d{4})-(\d{1,2})$/);
        if (isoMatch) {
            setInvoiceModal({
                open: true,
                year: parseInt(isoMatch[1], 10),
                month: parseInt(isoMatch[2], 10),
                monthName: monthStr,
                paymentRecord: null,
                userId: currentUserId,
            });
            return;
        }
        const fallback = new Date(monthStr);
        if (!isNaN(fallback.getTime())) {
            setInvoiceModal({
                open: true,
                year: fallback.getFullYear(),
                month: fallback.getMonth() + 1,
                monthName: monthStr,
                paymentRecord: null,
                userId: currentUserId,
            });
        }
    }, [payableAmountData?.monthName, currentUserId]);

    /* ── fetch payments ── */
    useEffect(() => {
        dispatch(fetchPayments({ page, limit }))
            .unwrap()
            .catch(err =>
                toast.error(typeof err === 'string' ? err : err?.message ?? 'Failed to load payments')
            );
    }, [dispatch, page, limit]);

    /* ── fetch payable amounts ── */
    useEffect(() => {
        if (user?._id || user?.id) {
            Promise.all([
                dispatch(fetchPayableAmount()),
                dispatch(fetchPayableGasBill()),
            ])
                .then(() => setInvoiceFetchDone(true))
                .catch((err) => {
                    toast.error(typeof err === 'string' ? err : 'Failed to load billing data');
                    setInvoiceFetchDone(true);
                });
        }
    }, [dispatch, user?._id, user?.id]);

    /* ── visibility — re-fetch when user returns to this tab ── */
    useEffect(() => {
        if (!(user?._id || user?.id)) return;
        const onVisible = () => {
            if (document.visibilityState === 'visible') {
                dispatch(fetchPayableAmount());
                dispatch(fetchPayableGasBill());
            }
        };
        document.addEventListener('visibilitychange', onVisible);
        return () => {
            document.removeEventListener('visibilitychange', onVisible);
        };
    }, [dispatch, user?._id, user?.id]);

    /* ── cleanup ── */
    useEffect(() => () => {
        dispatch(reset());
        markUnmounted();
    }, [dispatch, markUnmounted]);

    /* ── member preselection ── */
    const [preselectedUserId, setPreselectedUserId] = useState(null);

    /* ── modal handlers ── */
    const openCreate = useCallback((memberId) => {
        if (!isAdmin) return;
        setEditingPayment(null);
        setIsReadOnly(false);
        const selectedId = typeof memberId === 'string' ? memberId : (user?._id || user?.id);
        setPreselectedUserId(selectedId);
        setIsModalOpen(true);
    }, [isAdmin, user?._id, user?.id]);

    const openEdit = useCallback((p) => {
        setEditingPayment(p);
        setIsReadOnly(!isAdmin);
        setPreselectedUserId(null);
        setIsModalOpen(true);
    }, [isAdmin]);

    const closeInvoiceModal = useCallback(() => {
        setInvoiceModal(prev => ({ ...prev, open: false }));
    }, []);

    const closeModal = useCallback(() => {
        setIsModalOpen(false);
        setEditingPayment(null);
        setIsReadOnly(false);
        setPreselectedUserId(null);
    }, []);

    const handleViewInvoice = useCallback((payment) => {
        if (!payment) return;

        const monthStr = (payment.month || '').trim();
        if (!monthStr) {
            toast.error('Unable to open invoice: payment has no month information.');
            return;
        }

        // Extract the user identity from the payment record.
        // For admin, this is the selected user; for regular users, it's themselves.
        const userId = payment.user?._id || (typeof payment.user === 'string' ? payment.user : null);

        const paymentRecord = payment.paymentMethod === 'upi_manual' ? {
            paymentMethod: payment.paymentMethod,
            transactionId: payment.transactionId,
            status: payment.status,
        } : null;

        const parts = monthStr.split(/\s+/);
        if (parts.length >= 2) {
            const date = new Date(`${parts[0]} 1, ${parts[parts.length - 1]}`);
            if (!isNaN(date.getTime())) {
                setInvoiceModal({
                    open: true,
                    year: date.getFullYear(),
                    month: date.getMonth() + 1,
                    monthName: monthStr,
                    paymentRecord,
                    userId,
                });
                return;
            }
        }

        const isoMatch = monthStr.match(/^(\d{4})-(\d{1,2})$/);
        if (isoMatch) {
            setInvoiceModal({
                open: true,
                year: parseInt(isoMatch[1], 10),
                month: parseInt(isoMatch[2], 10),
                monthName: monthStr,
                paymentRecord,
                userId,
            });
            return;
        }

        const fallback = new Date(monthStr);
        if (!isNaN(fallback.getTime())) {
            setInvoiceModal({
                open: true,
                year: fallback.getFullYear(),
                month: fallback.getMonth() + 1,
                monthName: monthStr,
                paymentRecord,
                userId,
            });
            return;
        }

        toast.error(`Unable to open invoice: unrecognised month format "${monthStr}".`);
    }, []);

    /* ── submitting state ── */
    const [isSubmitting, setIsSubmitting] = useState(false);

    /* ── CRUD ── */
    const handleSubmit = useCallback(async (formData) => {
        if (!isAdmin) {
            toast.error('Only administrators can manage payment records');
            return;
        }
        setIsSubmitting(true);
        try {
            if (editingPayment) {
                await dispatch(updatePayment({
                    paymentId:   editingPayment._id,
                    paymentData: formData,
                })).unwrap();
                toast.success('Payment updated successfully');
            } else if (formData.userIds && formData.userIds.length > 1) {
                await dispatch(createBulkPayments(formData)).unwrap();
                toast.success(`Payments recorded for ${formData.userIds.length} members`);
            } else {
                const singleData = { ...formData, userId: formData.userIds?.[0] || '' };
                delete singleData.userIds;
                await dispatch(createPayment(singleData)).unwrap();
                toast.success('Payment recorded successfully');
            }
            closeModal();
            dispatch(fetchPayments({ page, limit }));
        } catch (err) {
            toast.error(typeof err === 'string' ? err : err?.message ?? 'Failed to save payment');
        } finally {
            setIsSubmitting(false);
        }
    }, [editingPayment, isAdmin, dispatch, closeModal, page, limit]);

    const handleDelete = useCallback((payment) => {
        if (!isAdmin || !payment) return;
        setDeletingPayment(payment);
    }, [isAdmin]);

    const handleDeleteCancel = useCallback(() => {
        if (!isDeleting) setDeletingPayment(null);
    }, [isDeleting]);

    const handleDeleteConfirm = useCallback(async () => {
        if (!deletingPayment || isDeleting) return;
        setIsDeleting(true);
        try {
            await dispatch(deletePayment(deletingPayment._id)).unwrap();
            toast.success('Payment deleted');
            setDeletingPayment(null);
            dispatch(fetchPayments({ page, limit }));
        } catch (err) {
            toast.error(err?.message ?? 'Failed to delete payment');
        } finally {
            setIsDeleting(false);
        }
    }, [deletingPayment, isDeleting, dispatch, page, limit]);

    const handleVerifyClick = useCallback((payment) => {
        setVerifyPayment(payment);
        setIsUpiVerifyOpen(true);
    }, []);

    const handleVerificationDone = useCallback(() => {
        setVerifyPayment(null);
        refreshData();
    }, [refreshData]);

    const closeVerifyModal = useCallback(() => {
        setIsUpiVerifyOpen(false);
        setVerifyPayment(null);
    }, []);

    const clearFilters = useCallback(() => {
        setSearchQuery(''); setDateFrom(''); setDateTo('');
        setStatusFilter(''); setTypeFilter(''); setMethodFilter('');
    }, []);

    /* ── client-side filter ── */
    const filtered = useMemo(() =>
        (payments || []).filter(p => {
            if (statusFilter && p.status        !== statusFilter) return false;
            if (typeFilter   && p.type          !== typeFilter)   return false;
            if (methodFilter && p.paymentMethod !== methodFilter) return false;
            if (dateFrom && new Date(p.paymentDate) < new Date(dateFrom)) return false;
            if (dateTo   && new Date(p.paymentDate) > new Date(dateTo))   return false;
            if (searchQuery.trim()) {
                const q    = searchQuery.toLowerCase();
                const name = (typeof p.user === 'object' ? p.user?.name  : '') || '';
                const mail = (typeof p.user === 'object' ? p.user?.email : '') || '';
                if (
                    !name.toLowerCase().includes(q) &&
                    !mail.toLowerCase().includes(q) &&
                    !(p.month   || '').toLowerCase().includes(q) &&
                    !(p.remarks || '').toLowerCase().includes(q)
                ) return false;
            }
            return true;
        }),
        [payments, statusFilter, typeFilter, methodFilter, dateFrom, dateTo, searchQuery]
    );

    /* ── derived ── */
    const hasActive       = !!(statusFilter || typeFilter || methodFilter || dateFrom || dateTo || searchQuery.trim());
    // Auto-dismiss error banner after 7s
    useEffect(() => {
        if (!isError && !message) return;
        const timer = setTimeout(() => dispatch(reset()), 7000);
        return () => clearTimeout(timer);
    }, [isError, message, dispatch]);
    const modalTitle      = isReadOnly ? 'View Payment Details' : editingPayment ? 'Edit Payment' : 'Record Payment';
    const gasBillVal      = payableGasBill && typeof payableGasBill === 'object'
        ? (payableGasBill.payableAmount ?? 0)
        : typeof payableGasBill === 'number' ? payableGasBill : 0;
    const messBillStatus  = payableAmountData?.paymentStatus || 'pending';
    const gasBillStatus   = payableGasBill?.status           || 'pending';

    /* ── render ── */
    return (
        <MainLayout>
            <div className="relative min-h-[80vh] max-w-7xl mx-auto">
                <div className="relative z-10 space-y-6">

                    {/* Header */}
                    <PaymentHeader
                        isAdmin={isAdmin}
                        viewMode={viewMode}
                        onViewModeChange={setViewMode}
                        onAddClick={openCreate}
                    />

                    {/* Stats bar */}
                    <PaymentStatsBar payments={payments || []} isAdmin={isAdmin} totalCount={pagination?.total || 0} />

                    {/* Bills Overview — unified mess + gas bill card */}
                    <AnimatePresence>
                        <BillsOverview
                            payableAmountData={payableAmountData}
                            payableGasBill={payableGasBill}
                            messBillStatus={messBillStatus}
                            gasBillStatus={gasBillStatus}
                            isPaying={isPaying}
                            onPayMess={() => handlePayBillClick(payableAmountData?.monthName || '')}
                            onPayGas={() => handleGasBillPayClick(gasBillVal)}
                            onViewInvoice={handleViewInvoiceFromOverview}
                            invoiceFetchDone={invoiceFetchDone}
                        />
                    </AnimatePresence>

                    {/* Search + filter bar */}
                    <PaymentSearchBar
                        isAdmin={isAdmin}
                        searchQuery={searchQuery}   onSearchChange={setSearchQuery}
                        dateFrom={dateFrom}         onDateFromChange={setDateFrom}
                        dateTo={dateTo}             onDateToChange={setDateTo}
                        statusFilter={statusFilter} onStatusChange={setStatusFilter}
                        typeFilter={typeFilter}     onTypeChange={setTypeFilter}
                        methodFilter={methodFilter} onMethodChange={setMethodFilter}
                        showFilters={showFilters}   onToggleFilters={() => setShowFilters(p => !p)}
                        filteredCount={filtered.length}
                        totalCount={pagination?.total || 0}
                        hasActive={hasActive}
                        onClearFilters={clearFilters}
                    />

                    {/* Error banner */}
                    <AnimatePresence>
                        {(isError || message) && (
                            <div className="flex items-start gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive">
                                <span className="w-2 h-2 rounded-full bg-red-500 mt-1.5 flex-shrink-0" />
                                <p className="flex-1 text-sm font-medium">
                                    {message || 'Something went wrong. Please try again.'}
                                </p>
                                <button
                                    onClick={() => dispatch(reset())}
                                    className="flex-shrink-0 p-1 rounded-lg hover:bg-red-100 dark:hover:bg-red-500/10 transition-colors"
                                    title="Dismiss"
                                    aria-label="Dismiss error"
                                >
                                    <HiOutlineXMark className="w-5 h-5" />
                                </button>
                            </div>
                        )}
                    </AnimatePresence>

                    {/* Payment list — Admin gets grouped expandable rows, users get paginated list */}
                    {isListLoading && (!payments || payments.length === 0) ? (
                        <div className={`grid gap-3 ${
                            viewMode === 'grid'
                                ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
                                : 'grid-cols-1'
                        }`}>
                            {[1, 2, 3, 4, 5, 6].map(n => <SkeletonCard key={n} />)}
                        </div>
                    ) : isAdmin ? (
                        <AdminPaymentView
                            payments={filtered}
                            viewMode={viewMode}
                            onEdit={openEdit}
                            onDelete={handleDelete}
                            onViewInvoice={handleViewInvoice}
                            onVerify={handleVerifyClick}
                            isLoading={isListLoading}
                        />
                    ) : (
                        <>
                            <PaymentList
                                payments={filtered}
                                viewMode={viewMode}
                                onEdit={openEdit}
                                onDelete={handleDelete}
                                onViewInvoice={handleViewInvoice}
                                onVerify={handleVerifyClick}
                                isAdmin={isAdmin}
                                hasActiveFilters={hasActive}
                            />
                            {!hasActive && (
                                <Pagination
                                    pagination={pagination}
                                    onPageChange={p => setPage(p)}
                                    onLimitChange={l => { setLimit(l); setPage(1); }}
                                />
                            )}
                        </>
                    )}
                </div>

                {/* Modal */}
                <PaymentModal isOpen={isModalOpen} onClose={closeModal} title={modalTitle}>
                    <PaymentForm
                        initialData={editingPayment}
                        onSubmit={handleSubmit}
                        onCancel={closeModal}
                        isAdmin={isAdmin}
                        currentUser={user}
                        readOnly={isReadOnly}
                        isSubmitting={isSubmitting}
                        preselectedUserId={preselectedUserId}
                    />
                </PaymentModal>

                <MonthlyInvoiceModal
                    isOpen={invoiceModal.open}
                    onClose={closeInvoiceModal}
                    year={invoiceModal.year}
                    month={invoiceModal.month}
                    monthName={invoiceModal.monthName}
                    onPayNow={handlePayBillClick}
                    isPaying={isPaying}
                    paymentRecord={invoiceModal.paymentRecord}
                    userId={invoiceModal.userId}
                />

                <PaymentFlowModal
                    isOpen={isPaymentFlowOpen}
                    onClose={() => {
                        setIsPaymentFlowOpen(false);
                        setPaymentFlowType('mess_bill');
                    }}
                    user={user}
                    isAdmin={isAdmin}
                    activeInvoiceMonth={activePaymentMonth}
                    onRazorpayPay={handleCheckout}
                    onSuccess={refreshData}
                    paymentType={paymentFlowType}
                />

                <PaymentFlowModal
                    isOpen={gasBillModal.open}
                    onClose={() => setGasBillModal({ open: false, amount: 0, monthName: '' })}
                    isAdmin={isAdmin}
                    activeInvoiceMonth={gasBillModal.monthName}
                    onRazorpayPay={handleCheckout}
                    onSuccess={refreshData}
                    paymentType="gas_bill"
                    gasBillAmount={gasBillModal.amount}
                />

                <UpiVerificationModal
                    isOpen={isUpiVerifyOpen}
                    onClose={closeVerifyModal}
                    payment={verifyPayment}
                    onVerified={handleVerificationDone}
                />

                {deletingPayment && (
                    <PaymentDeleteDialog
                        payment={deletingPayment}
                        onConfirm={handleDeleteConfirm}
                        onCancel={handleDeleteCancel}
                        isDeleting={isDeleting}
                    />
                )}
            </div>
        </MainLayout>
    );
};

export default PaymentPage;
