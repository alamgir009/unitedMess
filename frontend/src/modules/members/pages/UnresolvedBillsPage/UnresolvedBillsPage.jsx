import React from 'react';
import MainLayout from '@/shared/components/layout/MainLayout/MainLayout';
import AdminUnpaidPanel from '../../components/AdminUnpaidPanel';
import { ShieldAlert } from 'lucide-react';

const UnresolvedBillsPage = React.memo(() => {
    return (
        <MainLayout>
            <div className="relative min-h-[80vh] max-w-7xl mx-auto space-y-6">
                <header className="relative z-10 animate-fade-in">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="space-y-1">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 mb-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-500 border border-rose-500/20">
                                <ShieldAlert className="w-3.5 h-3.5" /> Admin
                            </span>
                            <h2 className="text-xl sm:text-2xl tracking-tight text-foreground font-semibold leading-tight">
                                Unresolved Bills
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                Review and resolve outstanding member invoices
                            </p>
                        </div>
                    </div>
                </header>

                <main className="relative z-10 animate-fade-in-up">
                    <AdminUnpaidPanel />
                </main>
            </div>
        </MainLayout>
    );
});

UnresolvedBillsPage.displayName = 'UnresolvedBillsPage';

export default UnresolvedBillsPage;
