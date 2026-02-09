import React, { useState } from 'react';
import Sidebar from '../Sidebar/Sidebar';
import Header from '../Header/Header';

const MainLayout = ({ children }) => {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="h-full bg-gray-50">
            <div className="flex h-screen overflow-hidden">
                <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

                <div className="flex flex-1 flex-col overflow-hidden">
                    <Header onMenuClick={() => setSidebarOpen(true)} />

                    <main className="flex-1 overflow-y-auto bg-gray-50 p-4 sm:p-6 lg:p-8">
                        {children}
                    </main>
                </div>
            </div>
        </div>
    );
};

export default MainLayout;
