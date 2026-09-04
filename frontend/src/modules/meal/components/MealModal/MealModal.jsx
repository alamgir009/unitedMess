import { Modal } from '@/shared/components/ui';

const MealModal = ({ isOpen, onClose, title, footer, children }) => (
  <Modal
    isOpen={isOpen}
    onClose={onClose}
    title={title}
    accentColor="blue"
    size="md"
    mobileSheet
    footer={footer}
  >
    {children}
  </Modal>
);

MealModal.displayName = 'MealModal';
export default MealModal;
