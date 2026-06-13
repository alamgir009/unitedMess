import { useState } from 'react';
import Sidebar from '../Sidebar/Sidebar';
import Header from '../Header/Header';
import SkipNav from '../SkipNav/SkipNav';
import { cn } from '@/core/utils/helpers/string.helper';

const MainLayout = ({ children, paddingClass = "p-3 sm:p-6 lg:p-8" }) => {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="relative h-full bg-background transition-colors duration-200">
            {/* position: relative — positioning context for SkipNav absolute */}
            <SkipNav />
            <div className="flex h-[100dvh] overflow-hidden">
                <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

                <div className="flex flex-1 flex-col overflow-hidden">
                    {/* sticky top-0: parent overflow-hidden prevents scroll, so visual-only; z-40 keeps stacking */}
                    <Header onMenuClick={() => setSidebarOpen(true)} />

                    <main
                        id="main-content"
                        className={cn(
                            "flex-1 overflow-y-auto bg-background transition-colors duration-200 overscroll-contain",
                            paddingClass
                        )}
                        tabIndex={-1}
                    >
                        {children}
                    </main>
                </div>
            </div>
        </div>
    );
};

MainLayout.displayName = 'MainLayout';
export default MainLayout;
