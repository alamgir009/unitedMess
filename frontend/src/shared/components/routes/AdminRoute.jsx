import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import { toast } from 'react-hot-toast';

const AdminRoute = ({ children }) => {
    const { user, sessionRestoring } = useSelector((state) => state.auth);

    const isAdmin = user?.role === 'admin';
    const isApproved = user?.userStatus === 'approved';
    const showDeniedToast = user && isApproved && !isAdmin;

    useEffect(() => {
        if (showDeniedToast) {
            toast.error('You do not have permission to access this page.');
        }
    }, [showDeniedToast]);

    if (sessionRestoring) {
        return null;
    }

    if (showDeniedToast) {
        return <Navigate to="/dashboard" replace />;
    }

    return <ProtectedRoute>{children}</ProtectedRoute>;
};

AdminRoute.displayName = 'AdminRoute';
export default AdminRoute;
