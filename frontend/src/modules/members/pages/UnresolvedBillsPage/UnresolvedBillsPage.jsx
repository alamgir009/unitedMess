import MainLayout from '@/shared/components/layout/MainLayout/MainLayout';
import AdminUnpaidPanel from '../../components/AdminUnpaidPanel';

const UnresolvedBillsPage = () => {
    return (
        <MainLayout>
            <AdminUnpaidPanel />
        </MainLayout>
    );
};

UnresolvedBillsPage.displayName = 'UnresolvedBillsPage';

export default UnresolvedBillsPage;
