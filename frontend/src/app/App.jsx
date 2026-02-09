import React, { Suspense } from 'react';
import AppProviders from './providers/AppProviders';
import AppRoutes from '@/routes/AppRoutes';
import { Toaster } from 'react-hot-toast';

const App = () => {
    return (
        <AppProviders>
            <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
                <AppRoutes />
            </Suspense>
            <Toaster position="top-right" />
        </AppProviders>
    );
};

export default App;
