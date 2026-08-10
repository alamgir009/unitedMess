import Button from '@/shared/components/ui/Button/Button';
import { RoleBadge } from '@/shared/components/ui';
import {
    HiOutlinePlus,
    HiOutlineSquares2X2,
    HiOutlineListBullet,
    HiOutlineCurrencyRupee,
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
                <RoleBadge isAdmin={isAdmin} icon={HiOutlineCurrencyRupee} label="My Payments" />
                <h2 className="text-h1">
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
                    <Button
                        variant="primary"
                        size="md"
                        onClick={onAddClick}
                    >
                        <HiOutlinePlus className="w-4 h-4 flex-shrink-0" />
                        <span>Add Payment</span>
                    </Button>
                )}

                <div className="flex items-center h-[42px] p-1 rounded-xl bg-muted/30 border border-border/40 shrink-0 select-none">
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
