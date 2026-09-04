import { Modal } from '@/shared/components/ui';

export const EditModal = ({ isOpen, onClose, title, children }) => (
  <Modal
    isOpen={isOpen}
    onClose={onClose}
    title={title || 'Edit Profile'}
    accentColor="blue"
    size="md"
    mobileSheet
  >
    {children}
  </Modal>
);

EditModal.displayName = 'EditModal';
export default EditModal;
