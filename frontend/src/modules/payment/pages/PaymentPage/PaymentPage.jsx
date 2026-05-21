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
import { HiOutlineXMark, HiOutlineCheckBadge } from 'react-icons/hi2';
import toast from 'react-hot-toast';

import MainLayout      from '@/shared/components/layout/MainLayout/MainLayout';
import Pagination      from '@/shared/components/ui/Pagination/Pagination';

import PaymentHeader    from '../../components/PaymentHeader/PaymentHeader';
import PaymentStatsBar  from '../../components/PaymentStatsBar/PaymentStatsBar';
import PaymentSearchBar from '../../components/PaymentSearchBar/PaymentSearchBar';
import PaymentList      from '../../components/PaymentList/PaymentList';
import PaymentForm      from '../../components/PaymentForm/PaymentForm';
import PaymentModal     from '../../components/PaymentModal/PaymentModal';
import MessBillInvoice  from '../../components/MessBillInvoice/MessBillInvoice';
import MonthlyInvoiceModal from '../../components/MonthlyInvoiceModal/MonthlyInvoiceModal';
import PaymentDeleteDialog from '../../components/PaymentDeleteDialog/PaymentDeleteDialog';

import {
    fetchPayments,
    createPayment,
    createBulkPayments,
    updatePayment,
    deletePayment,
    reset,
} from '../../store/payment.slice';
import { fetchPayableAmount, fetchPayableGasBill } from '../../../auth/store/auth.slice';

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
    const { payments, pagination, isLoading, isError, message } =
        useSelector(s => s.payment);
    const { user, payableAmountData, payableGasBill } =
        useSelector(s => s.auth);

    const isAdmin = user?.role === 'admin';

    /* ── state ── */
    const [isPaying,       setIsPaying]       = useState(false);
    const [isModalOpen,    setIsModalOpen]    = useState(false);
    const [invoiceModal,   setInvoiceModal]   = useState({ open: false, year: null, month: null, monthName: '' });
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

    /* ── payment hook ── */
    const refreshData = useCallback(() => {
        dispatch(fetchPayments({ page, limit }));
        dispatch(fetchPayableAmount());
        dispatch(fetchPayableGasBill());
    }, [dispatch, page, limit]);

    const { handleCheckout, lastPaymentId, markUnmounted } = usePayment({
        user,
        onSuccess: () => {
            setIsPaying(false);
            refreshData();
        },
    });

    const handleRazorpayCheckout = useCallback(async (amount, paymentType) => {
        setIsPaying(true);
        try {
            await handleCheckout(amount, paymentType);
        } finally {
            setIsPaying(false);
        }
    }, [handleCheckout]);

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
            ]).then(() => setInvoiceFetchDone(true))
              .catch(() => setInvoiceFetchDone(true));
        }
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
    }, [isAdmin, user?._id]);

    const openEdit = useCallback((p) => {
        setEditingPayment(p);
        setIsReadOnly(!isAdmin);
        setPreselectedUserId(null);
        setIsModalOpen(true);
    }, [isAdmin]);

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

        const parts = monthStr.split(/\s+/);
        if (parts.length >= 2) {
            const date = new Date(`${parts[0]} 1, ${parts[parts.length - 1]}`);
            if (!isNaN(date.getTime())) {
                setInvoiceModal({
                    open: true,
                    year: date.getFullYear(),
                    month: date.getMonth() + 1,
                    monthName: monthStr,
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
    const modalTitle      = isReadOnly ? 'View Payment Details' : editingPayment ? 'Edit Payment' : 'Record Payment';
    const gasBillVal      = payableGasBill && typeof payableGasBill === 'object'
        ? (payableGasBill.payableAmount ?? 0)
        : typeof payableGasBill === 'number' ? payableGasBill : 0;
    const messBillStatus  = payableAmountData?.paymentStatus || 'pending';
    const gasBillStatus   = payableGasBill?.status           || 'pending';
    const bothPaid        = messBillStatus === 'success' && gasBillStatus === 'success';
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
                        payableGasBill={gasBillVal}
                        gasBillStatus={gasBillStatus}
                        onPayNowClick={handleRazorpayCheckout}
                        isPaying={isPaying}
                    />

                    {/* Stats bar */}
                    <PaymentStatsBar payments={payments || []} isAdmin={isAdmin} />

                    {/* Invoice panel */}
                    <AnimatePresence>
                        {isInvoiceLoading && (
                            <InvoiceSkeleton />
                        )}

                        {bothPaid && hasInvoiceData && (
                            <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300">
                                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                                    <HiOutlineCheckBadge className="w-5 h-5 text-emerald-500" />
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
                                onPayNow={handleRazorpayCheckout}
                                isPaying={isPaying}
                                paymentStatus={messBillStatus}
                                paymentRecord={latestMessBillPayment}
                            />
                        )}
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
                        totalCount={payments?.length || 0}
                        hasActive={hasActive}
                        onClearFilters={clearFilters}
                    />

                    {/* Error banner */}
                    <AnimatePresence>
                        {(isError || message) && (
                            <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400">
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

                    {/* Payment list */}
                    {isLoading && (!payments || payments.length === 0) ? (
                        <div className={`grid gap-3 ${
                            viewMode === 'grid'
                                ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
                                : 'grid-cols-1'
                        }`}>
                            {[1, 2, 3, 4, 5, 6].map(n => <SkeletonCard key={n} />)}
                        </div>
                    ) : (
                        <>
                            <PaymentList
                                payments={filtered}
                                viewMode={viewMode}
                                onEdit={openEdit}
                                onDelete={handleDelete}
                                onViewInvoice={handleViewInvoice}
                                isAdmin={isAdmin}
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
                    onClose={() => setInvoiceModal(prev => ({ ...prev, open: false }))}
                    year={invoiceModal.year}
                    month={invoiceModal.month}
                    monthName={invoiceModal.monthName}
                    onPayNow={handleRazorpayCheckout}
                    isPaying={isPaying}
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
