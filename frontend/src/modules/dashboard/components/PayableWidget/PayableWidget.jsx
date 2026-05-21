import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
    FiCreditCard, FiClock, FiDroplet, FiCheckCircle,
    FiArrowRight, FiAlertCircle,
} from 'react-icons/fi';
import { cn } from '@/core/utils/helpers/string.helper';

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
 * isError            {boolean}                    – true if fetch failed
 */
const PayableWidget = ({
    mealPayable,
    gasBillPayable,
    mealPaymentStatus,
    gasBillStatus,
    isLoading,
    isLoaded,
    isError,
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
        (isLoaded && !isError && mealPayable === 0);

    const gasPaid =
        gasBillStatus === 'success' ||
        (isLoaded && !isError && gasBillPayable === 0);

    // Safe numeric totals (never NaN)
    const safeMeal = Number(mealPayable) || 0;
    const safeGas  = Number(gasBillPayable) || 0;
    const totalOutstanding = (mealPaid ? 0 : safeMeal) + (gasPaid ? 0 : safeGas);

    return (
        <div className="bg-gradient-to-br from-indigo-600 via-indigo-600 to-purple-700 dark:from-indigo-950/40 dark:to-purple-950/40 border border-indigo-500/20 dark:border-indigo-500/30 rounded-2xl p-6 relative overflow-hidden shadow-sm h-full flex flex-col transform-gpu hover:shadow-md transition-all duration-200 ease-out contain-layout">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 p-8 opacity-[0.04] dark:opacity-[0.08] pointer-events-none text-white">
                <FiCreditCard size={96} />
            </div>

            <div className="relative z-10 flex flex-col flex-1">
                {/* Header */}
                <div className="mb-5">
                    <h3 className="text-lg font-bold tracking-tight text-white">Your Payables</h3>
                    <p className="text-indigo-200/80 text-xs sm:text-sm mt-0.5">Monthly bill summary for this period</p>
                </div>

                {/* Error state */}
                {isError && (
                    <div className="flex items-center gap-2 bg-rose-500/20 border border-rose-500/30 rounded-xl px-4 py-2.5 mb-4 text-xs font-medium">
                        <FiAlertCircle size={14} className="shrink-0 text-rose-300" />
                        <span className="text-rose-100">
                            Unable to load bill data. Please refresh.
                        </span>
                    </div>
                )}

                {/* Bill Cards */}
                <div className="space-y-3 flex-1">

                    {/* ── Meal Bill ── */}
                    <div className="bg-white/5 dark:bg-white/[0.02] border border-white/10 hover:bg-white/10 dark:hover:bg-white/[0.05] rounded-xl p-4 flex items-center justify-between gap-3 transition-colors duration-150">
                        <div className="flex items-center gap-3">
                            <div className={cn('p-2 rounded-lg border', mealPaid ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' : 'bg-white/10 border-white/10 text-white')}>
                                {mealPaid
                                    ? <FiCheckCircle size={18} />
                                    : <FiClock size={18} />
                                }
                            </div>
                            <div>
                                <p className="text-indigo-200/90 text-[10px] font-semibold uppercase tracking-wider mb-0.5">Meal Bill</p>
                                <p className="text-lg sm:text-xl font-extrabold text-white leading-none tabular-nums">
                                    {isLoading ? (
                                        <span className="inline-block w-16 h-5 bg-white/20 rounded animate-pulse" />
                                    ) : isError ? (
                                        <span className="text-rose-300 text-sm">—</span>
                                    ) : mealPaid ? (
                                        <span className="text-emerald-300 text-sm font-semibold">Settled ✓</span>
                                    ) : (
                                        `₹${safeMeal.toLocaleString('en-IN')}`
                                    )}
                                </p>
                            </div>
                        </div>

                        {/* Action */}
                        {!isLoading && !isError && (
                            mealPaid ? (
                                <span className="bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[10.5px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg shrink-0">
                                    Paid
                                </span>
                            ) : (
                                <button
                                    onClick={() => navigate('/payments')}
                                    className="flex items-center gap-1 bg-white text-indigo-700 dark:bg-white dark:text-indigo-950 px-3.5 py-1.5 rounded-xl font-bold text-xs sm:text-sm hover:bg-white/90 active:bg-white/80 transition-colors shrink-0"
                                >
                                    Pay <FiArrowRight size={13} />
                                </button>
                            )
                        )}
                    </div>

                    {/* ── Gas Bill ── */}
                    <div className="bg-white/5 dark:bg-white/[0.02] border border-white/10 hover:bg-white/10 dark:hover:bg-white/[0.05] rounded-xl p-4 flex items-center justify-between gap-3 transition-colors duration-150">
                        <div className="flex items-center gap-3">
                            <div className={cn('p-2 rounded-lg border', gasPaid ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' : 'bg-white/10 border-white/10 text-white')}>
                                {gasPaid
                                    ? <FiCheckCircle size={18} />
                                    : <FiDroplet size={18} />
                                }
                            </div>
                            <div>
                                <p className="text-indigo-200/90 text-[10px] font-semibold uppercase tracking-wider mb-0.5">Gas Bill</p>
                                <p className="text-lg sm:text-xl font-extrabold text-white leading-none tabular-nums">
                                    {isLoading ? (
                                        <span className="inline-block w-16 h-5 bg-white/20 rounded animate-pulse" />
                                    ) : isError ? (
                                        <span className="text-rose-300 text-sm">—</span>
                                    ) : gasPaid ? (
                                        <span className="text-emerald-300 text-sm font-semibold">Settled ✓</span>
                                    ) : (
                                        `₹${safeGas.toLocaleString('en-IN')}`
                                    )}
                                </p>
                            </div>
                        </div>

                        {/* Action */}
                        {!isLoading && !isError && (
                            gasPaid ? (
                                <span className="bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[10.5px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg shrink-0">
                                    Paid
                                </span>
                            ) : (
                                <button
                                    onClick={() => navigate('/payments')}
                                    className="flex items-center gap-1 bg-white text-purple-700 dark:bg-white dark:text-purple-950 px-3.5 py-1.5 rounded-xl font-bold text-xs sm:text-sm hover:bg-white/90 active:bg-white/80 transition-colors shrink-0"
                                >
                                    Pay <FiArrowRight size={13} />
                                </button>
                            )
                        )}
                    </div>
                </div>

                {/* ── Footer ── */}
                {/* Total outstanding — only when loaded, not errored, and at least one bill is unpaid */}
                {isLoaded && !isError && (!mealPaid || !gasPaid) && (
                    <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
                        <span className="text-indigo-200/95 text-xs sm:text-sm font-semibold uppercase tracking-wider">Total Outstanding</span>
                        <span className="text-lg sm:text-xl font-bold text-white tabular-nums">
                            ₹{totalOutstanding.toLocaleString('en-IN')}
                        </span>
                    </div>
                )}

                {/* All bills cleared */}
                {isLoaded && !isError && mealPaid && gasPaid && (
                    <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-1.5 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
                        <FiCheckCircle size={14} />
                        <span>All bills cleared for this period!</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PayableWidget;
