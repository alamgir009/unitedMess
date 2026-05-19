import { useSelector, useDispatch } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import {
    User,
    Mail,
    Phone,
    Settings,
    LogOut,
    Edit3,
    RotateCcw,
    CalendarClock,
    UserX,
    AlertTriangle,
    X,
    Bell,
    Smartphone,
    Mail as MailIcon,
    Moon,
    ChevronDown,
    ChevronUp,
    Crown,
    Users,
} from 'lucide-react';
import MainLayout from '@/shared/components/layout/MainLayout/MainLayout';
import { Card, CardContent } from '@/shared/ui/Card/Card';
import { logout, deactivateAccount } from '@/modules/auth/store/auth.slice';
import { useNavigate } from 'react-router-dom';
import { useCallback, useEffect, useState, useMemo } from 'react';
import { EditModal } from '../../components/EditModal/EditModal';
import { EditForm } from '../../components/EditForm/EditForm';
import { AvatarUpload } from '../../components/AvatarUpload';
import { toast } from 'react-hot-toast';
import { Spinner } from '@/shared/components/ui';
import usePushManager from '@/modules/notification/hooks/usePushManager';
import useFcmPush from '@/modules/notification/hooks/useFcmPush';
import NotificationService from '@/modules/notification/services/notification.service';

