import { useNavigate } from 'react-router-dom';
import { useMemo } from 'react';
import {
    FiClock, FiDroplet, FiCheckCircle,
    FiArrowRight, FiAlertCircle, FiRotateCcw, FiCreditCard,
} from 'react-icons/fi';
import Button from '@/shared/components/ui/Button/Button';
import { cn } from '@/core/utils/helpers/string.helper';
import { isSettledBill, isRefundDueBill, isRefundedBill } from '@shared/utils/paymentStatus';

/**
 * PayableWidget
 *
 * Props
 * ─────
 * mealPayable        {number | null | undefined}  – raw payable amount from backend
 * gasBillPayable     {number | null | undefined}  – raw payable amount from backend
 * mealPaymentStatus  {'success'|'pending'|'refund'|'refunded'|null} – authoritative backend status
 * gasBillStatus      {'success'|'pending'|'refund'|'refunded'|null} – authoritative backend status
 * isLoading          {boolean}                    – true while fetch in-flight
 * isLoaded           {boolean}                    – true once fetch settled (success OR error)
 * isMealError        {boolean}                    – true if meal payable fetch failed
 * isGasError         {boolean}                    – true if gas bill payable fetch failed
 */
const PayableWidget = ({
    mealPayable,
    gasBillPayable,
    mealPaymentStatus,
    gasBillStatus,
    isLoading,
    onRetry,
    isLoaded,
    isMealError,
    isGasError,
}) => {
    const navigate = useNavigate();

    // Nothing owed when paid, refund already returned, refund credit exists,
    // or the computed balance is zero.
    const mealPaid =
        isSettledBill(mealPaymentStatus) ||
        isRefundDueBill(mealPaymentStatus) ||
        (isLoaded && !isMealError && mealPayable === 0);

    const gasPaid =
        isSettledBill(gasBillStatus) ||
        isRefundDueBill(gasBillStatus) ||
        (isLoaded && !isGasError && gasBillPayable === 0);

    // Hero keeps showing the refund amount whether it is due or settled —
    // only the ACTION changes (view details vs already processed).
    const mealRefund = isRefundDueBill(mealPaymentStatus) || isRefundedBill(mealPaymentStatus);
    const gasRefund = isRefundDueBill(gasBillStatus) || isRefundedBill(gasBillStatus);
    const hasPendingRefund = isRefundDueBill(mealPaymentStatus) || isRefundDueBill(gasBillStatus);
    const hasSettledRefund = isRefundedBill(mealPaymentStatus) || isRefundedBill(gasBillStatus);

    const safeMeal = Number(mealPayable) || 0;
    const safeGas  = Number(gasBillPayable) || 0;
    const totalOutstanding = (!mealPaid ? safeMeal : 0) + (!gasPaid ? safeGas : 0);
    const totalRefund = Math.abs((mealRefund ? safeMeal : 0) + (gasRefund ? safeGas : 0));

    const periodLabel = useMemo(() => {
        const now = new Date(
            new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })
        );
        return now.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    }, []);

    // Determine hero state
    const hasRefund = mealRefund || gasRefund;
    const hasOutstanding = totalOutstanding > 0;
    const allCleared = !hasPendingRefund && !hasOutstanding && mealPaid && gasPaid;

    return (
        <div className="rounded-2xl relative overflow-hidden shadow-sm bg-card border border-border/50 flex flex-col justify-between animate-fade-up" style={{ animationDelay: '0.1s' }}>
            <div className="p-4 sm:p-5 lg:p-6">

                {/* ── Hero Number ── */}
                {isLoaded && !isMealError && !isGasError && (
                    <div className="mb-4">
                        {/* Period selector — top right */}
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-caption font-semibold text-muted-foreground uppercase tracking-wider">
                                {hasRefund ? 'Total Refund' : hasOutstanding ? 'Total Due' : 'This Period'}
                            </span>
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-muted/60 border border-border/40 text-muted-foreground tabular-nums">
                                {periodLabel}
                            </span>
                        </div>

                        {/* Large hero amount */}
                        <div className="flex items-end gap-3">
                            <span className={cn(
                                "dashboard-balance-amount tabular-nums tracking-tight",
                                hasRefund
                                    ? "text-refund-text"
                                    : hasOutstanding
                                        ? "text-foreground"
                                        : "text-success-text"
                            )}>
                                {isLoading ? (
                                    <span className="inline-block w-32 h-12 bg-muted rounded-lg animate-pulse" />
                                ) : hasRefund ? (
                                    `₹${totalRefund.toLocaleString('en-IN')}`
                                ) : hasOutstanding ? (
                                    `₹${totalOutstanding.toLocaleString('en-IN')}`
                                ) : (
                                    '₹0'
                                )}
                            </span>

                            {!isLoading && hasOutstanding && (
                                <span className="inline-flex items-center gap-1 text-xs sm:text-xs font-bold text-warning-text bg-warning-bg border border-warning-border rounded-full px-2 py-0.5 mb-1">
                                    <FiAlertCircle size={11} />
                                    due
                                </span>
                            )}
                            {!isLoading && hasSettledRefund && !hasOutstanding && (
                                <span className="inline-flex items-center gap-1 text-xs sm:text-xs font-bold text-refund-text bg-refund-bg border border-refund-border rounded-full px-2 py-0.5 mb-1">
                                    <FiRotateCcw size={11} />
                                    Refunded
                                </span>
                            )}
                            {!isLoading && !hasRefund && !hasOutstanding && mealPaid && gasPaid && (
                                <span className="inline-flex items-center gap-1 text-xs sm:text-xs font-bold text-success-text bg-success-bg border border-success-border rounded-full px-2 py-0.5 mb-1">
                                    <FiCheckCircle size={11} />
                                    All clear
                                </span>
                            )}
                        </div>
                    </div>
                )}

                {/* Loading skeleton */}
                {isLoading && (
                    <div className="mb-4">
                        <div className="h-3 w-20 bg-muted rounded animate-pulse mb-2" />
                        <div className="h-10 w-36 bg-muted rounded animate-pulse" />
                    </div>
                )}

                {/* ── Breakdown Chips ── */}
                {isLoaded && !isMealError && !isGasError && (
                    <div className="flex flex-wrap gap-2">
                        {/* Meal chip */}
                        <div className={cn(
                            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs sm:text-caption font-semibold border",
                            mealRefund && safeMeal < 0
                                ? "bg-refund-bg border-refund-border text-refund-text"
                                : mealPaid
                                    ? "bg-success-bg border-success-border text-success-text"
                                    : "bg-muted/50 border-border/40 text-foreground"
                        )}>
                            {mealRefund && safeMeal < 0 ? (
                                <FiRotateCcw size={12} />
                            ) : mealPaid ? (
                                <FiCheckCircle size={12} />
                            ) : (
                                <FiClock size={12} />
                            )}
                            <span>Meal</span>
                            <span className="tabular-nums">
                                {mealRefund && safeMeal < 0
                                    ? `₹${Math.abs(safeMeal).toLocaleString('en-IN')}${isRefundedBill(mealPaymentStatus) ? ' · Refunded' : ''}`
                                    : mealPaid
                                        ? 'Settled'
                                        : `₹${safeMeal.toLocaleString('en-IN')}`
                                }
                            </span>
                        </div>

                        {/* Gas chip */}
                        <div className={cn(
                            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs sm:text-caption font-semibold border",
                            gasRefund && safeGas < 0
                                ? "bg-refund-bg border-refund-border text-refund-text"
                                : gasPaid
                                    ? "bg-success-bg border-success-border text-success-text"
                                    : "bg-muted/50 border-border/40 text-foreground"
                        )}>
                            {gasRefund && safeGas < 0 ? (
                                <FiRotateCcw size={12} />
                            ) : gasPaid ? (
                                <FiCheckCircle size={12} />
                            ) : (
                                <FiDroplet size={12} />
                            )}
                            <span>Gas</span>
                            <span className="tabular-nums">
                                {gasRefund && safeGas < 0
                                    ? `₹${Math.abs(safeGas).toLocaleString('en-IN')}${isRefundedBill(gasBillStatus) ? ' · Refunded' : ''}`
                                    : gasPaid
                                        ? 'Settled'
                                        : `₹${safeGas.toLocaleString('en-IN')}`
                                }
                            </span>
                        </div>
                    </div>
                )}

                {/* Breakdown loading skeleton */}
                {isLoading && (
                    <div className="flex gap-2">
                        <div className="h-7 w-24 bg-muted rounded-full animate-pulse" />
                        <div className="h-7 w-20 bg-muted rounded-full animate-pulse" />
                    </div>
                )}

                {/* Error states */}
                {(isMealError || isGasError) && isLoaded && (
                    <div className="flex flex-wrap gap-2">
                        {isMealError && (
                            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs sm:text-caption font-semibold bg-danger-bg border border-danger-border text-danger-text">
                                <FiAlertCircle size={12} />
                                <span>Meal failed</span>
                                <button onClick={onRetry} className="underline underline-offset-1 ml-0.5">Retry</button>
                            </div>
                        )}
                        {isGasError && (
                            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs sm:text-caption font-semibold bg-danger-bg border border-danger-border text-danger-text">
                                <FiAlertCircle size={12} />
                                <span>Gas failed</span>
                                <button onClick={onRetry} className="underline underline-offset-1 ml-0.5">Retry</button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ── Footer ── */}
            {isLoaded && !isMealError && !isGasError && (
                <div className="p-4 sm:p-5 border-t border-border/40 bg-muted/15 mt-auto">
                    {/* Refund pending — action only while money is still owed back */}
                    {hasPendingRefund && (
                        <Button
                            variant="secondary"
                            size="md"
                            fullWidth
                            onClick={() => navigate('/payments')}
                            className="dashboard-action font-semibold text-refund-text border-refund-border/60 hover:bg-refund-bg/70 shadow-xs flex items-center justify-between"
                        >
                            <span>View refund details</span>
                            <FiArrowRight size={15} />
                        </Button>
                    )}

                    {/* All bills cleared */}
                    {allCleared && (
                        <div className="h-10 px-4 rounded-btn-md border border-success-border/60 bg-success-bg/40 flex items-center justify-center gap-2 text-success-text text-caption font-semibold">
                            <FiCheckCircle size={15} />
                            <span>All bills cleared for this period</span>
                        </div>
                    )}

                    {/* Bills pending */}
                    {!hasPendingRefund && hasOutstanding && (
                        <Button
                            variant="primary"
                            size="md"
                            fullWidth
                            onClick={() => navigate('/payments')}
                            className="dashboard-action font-semibold shadow-sm hover:shadow flex items-center justify-between"
                        >
                            <span className="flex items-center gap-2">
                                <FiCreditCard size={16} />
                                <span>Pay now</span>
                            </span>
                            <FiArrowRight size={15} />
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
};

export default PayableWidget;
