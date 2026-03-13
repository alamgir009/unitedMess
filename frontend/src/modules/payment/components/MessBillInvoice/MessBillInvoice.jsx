import React, { useState, useEffect, useMemo, memo } from 'react';
import { motion } from 'framer-motion';
import {
    HiOutlineCurrencyRupee,
    HiOutlineShoppingCart,
    HiOutlineUserGroup,
    HiOutlineWrenchScrewdriver,
    HiOutlineBeaker,
    HiOutlineUsers,
    HiOutlineStar,
    HiOutlinePencilSquare,
    HiOutlineLockClosed,
    HiOutlineCheckCircle,
    HiOutlineXMark,
    HiOutlineArrowTrendingDown,
    HiOutlineReceiptPercent,
    HiOutlineDocumentText,
    HiOutlineEnvelope,
    HiOutlineSparkles,
    HiOutlineBuildingOffice2,
} from 'react-icons/hi2';
import { SiRazorpay } from 'react-icons/si';

/* ────────────────────────────────────────
   HELPERS (unchanged)
──────────────────────────────────────── */
const fmt = (n) =>
    Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

const nowDate = new Date();
const INV_MONTH = nowDate.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
const INV_DATE = nowDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
const INV_NO = `UM-${nowDate.getFullYear()}${String(nowDate.getMonth() + 1).padStart(2, '0')}-${Math.floor(Math.random() * 9000 + 1000)}`;

