import React from 'react';
import { Spinner } from '@/shared/components/ui';
import {
    HiOutlinePlus,
    HiOutlineSquares2X2,
    HiOutlineListBullet,
    HiOutlineCurrencyRupee,
    HiOutlineShieldCheck,
    HiOutlineCheckCircle,
} from 'react-icons/hi2';

const PaymentHeader = ({
    isAdmin,
    viewMode,
    onViewModeChange,
    onAddClick,
    payableGasBill,
    gasBillStatus = 'pending',
    onPayNowClick,
    isPaying,
}) => {
    const gasBillVal =
        typeof payableGasBill === 'number'
            ? payableGasBill
            : typeof payableGasBill === 'object' && payableGasBill !== null
            ? payableGasBill.payableAmount ?? payableGasBill.amount ?? 0
            : 0;

    const gasBillPaid = gasBillStatus === 'success';

    return (
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="space-y-1">
                {isAdmin ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 mb-1 rounded-full text-xs font-semibold bg-secondary-400/10 text-secondary-400 border border-secondary-400/20">
                        <HiOutlineShieldCheck className="w-3.5 h-3.5" /> Admin View
                    </span>
                ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 mb-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                        <HiOutlineCurrencyRupee className="w-3.5 h-3.5" /> My Payments
                    </span>
                )}
                <h2 className="text-xl sm:text-2xl tracking-tight text-foreground">
                    {isAdmin ? 'Payment Overview' : 'Payment Hub'}
                </h2>
                <p className="text-sm text-muted-foreground">
                    {isAdmin
                        ? 'Monitor and manage all payment records across members.'
                        : 'Track your mess bills, gas bills, and other payments.'}
                </p>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto">
                {gasBillPaid ? (
                    <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                        <HiOutlineCheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        <div className="leading-none">
                            <p className="text-[9px] uppercase font-bold tracking-widest opacity-70">Gas Bill</p>
                            <p className="text-sm font-bold mt-0.5">Paid</p>
                        </div>
                    </div>
                ) : gasBillVal > 0 ? (
                    <div className="hidden sm:flex items-center gap-3 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400">
                        <div className="leading-none">
                            <p className="text-[9px] uppercase font-bold tracking-widest opacity-70">Gas Bill</p>
                            <p className="text-lg font-black tabular-nums mt-0.5 leading-none">
                                ₹{gasBillVal.toLocaleString('en-IN')}
                            </p>
                        </div>
                        <button
                            disabled={isPaying}
                            onClick={() => onPayNowClick(gasBillVal, 'gas_bill')}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold text-white shadow-sm
                                bg-[#02042B] border border-[#3395FF]/30 hover:border-[#3395FF]/70
                                transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {isPaying ? (
                                <Spinner size="sm" color="white" className="!w-3 !h-3 !border-[2px]" />
                            ) : null}
                            Pay
                        </button>
                    </div>
                ) : null}

                {isAdmin && (
                    <button
                        onClick={onAddClick}
                        className="inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl text-sm font-semibold text-white shadow-sm hover:shadow-md transition-all duration-150"
                        style={{ background: 'linear-gradient(135deg, hsl(245,76%,60%) 0%, hsl(270,76%,48%) 100%)' }}
                    >
                        <HiOutlinePlus className="w-4 h-4 flex-shrink-0" />
                        <span className="hidden sm:inline">Add Payment</span>
                    </button>
                )}

                <div className="flex items-center p-1 rounded-xl bg-muted/30 border border-border/40">
                    <button
                        onClick={() => onViewModeChange('grid')}
                        title="Grid view"
                        aria-label="Grid view"
                        className={`p-2 rounded-lg transition-all duration-150 ${viewMode === 'grid' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        <HiOutlineSquares2X2 className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => onViewModeChange('list')}
                        title="List view"
                        aria-label="List view"
                        className={`p-2 rounded-lg transition-all duration-150 ${viewMode === 'list' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        <HiOutlineListBullet className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PaymentHeader;
