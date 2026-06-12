import {
    HiOutlinePlus,
    HiOutlineSquares2X2,
    HiOutlineListBullet,
    HiOutlineCurrencyRupee,
    HiOutlineShieldCheck,
} from 'react-icons/hi2';

const PaymentHeader = ({
    isAdmin,
    viewMode,
    onViewModeChange,
    onAddClick,
}) => {
    return (
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
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
                <h2 className="text-xl sm:text-2xl tracking-tight text-foreground font-semibold">
                    {isAdmin ? 'Payment Overview' : 'Payment Hub'}
                </h2>
                <p className="text-sm text-muted-foreground">
                    {isAdmin
                        ? 'Monitor and manage all payment records across members.'
                        : 'Track your mess bills, gas bills, and other payments.'}
                </p>
            </div>

            <div className="flex items-center flex-wrap sm:flex-nowrap gap-2 sm:gap-3 w-full lg:w-auto justify-start sm:justify-end flex-shrink-0">
                {isAdmin && (
                    <button
                        onClick={onAddClick}
                        className="inline-flex items-center justify-center gap-2 px-4 sm:px-5 h-[42px] rounded-xl text-sm font-semibold text-white shadow-sm hover:shadow-md hover:-translate-y-[1px] active:translate-y-0 transition-all duration-150 shrink-0 bg-gradient-to-br from-indigo-500 to-violet-600"
                    >
                        <HiOutlinePlus className="w-4 h-4 flex-shrink-0" />
                        <span>Add Payment</span>
                    </button>
                )}

                <div className="flex items-center h-[42px] p-1 rounded-xl bg-muted/30 border border-border/40 shrink-0 select-none">
                    <button
                        onClick={() => onViewModeChange('grid')}
                        title="Grid view"
                        aria-label="Grid view"
                        className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-150 ${viewMode === 'grid' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        <HiOutlineSquares2X2 className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => onViewModeChange('list')}
                        title="List view"
                        aria-label="List view"
                        className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-150 ${viewMode === 'list' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        <HiOutlineListBullet className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PaymentHeader;
