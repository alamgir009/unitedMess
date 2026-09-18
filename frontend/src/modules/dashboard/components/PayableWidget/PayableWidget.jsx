import { useNavigate } from 'react-router-dom';
import {
    FiCreditCard, FiClock, FiDroplet, FiCheckCircle,
    FiArrowRight, FiAlertCircle, FiRotateCcw,
} from 'react-icons/fi';
import { cn } from '@/core/utils/helpers/string.helper';
import { Button } from '@/shared/components/ui';

/**
 * PayableWidget
 *
 * Props
 * ─────
 * mealPayable        {number | null | undefined}  – raw payable amount from backend
 * gasBillPayable     {number | null | undefined}  – raw payable amount from backend
 * mealPaymentStatus  {'success'|'pending'|null}   – authoritative backend status
 * gasBillStatus      {'success'|'pending'|null}   – authoritative backend status
 * isLoading          {boolean}                    – true while fetch in-flight
 * isLoaded           {boolean}                    – true once fetch settled (success OR error)
 * isError            {boolean}                    – true if both fetches failed
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

    /**
     * A bill is PAID if:
     *  1. The backend explicitly says status === 'success', OR
     *  2. Data has loaded without error AND the payable amount is exactly 0.
     *
     * Crucially, null / undefined do NOT count as "paid" —
     * that would hide a real balance when the API hasn't resolved yet.
     */
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

    // Safe numeric totals (never NaN)
    const safeMeal = Number(mealPayable) || 0;
    const safeGas  = Number(gasBillPayable) || 0;
    // Outstanding = only amounts that are actually owed (exclude refunds)
    const totalOutstanding = (!mealPaid ? safeMeal : 0) + (!gasPaid ? safeGas : 0);

    return (
        <div className="rounded-2xl p-6 relative overflow-hidden shadow-sm h-full flex flex-col hover:shadow-md transition-[box-shadow] duration-200 ease-out bg-card border border-border/50">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 p-8 opacity-[0.04] dark:opacity-[0.06] pointer-events-none text-muted-foreground">
                <FiCreditCard size={96} />
            </div>

            <div className="relative z-10 flex flex-col flex-1">
                {/* Header */}
                <div className="mb-5">
                    <h3 className="text-h3 font-bold tracking-tight text-foreground">Your Payables</h3>
                    <p className="text-muted-foreground text-body mt-0.5">Monthly bill summary for this period</p>
                </div>

                {/* Bill Cards */}
                <div className="space-y-3 flex-1">

                    {/* ── Meal Bill ── */}
                    <div className="bg-muted/30 border border-border/40 hover:bg-muted/50 rounded-xl p-4 flex items-center justify-between gap-3 transition-[background-color] duration-150 ease-out">
                        <div className="flex items-center gap-3">
                            <div className={cn('p-2 rounded-lg border', isMealError ? 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400' : mealRefund && safeMeal < 0 ? 'bg-violet-500/10 border-violet-500/20 text-violet-600 dark:text-violet-400' : mealPaid ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-muted border-border/40 text-muted-foreground')}>
                                {isMealError
                                    ? <FiAlertCircle size={18} />
                                    : mealRefund && safeMeal < 0
                                        ? <FiRotateCcw size={18} />
                                        : mealPaid
                                            ? <FiCheckCircle size={18} />
                                            : <FiClock size={18} />
                                }
                            </div>
                            <div>
                                <p className="text-muted-foreground text-caption font-semibold uppercase tracking-wider mb-0.5">Meal Bill</p>
                                <p className="text-h2 font-extrabold text-foreground leading-none tabular-nums">
                                    {isLoading ? (
                                        <span className="inline-block w-16 h-5 bg-muted rounded animate-pulse" />
                                    ) : isMealError ? (
                                        <span className="text-rose-600 dark:text-rose-400 text-sm">Failed to load</span>
                                    ) : mealRefund && safeMeal < 0 ? (
                                        <span className="text-violet-600 dark:text-violet-400 text-sm font-semibold">₹{Math.abs(safeMeal).toLocaleString('en-IN')} Refund</span>
                                    ) : mealPaid ? (
                                        <span className="text-emerald-600 dark:text-emerald-400 text-sm font-semibold">Settled ✓</span>
                                    ) : (
                                        `₹${safeMeal.toLocaleString('en-IN')}`
                                    )}
                                </p>
                            </div>
                        </div>

                        {/* Action */}
                        {!isLoading && !isMealError && (
                            mealRefund && safeMeal < 0 ? (
                                <span className="bg-violet-500/10 border border-violet-500/20 text-violet-600 dark:text-violet-400 text-caption font-semibold uppercase tracking-wider px-2.5 py-1 rounded-lg shrink-0">
                                    Refund
                                </span>
                            ) : mealPaid ? (
                                <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-caption font-semibold uppercase tracking-wider px-2.5 py-1 rounded-lg shrink-0">
                                    Paid
                                </span>
                            ) : (
                                <Button
                                    variant="default"
                                    size="sm"
                                    onClick={() => navigate('/payments')}
                                >
                                    Pay <FiArrowRight size={13} />
                                </Button>
                            )
                        )}
                        {!isLoading && isMealError && (
                            <Button
                                variant="default"
                                size="sm"
                                onClick={() => window.location.reload()}
                            >
                                Retry
                            </Button>
                        )}
                    </div>

                    {/* ── Gas Bill ── */}
                    <div className="bg-muted/30 border border-border/40 hover:bg-muted/50 rounded-xl p-4 flex items-center justify-between gap-3 transition-[background-color] duration-150 ease-out">
                        <div className="flex items-center gap-3">
                            <div className={cn('p-2 rounded-lg border', isGasError ? 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400' : gasRefund && safeGas < 0 ? 'bg-violet-500/10 border-violet-500/20 text-violet-600 dark:text-violet-400' : gasPaid ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-muted border-border/40 text-muted-foreground')}>
                                {isGasError
                                    ? <FiAlertCircle size={18} />
                                    : gasRefund && safeGas < 0
                                        ? <FiRotateCcw size={18} />
                                        : gasPaid
                                            ? <FiCheckCircle size={18} />
                                            : <FiDroplet size={18} />
                                }
                            </div>
                            <div>
                                <p className="text-muted-foreground text-caption font-semibold uppercase tracking-wider mb-0.5">Gas Bill</p>
                                <p className="text-h2 font-extrabold text-foreground leading-none tabular-nums">
                                    {isLoading ? (
                                        <span className="inline-block w-16 h-5 bg-muted rounded animate-pulse" />
                                    ) : isGasError ? (
                                        <span className="text-rose-600 dark:text-rose-400 text-sm">Failed to load</span>
                                    ) : gasRefund && safeGas < 0 ? (
                                        <span className="text-violet-600 dark:text-violet-400 text-sm font-semibold">₹{Math.abs(safeGas).toLocaleString('en-IN')} Refund</span>
                                    ) : gasPaid ? (
                                        <span className="text-emerald-600 dark:text-emerald-400 text-sm font-semibold">Settled ✓</span>
                                    ) : (
                                        `₹${safeGas.toLocaleString('en-IN')}`
                                    )}
                                </p>
                            </div>
                        </div>

                        {/* Action */}
                        {!isLoading && !isGasError && (
                            gasRefund && safeGas < 0 ? (
                                <span className="bg-violet-500/10 border border-violet-500/20 text-violet-600 dark:text-violet-400 text-caption font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg shrink-0">
                                    Refund
                                </span>
                            ) : gasPaid ? (
                                <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-caption font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg shrink-0">
                                    Paid
                                </span>
                            ) : (
                                <Button
                                    variant="default"
                                    size="sm"
                                    onClick={() => navigate('/payments')}
                                >
                                    Pay <FiArrowRight size={13} />
                                </Button>
                            )
                        )}
                        {!isLoading && isGasError && (
                            <Button
                                variant="default"
                                size="sm"
                                onClick={() => window.location.reload()}
                            >
                                Retry
                            </Button>
                        )}
                    </div>
                </div>

                {/* ── Footer ── */}
                {/* Total outstanding — when at least one bill is unpaid and no refunds pending */}
                {isLoaded && !mealRefund && !gasRefund && (!mealPaid || !gasPaid) && !(isMealError && isGasError) && (
                    <div className="mt-4 pt-4 border-t border-border/40 flex items-center justify-between">
                        <span className="text-muted-foreground text-body font-semibold uppercase tracking-wider">Total Outstanding</span>
                        <span className="text-h2 font-bold text-foreground tabular-nums">
                            ₹{totalOutstanding.toLocaleString('en-IN')}
                        </span>
                    </div>
                )}

                {/* Refund pending — when any bill has refund due */}
                {isLoaded && (mealRefund || gasRefund) && (
                    <div className="mt-4 pt-4 border-t border-border/40 flex items-center justify-between">
                        <span className="text-muted-foreground text-body font-semibold uppercase tracking-wider">Total Refund</span>
                        <span className="text-h2 font-bold text-violet-600 dark:text-violet-400 tabular-nums">
                            ₹{Math.abs(safeMeal + safeGas).toLocaleString('en-IN')}
                        </span>
                    </div>
                )}

                {/* All bills cleared — both paid, no refunds */}
                {isLoaded && !isMealError && !isGasError && !mealRefund && !gasRefund && mealPaid && gasPaid && (
                    <div className="mt-4 pt-4 border-t border-border/40 flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-caption font-semibold uppercase tracking-wider">
                        <FiCheckCircle size={14} />
                        <span>All bills cleared for this period!</span>
                    </div>
                )}

                {/* Refund in progress — all bills have refund due */}
                {isLoaded && !isMealError && !isGasError && mealRefund && gasRefund && (
                    <div className="mt-4 pt-4 border-t border-border/40 flex items-center gap-1.5 text-violet-600 dark:text-violet-400 text-caption font-semibold uppercase tracking-wider">
                        <FiRotateCcw size={14} />
                        <span>Refunds pending for this period</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PayableWidget;
