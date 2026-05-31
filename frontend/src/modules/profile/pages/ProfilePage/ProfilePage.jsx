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
    WifiOff,
    Copy,
    Check,
} from 'lucide-react';
import MainLayout from '@/shared/components/layout/MainLayout/MainLayout';
import { Card, CardContent } from '@/shared/components/ui';
import { Button } from '@/shared/components/ui';
import { logout, deactivateAccount } from '@/modules/auth/store/auth.slice';
import { useNavigate } from 'react-router-dom';
import React, { useCallback, useEffect, useState, useMemo, Component } from 'react';
import { EditModal } from '../../components/EditModal/EditModal';
import { EditForm } from '../../components/EditForm/EditForm';
import { AvatarUpload } from '../../components/AvatarUpload';
import { toast } from 'react-hot-toast';
import { Spinner } from '@/shared/components/ui';
import usePushManager from '@/modules/notification/hooks/usePushManager';
import useFcmPush from '@/modules/notification/hooks/useFcmPush';
import NotificationService from '@/modules/notification/services/notification.service';

// ---------------------------------------------------------------------------- //
// Clipboard Copy Button
// ---------------------------------------------------------------------------- //
const CopyButton = ({ text, label }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = (e) => {
        e.stopPropagation();
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopied(true);
        toast.success(`${label} copied`);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <button
            onClick={handleCopy}
            type="button"
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all active:scale-95 shadow-sm"
            title={`Copy ${label}`}
        >
            {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-500" />
            ) : (
                <Copy className="w-3.5 h-3.5" />
            )}
        </button>
    );
};

