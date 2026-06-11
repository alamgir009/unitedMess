import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import { toast } from 'react-hot-toast';

const AdminRoute = ({ children }) => {
    const { user, sessionRestoring } = useSelector((state) => state.auth);

    if (sessionRestoring) {
        return null;
    }

    if (user && user.userStatus === 'approved' && user?.role !== 'admin') {
        toast.error('You do not have permission to access this page.');
        return <Navigate to="/dashboard" replace />;
    }

    return <ProtectedRoute>{children}</ProtectedRoute>;
};

AdminRoute.displayName = 'AdminRoute';
export default AdminRoute;
