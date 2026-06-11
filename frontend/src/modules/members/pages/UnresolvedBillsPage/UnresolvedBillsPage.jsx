import MainLayout from '@/shared/components/layout/MainLayout/MainLayout';
import AdminUnpaidPanel from '../../components/AdminUnpaidPanel';

const UnresolvedBillsPage = () => {
    return (
        <MainLayout paddingClass="p-0 sm:p-6 lg:p-8">
            <AdminUnpaidPanel />
        </MainLayout>
    );
};

UnresolvedBillsPage.displayName = 'UnresolvedBillsPage';

export default UnresolvedBillsPage;
