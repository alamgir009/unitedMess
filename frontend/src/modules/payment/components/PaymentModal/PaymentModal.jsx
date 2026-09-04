import { Modal } from '@/shared/components/ui';

const PaymentModal = ({ isOpen, onClose, title, footer, children }) => (
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

PaymentModal.displayName = 'PaymentModal';
export default PaymentModal;
