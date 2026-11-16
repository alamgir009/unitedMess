import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import ProtectedRoute from '@/shared/components/routes/ProtectedRoute';

export default function AnalyticsGuard({ children }) {
    const { user, sessionRestoring } = useSelector((state) => state.auth);
    if (sessionRestoring) return <ProtectedRoute>{children}</ProtectedRoute>;
    if (user && (user.role !== 'admin' || user.isActive === false)) {
        return <main className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center gap-4 p-6">
            <h1 className="text-2xl font-semibold">403 — Access denied</h1>
            <p>Analytics is available to administrators only.</p>
            <Link to="/dashboard" className="underline underline-offset-4 focus-visible:outline focus-visible:outline-2">Back to dashboard</Link>
        </main>;
    }
    return <ProtectedRoute>{children}</ProtectedRoute>;
}
