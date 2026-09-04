import { memo } from 'react';
import {
    HiOutlineDocumentText,
    HiOutlineFire,
    HiOutlineCurrencyRupee,
} from 'react-icons/hi2';
import { ConfirmDialog } from '@/shared/components/ui';
import { fmt } from '@/core/utils/helpers/currency.helper';

const PAYMENT_TYPE_META = {
    mess_bill: { label: 'Mess Bill', Icon: HiOutlineDocumentText, color: 'text-indigo-500 bg-indigo-500/10' },
    gas_bill:  { label: 'Gas Bill',  Icon: HiOutlineFire,         color: 'text-amber-500 bg-amber-500/10'  },
    other:     { label: 'Other',     Icon: HiOutlineCurrencyRupee, color: 'text-muted-foreground bg-muted/40' },
};

const STATUS_META = {
    completed: { label: 'Paid',     cls: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' },
    pending:   { label: 'Pending',  cls: 'bg-amber-500/15  text-amber-700  dark:text-amber-300'  },
    failed:    { label: 'Failed',   cls: 'bg-red-500/15    text-red-700    dark:text-red-400'    },
    refunded:  { label: 'Refunded', cls: 'bg-violet-500/15 text-violet-700 dark:text-violet-300' },
};

const PaymentDeleteDialog = memo(({ payment, onConfirm, onCancel, isDeleting }) => {
    const isOpen = Boolean(payment);

    const meta     = PAYMENT_TYPE_META[payment?.type] ?? PAYMENT_TYPE_META.other;
    const { Icon } = meta;
    const status   = STATUS_META[payment?.status] ?? STATUS_META.pending;
    const amount   = Number(payment?.amount ?? 0);
    const month    = payment?.month || '—';

    return (
        <ConfirmDialog
            isOpen={isOpen}
            onClose={onCancel}
            onConfirm={onConfirm}
            title="Delete Payment Record?"
            description="This is permanent and cannot be undone."
            confirmLabel="Yes, Delete"
            isConfirming={isDeleting}
            variant="danger"
            itemSummary={
                <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-muted/30 border border-border/50">
                    <div className={`p-2 rounded-xl flex-shrink-0 ${meta.color}`}>
                        <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                            {meta.label}
                        </p>
                        <p className="text-sm font-semibold text-foreground truncate">
                            ₹{fmt(amount)} · {month}
                        </p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${status.cls}`}>
                        {status.label}
                    </span>
                </div>
            }
        />
    );
});

PaymentDeleteDialog.displayName = 'PaymentDeleteDialog';
export default PaymentDeleteDialog;