// ---------------------------------------------------------------------------- //
// Reusable Confirm Dialog
// ---------------------------------------------------------------------------- //
const ConfirmDialog = ({ isOpen, onClose, onConfirm, title, message, confirmLabel = 'Confirm', variant = 'danger' }) => {
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 20 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-gray-200/80 dark:border-slate-700/80"
                >
                    <div className="flex items-start gap-4">
                        <div className={`p-2.5 rounded-xl shrink-0 ${
                            variant === 'danger'
                                ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                                : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                        }`}>
                            <AlertTriangle className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-50">{title}</h3>
                            <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{message}</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1 -mt-1 -mr-1"
                            aria-label="Close"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="mt-6 flex justify-end gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2.5 text-sm font-medium rounded-xl border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => { onConfirm(); onClose(); }}
                            className={`px-4 py-2.5 text-sm font-medium rounded-xl text-white transition-all shadow-lg active:scale-[0.98] ${
                                variant === 'danger'
                                    ? 'bg-red-600 hover:bg-red-700 shadow-red-500/20'
                                    : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'
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
// Profile Detail Row
// ---------------------------------------------------------------------------- //
const ProfileRow = ({ icon: Icon, label, value, isLast = false }) => (
    <>
        <div className="group flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 py-4">
            <div className="flex items-center gap-2.5 text-sm font-medium text-gray-500 dark:text-gray-400 sm:w-44 shrink-0">
                <div className="p-1.5 rounded-lg bg-gray-100 dark:bg-slate-800 group-hover:bg-gray-150 dark:group-hover:bg-slate-750 transition-colors">
                    <Icon className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-semibold uppercase tracking-wider">{label}</span>
            </div>
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100 sm:flex-1 break-words">
                {value}
            </div>
        </div>
        {!isLast && <div className="h-px bg-gradient-to-r from-transparent via-gray-200 dark:via-slate-700 to-transparent" />}
    </>
);

// ---------------------------------------------------------------------------- //
// Notification Toggle Row
// ---------------------------------------------------------------------------- //
const NotificationToggle = ({ icon: Icon, iconBg, iconColor, title, description, enabled, loading, onToggle, error }) => (
    <div className="flex items-center justify-between py-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className={`p-2 rounded-xl shrink-0 ${iconBg}`}>
                <Icon className={`w-4 h-4 ${iconColor}`} />
            </div>
            <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{title}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{description}</p>
            </div>
        </div>
        <button
            onClick={onToggle}
            disabled={loading}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50 shrink-0 ml-3 ${
                loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
            } ${enabled ? 'bg-teal-500' : 'bg-gray-300 dark:bg-slate-600'}`}
            role="switch"
            aria-checked={enabled}
        >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                enabled ? 'translate-x-6' : 'translate-x-1'
            }`} />
        </button>
        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
);

// ---------------------------------------------------------------------------- //
// Profile Page
// ---------------------------------------------------------------------------- //
const ProfilePage = () => {
    const { user } = useSelector((state) => state.auth);
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const isAdmin = user?.role === 'admin';

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [deactivationLoading, setDeactivationLoading] = useState(false);
    const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
    const [avatarError, setAvatarError] = useState(null);

    const {
        isSubscribed: fcmEnabled,
        loading: fcmLoading,
        toggle: toggleFcm,
        supported: fcmSupported,
        error: fcmError,
    } = useFcmPush();

    const {
        isSubscribed: vapidEnabled,
        loading: vapidLoading,
        toggle: toggleVapid,
        supported: vapidSupported,
        error: vapidError,
    } = usePushManager();

    const [notifPrefs, setNotifPrefs] = useState(null);
    const [prefsLoading, setPrefsLoading] = useState(true);
    const [prefsOpen, setPrefsOpen] = useState(false);

    useEffect(() => {
        if (!user) return;
        NotificationService.getPreferences()
            .then((res) => setNotifPrefs(res?.data || null))
            .catch(() => {})
            .finally(() => setPrefsLoading(false));
    }, [user]);

    const handlePrefsUpdate = useCallback(async (updates) => {
        try {
            const res = await NotificationService.updatePreferences(updates);
            setNotifPrefs((prev) => ({ ...prev, ...updates, ...(res?.data || {}) }));
            toast.success('Notification preferences updated');
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Failed to update preferences');
        }
    }, []);

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

    const handleLogout = async () => {
        try {
            await dispatch(logout()).unwrap();
            navigate('/');
        } catch (err) {
            toast.error('Logout failed. Please try again.');
        }
    };

    const handleDeactivate = async () => {
        setDeactivationLoading(true);
        try {
            await dispatch(deactivateAccount()).unwrap();
            navigate('/');
        } catch (error) {
            toast.error(error?.message || 'Deactivation failed.');
        } finally {
            setDeactivationLoading(false);
        }
    };

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

    const containerVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.5, staggerChildren: 0.08 }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 15 },
        visible: { opacity: 1, y: 0 }
    };

    return (
        <MainLayout>
            <div className="max-w-5xl mx-auto sm:px-6 lg:px-8">
                {/* Page Header */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="px-4 sm:px-0 pt-2 pb-6 sm:pt-4 sm:pb-8"
                >
                    <div className="flex items-center gap-3 mb-2">
                        <div className="h-8 w-1 rounded-full bg-gradient-to-b from-teal-500 to-cyan-600" />
                        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-50">
                            My Profile
                        </h2>
                    </div>
                    <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 ml-4">
                        Manage your personal information, notifications, and account security.
                    </p>
                </motion.div>

                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="grid grid-cols-1 lg:grid-cols-12 gap-0 sm:gap-6 lg:gap-8 pb-8"
                >
                    {/* Left Column: Avatar & Quick Info */}
                    <motion.div variants={itemVariants} className="lg:col-span-4 xl:col-span-3 space-y-0 sm:space-y-5">
                        {/* Avatar Card */}
                        <Card className="overflow-hidden rounded-none sm:rounded-xl border-0 sm:border border-gray-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-900 shadow-none sm:shadow-sm hover:shadow-md transition-shadow mb-px sm:mb-0">
                            <CardContent className="p-6">
                                <div className="flex flex-col items-center text-center space-y-4">
                                    <AvatarUpload
                                        maxSize={5 * 1024 * 1024}
                                        onError={handleAvatarError}
                                        onSuccess={handleAvatarSuccess}
                                    />
                                    <p className="text-xs text-gray-400 dark:text-gray-500">
                                        JPG, PNG or GIF. Max 5 MB.
                                    </p>
                                    {avatarError && (
                                        <div className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400">
                                            <AlertTriangle className="w-3.5 h-3.5" />
                                            {avatarError}
                                        </div>
                                    )}
                                    <div className="space-y-1">
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-50 truncate max-w-full">
                                            {user?.name || 'Member User'}
                                        </h3>
                                        <div className="flex items-center justify-center gap-1.5">
                                            {isAdmin ? (
                                                <Crown className="w-3.5 h-3.5 text-violet-500" />
                                            ) : (
                                                <Users className="w-3.5 h-3.5 text-teal-500" />
                                            )}
                                            <span className={`inline-flex items-center gap-1 text-xs font-semibold tracking-wide px-2.5 py-0.5 rounded-full ${
                                                isAdmin
                                                    ? 'bg-violet-50 dark:bg-violet-900/25 text-violet-700 dark:text-violet-300 border border-violet-200/70 dark:border-violet-700/50'
                                                    : 'bg-teal-50 dark:bg-teal-900/25 text-teal-700 dark:text-teal-300 border border-teal-200/70 dark:border-teal-700/50'
                                            }`}>
                                                {isAdmin ? 'Administrator' : 'Member'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Quick Actions */}
                        <Card className="rounded-none sm:rounded-xl border-0 sm:border border-gray-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-900 shadow-none sm:shadow-sm mt-px sm:mt-0">
                            <CardContent className="p-2">
                                <div className="space-y-1">
                                    {isAdmin && (
                                        <>
                                            <button
                                                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800/60 transition-colors text-gray-700 dark:text-gray-300 group"
                                                onClick={() => navigate('/settings')}
                                            >
                                                <span className="flex items-center gap-3 text-sm font-medium">
                                                    <Settings className="w-4 h-4 text-gray-400 dark:text-gray-500 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors" />
                                                    Account Settings
                                                </span>
                                                <ChevronDown className="w-4 h-4 -rotate-90 text-gray-300 dark:text-slate-600" />
                                            </button>
                                            <div className="h-px bg-gray-100 dark:bg-slate-800 mx-3" />
                                        </>
                                    )}

                                    <button
                                        onClick={handleLogout}
                                        className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 group"
                                    >
                                        <span className="flex items-center gap-3 text-sm font-medium">
                                            <LogOut className="w-4 h-4 text-gray-400 dark:text-gray-500 group-hover:text-red-500 dark:group-hover:text-red-400 transition-colors" />
                                            Sign Out
                                        </span>
                                    </button>

                                    <div className="h-px bg-gray-100 dark:bg-slate-800 mx-3" />

                                    <button
                                        onClick={() => setShowDeactivateConfirm(true)}
                                        disabled={deactivationLoading}
                                        className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed group"
                                    >
                                        <span className="flex items-center gap-3 text-sm font-medium">
                                            <UserX className="w-4 h-4 text-gray-400 dark:text-gray-500 group-hover:text-red-500 dark:group-hover:text-red-400 transition-colors" />
                                            Deactivate Account
                                        </span>
                                        {deactivationLoading && (
                                            <Spinner size="sm" color="current" className="text-red-600 dark:text-red-400" />
                                        )}
                                    </button>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* Right Column: Details & Notifications */}
                    <motion.div variants={itemVariants} className="lg:col-span-8 xl:col-span-9 space-y-0 sm:space-y-5 mt-px sm:mt-0">
                        {/* Personal Details Card */}
                        <Card className="rounded-none sm:rounded-xl border-0 sm:border border-gray-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-900 shadow-none sm:shadow-sm hover:shadow-md transition-shadow">
                            <div className="px-4 sm:px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                                        <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <h3 className="text-base font-semibold text-gray-900 dark:text-gray-50">
                                        Personal Details
                                    </h3>
                                </div>
                                <button
                                    onClick={() => setIsModalOpen(true)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20 hover:bg-teal-100 dark:hover:bg-teal-900/30 rounded-lg transition-colors"
                                    aria-label="Edit personal details"
                                >
                                    <Edit3 className="w-3.5 h-3.5" />
                                    Edit
                                </button>
                            </div>
                            <CardContent className="px-4 sm:px-6 py-2">
                                <div className="divide-y-0">
                                    <ProfileRow icon={User} label="Full Name" value={user?.name || '—'} />
                                    <ProfileRow icon={Mail} label="Email" value={user?.email || '—'} />
                                    <ProfileRow icon={Phone} label="Phone" value={user?.phone || '+91 XXX XXX XXXX'} />
                                    <ProfileRow icon={CalendarClock} label="Member Since" value={memberSinceText} />
                                    <ProfileRow icon={RotateCcw} label="Last Login" value={lastUpdatedText} isLast />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Notification Preferences */}
                        <Card className="rounded-none sm:rounded-xl border-0 sm:border border-gray-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-900 shadow-none sm:shadow-sm hover:shadow-md transition-shadow mt-px sm:mt-0">
                            <div className="px-4 sm:px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <div className="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-900/20">
                                        <Bell className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                                    </div>
                                    <h3 className="text-base font-semibold text-gray-900 dark:text-gray-50">
                                        Notifications
                                    </h3>
                                </div>
                                <button
                                    onClick={() => setPrefsOpen(!prefsOpen)}
                                    className="inline-flex items-center gap-1 text-xs font-semibold text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 transition-colors"
                                >
                                    {prefsOpen ? 'Hide' : 'Manage'}
                                    {prefsOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                </button>
                            </div>
                            <AnimatePresence>
                                {prefsOpen && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.25, ease: 'easeInOut' }}
                                        className="overflow-hidden"
                                    >
                                        <CardContent className="px-4 sm:px-6 py-4 space-y-1">
                                            {prefsLoading ? (
                                                <div className="flex items-center justify-center py-6">
                                                    <Spinner size="sm" color="current" className="text-blue-500" />
                                                </div>
                                            ) : notifPrefs ? (
                                                <>
                                                    <NotificationToggle
                                                        icon={Smartphone}
                                                        iconBg="bg-blue-50 dark:bg-blue-900/20"
                                                        iconColor="text-blue-600 dark:text-blue-400"
                                                        title="FCM Push"
                                                        description={fcmSupported ? (fcmEnabled ? 'Subscribed' : 'Not subscribed') : 'Not supported on this device'}
                                                        enabled={fcmEnabled}
                                                        loading={fcmLoading}
                                                        onToggle={toggleFcm}
                                                        error={fcmError}
                                                    />
                                                    <div className="h-px bg-gray-100 dark:bg-slate-800" />
                                                    <NotificationToggle
                                                        icon={Smartphone}
                                                        iconBg="bg-green-50 dark:bg-green-900/20"
                                                        iconColor="text-green-600 dark:text-green-400"
                                                        title="VAPID Push"
                                                        description={vapidSupported ? (vapidEnabled ? 'Subscribed' : 'Not subscribed') : 'Not supported on this device'}
                                                        enabled={vapidEnabled}
                                                        loading={vapidLoading}
                                                        onToggle={toggleVapid}
                                                        error={vapidError}
                                                    />
                                                    <div className="h-px bg-gray-100 dark:bg-slate-800" />
                                                    <NotificationToggle
                                                        icon={MailIcon}
                                                        iconBg="bg-purple-50 dark:bg-purple-900/20"
                                                        iconColor="text-purple-600 dark:text-purple-400"
                                                        title="Email Notifications"
                                                        description={notifPrefs.email ? 'Enabled' : 'Disabled'}
                                                        enabled={notifPrefs.email}
                                                        loading={false}
                                                        onToggle={() => handlePrefsUpdate({ email: !notifPrefs.email })}
                                                    />
                                                    <div className="h-px bg-gray-100 dark:bg-slate-800" />
                                                    <NotificationToggle
                                                        icon={Moon}
                                                        iconBg="bg-indigo-50 dark:bg-indigo-900/20"
                                                        iconColor="text-indigo-600 dark:text-indigo-400"
                                                        title="Quiet Hours"
                                                        description={notifPrefs.quietHours?.enabled
                                                            ? `${notifPrefs.quietHours.start || '22:00'} – ${notifPrefs.quietHours.end || '08:00'}`
                                                            : 'Off'}
                                                        enabled={notifPrefs.quietHours?.enabled || false}
                                                        loading={false}
                                                        onToggle={() => handlePrefsUpdate({
                                                            quietHours: {
                                                                ...notifPrefs.quietHours,
                                                                enabled: !notifPrefs.quietHours?.enabled,
                                                            }
                                                        })}
                                                    />
                                                </>
                                            ) : (
                                                <div className="flex items-center justify-center py-6">
                                                    <p className="text-xs text-gray-400">Could not load preferences</p>
                                                </div>
                                            )}
                                        </CardContent>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </Card>
                    </motion.div>
                </motion.div>

                {/* Edit Profile Modal */}
                <EditModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Edit Profile">
                    <EditForm handleClose={() => setIsModalOpen(false)} initialData={user} />
                </EditModal>

                {/* Deactivation Confirmation */}
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
