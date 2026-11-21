import { useId } from 'react';
import { useSelector } from 'react-redux';
import { Button, Modal } from '@/shared/components/ui';
import { EditForm } from '../EditForm/EditForm';

export const EditModal = ({ isOpen, onClose, initialData }) => {
  const formId = useId();
  const isLoading = useSelector((state) => state.auth.isLoading);

  const footer = (
    <div className="grid w-full grid-cols-2 gap-2.5 sm:flex">
      <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading} className="sm:flex-1">
        Cancel
      </Button>
      <Button type="submit" form={formId} className="sm:flex-1" isLoading={isLoading} disabled={isLoading}>
        Save Changes
      </Button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Profile"
      accentColor="blue"
      size="md"
      mobileSheet
      footer={footer}
    >
      <EditForm id={formId} handleClose={onClose} initialData={initialData} />
    </Modal>
  );
};

EditModal.displayName = 'EditModal';
export default EditModal;
