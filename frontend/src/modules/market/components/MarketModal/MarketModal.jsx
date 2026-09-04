import { Modal } from '@/shared/components/ui';

const MarketModal = ({ isOpen, onClose, title, footer, children }) => (
  <Modal
    isOpen={isOpen}
    onClose={onClose}
    title={title}
    accentColor="emerald"
    size="md"
    mobileSheet
    footer={footer}
  >
    {children}
  </Modal>
);

MarketModal.displayName = 'MarketModal';
export default MarketModal;
