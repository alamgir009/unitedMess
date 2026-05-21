import { useState } from 'react';
import Sidebar from '../Sidebar/Sidebar';
import Header from '../Header/Header';

const MainLayout = ({ children }) => {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="h-full bg-background transition-colors duration-200">
            <div className="flex h-[100dvh] overflow-hidden">
                <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

                <div className="flex flex-1 flex-col overflow-hidden">
                    <Header onMenuClick={() => setSidebarOpen(true)} />

                    <main className="flex-1 overflow-y-auto bg-background p-4 sm:p-6 lg:p-8 transition-colors duration-200">
                        {children}
                    </main>
                </div>
            </div>
        </div>
    );
};

export default MainLayout;
