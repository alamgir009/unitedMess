import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AnimatePresence, motion } from 'framer-motion';
import { HiOutlineXMark, HiOutlineCheckBadge } from 'react-icons/hi2';
import toast from 'react-hot-toast';

import MainLayout from '@/shared/components/layout/MainLayout/MainLayout';
import Pagination from '@/shared/components/ui/Pagination/Pagination';

// Payment-specific components
import PaymentHeader   from '../../components/PaymentHeader/PaymentHeader';
import PaymentStatsBar from '../../components/PaymentStatsBar/PaymentStatsBar';
import PaymentSearchBar from '../../components/PaymentSearchBar/PaymentSearchBar';
import PaymentList     from '../../components/PaymentList/PaymentList';
import PaymentForm     from '../../components/PaymentForm/PaymentForm';
import PaymentModal    from '../../components/PaymentModal/PaymentModal';
import MessBillInvoice from '../../components/MessBillInvoice/MessBillInvoice';

// Redux
import {
    fetchPayments,
    createPayment,
    updatePayment,
    deletePayment,
    reset,
} from '../../store/payment.slice';
import { fetchPayableAmount, fetchPayableGasBill } from '../../../auth/store/auth.slice';
import paymentService from '../../services/payment.service';

/* ── Skeleton — payment cards ── */
const SkeletonCard = () => (
    <div className="rounded-3xl border border-white/10 dark:border-white/5 bg-card/50 p-6 animate-pulse">
        <div className="flex justify-between mb-4">
            <div className="h-7 w-20 bg-muted/60 rounded-xl" />
            <div className="h-5 w-16 bg-muted/40 rounded-full" />
        </div>
        <div className="h-3 w-full bg-muted/30 rounded mb-1.5" />
        <div className="h-3 w-2/3 bg-muted/20 rounded mb-6" />
        <div className="h-9 w-full bg-muted/30 rounded-2xl" />
    </div>
);

/* ── Skeleton — invoice panel ── */
const InvoiceSkeleton = () => (
    <div className="rounded-3xl border border-black/5 dark:border-white/10 bg-white/70 dark:bg-slate-900/50 p-6 animate-pulse space-y-4">
        <div className="flex justify-between">
            <div className="h-10 w-44 bg-muted/40 rounded-2xl" />
            <div className="h-10 w-28 bg-muted/30 rounded-2xl" />
        </div>
        <div className="space-y-3 pt-2">
            {[1,2,3,4,5].map(n => (
                <div key={n} className="flex justify-between items-center">
                    <div className="h-3.5 w-2/5 bg-muted/30 rounded" />
                    <div className="h-3.5 w-20 bg-muted/20 rounded" />
                </div>
            ))}
        </div>
        <div className="h-12 w-full bg-muted/30 rounded-2xl mt-2" />
    </div>
);

