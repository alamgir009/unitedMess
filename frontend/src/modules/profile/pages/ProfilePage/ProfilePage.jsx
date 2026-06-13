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
import { useCallback, useEffect, useState, useMemo, Component } from 'react';
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
            className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-primary hover:bg-muted transition-all active:scale-95 shadow-sm"
            title={`Copy ${label}`}
        >
            {copied ? (
                <Check className="w-3.5 h-3.5 text-success" />
            ) : (
                <Copy className="w-3.5 h-3.5" />
            )}
        </button>
    );
};

// ---------------------------------------------------------------------------- //
// Reusable Confirm Dialog (Low GPU, matches MealModal performance parameters)
// ---------------------------------------------------------------------------- //
const ConfirmDialog = ({ isOpen, onClose, onConfirm, title, message, confirmLabel = 'Confirm', variant = 'danger' }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 contain-[layout_style_paint]">
                    {/* Static backdrop overlay, zero GPU paint cost */}
                    <div
                        onClick={onClose}
                        className="absolute inset-0 w-full h-full bg-black/60 md:bg-black/50"
                    />
                    
                    {/* GPU hardware accelerated card transition */}
                    <motion.div
                        initial={{ scale: 0.985, opacity: 0, y: 12 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.985, opacity: 0, y: 12 }}
                        transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                        onClick={(e) => e.stopPropagation()}
                        className="relative z-10 bg-card rounded-xl shadow-xl max-w-md w-full p-6 border border-border"
                    >
                        <div className="flex items-start gap-4">
                            <div className={`p-2.5 rounded-xl shrink-0 border ${
                                variant === 'danger'
                                    ? 'bg-danger-bg text-danger border-danger-border'
                                    : 'bg-primary/10 text-primary border-primary/20'
                            }`}>
                                <AlertTriangle className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-base font-bold text-foreground">{title}</h3>
                                <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{message}</p>
                            </div>
                            <button
                                onClick={onClose}
                                className="text-muted-foreground hover:text-foreground transition-colors p-1 -mt-1 -mr-1"
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
                </div>
            )}
        </AnimatePresence>
    );
};

