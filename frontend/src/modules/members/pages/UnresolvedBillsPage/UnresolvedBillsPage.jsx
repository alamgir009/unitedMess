import MainLayout from '@/shared/components/layout/MainLayout/MainLayout';
import AdminUnpaidPanel from '../../components/AdminUnpaidPanel';

const UnresolvedBillsPage = () => {
    return (
        <MainLayout>
            <div className="max-w-7xl mx-auto">
                <AdminUnpaidPanel />
            </div>
        </MainLayout>
    );
};

UnresolvedBillsPage.displayName = 'UnresolvedBillsPage';

export default UnresolvedBillsPage;