/* ────────────────────────────────────────
   STAT CARD – memoized
──────────────────────────────────────── */
const StatCard = memo(({ icon: Icon, label, value, subLabel, accent = false }) => (
    <div className="flex-1 min-w-[140px] p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
        <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg ${accent ? 'bg-indigo-100 dark:bg-indigo-900/30' : 'bg-gray-100 dark:bg-gray-700'}`}>
                <Icon className={`w-5 h-5 ${accent ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-600 dark:text-gray-300'}`} />
            </div>
            <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
                <p className={`text-2xl font-bold tabular-nums leading-tight ${accent ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-900 dark:text-white'}`}>
                    {value}
                </p>
                {subLabel && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{subLabel}</p>}
            </div>
        </div>
    </div>
));

/* ────────────────────────────────────────
   LINE ITEM – memoized
──────────────────────────────────────── */
const LineItem = memo(({ icon: Icon, label, value, subText, accent = false }) => (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-800 last:border-0">
        <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${accent ? 'bg-indigo-50 dark:bg-indigo-900/20' : 'bg-gray-50 dark:bg-gray-800'}`}>
                <Icon className={`w-4 h-4 ${accent ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400'}`} />
            </div>
            <div>
                <p className={`text-sm font-medium ${accent ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-700 dark:text-gray-200'}`}>
                    {label}
                </p>
                {subText && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{subText}</p>}
            </div>
        </div>
        <span className={`text-sm font-bold tabular-nums ${accent ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-900 dark:text-white'}`}>
            {value}
        </span>
    </div>
));

/* ────────────────────────────────────────
   SECTION DIVIDER – memoized
──────────────────────────────────────── */
const SectionDivider = memo(({ label }) => (
    <div className="flex items-center gap-3 pt-4 pb-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
            {label}
        </span>
        <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
    </div>
));

/* ────────────────────────────────────────
   PLATFORM FEE ROW – memoized, with safe onSave
──────────────────────────────────────── */
const PlatformFeeRow = memo(({ isAdmin, platformFee, onSave }) => {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(String(platformFee));

    useEffect(() => setDraft(String(platformFee)), [platformFee]);

    const commit = () => {
        const val = parseFloat(draft);
        // Only call onSave if it's a function
        if (typeof onSave === 'function') {
            onSave(isNaN(val) ? 0 : val);
        }
        setEditing(false);
    };
    const cancel = () => {
        setDraft(String(platformFee));
        setEditing(false);
    };

    return (
        <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-violet-50 dark:bg-violet-900/20">
                    <HiOutlineReceiptPercent className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                </div>
                <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Platform Fee</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                        {isAdmin ? 'Click to edit' : 'Set by admin'}
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-2">
                {editing ? (
                    <>
                        <span className="text-sm text-gray-500">₹</span>
                        <input
                            autoFocus
                            type="number"
                            min="0"
                            step="0.01"
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && commit()}
                            className="w-20 px-2 py-1 text-sm text-right bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none"
                        />
                        <button
                            onClick={commit}
                            className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30"
                        >
                            <HiOutlineCheckCircle className="w-4 h-4" />
                        </button>
                        <button
                            onClick={cancel}
                            className="p-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30"
                        >
                            <HiOutlineXMark className="w-4 h-4" />
                        </button>
                    </>
                ) : (
                    <>
                        <span className="text-sm font-bold tabular-nums text-violet-600 dark:text-violet-400">
                            ₹{fmt(platformFee)}
                        </span>
                        {isAdmin ? (
                            <button
                                onClick={() => setEditing(true)}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20"
                            >
                                <HiOutlinePencilSquare className="w-4 h-4" />
                            </button>
                        ) : (
                            <HiOutlineLockClosed className="w-4 h-4 text-gray-300 dark:text-gray-600" />
                        )}
                    </>
                )}
            </div>
        </div>
    );
});

/* ────────────────────────────────────────
   MAIN COMPONENT
──────────────────────────────────────── */
const MessBillInvoice = ({
    data,
    isAdmin,
    user,
    platformFee = 0,
    onPlatformFeeChange,
    onPayNow,
    isPaying,
    isSendingEmail,
    onSendEmail,
    paymentStatus = 'pending',   // 'pending' | 'success' | 'failed' | 'refunded'
}) => {
    if (!data) return null;

    const {
        grandTotalMarketAmount = 0,
        grandTotalMeal = 0,
        totalGuestRevenue = 0,
        adjustedMealCharge = 0,
        userStats = {},
    } = data;

    const {
        totalMeal = 0,
        totalMarketAmount = 0,
        waterBill = 0,
        cookingCharge = 0,
        costOfMeals = 0,
        guestMeal = 0,
        chargePerGuestMeal = 0,
        guestMealAmount = 0,
    } = userStats;

    // Memoized derived values
    const basePayable = data.payableAmount ?? 0;
    const finalPayable = useMemo(() => basePayable + platformFee, [basePayable, platformFee]);
    const isRefund = useMemo(() => finalPayable < 0, [finalPayable]);
    const displayAmt = useMemo(() => Math.abs(finalPayable), [finalPayable]);
    const isPaid = useMemo(() => paymentStatus === 'success', [paymentStatus]);

    // Safe action handlers
    const handlePayNow = () => {
        if (typeof onPayNow === 'function') {
            onPayNow(finalPayable, 'mess_bill');
        }
    };

    const handleSendEmail = () => {
        if (typeof onSendEmail === 'function') {
            onSendEmail();
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="relative rounded-2xl bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl backdrop-saturate-150 border border-black/5 dark:border-white/10 overflow-hidden shadow-lg dark:shadow-black/40 hover:shadow-xl hover:shadow-emerald-500/[0.08] transition-all duration-300 hover:-translate-y-1 before:absolute before:inset-x-12 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/70 dark:before:via-white/20 before:to-transparent before:pointer-events-none"
        >
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 px-6 py-5 border-b border-gray-200 dark:border-gray-800">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center">
                        <HiOutlineDocumentText className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Mess Bill Invoice</h3>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-medium">
                                <HiOutlineSparkles className="w-3 h-3" /> {INV_MONTH}
                            </span>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                            <HiOutlineBuildingOffice2 className="inline w-4 h-4 mr-1 -mt-0.5" />
                            United Mess · {INV_DATE}
                        </p>
                    </div>
                </div>

                <div className="flex flex-col items-start sm:items-end gap-0.5">
                    <p className="text-xs font-mono text-gray-400 dark:text-gray-500">{INV_NO}</p>
                    {user?.name && <p className="text-sm font-medium text-gray-900 dark:text-white">{user.name}</p>}
                    {user?.email && <p className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-[200px]">{user.email}</p>}
                </div>
            </div>

            {/* Summary Stats */}
            <div className="px-6 pt-5">
                <div className="flex flex-wrap gap-4">
                    <StatCard
                        icon={HiOutlineShoppingCart}
                        label="Market Total"
                        value={`₹${fmt(grandTotalMarketAmount)}`}
                        subLabel="All members"
                    />
                    <StatCard
                        icon={HiOutlineUsers}
                        label="Total Meals"
                        value={`${fmt(grandTotalMeal)}`}
                        subLabel="All members"
                    />
                    <StatCard
                        icon={HiOutlineCurrencyRupee}
                        label="Your Payable"
                        value={`₹${fmt(finalPayable)}`}
                        subLabel={isRefund ? 'Refund due' : 'Due now'}
                        accent={!isRefund}
                    />
                </div>
            </div>

            {/* Detailed Breakdown */}
            <div className="px-6 py-4">
                <SectionDivider label="Your usage" />
                <LineItem icon={HiOutlineStar} label="Your meals" value={`${fmt(totalMeal)} meals`} />
                <LineItem icon={HiOutlineShoppingCart} label="Your market spend" value={`₹${fmt(totalMarketAmount)}`} subText="What you spent" />

                <SectionDivider label="Monthly charges" />
                <LineItem icon={HiOutlineBeaker} label="Water bill" value={`₹${fmt(waterBill)}`} />
                <LineItem icon={HiOutlineWrenchScrewdriver} label="Cooking charge" value={`₹${fmt(cookingCharge)}`} />
                {guestMeal > 0 && (
                    <LineItem
                        icon={HiOutlineUserGroup}
                        label="Guest meals"
                        subText={`${guestMeal} meal(s) × ₹${fmt(chargePerGuestMeal)}`}
                        value={`₹${fmt(guestMealAmount)}`}
                    />
                )}

                <SectionDivider label="Calculations" />
                <LineItem icon={HiOutlineCurrencyRupee} label="Cost of your meals" value={`₹${fmt(costOfMeals)}`} subText="Proportional share" accent />
                <LineItem icon={HiOutlineCurrencyRupee} label="Adjusted meal charge" value={`₹${fmt(adjustedMealCharge)}`} subText="After guest deduction" accent />

                <PlatformFeeRow isAdmin={isAdmin} platformFee={platformFee} onSave={onPlatformFeeChange} />
            </div>

            {/* Total & Actions */}
            <div className={`px-6 py-5 rounded-b-2xl ${isRefund ? 'bg-emerald-50/50 dark:bg-emerald-900/10' : 'bg-gray-50 dark:bg-gray-800/30'}`}>
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-5">
                    <div>
                        <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                            {isRefund ? 'Refund amount' : 'Total payable'}
                        </p>
                        <div className="flex items-baseline gap-3">
                            <span className={`text-3xl sm:text-4xl font-bold tabular-nums ${isRefund ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-900 dark:text-white'}`}>
                                ₹{fmt(displayAmt)}
                            </span>
                            {isRefund && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
                                    <HiOutlineArrowTrendingDown className="w-3 h-3" /> Refund
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Status badge */}
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
                        isPaid
                            ? 'border-emerald-200 dark:border-emerald-800'
                            : isRefund
                                ? 'border-emerald-200 dark:border-emerald-800'
                                : 'border-amber-200 dark:border-amber-800'
                    }`}>
                        {isPaid ? (
                            <HiOutlineCheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        ) : isRefund ? (
                            <HiOutlineArrowTrendingDown className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                            <HiOutlineCurrencyRupee className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        )}
                        <span className={`text-xs font-semibold ${
                            isPaid
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : isRefund
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : 'text-amber-600 dark:text-amber-400'
                        }`}>
                            {isPaid ? 'Paid' : isRefund ? 'Refund' : 'Due'}
                        </span>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3">
                    {/* ── Payment already completed ── */}
                    {isPaid ? (
                        <div className="flex-1 flex items-start gap-3 p-4 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                            <HiOutlineCheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Mess Bill Payment Successful!</p>
                                <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70 mt-1">
                                    ₹{fmt(displayAmt)} has been received. Your invoice is final.
                                </p>
                            </div>
                        </div>
                    ) : isRefund ? (
                        <div className="flex-1 flex items-start gap-3 p-4 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                            <HiOutlineCheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">You have a refund!</p>
                                <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70 mt-1">
                                    ₹{fmt(displayAmt)} will be credited back. Contact your mess admin.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            disabled={!!isPaying}
                            onClick={handlePayNow}
                            className="flex-1 flex items-center justify-center gap-2 py-3 px-5 rounded-lg text-sm font-semibold text-white 
                            bg-indigo-600 hover:bg-indigo-700 
                            shadow-[0_6px_20px_rgba(79,70,229,0.35),inset_0_1px_0_rgba(255,255,255,0.2)] 
                            hover:shadow-[0_10px_30px_rgba(79,70,229,0.45)] 
                            disabled:opacity-60 disabled:cursor-not-allowed 
                            transition-all duration-300"
                        >
                            {isPaying ? (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <SiRazorpay className="w-5 h-5" />
                            )}
                            <span>{isPaying ? 'Processing…' : `Pay ₹${fmt(finalPayable)}`}</span>
                        </motion.button>
                    )}

                    {typeof onSendEmail === 'function' && (
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            disabled={!!isSendingEmail}
                            onClick={handleSendEmail}
                            className="flex items-center justify-center gap-2 px-5 py-3 rounded-lg text-sm font-medium 
                            border border-gray-300/60 dark:border-white/10 
                            bg-white/70 dark:bg-gray-800/60 backdrop-blur-md
                            text-gray-700 dark:text-gray-200 
                            shadow-[0_4px_16px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.4)] 
                            hover:shadow-[0_8px_24px_rgba(0,0,0,0.15)] 
                            hover:bg-white/80 dark:hover:bg-gray-700/60
                            transition-all duration-300 disabled:opacity-60"
                        >
                            {isSendingEmail ? (
                                <div className="w-4 h-4 border-2 border-gray-400/30 border-t-gray-600 dark:border-t-gray-300 rounded-full animate-spin" />
                            ) : (
                                <HiOutlineEnvelope className="w-4 h-4" />
                            )}
                            <span className="hidden sm:inline">Email Invoice</span>
                        </motion.button>
                    )}
                </div>

                {/* Fine print */}
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-4 text-center">
                    System‑generated invoice for {INV_MONTH}. For disputes, contact your mess admin.
                </p>
            </div>
        </motion.div>
    );
};

export default MessBillInvoice;