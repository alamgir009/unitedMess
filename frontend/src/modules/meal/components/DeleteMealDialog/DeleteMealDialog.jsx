import RecordDeleteDialog from '@/shared/components/ui/ConfirmDialog/RecordDeleteDialog';

const DeleteMealDialog = ({ meal, onConfirm, onCancel, isDeleting, isBulk, selectedCount, mealIds, error }) => (
    <RecordDeleteDialog
        category="meals"
        isOpen={isBulk ? Boolean(mealIds?.length) : Boolean(meal)}
        record={meal}
        count={isBulk ? selectedCount : 1}
        onConfirm={onConfirm}
        onClose={onCancel}
        isDeleting={isDeleting}
        error={error}
    />
);

export default DeleteMealDialog;
