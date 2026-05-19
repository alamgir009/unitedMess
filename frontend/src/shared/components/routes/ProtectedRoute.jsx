import { useSelector } from 'react-redux';
import { Navigate, useLocation } from 'react-router-dom';
import { Spinner } from '@/shared/components/ui';

const ProtectedRoute = ({ children }) => {
    const { user, isLoading, sessionRestoring } = useSelector((state) => state.auth);
    const location = useLocation();

    if (sessionRestoring || isLoading) {
        return (
            <div
                className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-background"
                role="status"
                aria-label="Checking authentication…"
            >
                <div className="pointer-events-none absolute top-0 right-0 w-[500px] h-[500px] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/20 via-primary/5 to-transparent" />
                <div className="pointer-events-none absolute bottom-10 left-0 w-[400px] h-[400px] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-secondary-400/10 via-secondary-400/5 to-transparent" />

                <div className="relative flex flex-col items-center gap-4 px-10 py-8 rounded-3xl border border-white/10 dark:border-white/5 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl shadow-2xl">
                    <Spinner size="xl" color="primary" />
                    <p className="text-sm font-semibold text-muted-foreground tracking-wide">
                        Checking authentication…
                    </p>
                </div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (user.userStatus !== 'approved') {
        return <Navigate to="/auth/pending-approval" replace />;
    }

    return children;
};

export default ProtectedRoute;