// ---------------------------------------------------------------------------- //
// Reusable Confirm Dialog (Fixed AnimatePresence exit bug)
// ---------------------------------------------------------------------------- //
const ConfirmDialog = ({ isOpen, onClose, onConfirm, title, message, confirmLabel = 'Confirm', variant = 'danger' }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.96, opacity: 0, y: 12 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.96, opacity: 0, y: 12 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800"
                    >
                        <div className="flex items-start gap-4">
                            <div className={`p-2.5 rounded-xl shrink-0 border ${
                                variant === 'danger'
                                    ? 'bg-red-50 dark:bg-red-950/20 text-red-650 dark:text-red-455 border-red-100 dark:border-red-900/30'
                                    : 'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-650 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/30'
                            }`}>
                                <AlertTriangle className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-base font-bold text-slate-900 dark:text-slate-50">{title}</h3>
                                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{message}</p>
                            </div>
                            <button
                                onClick={onClose}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1 -mt-1 -mr-1"
                                aria-label="Close"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="mt-6 flex justify-end gap-3">
                            <Button
                                onClick={onClose}
                                variant="secondary"
                                size="sm"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={() => { onConfirm(); onClose(); }}
                                variant={variant === 'danger' ? 'danger' : 'primary'}
                                size="sm"
                            >
                                {confirmLabel}
                            </Button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

// ---------------------------------------------------------------------------- //
// Profile Detail Card (Premium Grid design)
// ---------------------------------------------------------------------------- //
const ProfileDetailCard = ({ icon: Icon, label, value, isCopyable, copyLabel }) => {
    return (
        <div className="group relative flex items-center justify-between p-4 rounded-xl border border-slate-200/60 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-200 shadow-sm">
            <div className="flex items-center gap-3.5 min-w-0">
                <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-950/40 group-hover:text-indigo-650 dark:group-hover:text-indigo-400 transition-colors shrink-0 border border-transparent dark:border-slate-700/30">
                    <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        {label}
                    </span>
                    <span className="block text-sm font-semibold text-slate-850 dark:text-slate-100 truncate mt-0.5">
                        {value}
                    </span>
                </div>
            </div>
            {isCopyable && value && value !== '—' && (
                <div className="opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity ml-2 shrink-0">
                    <CopyButton text={value} copyLabel={copyLabel} label={label} />
                </div>
            )}
        </div>
    );
};

// ---------------------------------------------------------------------------- //
// Notification Toggle Row
// ---------------------------------------------------------------------------- //
const NotificationToggle = ({ icon: Icon, iconBg, iconColor, title, description, enabled, loading, onToggle, error }) => (
    <div className="py-4 px-4 rounded-xl border border-slate-200/40 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/20 hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className={`p-2.5 rounded-xl shrink-0 ${iconBg} border border-slate-200/50 dark:border-slate-800`}>
                    <Icon className={`w-4 h-4 ${iconColor}`} />
                </div>
                <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-tight">{title}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-1.5">{description}</p>
                </div>
            </div>
            <button
                onClick={onToggle}
                disabled={loading}
                className={`relative inline-flex h-[24px] w-11 items-center rounded-full transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-400 shrink-0 ml-4 ${
                    loading ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
                } ${
                    enabled
                        ? 'bg-emerald-500 dark:bg-emerald-600'
                        : 'bg-slate-200 dark:bg-slate-700'
                }`}
                role="switch"
                aria-checked={enabled}
            >
                <span className={`inline-block h-[18px] w-[18px] transform rounded-full bg-white shadow transition-transform duration-200 ${
                    enabled ? 'translate-x-[23px]' : 'translate-x-[3px]'
                }`} />
            </button>
        </div>
        {error && (
            <div className="flex items-center gap-1.5 mt-2.5 ml-12 text-red-500">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <p className="text-xs font-semibold leading-snug">{error}</p>
            </div>
        )}
    </div>
);

// ---------------------------------------------------------------------------- //
// Premium Profile Skeleton Shimmer
// ---------------------------------------------------------------------------- //
const ProfileSkeleton = () => (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 animate-pulse">
        {/* Header Skeleton */}
        <div className="h-32 bg-slate-200 dark:bg-slate-800 rounded-2xl" />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {/* Left Column Skeleton */}
            <div className="space-y-6">
                <div className="bg-slate-200 dark:bg-slate-800 h-64 rounded-2xl" />
                <div className="bg-slate-200 dark:bg-slate-800 h-40 rounded-2xl" />
            </div>

            {/* Right Column Skeleton */}
            <div className="md:col-span-2 space-y-6">
                <div className="bg-slate-200 dark:bg-slate-800 h-80 rounded-2xl" />
                <div className="bg-slate-200 dark:bg-slate-800 h-60 rounded-2xl" />
            </div>
        </div>
    </div>
);

// ---------------------------------------------------------------------------- //
// Profile Card Error Boundary
// ---------------------------------------------------------------------------- //
class ProfileCardErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("ProfileCardErrorBoundary caught an error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="p-6 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-2xl text-center space-y-3">
                    <div className="inline-flex p-2.5 rounded-xl bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400">
                        <AlertTriangle className="w-5 h-5" />
                    </div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-50">Card Load Failed</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                        An error occurred while loading this section of your profile: {this.state.error?.message || "Unknown error"}
                    </p>
                    <button
                        onClick={() => this.setState({ hasError: false, error: null })}
                        className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-red-600 hover:bg-red-750 text-white shadow-sm transition-colors active:scale-95"
                    >
                        Try Again
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}

// ---------------------------------------------------------------------------- //
// Safe Date Parser for Browser Compatibility
// ---------------------------------------------------------------------------- //
const parseSafeDate = (dateValue) => {
    if (!dateValue) return null;
    let date = new Date(dateValue);
    
    if (isNaN(date.getTime()) && typeof dateValue === 'string') {
        const normalized = dateValue.replace(/\s+/, 'T');
        date = new Date(normalized);
    }
    
    return isNaN(date.getTime()) ? null : date;
};

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
    const [prefsError, setPrefsError] = useState(false);
    const [prefsOpen, setPrefsOpen] = useState(false);

    useEffect(() => {
        if (!user) return;
        setPrefsLoading(true);
        setPrefsError(false);
        NotificationService.getPreferences()
            .then((res) => {
                const data = res?.data ?? null;
                setNotifPrefs(data);
                if (!data) setPrefsError(true);
            })
            .catch(() => setPrefsError(true))
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
        toast.success('Profile picture updated');
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
        const date = parseSafeDate(user?.createdAt);
        if (!date) return 'Not available';
        return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }, [user?.createdAt]);

    const lastUpdatedText = useMemo(() => {
        const date = parseSafeDate(user?.lastLogin || user?.createdAt);
        if (!date) return 'Not available';
        return date.toLocaleString('en-US', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    }, [user?.lastLogin, user?.createdAt]);

    if (!user) {
        return (
            <MainLayout>
                <ProfileSkeleton />
            </MainLayout>
        );
    }

    return (
        <MainLayout>
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
                {/* Premium Banner Header */}
                <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-gradient-to-br from-slate-900 via-slate-850 to-indigo-950 p-6 sm:p-8 text-white mb-6 sm:mb-8 shadow-md">
                    <div className="absolute right-0 top-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
                    <div className="absolute left-1/3 bottom-0 -mb-20 w-80 h-80 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
                    
                    <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-300">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                Secured Portal
                            </div>
                            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mt-1.5">
                                Welcome back, {user?.name?.split(' ')[0] || 'User'}
                            </h2>
                            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xl leading-relaxed">
                                Manage your credentials, security preferences, and keep your communication channels up to date.
                            </p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0 self-start sm:self-center">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-white border border-white/10">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                Active Session
                            </span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 pb-8">
                    {/* Left Column: Avatar & Quick Info */}
                    <div className="md:col-span-1 space-y-6">
                        {/* Avatar Card */}
                        <Card variant="default" padding="none" className="overflow-hidden bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
                            <CardContent className="p-6">
                                <div className="flex flex-col items-center text-center space-y-4">
                                    <AvatarUpload />
                                    
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                            Account User
                                        </p>
                                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 truncate max-w-full">
                                            {user?.name || 'Member User'}
                                        </h3>
                                        <div className="flex items-center justify-center pt-1.5">
                                            {isAdmin ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase bg-violet-50 dark:bg-violet-950/40 text-violet-650 dark:text-violet-400 border border-violet-100 dark:border-violet-900/30 shadow-sm">
                                                    <Crown className="w-2.5 h-2.5" />
                                                    Admin
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase bg-slate-50 dark:bg-slate-950/40 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 shadow-sm">
                                                    Member
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <div className="h-px bg-slate-100 dark:bg-slate-800 w-full" />
                                    <p className="text-[10px] text-slate-400 dark:text-slate-500">
                                        JPG, PNG or GIF. Max 5 MB.
                                    </p>
                                    {avatarError && (
                                        <div className="flex items-center gap-1.5 text-xs font-semibold text-red-500">
                                            <AlertTriangle className="w-3.5 h-3.5" />
                                            {avatarError}
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Quick Actions */}
                        <Card variant="default" padding="none" className="overflow-hidden bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
                            <CardContent className="p-3">
                                <div className="space-y-1">
                                    {isAdmin && (
                                        <>
                                            <button
                                                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors text-slate-700 dark:text-slate-350 group font-medium"
                                                onClick={() => navigate('/settings')}
                                            >
                                                <span className="flex items-center gap-3 text-sm">
                                                    <Settings className="w-4 h-4 text-slate-400 dark:text-slate-500 group-hover:text-indigo-650 dark:group-hover:text-indigo-400 transition-colors" />
                                                    Account Settings
                                                </span>
                                                <ChevronDown className="w-4 h-4 -rotate-90 text-slate-300 dark:text-slate-700" />
                                            </button>
                                            <div className="h-px bg-slate-100 dark:bg-slate-800 mx-2" />
                                        </>
                                    )}

                                    <button
                                        onClick={handleLogout}
                                        className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors text-slate-700 dark:text-slate-350 hover:text-red-650 dark:hover:text-red-400 group font-medium"
                                    >
                                        <span className="flex items-center gap-3 text-sm">
                                            <LogOut className="w-4 h-4 text-slate-400 dark:text-slate-500 group-hover:text-red-500 dark:group-hover:text-red-450 transition-colors" />
                                            Sign Out
                                        </span>
                                    </button>

                                    <div className="h-px bg-slate-100 dark:bg-slate-800 mx-2" />

                                    <button
                                        onClick={() => setShowDeactivateConfirm(true)}
                                        disabled={deactivationLoading}
                                        className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors text-slate-700 dark:text-slate-350 hover:text-red-650 dark:hover:text-red-455 disabled:opacity-50 disabled:cursor-not-allowed group font-medium"
                                    >
                                        <span className="flex items-center gap-3 text-sm">
                                            <UserX className="w-4 h-4 text-slate-400 dark:text-slate-500 group-hover:text-red-500 dark:group-hover:text-red-455 transition-colors" />
                                            Deactivate Account
                                        </span>
                                        {deactivationLoading ? (
                                            <Spinner size="sm" color="current" className="text-red-600 dark:text-red-400" />
                                        ) : (
                                            <ChevronDown className="w-4 h-4 -rotate-90 text-slate-300 dark:text-slate-700" />
                                        )}
                                    </button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Column: Details & Notifications */}
                    <div className="md:col-span-2 space-y-6">
                        {/* Personal Details Card */}
                        <ProfileCardErrorBoundary>
                            <Card variant="default" padding="none" className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
                                <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                        <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100/50 dark:border-indigo-900/30">
                                            <User className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                        </div>
                                        <div>
                                            <h3 className="text-base font-bold text-slate-900 dark:text-slate-50">
                                                Personal Details
                                            </h3>
                                            <p className="text-[11px] text-slate-400 dark:text-slate-500">Your profile registration data</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setIsModalOpen(true)}
                                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg border border-indigo-200 dark:border-indigo-850 text-indigo-650 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/20 hover:bg-indigo-100/60 dark:hover:bg-indigo-950/60 transition-colors active:scale-95 shadow-sm"
                                        aria-label="Edit personal details"
                                    >
                                        <Edit3 className="w-3.5 h-3.5" />
                                        Edit Profile
                                    </button>
                                </div>
                                <CardContent className="px-6 py-6">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <ProfileDetailCard icon={User} label="Full Name" value={user?.name || '—'} isCopyable copyLabel="Name" />
                                        <ProfileDetailCard icon={Mail} label="Email Address" value={user?.email || '—'} isCopyable copyLabel="Email" />
                                        <ProfileDetailCard icon={Phone} label="Phone Number" value={user?.phone || '+91 XXX XXX XXXX'} isCopyable copyLabel="Phone" />
                                        <ProfileDetailCard icon={CalendarClock} label="Member Since" value={memberSinceText} />
                                        <div className="sm:col-span-2">
                                            <ProfileDetailCard icon={RotateCcw} label="Last Active Session" value={lastUpdatedText} />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </ProfileCardErrorBoundary>

                        {/* Notification Preferences */}
                        <ProfileCardErrorBoundary>
                            <Card variant="default" padding="none" className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
                                <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                        <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-100/50 dark:border-emerald-900/30">
                                            <Bell className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                        </div>
                                        <div>
                                            <h3 className="text-base font-bold text-slate-900 dark:text-slate-50">
                                                Communication Channels
                                            </h3>
                                            <p className="text-[11px] text-slate-400 dark:text-slate-500">Configure alert channels and push tokens</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setPrefsOpen(!prefsOpen)}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                        aria-expanded={prefsOpen}
                                    >
                                        {prefsOpen ? 'Hide System Settings' : 'Manage Preferences'}
                                        {prefsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                    </button>
                                </div>
                                <AnimatePresence initial={false}>
                                    {prefsOpen && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.2, ease: 'easeOut' }}
                                            className="overflow-hidden"
                                        >
                                            <CardContent className="px-6 pb-6 pt-2 space-y-4">
                                                {prefsLoading ? (
                                                    <div className="flex items-center gap-2.5 justify-center py-8">
                                                        <Spinner size="sm" color="current" className="text-indigo-500" />
                                                        <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">Synchronizing configurations…</span>
                                                    </div>
                                                ) : prefsError ? (
                                                    <div className="flex flex-col items-center gap-2 py-8 text-center">
                                                        <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30">
                                                            <WifiOff className="w-5 h-5 text-red-500 dark:text-red-400" />
                                                        </div>
                                                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Failed to load channels</p>
                                                        <p className="text-xs text-slate-400 dark:text-slate-550 max-w-xs leading-normal">Verify security certificates and device connection settings.</p>
                                                        <button
                                                            onClick={() => {
                                                                setPrefsLoading(true);
                                                                setPrefsError(false);
                                                                NotificationService.getPreferences()
                                                                    .then((res) => {
                                                                        const data = res?.data ?? null;
                                                                        setNotifPrefs(data);
                                                                        if (!data) setPrefsError(true);
                                                                    })
                                                                    .catch(() => setPrefsError(true))
                                                                    .finally(() => setPrefsLoading(false));
                                                            }}
                                                            className="mt-3 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors active:scale-95 shadow-sm"
                                                        >
                                                            Retry Handshake
                                                        </button>
                                                    </div>
                                                ) : notifPrefs ? (
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                                                        <NotificationToggle
                                                            icon={Smartphone}
                                                            iconBg="bg-blue-50 dark:bg-blue-950/30"
                                                            iconColor="text-blue-600 dark:text-blue-400"
                                                            title="FCM Push Notifications"
                                                            description={fcmSupported ? (fcmEnabled ? 'Subscribed' : 'Inactive') : 'Not supported on this device'}
                                                            enabled={fcmEnabled}
                                                            loading={fcmLoading}
                                                            onToggle={toggleFcm}
                                                            error={fcmError}
                                                        />
                                                        <NotificationToggle
                                                            icon={Smartphone}
                                                            iconBg="bg-green-50 dark:bg-emerald-950/20"
                                                            iconColor="text-green-600 dark:text-emerald-450"
                                                            title="VAPID Web Push"
                                                            description={vapidSupported ? (vapidEnabled ? 'Subscribed' : 'Inactive') : 'Not supported on this device'}
                                                            enabled={vapidEnabled}
                                                            loading={vapidLoading}
                                                            onToggle={toggleVapid}
                                                            error={vapidError}
                                                        />
                                                        <NotificationToggle
                                                            icon={MailIcon}
                                                            iconBg="bg-purple-50 dark:bg-purple-950/30"
                                                            iconColor="text-purple-600 dark:text-purple-400"
                                                            title="Email Notifications"
                                                            description={notifPrefs.email ? 'Alerts enabled' : 'Alerts disabled'}
                                                            enabled={notifPrefs.email}
                                                            loading={false}
                                                            onToggle={() => handlePrefsUpdate({ email: !notifPrefs.email })}
                                                        />
                                                        <NotificationToggle
                                                            icon={Moon}
                                                            iconBg="bg-indigo-50 dark:bg-indigo-950/30"
                                                            iconColor="text-indigo-600 dark:text-indigo-400"
                                                            title="Quiet Hours (DND)"
                                                            description={notifPrefs.quietHours?.enabled
                                                                ? `${notifPrefs.quietHours.start || '22:00'} – ${notifPrefs.quietHours.end || '08:00'}`
                                                                : 'Inactive'}
                                                            enabled={notifPrefs.quietHours?.enabled || false}
                                                            loading={false}
                                                            onToggle={() => handlePrefsUpdate({
                                                                quietHours: {
                                                                    ...notifPrefs.quietHours,
                                                                    enabled: !notifPrefs.quietHours?.enabled,
                                                                }
                                                            })}
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col items-center gap-2 py-8 text-center">
                                                        <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                                                            <Bell className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                                                        </div>
                                                        <p className="text-sm font-semibold text-slate-550 dark:text-slate-400">No preference schema</p>
                                                        <p className="text-xs text-slate-400 dark:text-slate-500">Contact admin to provision notification parameters.</p>
                                                    </div>
                                                )}
                                            </CardContent>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </Card>
                        </ProfileCardErrorBoundary>
                    </div>
                </div>

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
                    message="This action is irreversible. All of your historical metrics, billing logs, and membership states will be terminated immediately. Confirm security credentials to execute."
                    confirmLabel={deactivationLoading ? 'Deactivating...' : 'Deactivate Account'}
                    variant="danger"
                />
            </div>
        </MainLayout>
    );
};

export default ProfilePage;
