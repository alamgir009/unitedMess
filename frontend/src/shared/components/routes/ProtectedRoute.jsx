import { useSelector } from 'react-redux';
import { Navigate, useLocation } from 'react-router-dom';

// ─────────────────────────────────────────────────────────────────────────────
// ProtectedRoute
// ─────────────────────────────────────────────────────────────────────────────
// Guards private pages behind two conditions:
//   1. sessionRestoring must be false — prevents redirect to /login before
//      the restoreSession thunk (in SessionGate) has had a chance to re-hydrate
//      the user from the server. SessionGate renders this tree only after the
//      flag is false, but we keep the check here as a belt-and-suspenders safety.
//
//   2. user must be non-null and have userStatus === 'approved'.
//
// This is the ONLY component that decides between:
//   • Render protected content
//   • Redirect to /login  (not authenticated)
//   • Redirect to /auth/pending-approval  (authenticated but not yet approved)
// ─────────────────────────────────────────────────────────────────────────────
const ProtectedRoute = ({ children }) => {
    const { user, isLoading, sessionRestoring } = useSelector((state) => state.auth);
    const location = useLocation();

    // --- Belt-and-suspenders: session restore still in progress ---
    // SessionGate handles this case before ever rendering <AppRoutes />,
    // but we guard here too in case the component tree is rendered out of order.
    if (sessionRestoring || isLoading) {
        return (
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100vh',
                    background: 'var(--color-bg, #0f172a)',
                }}
                role="status"
                aria-label="Checking authentication…"
            >
                <div
                    style={{
                        width: 48,
                        height: 48,
                        borderRadius: '50%',
                        border: '3px solid rgba(99,102,241,0.2)',
                        borderTopColor: '#6366f1',
                        animation: 'spin 0.75s linear infinite',
                    }}
                />
                <style>{`
                    @keyframes spin {
                        to { transform: rotate(360deg); }
                    }
                `}</style>
            </div>
        );
    }

    // --- Not authenticated → send to login, preserving the intended destination ---
    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // --- Authenticated but account not yet approved ---
    if (user.userStatus !== 'approved') {
        return <Navigate to="/auth/pending-approval" replace />;
    }

    return children;
};

export default ProtectedRoute;
