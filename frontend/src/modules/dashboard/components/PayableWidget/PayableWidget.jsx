import { useNavigate } from 'react-router-dom';
import { useMemo } from 'react';
import {
    FiClock, FiDroplet, FiCheckCircle,
    FiArrowRight, FiAlertCircle, FiRotateCcw,
} from 'react-icons/fi';
import { cn } from '@/core/utils/helpers/string.helper';

/**
 * PayableWidget
 *
 * Props
 * ─────
 * mealPayable        {number | null | undefined}  – raw payable amount from backend
 * gasBillPayable     {number | null | undefined}  – raw payable amount from backend
 * mealPaymentStatus  {'success'|'pending'|'refund'|null}   – authoritative backend status
 * gasBillStatus      {'success'|'pending'|'refund'|null}   – authoritative backend status
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
    isLoaded,
    isMealError,
    isGasError,
}) => {
    const navigate = useNavigate();

    const mealPaid =
        mealPaymentStatus === 'success' ||
        mealPaymentStatus === 'refund' ||
        (isLoaded && !isMealError && mealPayable === 0);

    const gasPaid =
        gasBillStatus === 'success' ||
        gasBillStatus === 'refund' ||
        (isLoaded && !isGasError && gasBillPayable === 0);

    const mealRefund = mealPaymentStatus === 'refund';
    const gasRefund = gasBillStatus === 'refund';

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
    const allCleared = !hasRefund && !hasOutstanding && mealPaid && gasPaid;

    return (
        <div className="rounded-2xl relative overflow-hidden shadow-sm bg-card border border-border/50 animate-fade-up" style={{ animationDelay: '0.1s' }}>
            <div className="p-4 sm:p-5 lg:p-6">

                {/* ── Hero Number ── */}
                {isLoaded && !isMealError && !isGasError && (
                    <div className="mb-4">
                        {/* Period selector — top right */}
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-caption font-semibold text-muted-foreground uppercase tracking-wider">
                                {hasRefund ? 'Total Refund' : hasOutstanding ? 'Total Due' : 'This Period'}
                            </span>
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-muted/60 border border-border/40 text-muted-foreground tabular-nums">
                                {periodLabel}
                            </span>
                        </div>

                        {/* Large hero amount */}
                        <div className="flex items-end gap-3">
                            <span className={cn(
                                "text-4xl sm:text-5xl font-bold tabular-nums tracking-tight leading-none",
                                hasRefund
                                    ? "text-violet-600 dark:text-violet-400"
                                    : hasOutstanding
                                        ? "text-foreground"
                                        : "text-emerald-600 dark:text-emerald-400"
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
                                <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-full px-2 py-0.5 mb-1">
                                    <FiAlertCircle size={11} />
                                    due
                                </span>
                            )}
                            {!isLoading && !hasRefund && !hasOutstanding && mealPaid && gasPaid && (
                                <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2 py-0.5 mb-1">
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
                            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] sm:text-caption font-semibold border",
                            mealRefund && safeMeal < 0
                                ? "bg-violet-500/5 border-violet-500/20 text-violet-600 dark:text-violet-400"
                                : mealPaid
                                    ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
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
                                    ? `₹${Math.abs(safeMeal).toLocaleString('en-IN')}`
                                    : mealPaid
                                        ? 'Settled'
                                        : `₹${safeMeal.toLocaleString('en-IN')}`
                                }
                            </span>
                        </div>

                        {/* Gas chip */}
                        <div className={cn(
                            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] sm:text-caption font-semibold border",
                            gasRefund && safeGas < 0
                                ? "bg-violet-500/5 border-violet-500/20 text-violet-600 dark:text-violet-400"
                                : gasPaid
                                    ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
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
                                    ? `₹${Math.abs(safeGas).toLocaleString('en-IN')}`
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
                            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] sm:text-caption font-semibold bg-rose-500/5 border border-rose-500/20 text-rose-600 dark:text-rose-400">
                                <FiAlertCircle size={12} />
                                <span>Meal failed</span>
                                <button onClick={() => window.location.reload()} className="underline underline-offset-1 ml-0.5">Retry</button>
                            </div>
                        )}
                        {isGasError && (
                            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] sm:text-caption font-semibold bg-rose-500/5 border border-rose-500/20 text-rose-600 dark:text-rose-400">
                                <FiAlertCircle size={12} />
                                <span>Gas failed</span>
                                <button onClick={() => window.location.reload()} className="underline underline-offset-1 ml-0.5">Retry</button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ── Footer ── */}
            {isLoaded && !isMealError && !isGasError && (
                <>
                    {/* Refund pending */}
                    {hasRefund && (
                        <button
                            onClick={() => navigate('/payments')}
                            className="w-full px-4 sm:px-6 py-3 sm:py-3.5 border-t border-border/40 bg-violet-500/5 hover:bg-violet-500/10 flex items-center justify-between transition-colors duration-150 group"
                        >
                            <span className="text-caption sm:text-body font-semibold text-violet-600 dark:text-violet-400">View refund details</span>
                            <FiArrowRight size={14} className="text-violet-600/50 dark:text-violet-400/50 group-hover:text-violet-600 dark:group-hover:text-violet-400 group-hover:translate-x-0.5 transition-all" />
                        </button>
                    )}

                    {/* All bills cleared */}
                    {allCleared && (
                        <div className="px-4 sm:px-6 py-3 sm:py-3.5 border-t border-border/40 bg-emerald-500/5 flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-caption font-semibold">
                            <FiCheckCircle size={14} />
                            <span>All bills cleared for this period</span>
                        </div>
                    )}

                    {/* Bills pending */}
                    {!hasRefund && hasOutstanding && (
                        <button
                            onClick={() => navigate('/payments')}
                            className="w-full px-4 sm:px-6 py-3 sm:py-3.5 border-t border-border/40 bg-primary/5 hover:bg-primary/10 flex items-center justify-between transition-colors duration-150 group"
                        >
                            <span className="text-caption sm:text-body font-semibold text-primary">Pay now</span>
                            <FiArrowRight size={14} className="text-primary/50 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                        </button>
                    )}
                </>
            )}
        </div>
    );
};

export default PayableWidget;
