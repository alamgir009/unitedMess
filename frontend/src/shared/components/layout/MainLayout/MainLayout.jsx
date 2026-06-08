import { useState } from 'react';
import Sidebar from '../Sidebar/Sidebar';
import Header from '../Header/Header';
import SkipNav from '../SkipNav/SkipNav';

const MainLayout = ({ children }) => {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="h-full bg-background transition-colors duration-200">
            <SkipNav />
            <div className="flex h-[100dvh] overflow-hidden">
                <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

                <div className="flex flex-1 flex-col overflow-hidden">
                    <Header onMenuClick={() => setSidebarOpen(true)} />

                    <main
                        id="main-content"
                        className="flex-1 overflow-y-auto bg-background p-3 sm:p-6 lg:p-8 transition-colors duration-200"
                        tabIndex={-1}
                    >
                        {children}
                    </main>
                </div>
            </div>
        </div>
    );
};

export default MainLayout;
