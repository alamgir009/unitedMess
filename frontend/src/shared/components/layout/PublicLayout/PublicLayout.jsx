import { Outlet } from 'react-router-dom';
import Navbar from '@/shared/components/layout/Navbar/Navbar';
import Footer from '@/shared/components/layout/Footer/Footer';

/**
 * PublicLayout — wraps all public-facing pages.
 * Renders the liquid-glass Navbar and premium Footer.
 */
const PublicLayout = () => {
    return (
        <div className="min-h-screen flex flex-col bg-background selection:bg-primary/20">
            {/* Navbar is fixed/absolute so it doesn't interrupt flex flow */}
            <Navbar />

            {/* Main content expands to push footer down */}
            <main className="flex-1 w-full">
                <Outlet />
            </main>

            <Footer />
        </div>
    );
};

export default PublicLayout;
