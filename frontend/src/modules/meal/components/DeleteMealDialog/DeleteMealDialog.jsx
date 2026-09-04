import { useMemo, memo } from 'react';
import {
    HiOutlineSparkles,
    HiOutlineSun,
    HiOutlineMoon,
    HiOutlineNoSymbol,
    HiOutlineTrash,
} from 'react-icons/hi2';
import { format } from 'date-fns';
import { ConfirmDialog } from '@/shared/components/ui';

const MEAL_TYPE_META = {
    both: { label: 'Both Meals', Icon: HiOutlineSparkles, color: 'text-primary bg-primary/10' },
    day: { label: 'Day Meal', Icon: HiOutlineSun, color: 'text-amber-500 bg-amber-500/10' },
    night: { label: 'Night Meal', Icon: HiOutlineMoon, color: 'text-indigo-400 bg-indigo-400/10' },
    off: { label: 'No Meal (Off)', Icon: HiOutlineNoSymbol, color: 'text-muted-foreground bg-muted/40' },
};

const DeleteMealDialog = memo(({ meal, onConfirm, onCancel, isDeleting, isBulk, selectedCount, mealIds }) => {
    const isOpen = Boolean(isBulk ? mealIds?.length > 0 : meal);

    const meta = isBulk ? null : (MEAL_TYPE_META[meal?.type] ?? MEAL_TYPE_META.both);
    const Icon = isBulk ? HiOutlineTrash : meta?.Icon;
    const dateLabel = meal?.date ? format(new Date(meal.date), 'EEEE, MMMM d, yyyy') : '—';
    const deleteLabel = isBulk
        ? `Delete ${selectedCount} Meal${selectedCount !== 1 ? 's' : ''}?`
        : 'Delete Meal Record?';
    const deleteDesc = isBulk
        ? `This will permanently delete ${selectedCount} meal record${selectedCount !== 1 ? 's' : ''}. This action cannot be undone.`
        : 'This is permanent and cannot be undone.';
    const btnLabel = isBulk ? `Yes, Delete ${selectedCount}` : 'Yes, Delete';

    const itemSummary = useMemo(() => {
        if (isBulk) {
            return (
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-muted/30 border border-border/50">
                    <div className="p-2 rounded-lg flex-shrink-0 bg-rose-50 dark:bg-rose-500/10 text-rose-500">
                        <HiOutlineTrash className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                            Bulk Delete
                        </p>
                        <p className="text-sm font-semibold text-foreground truncate">
                            {selectedCount} record{selectedCount !== 1 ? 's' : ''}
                        </p>
                    </div>
                </div>
            );
        }

        return (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-muted/30 border border-border/50">
                <div className={`p-2 rounded-lg flex-shrink-0 ${meta.color}`}>
                    <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                        {meta.label}
                    </p>
                    <p className="text-sm font-semibold text-foreground truncate">
                        {dateLabel}
                    </p>
                </div>
            </div>
        );
    }, [isBulk, meta, selectedCount, dateLabel]);

    return (
        <ConfirmDialog
            isOpen={isOpen}
            onClose={onCancel}
            onConfirm={onConfirm}
            title={deleteLabel}
            description={deleteDesc}
            confirmLabel={btnLabel}
            isConfirming={isDeleting}
            variant="danger"
            itemSummary={itemSummary}
        />
    );
});

DeleteMealDialog.displayName = 'DeleteMealDialog';
export default DeleteMealDialog;
