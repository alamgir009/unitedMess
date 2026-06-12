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
import { HiOutlineXMark, HiOutlineCheckBadge, HiOutlineCurrencyRupee, HiOutlineCheckCircle } from 'react-icons/hi2';
import toast from 'react-hot-toast';

import { Spinner }     from '@/shared/components/ui';
import MainLayout      from '@/shared/components/layout/MainLayout/MainLayout';
import Pagination      from '@/shared/components/ui/Pagination/Pagination';

import PaymentHeader    from '../../components/PaymentHeader/PaymentHeader';
import PaymentStatsBar  from '../../components/PaymentStatsBar/PaymentStatsBar';
import PaymentSearchBar from '../../components/PaymentSearchBar/PaymentSearchBar';
import PaymentList      from '../../components/PaymentList/PaymentList';
import AdminPaymentView from '../../components/AdminPaymentView/AdminPaymentView';
import PaymentForm      from '../../components/PaymentForm/PaymentForm';
import PaymentModal     from '../../components/PaymentModal/PaymentModal';
import MessBillInvoice  from '../../components/MessBillInvoice/MessBillInvoice';
import MonthlyInvoiceModal from '../../components/MonthlyInvoiceModal/MonthlyInvoiceModal';
import PaymentDeleteDialog from '../../components/PaymentDeleteDialog/PaymentDeleteDialog';
import PaymentFlowModal from '../../components/PaymentFlowModal/PaymentFlowModal';
import GasBillPaymentModal from '../../components/GasBillPaymentModal/GasBillPaymentModal';
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

const SkeletonCard = React.memo(() => (
    <div className="rounded-xl border border-border/50 bg-card p-5 animate-pulse">
        <div className="flex justify-between mb-4">
            <div className="space-y-2">
                <div className="h-7 w-14 bg-muted/60 rounded-md" />
                <div className="h-3 w-28 bg-muted/40 rounded" />
            </div>
            <div className="h-6 w-14 bg-muted/40 rounded-full" />
        </div>
        <div className="h-3 w-full bg-muted/30 rounded mb-1.5" />
        <div className="h-3 w-2/3 bg-muted/20 rounded mb-5" />
        <div className="h-8 w-full bg-muted/30 rounded-xl" />
    </div>
));
SkeletonCard.displayName = 'SkeletonCard';

const InvoiceSkeleton = React.memo(() => (
    <div className="rounded-xl border border-border/50 bg-card p-5 animate-pulse space-y-4">
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

    const { handleCheckout, lastPaymentId, markUnmounted, isPaying } = usePayment({
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

    const latestMessBillPayment = useMemo(() => {
        if (lastPaymentId && payments) {
            const match = payments.find(p => p._id === lastPaymentId);
            if (match) return match;
        }
        const activeMonth = payableAmountData?.monthName;
        return (payments || []).find(p => 
            p.type === 'mess_bill' && 
            p.status === 'completed' && 
            (!activeMonth || p.month === activeMonth)
        ) || null;
    }, [lastPaymentId, payments, payableAmountData?.monthName]);

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

    /* ── visibility / focus — re-fetch when user returns to this tab ── */
    useEffect(() => {
        if (!(user?._id || user?.id)) return;
        const onVisible = () => {
            if (document.visibilityState === 'visible') {
                dispatch(fetchPayableAmount());
                dispatch(fetchPayableGasBill());
            }
        };
        document.addEventListener('visibilitychange', onVisible);
        window.addEventListener('focus', onVisible);
        return () => {
            document.removeEventListener('visibilitychange', onVisible);
            window.removeEventListener('focus', onVisible);
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
    const gasBillPaid     = gasBillStatus === 'success';
    const bothPaid        = messBillStatus === 'success' && gasBillPaid;
    const hasInvoiceData  = !!payableAmountData && 'payableAmount' in payableAmountData;
    const isInvoiceLoading = !invoiceFetchDone && !hasInvoiceData && !!(user?._id || user?.id);

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

                    {/* Invoice panel */}
                    <AnimatePresence>
                        {isInvoiceLoading && (
                            <InvoiceSkeleton />
                        )}

                        {bothPaid && hasInvoiceData && (
                            <div className="flex items-center gap-3 p-4 rounded-xl bg-success-bg border border-success-border text-success-text">
                                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center">
                                    <HiOutlineCheckBadge className="w-5 h-5 text-success" />
                                </div>
                                <div className="flex-1">
                                    <p className="font-semibold text-sm">All Bills Fully Paid</p>
                                    <p className="text-xs opacity-75 mt-0.5">
                                        Both your Mess Bill and Gas Bill are paid for this month.
                                        Your invoice and payment history are shown below.
                                    </p>
                                </div>
                            </div>
                        )}

                        {hasInvoiceData && (
                            <MessBillInvoice
                                data={payableAmountData}
                                isAdmin={isAdmin}
                                user={user}
                                platformFee={payableAmountData?.userStats?.platformFee || user?.platformFee || 0}
                                onPayNow={handlePayBillClick}
                                isPaying={isPaying}
                                paymentStatus={messBillStatus}
                                paymentRecord={latestMessBillPayment}
                            />
                        )}
                    </AnimatePresence>

                    {/* Gas Bill Pay card */}
                    {(gasBillVal > 0 || gasBillPaid) && !bothPaid && (
                        <div className="rounded-xl border border-border/50 bg-card p-5 shadow-sm">
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 shrink-0">
                                        <HiOutlineCurrencyRupee className="w-5 h-5" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold text-foreground">Gas Bill</p>
                                        <p className="text-xs text-muted-foreground truncate">
                                            Monthly gas bill share
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                    <span className="text-xl font-black tabular-nums text-foreground">
                                        ₹{gasBillVal.toLocaleString('en-IN')}
                                    </span>
                                    {gasBillPaid ? (
                                        <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 text-xs font-bold">
                                            <HiOutlineCheckCircle className="w-4 h-4" /> Paid
                                        </span>
                                    ) : (
                                        <button
                                            onClick={() => handleGasBillPayClick(gasBillVal)}
                                            disabled={isPaying}
                                            className="inline-flex items-center justify-center gap-1.5 px-4 min-w-[80px] h-9 rounded-lg text-sm font-medium tracking-tight text-white bg-primary hover:brightness-105 hover:shadow-md active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none disabled:cursor-not-allowed transition-all duration-120 shadow-sm"
                                        >
                                            {isPaying ? (
                                                <Spinner size="sm" color="white" className="!w-4 !h-4 !border-[1.5px]" />
                                            ) : (
                                                <HiOutlineCurrencyRupee className="w-4 h-4" />
                                            )}
                                            {isPaying ? 'Processing' : 'Pay Now'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

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

                <GasBillPaymentModal
                    isOpen={gasBillModal.open}
                    onClose={() => setGasBillModal({ open: false, amount: 0, monthName: '' })}
                    payableAmount={gasBillModal.amount}
                    payableMonthName={gasBillModal.monthName}
                    onRazorpayPay={handleCheckout}
                    onSuccess={refreshData}
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