// ---------------------------------------------------------------------------- //
// Profile Detail Card (Hover matched to Sidebar styling)
// ---------------------------------------------------------------------------- //
const ProfileDetailCard = ({ icon: Icon, label, value, isCopyable, copyLabel }) => {
    return (
        <div className="group relative flex items-center justify-between p-4 rounded-xl border border-border bg-muted/30 hover:bg-muted hover:border-border transition-all duration-200 shadow-sm">
            <div className="flex items-center gap-3.5 min-w-0">
                <div className="p-2.5 rounded-xl bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors shrink-0 border border-transparent">
                    <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        {label}
                    </span>
                    <span className="block text-sm font-semibold text-foreground truncate mt-0.5">
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
// Notification Toggle Row (Hover matched to Sidebar styling)
// ---------------------------------------------------------------------------- //
const NotificationToggle = ({ icon: Icon, iconBg, iconColor, title, description, enabled, loading, onToggle, error }) => (
    <div className="py-4 px-4 rounded-xl border border-border bg-muted/20 hover:bg-muted transition-colors">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className={`p-2.5 rounded-xl shrink-0 ${iconBg} border border-border`}>
                    <Icon className={`w-4 h-4 ${iconColor}`} />
                </div>
                <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground leading-tight">{title}</p>
                    <p className="text-xs text-muted-foreground truncate mt-1.5">{description}</p>
                </div>
            </div>
            <button
                onClick={onToggle}
                disabled={loading}
                className={`relative inline-flex h-[24px] w-11 items-center rounded-full transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary shrink-0 ml-4 ${
                    loading ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
                } ${
                    enabled
                        ? 'bg-success'
                        : 'bg-muted-foreground/30'
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
            <div className="flex items-center gap-1.5 mt-2.5 ml-12 text-danger">
                <AlertTriangle className="w-4 h-4 shrink-0" />
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
        <div className="h-32 bg-muted rounded-2xl" />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {/* Left Column Skeleton */}
            <div className="space-y-6">
                <div className="bg-muted h-64 rounded-2xl" />
                <div className="bg-muted h-40 rounded-2xl" />
            </div>

            {/* Right Column Skeleton */}
            <div className="md:col-span-2 space-y-6">
                <div className="bg-muted h-80 rounded-2xl" />
                <div className="bg-muted h-60 rounded-2xl" />
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
                <div className="p-6 bg-danger-bg border border-danger-border rounded-2xl text-center space-y-3">
                    <div className="inline-flex p-2.5 rounded-xl bg-danger-bg text-danger border border-danger-border">
                        <AlertTriangle className="w-5 h-5" />
                    </div>
                    <h3 className="text-sm font-semibold text-foreground">Card Load Failed</h3>
                    <p className="text-xs text-muted-foreground max-w-md mx-auto">
                        An error occurred while loading this section of your profile: {this.state.error?.message || "Unknown error"}
                    </p>
                    <button
                        onClick={() => this.setState({ hasError: false, error: null })}
                        className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-danger text-white hover:bg-danger/90 shadow-sm transition-colors active:scale-95"
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
    const [avatarError] = useState(null);

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
            <div className="sm:max-w-5xl sm:mx-auto px-0 sm:px-6 lg:px-8 py-2">
                {/* Premium Banner Header */}
                <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 p-6 sm:p-8 text-white mb-6 sm:mb-8 shadow-md">
                    <div className="absolute right-0 top-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
                    <div className="absolute left-1/3 bottom-0 -mb-20 w-80 h-80 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
                    
                    <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                                {user?.name || 'User Profile'}
                            </h2>
                            <p className="text-xs sm:text-sm text-muted-foreground mt-2 max-w-xl leading-relaxed">
                                View your account details, manage notification channels, and update personal settings.
                            </p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0 self-start sm:self-center">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-white border border-white/10">
                                <span className="w-1.5 h-1.5 rounded-full bg-success" />
                                Active Session
                            </span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 pb-8">
                    {/* Left Column: Avatar & Quick Info */}
                    <div className="md:col-span-1 space-y-6">
                        {/* Avatar Card */}
                        <Card variant="default" padding="none" className="overflow-hidden bg-card border border-border shadow-sm">
                            <CardContent className="p-6">
                                <div className="flex flex-col items-center text-center space-y-4">
                                    <AvatarUpload />
                                    
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                            Account User
                                        </p>
                                        <h3 className="text-lg font-bold text-foreground truncate max-w-full">
                                            {user?.name || 'Member User'}
                                        </h3>
                                        <div className="flex items-center justify-center pt-1.5">
                                            {isAdmin ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase bg-primary/10 text-primary border border-primary/20 shadow-sm">
                                                    <Crown className="w-3 h-3" />
                                                    Admin
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase bg-muted text-muted-foreground border border-border shadow-sm">
                                                    Member
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <div className="h-px bg-border w-full" />
                                    <p className="text-[10px] text-muted-foreground">
                                        JPG, PNG or GIF. Max 5 MB.
                                    </p>
                                    {avatarError && (
                                        <div className="flex items-center gap-1.5 text-xs font-semibold text-danger">
                                            <AlertTriangle className="w-4 h-4" />
                                            {avatarError}
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Quick Actions */}
                        <Card variant="default" padding="none" className="overflow-hidden bg-card border border-border shadow-sm">
                            <CardContent className="p-3">
                                <div className="space-y-1">
                                    {isAdmin && (
                                        <>
                                            <button
                                                className="w-full flex items-center justify-between p-3 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-colors group font-medium"
                                                onClick={() => navigate('/settings')}
                                            >
                                                <span className="flex items-center gap-3 text-sm">
                                                    <Settings className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                                                    Account Settings
                                                </span>
                                                <ChevronDown className="w-4 h-4 -rotate-90 text-muted-foreground" />
                                            </button>
                                            <div className="h-px bg-border mx-2" />
                                        </>
                                    )}

                                    <button
                                        onClick={handleLogout}
                                        className="w-full flex items-center justify-between p-3 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-colors group font-medium"
                                    >
                                        <span className="flex items-center gap-3 text-sm">
                                            <LogOut className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                                            Sign Out
                                        </span>
                                        <ChevronDown className="w-4 h-4 -rotate-90 text-muted-foreground" />
                                    </button>

                                    <div className="h-px bg-border mx-2" />

                                    <button
                                        onClick={() => setShowDeactivateConfirm(true)}
                                        disabled={deactivationLoading}
                                        className="w-full flex items-center justify-between p-3 rounded-xl text-danger hover:bg-danger-bg transition-colors disabled:opacity-50 disabled:cursor-not-allowed group font-medium"
                                    >
                                        <span className="flex items-center gap-3 text-sm">
                                            <UserX className="w-5 h-5 text-danger group-hover:text-danger transition-colors" />
                                            Deactivate Account
                                        </span>
                                        {deactivationLoading ? (
                                            <Spinner size="sm" color="current" className="text-danger" />
                                        ) : (
                                            <ChevronDown className="w-4 h-4 -rotate-90 text-danger/50" />
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
                            <Card variant="default" padding="none" className="bg-card border border-border shadow-sm">
                                <div className="px-6 py-5 border-b border-border flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                        <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20">
                                            <User className="w-4 h-4 text-primary" />
                                        </div>
                                        <div>
                                            <h3 className="text-base font-bold text-foreground">
                                                Personal Details
                                            </h3>
                                            <p className="text-[11px] text-muted-foreground">Your profile registration data</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setIsModalOpen(true)}
                                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg border border-primary/30 text-primary bg-primary/10 hover:bg-primary/20 transition-colors active:scale-95 shadow-sm"
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
                            <Card variant="default" padding="none" className="bg-card border border-border shadow-sm">
                                <div className="px-6 py-5 border-b border-border flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                        <div className="p-1.5 rounded-lg bg-success-bg border border-success-border">
                                            <Bell className="w-4 h-4 text-success" />
                                        </div>
                                        <div>
                                            <h3 className="text-base font-bold text-foreground">
                                                Communication Channels
                                            </h3>
                                            <p className="text-[11px] text-muted-foreground">Configure alert channels and push tokens</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setPrefsOpen(!prefsOpen)}
                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                        aria-expanded={prefsOpen}
                                    >
                                        {prefsOpen ? 'Hide Preferences' : 'Manage Preferences'}
                                        {prefsOpen ? <ChevronUp className="w-4 h-4 ml-1.5" /> : <ChevronDown className="w-4 h-4 ml-1.5" />}
                                    </button>
                                </div>
                                <AnimatePresence initial={false}>
                                    {prefsOpen && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.15, ease: 'easeOut' }}
                                            className="overflow-hidden"
                                        >
                                            <CardContent className="px-6 pb-6 pt-6">
                                                {prefsLoading ? (
                                                    <div className="flex items-center gap-2.5 justify-center py-8">
                                                        <Spinner size="sm" color="current" className="text-primary" />
                                                        <span className="text-xs text-muted-foreground font-medium">Synchronizing configurations…</span>
                                                    </div>
                                                ) : prefsError ? (
                                                    <div className="flex flex-col items-center gap-2 py-8 text-center">
                                                        <div className="p-2.5 rounded-xl bg-danger-bg border border-danger-border">
                                                            <WifiOff className="w-5 h-5 text-danger" />
                                                        </div>
                                                        <p className="text-sm font-semibold text-foreground">Failed to load channels</p>
                                                        <p className="text-xs text-muted-foreground max-w-xs leading-normal">Verify security certificates and device connection settings.</p>
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
                                                            className="mt-3 px-3 py-1.5 text-xs font-semibold rounded-lg border border-border text-muted-foreground hover:bg-muted transition-colors active:scale-95 shadow-sm"
                                                        >
                                                            Retry Handshake
                                                        </button>
                                                    </div>
                                                ) : notifPrefs ? (
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                        <NotificationToggle
                                                            icon={Smartphone}
                                                            iconBg="bg-primary/10"
                                                            iconColor="text-primary"
                                                            title="FCM Push Notifications"
                                                            description={fcmSupported ? (fcmEnabled ? 'Subscribed' : 'Inactive') : 'Not supported on this device'}
                                                            enabled={fcmEnabled}
                                                            loading={fcmLoading}
                                                            onToggle={toggleFcm}
                                                            error={fcmError}
                                                        />
                                                        <NotificationToggle
                                                            icon={Smartphone}
                                                            iconBg="bg-success-bg"
                                                            iconColor="text-success"
                                                            title="VAPID Web Push"
                                                            description={vapidSupported ? (vapidEnabled ? 'Subscribed' : 'Inactive') : 'Not supported on this device'}
                                                            enabled={vapidEnabled}
                                                            loading={vapidLoading}
                                                            onToggle={toggleVapid}
                                                            error={vapidError}
                                                        />
                                                        <NotificationToggle
                                                            icon={MailIcon}
                                                            iconBg="bg-primary/10"
                                                            iconColor="text-primary"
                                                            title="Email Notifications"
                                                            description={notifPrefs.email ? 'Alerts enabled' : 'Alerts disabled'}
                                                            enabled={notifPrefs.email}
                                                            loading={false}
                                                            onToggle={() => handlePrefsUpdate({ email: !notifPrefs.email })}
                                                        />
                                                        <NotificationToggle
                                                            icon={Moon}
                                                            iconBg="bg-primary/10"
                                                            iconColor="text-primary"
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
                                                        <div className="p-2 rounded-xl bg-muted border border-border">
                                                            <Bell className="w-5 h-5 text-muted-foreground" />
                                                        </div>
                                                        <p className="text-sm font-semibold text-muted-foreground">No preference schema</p>
                                                        <p className="text-xs text-muted-foreground">Contact admin to provision notification parameters.</p>
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
