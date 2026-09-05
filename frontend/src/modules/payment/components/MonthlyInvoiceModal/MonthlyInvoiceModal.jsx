import { useEffect, useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    HiOutlineExclamationTriangle,
    HiOutlineCurrencyRupee,
    HiOutlineArrowPath,
    HiOutlineClock,
    HiOutlineDocumentText,
} from 'react-icons/hi2';

import { Modal, Button } from '@/shared/components/ui';
import InvoicePreview from '../InvoicePreview/InvoicePreview';
import { fetchMonthlyInvoice, clearMonthlyInvoice } from '../../store/invoice.slice';
import { fmt } from '@/core/utils/helpers/currency.helper';

const toPaymentStatus = (invoiceStatus) => {
    switch (invoiceStatus) {
        case 'paid':           return 'success';
        case 'partially_paid': return 'partially_paid';
        case 'unpaid':
        default:               return 'pending';
    }
};

const resolveInvoiceOwner = (invoice, paymentRecord, authUser) => {
    const details = invoice?.userDetails;
    if (details?.name) {
        return {
            ...(details.id ? { _id: details.id, id: details.id } : {}),
            name: details.name,
            email: details.email ?? '',
            ...(details.image ? { image: details.image } : {}),
            ...(details.chargePerGuestMeal != null
                ? { chargePerGuestMeal: details.chargePerGuestMeal }
                : {}),
        };
    }

    const paymentUser = paymentRecord?.user;
    if (paymentUser && typeof paymentUser === 'object' && paymentUser.name) {
        return paymentUser;
    }

    return authUser;
};

const InvoiceSkeleton = () => (
    <div className="space-y-4 animate-pulse">
        <div className="h-28 bg-muted rounded-xl w-full" />
        <div className="h-16 bg-muted rounded-xl w-full" />
        <div className="h-56 bg-muted rounded-xl w-full" />
        <div className="h-20 bg-muted rounded-xl w-full" />
    </div>
);

const PartialPaymentBanner = ({ remainingAmount, paidAmount, totalPayable, onPayNow, isPaying, monthName }) => {
    const paidPercent = totalPayable > 0
        ? Math.min(100, Math.round((paidAmount / totalPayable) * 100))
        : 0;

    return (
        <div className="rounded-xl border border-warning-border bg-warning-bg overflow-hidden">
            <div className="h-1.5 bg-warning-bg w-full">
                <div
                    className="h-full bg-gradient-to-r from-warning to-warning rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${paidPercent}%` }}
                />
            </div>

            <div className="p-4">
                <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-warning-bg flex items-center justify-center">
                        <HiOutlineClock className="w-5 h-5 text-warning-text" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-warning-text">
                            Partial Payment Received — Balance Due
                        </p>
                        <p className="text-xs text-warning-text/80 mt-0.5 leading-relaxed">
                            You&apos;ve paid <span className="font-semibold">₹{fmt(paidAmount)}</span> ({paidPercent}%) of
                            your total bill of <span className="font-semibold">₹{fmt(totalPayable)}</span>.
                            Please pay the remaining{' '}
                            <span className="font-bold text-warning-text">
                                ₹{fmt(remainingAmount)}
                            </span>{' '}
                            to clear your balance.
                        </p>
                    </div>
                </div>

                {onPayNow && (
                    <Button
                        variant="warning"
                        size="sm"
                        fullWidth
                        disabled={!!isPaying}
                        isLoading={!!isPaying}
                        onClick={() => onPayNow(monthName)}
                        className="mt-3"
                    >
                        <HiOutlineCurrencyRupee className="w-4 h-4" />
                        {isPaying ? 'Processing…' : `Pay Remaining ₹${fmt(remainingAmount)}`}
                    </Button>
                )}
            </div>
        </div>
    );
};

