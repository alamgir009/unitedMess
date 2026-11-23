import RecordDeleteDialog from '@/shared/components/ui/ConfirmDialog/RecordDeleteDialog';

const DeleteMarketDialog = ({ market, onConfirm, onCancel, isDeleting, error }) => (
    <RecordDeleteDialog
        category="markets"
        isOpen={Boolean(market)}
        record={market}
        onConfirm={onConfirm}
        onClose={onCancel}
        isDeleting={isDeleting}
        error={error}
    />
);

export default DeleteMarketDialog;
