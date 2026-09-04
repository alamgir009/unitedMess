import { memo } from 'react';
import { HiOutlineShoppingBag } from 'react-icons/hi2';
import { format } from 'date-fns';
import { ConfirmDialog } from '@/shared/components/ui';

const DeleteMarketDialog = memo(({ market, onConfirm, onCancel, isDeleting }) => {
    const isOpen = Boolean(market);

    const dateLabel = market?.date
        ? format(new Date(market.date), 'EEEE, MMMM d, yyyy')
        : '—';
    const amountLabel = market?.amount
        ? `₹${Number(market.amount).toLocaleString('en-IN')}`
        : '—';

    return (
        <ConfirmDialog
            isOpen={isOpen}
            onClose={onCancel}
            onConfirm={onConfirm}
            title="Delete Market Record?"
            description="This is permanent and cannot be undone."
            confirmLabel="Yes, Delete"
            isConfirming={isDeleting}
            variant="danger"
            itemSummary={
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-muted/30 border border-border/50">
                    <div className="p-2 rounded-lg flex-shrink-0 text-emerald-600 bg-emerald-50 dark:bg-emerald-400/10 dark:text-emerald-400">
                        <HiOutlineShoppingBag className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex justify-between items-center gap-2">
                            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                                Market Record
                            </p>
                            <p className="text-xs font-black tabular-nums text-emerald-500">
                                {amountLabel}
                            </p>
                        </div>
                        <p className="text-sm font-semibold text-foreground truncate mt-0.5">
                            {dateLabel}
                        </p>
                    </div>
                </div>
            }
        />
    );
});

DeleteMarketDialog.displayName = 'DeleteMarketDialog';
export default DeleteMarketDialog;