/* ══════════════════════════════════════════════
   PAYMENT PAGE
══════════════════════════════════════════════ */
const PaymentPage = () => {
    const dispatch = useDispatch();
    const { payments, pagination, isLoading, isError, message } = useSelector((s) => s.payment);
    const { user, payableAmountData, payableGasBill } = useSelector((s) => s.auth);
    const isAdmin = user?.role === 'admin';

    // Razorpay state
    const [isPaying, setIsPaying] = useState(false);

    // Invoice email state
    const [isSendingEmail, setIsSendingEmail] = useState(false);
    const lastPaymentIdRef = useRef(null);

    // Platform fee (admin-editable)
    const [platformFee, setPlatformFee] = useState(0);

    // Modal
    const [isModalOpen,    setIsModalOpen]    = useState(false);
    const [editingPayment, setEditingPayment] = useState(null);
    const [isReadOnly,     setIsReadOnly]     = useState(false);

    // View mode
    const [viewMode, setViewMode] = useState('grid');

    // Filters
    const [searchQuery,  setSearchQuery]  = useState('');
    const [dateFrom,     setDateFrom]     = useState('');
    const [dateTo,       setDateTo]       = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [typeFilter,   setTypeFilter]   = useState('');
    const [methodFilter, setMethodFilter] = useState('');
    const [showFilters,  setShowFilters]  = useState(false);

    // Pagination
    const [page,  setPage]  = useState(1);
    const [limit, setLimit] = useState(20);

    // Error banner
    const [errorMsg, setErrorMsg] = useState('');

    /* ══ Fetch payments on mount / page / limit change ══ */
    useEffect(() => {
        dispatch(fetchPayments({ page, limit }))
            .unwrap()
            .catch((err) => setErrorMsg(typeof err === 'string' ? err : err?.message || 'Failed to load payments'));
    }, [dispatch, page, limit]);

    /* ══ Fetch payable data when user changes ══ */
    useEffect(() => {
        if (user?._id || user?.id) {
            dispatch(fetchPayableAmount());
            dispatch(fetchPayableGasBill());
        }
    }, [dispatch, user?._id, user?.id]);

    /* ══ Cleanup on unmount ══ */
    useEffect(() => {
        return () => { dispatch(reset()); };
    }, [dispatch]);

    /* ══ Razorpay SDK inject (once) ══ */
    useEffect(() => {
        if (document.getElementById('razorpay-sdk')) return;
        const s = document.createElement('script');
        s.id    = 'razorpay-sdk';
        s.src   = 'https://checkout.razorpay.com/v1/checkout.js';
        s.async = true;
        document.body.appendChild(s);
    }, []);

    /* ══ Helpers ══ */
    const refreshAfterPayment = useCallback(() => {
        dispatch(fetchPayments({ page, limit }));
        dispatch(fetchPayableAmount());
        dispatch(fetchPayableGasBill());
    }, [dispatch, page, limit]);

    const handleSendInvoiceEmail = useCallback(async (paymentId) => {
        const pid = paymentId || lastPaymentIdRef.current;
        if (!pid) return;
        setIsSendingEmail(true);
        try {
            await paymentService.sendInvoiceEmail(pid);
            toast.success('📧 Invoice sent to your email!');
        } catch (err) {
            if (err?.response?.status === 404) {
                toast('📧 Invoice email feature coming soon!', { icon: '🔔' });
            } else {
                toast.error(err?.response?.data?.message || 'Failed to send invoice email');
            }
        } finally {
            setIsSendingEmail(false);
        }
    }, []);

    /* ══ Razorpay checkout ══ */
    const handleRazorpayCheckout = useCallback(async (amount, paymentType = 'mess_bill') => {
        if (!amount || amount <= 0) return toast.error('Invalid payable amount');
        if (!window.Razorpay)       return toast.error('Razorpay SDK failed to load');

        setIsPaying(true);
        try {
            const orderRes = await paymentService.createOnlineOrder({
                amount,
                type: paymentType,
            });
            const { order, payment } = orderRes.data || {};

            if (!order) throw new Error('Invalid order response from server');

            const options = {
                key:         import.meta.env.VITE_RAZORPAY_KEY_ID || '',
                amount:      order.amount,
                currency:    order.currency,
                name:        'United Mess',
                description: paymentType === 'gas_bill' ? 'Gas Bill Payment' : 'Mess Bill Payment',
                order_id:    order.id,
                handler: async function (response) {
                    try {
                        await paymentService.verifyPayment({
                            orderId:   order.id,
                            paymentId: response.razorpay_payment_id,
                            signature: response.razorpay_signature,
                        });

                        toast.success('✅ Payment successful!');

                        // Store payment id for email (if available)
                        if (payment?._id) {
                            lastPaymentIdRef.current = payment._id;
                        }

                        // Refresh payment list + payable amounts
                        refreshAfterPayment();

                        // Auto-send invoice email after mess bill payment (short delay)
                        if (paymentType !== 'gas_bill' && payment?._id) {
                            setTimeout(() => handleSendInvoiceEmail(payment._id), 1000);
                        }
                    } catch (verifyErr) {
                        toast.error(verifyErr.response?.data?.message || 'Payment verification failed');
                    } finally {
                        setIsPaying(false);
                    }
                },
                prefill: { name: user?.name, email: user?.email },
                theme:   { color: '#6366f1' },
                modal: { ondismiss: () => setIsPaying(false) },
            };

            const rzp = new window.Razorpay(options);
            rzp.on('payment.failed', (resp) => {
                toast.error(resp.error.description || 'Payment failed');
                setIsPaying(false);
            });
            rzp.open();
        } catch (err) {
            setIsPaying(false);
            toast.error(err.response?.data?.message || err.message || 'Failed to initiate payment');
        }
    }, [user, refreshAfterPayment, handleSendInvoiceEmail]);

    /* ══ Modal handlers ══ */
    const openCreate = useCallback(() => {
        if (!isAdmin) return;
        setEditingPayment(null);
        setIsReadOnly(false);
        setIsModalOpen(true);
    }, [isAdmin]);

    const openEdit = useCallback((p) => {
        setEditingPayment(p);
        setIsReadOnly(!isAdmin);
        setIsModalOpen(true);
    }, [isAdmin]);

    const closeModal = useCallback(() => {
        setIsModalOpen(false);
        setEditingPayment(null);
        setIsReadOnly(false);
    }, []);

    /* ══ CRUD ══ */
    const handleSubmit = useCallback(async (formData) => {
        if (!isAdmin) {
            toast.error('Only administrators can manage payment records');
            closeModal();
            return;
        }
        try {
            setErrorMsg('');
            if (editingPayment) {
                await dispatch(updatePayment({ paymentId: editingPayment._id, paymentData: formData })).unwrap();
                toast.success('Payment updated successfully');
            } else {
                await dispatch(createPayment(formData)).unwrap();
                toast.success('Payment recorded successfully');
            }
            closeModal();
            dispatch(fetchPayments({ page, limit }));
        } catch (err) {
            setErrorMsg(typeof err === 'string' ? err : err?.message || 'Failed to save payment');
            closeModal();
        }
    }, [editingPayment, isAdmin, dispatch, closeModal, page, limit]);

    const handleDelete = useCallback(async (paymentId) => {
        if (!isAdmin) return;
        if (!window.confirm('Delete this payment record?')) return;
        try {
            setErrorMsg('');
            await dispatch(deletePayment(paymentId)).unwrap();
            toast.success('Payment deleted successfully');
            dispatch(fetchPayments({ page, limit })); // Refresh list
        } catch (err) {
            setErrorMsg(typeof err === 'string' ? err : err?.message || 'Failed to delete payment');
        }
    }, [isAdmin, dispatch, page, limit]);

    const clearFilters = useCallback(() => {
        setSearchQuery(''); setDateFrom(''); setDateTo('');
        setStatusFilter(''); setTypeFilter(''); setMethodFilter('');
    }, []);

    /* ══ Client-side filter ══ */
    const filtered = useMemo(() => (payments || []).filter((p) => {
        if (statusFilter && p.status           !== statusFilter) return false;
        if (typeFilter   && p.type             !== typeFilter)   return false;
        if (methodFilter && p.paymentMethod    !== methodFilter) return false;
        if (dateFrom     && new Date(p.paymentDate) < new Date(dateFrom)) return false;
        if (dateTo       && new Date(p.paymentDate) > new Date(dateTo))   return false;
        if (searchQuery.trim()) {
            const q    = searchQuery.toLowerCase();
            const name = (typeof p.user === 'object' ? p.user?.name  : '') || '';
            const mail = (typeof p.user === 'object' ? p.user?.email : '') || '';
            if (!name.toLowerCase().includes(q) && !mail.toLowerCase().includes(q) &&
                !(p.month || '').toLowerCase().includes(q) && !(p.remarks || '').toLowerCase().includes(q))
                return false;
        }
        return true;
    }), [payments, statusFilter, typeFilter, methodFilter, dateFrom, dateTo, searchQuery]);

    const hasActive = !!(statusFilter || typeFilter || methodFilter || dateFrom || dateTo || searchQuery.trim());
    const modalTitle = isReadOnly ? 'View Payment Details' : editingPayment ? 'Edit Payment' : 'Record Payment';

    // Gas bill value (handle both object and number)
    const gasBillVal = payableGasBill && typeof payableGasBill === 'object'
        ? (payableGasBill.payableAmount ?? 0)
        : typeof payableGasBill === 'number' ? payableGasBill : 0;

    // Payment statuses
    const messBillStatus = payableAmountData?.paymentStatus || 'pending';
    const gasBillStatus  = payableGasBill?.status || 'pending';
    const bothPaid       = messBillStatus === 'success' && gasBillStatus === 'success';

    const hasInvoiceData   = !!payableAmountData && 'payableAmount' in payableAmountData;
    const isInvoiceLoading = !payableAmountData && !!(user?._id || user?.id);

    return (
        <MainLayout>
            <div className="relative min-h-[80vh]">

                {/* Ambient orbs */}
                <div className="pointer-events-none absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-indigo-500/10 blur-[120px] -z-10" />
                <div className="pointer-events-none absolute bottom-10 left-0 w-[400px] h-[400px] rounded-full bg-violet-400/8 blur-[100px] -z-10" />
                <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full bg-purple-500/5 blur-[80px] -z-10" />

                <div className="relative z-10 space-y-8">

                    {/* Header */}
                    <PaymentHeader
                        isAdmin={isAdmin}
                        viewMode={viewMode}
                        onViewModeChange={setViewMode}
                        onAddClick={openCreate}
                        payableAmount={payableAmountData?.payableAmount ?? null}
                        payableGasBill={gasBillVal}
                        gasBillStatus={gasBillStatus}
                        onPayNowClick={handleRazorpayCheckout}
                        isPaying={isPaying}
                    />

                    {/* Mess Bill Invoice Panel */}
                    <AnimatePresence>
                        {isInvoiceLoading && (
                            <motion.div key="inv-skeleton" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                <InvoiceSkeleton />
                            </motion.div>
                        )}
                        {bothPaid && hasInvoiceData && (
                            <motion.div
                                key="fully-paid"
                                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                                className="flex items-center gap-4 p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-700 dark:text-emerald-300"
                            >
                                <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                                    <HiOutlineCheckBadge className="w-6 h-6 text-emerald-500" />
                                </div>
                                <div className="flex-1">
                                    <p className="font-bold text-base">All Bills Fully Paid 🎉</p>
                                    <p className="text-sm opacity-75 mt-0.5">
                                        Both your Mess Bill and Gas Bill are paid for this month. Your invoice and payment history are shown below.
                                    </p>
                                </div>
                            </motion.div>
                        )}
                        {hasInvoiceData && (
                            <motion.div key="inv-panel" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                <MessBillInvoice
                                    data={payableAmountData}
                                    isAdmin={isAdmin}
                                    user={user}
                                    platformFee={platformFee}
                                    onPlatformFeeChange={setPlatformFee}
                                    onPayNow={handleRazorpayCheckout}
                                    isPaying={isPaying}
                                    isSendingEmail={isSendingEmail}
                                    onSendEmail={lastPaymentIdRef.current ? () => handleSendInvoiceEmail() : null}
                                    paymentStatus={messBillStatus}
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Stats bar */}
                    <PaymentStatsBar payments={payments || []} isAdmin={isAdmin} />

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
                        {(isError || errorMsg) && (
                            <motion.div
                                initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}
                                className="flex items-start gap-3 p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-500 dark:text-red-400"
                            >
                                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping mt-0.5 flex-shrink-0" />
                                <p className="flex-1 text-sm font-semibold">
                                    {errorMsg || message || 'Something went wrong. Please try again.'}
                                </p>
                                <button
                                    onClick={() => { setErrorMsg(''); dispatch(reset()); }}
                                    className="flex-shrink-0 p-1 rounded-lg hover:bg-red-500/10 transition-colors"
                                >
                                    <HiOutlineXMark className="w-5 h-5" />
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Payment list */}
                    {isLoading && (!payments || payments.length === 0) ? (
                        <div className={`grid gap-5 ${viewMode === 'grid'
                            ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
                            : 'grid-cols-1'}`}
                        >
                            {[1,2,3,4,5,6].map(n => <SkeletonCard key={n} />)}
                        </div>
                    ) : (
                        <>
                            <PaymentList
                                payments={filtered}
                                viewMode={viewMode}
                                onEdit={openEdit}
                                onDelete={handleDelete}
                                isAdmin={isAdmin}
                            />
                            {!hasActive && (
                                <Pagination
                                    pagination={pagination}
                                    onPageChange={(p) => setPage(p)}
                                    onLimitChange={(l) => { setLimit(l); setPage(1); }}
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
                    />
                </PaymentModal>

            </div>
        </MainLayout>
    );
};

export default PaymentPage;