const MonthlyInvoiceModal = ({
    isOpen,
    onClose,
    year,
    month,
    monthName,
    onPayNow,
    isPaying,
    paymentRecord: externalPaymentRecord,
    userId,
}) => {
    const dispatch = useDispatch();
    const { monthlyInvoice, isLoadingMonthly, error } = useSelector((state) => state.invoice);
    const authUser = useSelector((state) => state.auth.user);

    useEffect(() => {
        if (!isOpen) return;

        if (year && month) {
            dispatch(fetchMonthlyInvoice({ year, month, userId }));
        }

        return () => {
            dispatch(clearMonthlyInvoice());
        };
    }, [isOpen, year, month, userId, dispatch]);

    const handleClose = useCallback(() => onClose(), [onClose]);

    const displayUser = useMemo(
        () => resolveInvoiceOwner(monthlyInvoice, externalPaymentRecord, authUser),
        [monthlyInvoice, externalPaymentRecord, authUser]
    );

    const invoiceStatus    = monthlyInvoice?.status ?? 'unpaid';
    const paymentStatus    = toPaymentStatus(invoiceStatus);
    const isPartiallyPaid  = invoiceStatus === 'partially_paid';
    const paidAmount       = monthlyInvoice?.paidAmount    ?? 0;
    const totalPayable     = monthlyInvoice?.totalPayable  ?? 0;
    const remainingAmount  = monthlyInvoice?.remainingAmount
        ?? Math.max(0, totalPayable - paidAmount);

    const invoicePaymentRecord = {
        ...(externalPaymentRecord || {}),
        month:          monthlyInvoice?.monthName,
        paymentDate:    monthlyInvoice?._paymentDate || monthlyInvoice?.createdAt,
        paidAmount,
        totalPayable,
        remainingAmount,
        paymentMethod:  monthlyInvoice?._paymentMethod,
        transactionId:  monthlyInvoice?._transactionId,
        utr:            monthlyInvoice?._utr,
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title="Invoice Details"
            description={monthName || monthlyInvoice?.monthName || ''}
            size="2xl"
            mobileSheet
            accentColor="blue"
            desktopMaxHeight="85vh"
        >
            <div className="space-y-2">
                {isLoadingMonthly && <InvoiceSkeleton />}

                {!isLoadingMonthly && error && (
                    <div className="p-6 text-center bg-destructive/10 rounded-xl border border-destructive/20">
                        <HiOutlineExclamationTriangle className="w-10 h-10 text-destructive mx-auto mb-3" />
                        <p className="font-semibold text-destructive mb-1">
                            Failed to load invoice
                        </p>
                        <p className="text-sm text-destructive/80">{error}</p>
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => dispatch(fetchMonthlyInvoice({ year, month }))}
                            className="mt-4"
                        >
                            <HiOutlineArrowPath className="w-4 h-4" />
                            Try Again
                        </Button>
                    </div>
                )}

                {!isLoadingMonthly && !error && monthlyInvoice && (
                    <>
                        {isPartiallyPaid && (
                            <PartialPaymentBanner
                                remainingAmount={remainingAmount}
                                paidAmount={paidAmount}
                                totalPayable={totalPayable}
                                onPayNow={onPayNow}
                                isPaying={isPaying}
                                monthName={monthlyInvoice?.monthName || monthName}
                            />
                        )}

                        <InvoicePreview
                            invoice={monthlyInvoice}
                            user={displayUser}
                            paymentRecord={invoicePaymentRecord}
                            onPayNow={!isPartiallyPaid && paymentStatus !== 'success' ? onPayNow : undefined}
                            isPaying={isPaying}
                            userId={userId || displayUser?._id || displayUser?.id}
                        />
                    </>
                )}

                {!isLoadingMonthly && !error && !monthlyInvoice && (
                    <div className="py-16 text-center">
                        <HiOutlineDocumentText className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
                        <p className="text-sm font-medium text-muted-foreground">
                            No invoice data found for this period.
                        </p>
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default MonthlyInvoiceModal;
