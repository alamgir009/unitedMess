import { useSelector, useDispatch } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import {
    User,
    Mail,
    Phone,
    Shield,
    Settings,
    LogOut,
    Edit3,
    RotateCcw,
    CalendarClock,
    UserX,
    AlertTriangle,
    CheckCircle,
    X
} from 'lucide-react';
import MainLayout from '@/shared/components/layout/MainLayout/MainLayout';
import { Card, CardContent } from '@/shared/ui/Card/Card';
import { logout, deactivateAccount } from '@/modules/auth/store/auth.slice';
import { useNavigate } from 'react-router-dom';
import { useCallback, useState, useMemo } from 'react';
import { EditModal } from '../../components/EditModal/EditModal';
import { EditForm } from '../../components/EditForm/EditForm';
import { AvatarUpload } from '../../components/AvatarUpload';
import { toast } from 'react-hot-toast'; // or your project's toast system

// ---------------------------------------------------------------------------- //
// Reusable Confirm Dialog – replaces window.confirm with a polished modal       //
// ---------------------------------------------------------------------------- //
const ConfirmDialog = ({ isOpen, onClose, onConfirm, title, message, confirmLabel = 'Confirm', variant = 'danger' }) => {
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-100 dark:border-slate-800"
                >
                    <div className="flex items-start gap-4">
                        <div className={`p-2 rounded-full ${
                            variant === 'danger'
                                ? 'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                                : 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                        }`}>
                            <AlertTriangle className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50">{title}</h3>
                            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{message}</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                            aria-label="Close"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="mt-6 flex justify-end gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => { onConfirm(); onClose(); }}
                            className={`px-4 py-2 text-sm font-medium rounded-lg text-white transition-colors ${
                                variant === 'danger'
                                    ? 'bg-red-600 hover:bg-red-700'
                                    : 'bg-blue-600 hover:bg-blue-700'
                            }`}
                        >
                            {confirmLabel}
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

// ---------------------------------------------------------------------------- //
// Profile Page                                                                 //
// ---------------------------------------------------------------------------- //
const ProfilePage = () => {
    const { user } = useSelector((state) => state.auth);
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [deactivationLoading, setDeactivationLoading] = useState(false);
    const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
    const [avatarError, setAvatarError] = useState(null);

    // ── Avatar upload size validation (max 5 MB) ── //
    const handleAvatarError = useCallback((error) => {
        if (error?.message?.includes('size')) {
            setAvatarError('File size must be less than 5 MB.');
            toast.error('File size must be less than 5 MB.');
        } else {
            setAvatarError('Image upload failed. Please try again.');
            toast.error('Image upload failed. Please try again.');
        }
    }, []);

    const handleAvatarSuccess = useCallback(() => {
        setAvatarError(null);
        toast.success('Profile picture updated.');
    }, []);

    // ── Logout ── //
    const handleLogout = async () => {
        try {
            await dispatch(logout()).unwrap();
            navigate('/');
        } catch (err) {
            toast.error('Logout failed. Please try again.');
        }
    };

    // ── Deactivate account ── //
    const handleDeactivate = async () => {
        setDeactivationLoading(true);
        try {
            await dispatch(deactivateAccount()).unwrap();
            navigate('/');
        } catch (error) {
            // Error toast is handled inside the slice, but fallback:
            toast.error(error?.message || 'Deactivation failed.');
        } finally {
            setDeactivationLoading(false);
        }
    };

    // ── Date formatters (memoized) ── //
    const memberSinceText = useMemo(() => {
        const dateValue = user?.createdAt;
        if (!dateValue) return 'Not available';
        const date = new Date(dateValue);
        return isNaN(date.getTime())
            ? 'Invalid Date'
            : date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }, [user?.createdAt]);

    const lastUpdatedText = useMemo(() => {
        const dateValue = user?.lastLogin || user?.createdAt;
        if (!dateValue) return 'Not available';
        const date = new Date(dateValue);
        return isNaN(date.getTime())
            ? 'Invalid Date'
            : date.toLocaleString('en-US', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true
              });
    }, [user?.lastLogin, user?.createdAt]);

    // ── Motion variants ── //
    const containerVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.5, staggerChildren: 0.1 }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 15 },
        visible: { opacity: 1, y: 0 }
    };

    return (
        <MainLayout>
            <div className="max-w-4xl mx-auto space-y-8 px-4 sm:px-6 lg:px-8 py-6">
                {/* ── Page Header ── */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="flex items-center justify-between"
                >
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-50 transition-colors">
                            My Profile
                        </h2>
                        <p className="text-muted-foreground text-gray-500 dark:text-gray-400 mt-1 transition-colors">
                            Manage your personal information and account security.
                        </p>
                    </div>
                </motion.div>

                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="grid grid-cols-1 md:grid-cols-3 gap-6"
                >
                    {/* ── Left Column: Avatar & Quick Info ── */}
                    <motion.div variants={itemVariants} className="md:col-span-1 space-y-6">
                        <Card className="overflow-hidden border-border/40 dark:border-slate-800/60 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl shadow-lg transition-colors">
                            <CardContent className="p-6">
                                <div className="flex flex-col items-center text-center space-y-4">
                                    <AvatarUpload
                                        maxSize={5 * 1024 * 1024} // 5 MB
                                        onError={handleAvatarError}
                                        onSuccess={handleAvatarSuccess}
                                    />
                                    <p className="text-xs text-gray-500 dark:text-gray-400 font-normal">
                                        JPG, PNG or GIF. Max 5 MB.
                                    </p>
                                    {avatarError && (
                                        <div className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 animate-pulse">
                                            <AlertTriangle className="w-3.5 h-3.5" />
                                            {avatarError}
                                        </div>
                                    )}
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-50 transition-colors">
                                            {user?.name || 'Member User'}
                                        </h3>
                                        <p className="text-sm font-medium text-blue-600 dark:text-blue-400 flex items-center justify-center gap-1 mt-1">
                                            <Shield className="w-3.5 h-3.5" />
                                            {user?.role === 'admin' ? 'Administrator' : 'Member'}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Quick Actions */}
                        <Card className="border-border/40 dark:border-slate-800/60 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl shadow-md transition-colors">
                            <CardContent className="p-4 space-y-2">
                                <button
                                    className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors text-gray-700 dark:text-gray-300"
                                    onClick={() => navigate('/settings')} // placeholder
                                >
                                    <span className="flex items-center gap-3 text-sm font-medium">
                                        <Settings className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                                        Account Settings
                                    </span>
                                </button>

                                <div className="h-px bg-gray-200 dark:bg-slate-800 my-2" />

                                <button
                                    onClick={handleLogout}
                                    className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors text-red-600 dark:text-red-400"
                                >
                                    <span className="flex items-center gap-3 text-sm font-medium">
                                        <LogOut className="w-4 h-4" />
                                        Sign Out
                                    </span>
                                </button>

                                <div className="h-px bg-gray-200 dark:bg-slate-800 my-2" />

                                <button
                                    onClick={() => setShowDeactivateConfirm(true)}
                                    disabled={deactivationLoading}
                                    className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors text-red-600 dark:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <span className="flex items-center gap-3 text-sm font-medium">
                                        <UserX className="w-4 h-4" />
                                        Deactivate Account
                                    </span>
                                    {deactivationLoading && (
                                        <svg className="animate-spin h-4 w-4 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                    )}
                                </button>
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* ── Right Column: Details ── */}
                    <motion.div variants={itemVariants} className="md:col-span-2 space-y-6">
                        <Card className="border-border/40 dark:border-slate-800/60 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl shadow-lg h-full transition-colors">
                            <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between transition-colors">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50 transition-colors">
                                    Personal Details
                                </h3>
                                <button
                                    onClick={() => setIsModalOpen(true)}
                                    className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1 transition-colors"
                                    aria-label="Edit personal details"
                                >
                                    <Edit3 className="w-4 h-4" />
                                    Edit
                                </button>
                            </div>
                            <CardContent className="p-6">
                                <div className="space-y-6">
                                    {/* Full Name */}
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 items-center">
                                        <div className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center gap-2">
                                            <User className="w-4 h-4" /> Full Name
                                        </div>
                                        <div className="sm:col-span-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                                            {user?.name || '—'}
                                        </div>
                                    </div>

                                    <div className="h-px bg-gray-100 dark:bg-slate-800/60" />

                                    {/* Email */}
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 items-center">
                                        <div className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center gap-2">
                                            <Mail className="w-4 h-4" /> Email Address
                                        </div>
                                        <div className="sm:col-span-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                                            {user?.email || '—'}
                                        </div>
                                    </div>

                                    <div className="h-px bg-gray-100 dark:bg-slate-800/60" />

                                    {/* Phone */}
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 items-center">
                                        <div className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center gap-2">
                                            <Phone className="w-4 h-4" /> Phone Number
                                        </div>
                                        <div className="sm:col-span-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                                            {user?.phone || '+91 XXX XXX XXXX'}
                                        </div>
                                    </div>

                                    <div className="h-px bg-gray-100 dark:bg-slate-800/60" />

                                    {/* Member Since */}
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 items-center">
                                        <div className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center gap-2">
                                            <CalendarClock className="w-4 h-4" /> Member Since
                                        </div>
                                        <div className="sm:col-span-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                                            {memberSinceText}
                                        </div>
                                    </div>

                                    <div className="h-px bg-gray-100 dark:bg-slate-800/60" />

                                    {/* Last Login */}
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 items-center">
                                        <div className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center gap-2">
                                            <RotateCcw className="w-4 h-4" /> Last Login
                                        </div>
                                        <div className="sm:col-span-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                                            {lastUpdatedText}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                </motion.div>

                {/* ── Edit Profile Modal ── */}
                <EditModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Edit Profile">
                    <EditForm handleClose={() => setIsModalOpen(false)} initialData={user} />
                </EditModal>

                {/* ── Deactivation Confirmation Dialog ── */}
                <ConfirmDialog
                    isOpen={showDeactivateConfirm}
                    onClose={() => setShowDeactivateConfirm(false)}
                    onConfirm={handleDeactivate}
                    title="Deactivate Account"
                    message="This action cannot be undone. All your data will be permanently deleted. Are you absolutely sure you want to proceed?"
                    confirmLabel={deactivationLoading ? 'Deactivating...' : 'Yes, deactivate'}
                    variant="danger"
                />
            </div>
        </MainLayout>
    );
};

export default ProfilePage;