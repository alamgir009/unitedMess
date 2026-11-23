import RecordDeleteDialog from '@/shared/components/ui/ConfirmDialog/RecordDeleteDialog';

const PaymentDeleteDialog = ({ payment, onConfirm, onCancel, isDeleting, error }) => (
    <RecordDeleteDialog
        category="payments"
        isOpen={Boolean(payment)}
        record={payment}
        onConfirm={onConfirm}
        onClose={onCancel}
        isDeleting={isDeleting}
        error={error}
    />
);

export default PaymentDeleteDialog;
