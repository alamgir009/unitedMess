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
        <div className="bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-700 rounded-3xl p-7 relative overflow-hidden shadow-xl shadow-indigo-500/25 text-white h-full flex flex-col">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 p-10 opacity-10 pointer-events-none">
                <FiCreditCard size={100} />
            </div>
            <div className="absolute -bottom-10 -left-10 w-44 h-44 bg-white/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute top-8 right-16 w-28 h-28 bg-purple-300/10 rounded-full blur-2xl pointer-events-none" />

            <div className="relative z-10 flex flex-col flex-1">
                {/* Header */}
                <div className="mb-6">
                    <h3 className="text-xl font-bold tracking-tight">Your Payables</h3>
                    <p className="text-indigo-200/80 text-sm mt-0.5">Monthly bill summary for this period</p>
                </div>

                {/* Error state */}
                {isError && (
                    <div className="flex items-center gap-3 bg-white/10 border border-white/20 rounded-2xl px-4 py-3 mb-4 text-sm">
                        <FiAlertCircle size={18} className="shrink-0 text-rose-300" />
                        <span className="text-indigo-100">
                            Unable to load bill data. Please refresh.
                        </span>
                    </div>
                )}

                {/* Bill Cards */}
                <div className="space-y-3 flex-1">

                    {/* ── Meal Bill ── */}
                    <div className="bg-white/10 border border-white/20 backdrop-blur-md rounded-2xl p-4 flex items-center justify-between gap-3 hover:bg-white/15 transition-all duration-300">
                        <div className="flex items-center gap-3">
                            <div className={cn('p-2.5 rounded-xl', mealPaid ? 'bg-green-400/30' : 'bg-indigo-400/30')}>
                                {mealPaid
                                    ? <FiCheckCircle size={20} className="text-green-300" />
                                    : <FiClock size={20} className="text-white" />
                                }
                            </div>
                            <div>
                                <p className="text-indigo-200 text-xs font-medium uppercase tracking-wider mb-0.5">Meal Bill</p>
                                <p className="text-xl font-extrabold">
                                    {isLoading ? (
                                        <span className="inline-block w-16 h-6 bg-white/20 rounded animate-pulse" />
                                    ) : isError ? (
                                        <span className="text-rose-300 text-sm">—</span>
                                    ) : mealPaid ? (
                                        <span className="text-green-300">Settled ✓</span>
                                    ) : (
                                        `₹${safeMeal.toLocaleString('en-IN')}`
                                    )}
                                </p>
                            </div>
                        </div>

                        {/* Action */}
                        {!isLoading && !isError && (
                            mealPaid ? (
                                <span className="bg-green-500/30 border border-green-400/40 text-green-200 text-xs font-bold px-3 py-1.5 rounded-xl shrink-0">
                                    Paid
                                </span>
                            ) : (
                                <button
                                    onClick={() => navigate('/payments')}
                                    className="flex items-center gap-1.5 bg-white text-indigo-700 px-4 py-2 rounded-xl font-bold text-sm hover:shadow-lg hover:scale-105 active:scale-95 transition-all duration-200 shrink-0"
                                >
                                    Pay <FiArrowRight size={14} />
                                </button>
                            )
                        )}
                    </div>

                    {/* ── Gas Bill ── */}
                    <div className="bg-white/10 border border-white/20 backdrop-blur-md rounded-2xl p-4 flex items-center justify-between gap-3 hover:bg-white/15 transition-all duration-300">
                        <div className="flex items-center gap-3">
                            <div className={cn('p-2.5 rounded-xl', gasPaid ? 'bg-green-400/30' : 'bg-purple-400/30')}>
                                {gasPaid
                                    ? <FiCheckCircle size={20} className="text-green-300" />
                                    : <FiDroplet size={20} className="text-white" />
                                }
                            </div>
                            <div>
                                <p className="text-indigo-200 text-xs font-medium uppercase tracking-wider mb-0.5">Gas Bill</p>
                                <p className="text-xl font-extrabold">
                                    {isLoading ? (
                                        <span className="inline-block w-16 h-6 bg-white/20 rounded animate-pulse" />
                                    ) : isError ? (
                                        <span className="text-rose-300 text-sm">—</span>
                                    ) : gasPaid ? (
                                        <span className="text-green-300">Settled ✓</span>
                                    ) : (
                                        `₹${safeGas.toLocaleString('en-IN')}`
                                    )}
                                </p>
                            </div>
                        </div>

                        {/* Action */}
                        {!isLoading && !isError && (
                            gasPaid ? (
                                <span className="bg-green-500/30 border border-green-400/40 text-green-200 text-xs font-bold px-3 py-1.5 rounded-xl shrink-0">
                                    Paid
                                </span>
                            ) : (
                                <button
                                    onClick={() => navigate('/payments')}
                                    className="flex items-center gap-1.5 bg-white text-purple-700 px-4 py-2 rounded-xl font-bold text-sm hover:shadow-lg hover:scale-105 active:scale-95 transition-all duration-200 shrink-0"
                                >
                                    Pay <FiArrowRight size={14} />
                                </button>
                            )
                        )}
                    </div>
                </div>

                {/* ── Footer ── */}
                {/* Total outstanding — only when loaded, not errored, and at least one bill is unpaid */}
                {isLoaded && !isError && (!mealPaid || !gasPaid) && (
                    <div className="mt-5 pt-4 border-t border-white/20 flex items-center justify-between">
                        <span className="text-indigo-200 text-sm font-medium">Total Outstanding</span>
                        <span className="text-xl font-extrabold">
                            ₹{totalOutstanding.toLocaleString('en-IN')}
                        </span>
                    </div>
                )}

                {/* All bills cleared */}
                {isLoaded && !isError && mealPaid && gasPaid && (
                    <div className="mt-5 pt-4 border-t border-white/20 flex items-center gap-2 text-green-300">
                        <FiCheckCircle size={16} />
                        <span className="text-sm font-semibold">All bills cleared for this period!</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PayableWidget;
