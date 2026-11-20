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
    Bell,
    Smartphone,
    Mail as MailIcon,
    Moon,
    ChevronDown,
    ChevronUp,
    ChevronRight,
    Crown,
    WifiOff,
    Copy,
    Check,
} from 'lucide-react';
import MainLayout from '@/shared/components/layout/MainLayout/MainLayout';
import { Button, Spinner } from '@/shared/components/ui';
import ConfirmDialog from '@/shared/components/ui/ConfirmDialog/ConfirmDialog';
import { logout, deactivateAccount } from '@/modules/auth/store/auth.slice';
import { useNavigate } from 'react-router-dom';
import { useCallback, useEffect, useState, useMemo, Component, memo } from 'react';
import { EditModal } from '../../components/EditModal/EditModal';
import { AvatarUpload } from '../../components/AvatarUpload';
import { toast } from 'react-hot-toast';
import useFcmPush from '@/modules/notification/hooks/useFcmPush';
import NotificationService from '@/modules/notification/services/notification.service';
import { cn } from '@/core/utils/helpers/string.helper';

// ---------------------------------------------------------------------------- //
// Clipboard Copy Button (Mobile & Touch-Optimized)
// ---------------------------------------------------------------------------- //
const CopyButton = memo(({ text, label }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = (e) => {
        e.stopPropagation();
        if (!text || text === '—') return;
        navigator.clipboard.writeText(text);
        setCopied(true);
        toast.success(`${label} copied`);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <button
            onClick={handleCopy}
            type="button"
            className="p-1.5 sm:p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted active:scale-95 transition-all shadow-2xs touch-manipulation min-w-[32px] min-h-[32px] flex items-center justify-center"
            title={`Copy ${label}`}
            aria-label={`Copy ${label}`}
        >
            {copied ? (
                <Check className="w-3.5 h-3.5 text-success animate-in zoom-in-50 duration-150" />
            ) : (
                <Copy className="w-3.5 h-3.5" />
            )}
        </button>
    );
});
CopyButton.displayName = 'CopyButton';

// ---------------------------------------------------------------------------- //
// Profile Detail Card (Touch-Friendly with Visible Copy on Mobile)
// ---------------------------------------------------------------------------- //
const ProfileDetailCard = memo(({ icon: Icon, label, value, isCopyable, copyLabel }) => {
    return (
        <div className="group relative flex items-center justify-between p-3.5 sm:p-4 rounded-lg border border-border bg-muted/40 hover:bg-muted/60 transition-all duration-200">
            <div className="flex items-center gap-3 sm:gap-3.5 min-w-0 pr-2">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-card border border-border text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary group-hover:border-primary/20 transition-all flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        {label}
                    </span>
                    <span
                        className="block text-xs sm:text-sm font-semibold text-foreground truncate mt-0.5"
                        title={value}
                    >
                        {value || '—'}
                    </span>
                </div>
            </div>
            {isCopyable && value && value !== '—' && value !== 'Not provided' && (
                <div className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus-within:opacity-100 transition-opacity ml-1.5 sm:ml-2 shrink-0">
                    <CopyButton text={value} label={copyLabel || label} />
                </div>
            )}
        </div>
    );
});
ProfileDetailCard.displayName = 'ProfileDetailCard';

// ---------------------------------------------------------------------------- //
// Notification Toggle Row (Mobile Responsive Switch Row)
// ---------------------------------------------------------------------------- //
const NotificationToggle = memo(({ icon: Icon, iconBg, iconColor, title, description, enabled, loading, onToggle, error }) => (
    <div className="p-3 sm:p-4 rounded-lg border border-border bg-muted/40 hover:bg-muted/60 transition-colors">
        <div className="flex items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-3 sm:gap-3.5 min-w-0 flex-1">
                <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg shrink-0 ${iconBg} border border-border flex items-center justify-center`}>
                    <Icon className={`w-4 h-4 ${iconColor}`} />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm font-semibold text-foreground leading-tight truncate sm:whitespace-normal">
                        {title}
                    </p>
                    <p className="text-[11px] sm:text-xs text-muted-foreground truncate mt-0.5 sm:mt-1">
                        {description}
                    </p>
                </div>
            </div>
            <button
                type="button"
                onClick={onToggle}
                disabled={loading}
                className={cn(
                    'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 touch-manipulation',
                    enabled ? 'bg-primary' : 'bg-muted-foreground/30',
                    loading && 'opacity-40 cursor-not-allowed'
                )}
                role="switch"
                aria-checked={enabled}
                aria-label={`Toggle ${title}`}
            >
                <span
                    aria-hidden="true"
                    className={cn(
                        'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out',
                        enabled ? 'translate-x-5' : 'translate-x-0'
                    )}
                />
            </button>
        </div>
        {error && (
            <div className="flex items-center gap-1.5 mt-2.5 ml-11 sm:ml-12 text-danger text-xs font-semibold">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <p className="leading-snug">{error}</p>
            </div>
        )}
    </div>
));
NotificationToggle.displayName = 'NotificationToggle';

// ---------------------------------------------------------------------------- //
// Responsive Profile Skeleton Shimmer
// ---------------------------------------------------------------------------- //
const ProfileSkeleton = () => (
    <div className="max-w-5xl mx-auto px-3 sm:px-6 space-y-4 sm:space-y-6 animate-pulse py-2 sm:py-4">
        <div className="h-28 sm:h-32 bg-card border border-border rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            <div className="space-y-4 sm:space-y-6">
                <div className="bg-card border border-border h-60 sm:h-64 rounded-xl" />
                <div className="bg-card border border-border h-36 sm:h-40 rounded-xl" />
            </div>
            <div className="md:col-span-2 space-y-4 sm:space-y-6">
                <div className="bg-card border border-border h-72 sm:h-80 rounded-xl" />
                <div className="bg-card border border-border h-20 sm:h-24 rounded-xl" />
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
        console.error('ProfileCardErrorBoundary caught an error:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="p-4 sm:p-6 bg-card border border-danger-border rounded-xl text-center space-y-3">
                    <div className="inline-flex p-2 rounded-lg bg-danger-bg text-danger-text border border-danger-border">
                        <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <h3 className="text-sm font-semibold text-foreground">Section Load Failed</h3>
                    <p className="text-xs text-muted-foreground max-w-md mx-auto">
                        An error occurred while loading this section: {this.state.error?.message || 'Unknown error'}
                    </p>
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => this.setState({ hasError: false, error: null })}
                    >
                        Try Again
                    </Button>
                </div>
            );
        }
        return this.props.children;
    }
}

// ---------------------------------------------------------------------------- //
// Safe Date Parser
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

    const {
        isSubscribed: fcmEnabled,
        loading: fcmLoading,
        toggle: toggleFcm,
        supported: fcmSupported,
        error: fcmError,
    } = useFcmPush();

    const [notifPrefs, setNotifPrefs] = useState(null);
    const [prefsLoading, setPrefsLoading] = useState(true);
    const [prefsError, setPrefsError] = useState(false);

    // Default closed as specifically requested by user for clean alignment
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
            setShowDeactivateConfirm(false);
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
            hour12: true,
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
            <div className="max-w-5xl mx-auto px-2 sm:px-6 lg:px-8 py-2 sm:py-4">

                {/* ── 1. Fintech Grade Header Card (Seamless on Mobile & Desktop) ── */}
                <div className="relative overflow-hidden rounded-xl border border-border bg-card shadow-sm depth-top p-4 sm:p-6 lg:p-8 mb-4 sm:mb-6 lg:mb-8 transition-colors duration-200">
                    {/* Top inset hairline with subtle white accent light */}
                    <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/40 dark:via-white/15 to-transparent pointer-events-none" />

                    <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                        <div>
                            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-foreground">
                                {user?.name || 'User Profile'}
                            </h2>
                            <p className="text-xs sm:text-sm text-muted-foreground mt-1 sm:mt-2 max-w-xl leading-relaxed">
                                View your account details, manage notification channels, and update personal settings.
                            </p>
                        </div>
                    </div>
                </div>

                {/* ── 2. Responsive Layout Grid (Top-aligned, content-driven heights) ── */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 pb-6 sm:pb-8 items-start">

                    {/* Left Column: Avatar & Quick Actions */}
                    <div className="md:col-span-1 flex flex-col gap-4 sm:gap-6">

                        {/* Avatar Card */}
                        <div className="rounded-xl border border-border bg-card shadow-sm p-5 sm:p-6 text-center">
                            <div className="flex flex-col items-center space-y-3.5 sm:space-y-4">
                                <AvatarUpload />

                                <div className="space-y-1 w-full">
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                        Account User
                                    </p>
                                    <h3 className="text-base sm:text-lg font-bold text-foreground truncate max-w-full">
                                        {user?.name || 'Member User'}
                                    </h3>
                                    <div className="flex items-center justify-center pt-1 sm:pt-1.5">
                                        {isAdmin ? (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase bg-primary/10 text-primary border border-primary/20 shadow-2xs">
                                                <Crown className="w-3 h-3" />
                                                Admin
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase bg-muted text-muted-foreground border border-border shadow-2xs">
                                                Member
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="h-px bg-border w-full my-1 sm:my-2" />
                                <p className="text-[10px] text-muted-foreground">
                                    JPG, PNG or GIF. Max 5 MB.
                                </p>
                            </div>
                        </div>

                        {/* Quick Actions Card */}
                        <div className="rounded-xl border border-border bg-card shadow-sm p-2 sm:p-3">
                            <div className="space-y-1">
                                {isAdmin && (
                                    <>
                                        <button
                                            type="button"
                                            className="w-full flex items-center justify-between p-2.5 sm:p-3 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground active:bg-muted/80 transition-colors group font-medium min-h-[44px]"
                                            onClick={() => navigate('/settings')}
                                        >
                                            <span className="flex items-center gap-2.5 sm:gap-3 text-xs sm:text-sm">
                                                <Settings className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                                                Account Settings
                                            </span>
                                            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
                                        </button>
                                        <div className="h-px bg-border mx-2" />
                                    </>
                                )}

                                <button
                                    type="button"
                                    onClick={handleLogout}
                                    className="w-full flex items-center justify-between p-2.5 sm:p-3 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground active:bg-muted/80 transition-colors group font-medium min-h-[44px]"
                                >
                                    <span className="flex items-center gap-2.5 sm:gap-3 text-xs sm:text-sm">
                                        <LogOut className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                                        Sign Out
                                    </span>
                                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
                                </button>

                                <div className="h-px bg-border mx-2" />

                                <button
                                    type="button"
                                    onClick={() => setShowDeactivateConfirm(true)}
                                    disabled={deactivationLoading}
                                    className="w-full flex items-center justify-between p-2.5 sm:p-3 rounded-lg text-danger hover:bg-danger-bg hover:text-danger-text active:bg-danger-bg/80 transition-colors group font-medium text-left min-h-[44px]"
                                >
                                    <span className="flex items-center gap-2.5 sm:gap-3 text-xs sm:text-sm">
                                        <UserX className="w-4 h-4 text-danger shrink-0" />
                                        Deactivate Account
                                    </span>
                                    {deactivationLoading ? (
                                        <Spinner size="sm" color="current" />
                                    ) : (
                                        <ChevronRight className="w-4 h-4 text-danger opacity-70 shrink-0" />
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Personal Details & Communication Channels */}
                    <div className="md:col-span-2 flex flex-col gap-4 sm:gap-6">

                        {/* Personal Details Card */}
                        <ProfileCardErrorBoundary>
                            <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden flex flex-col">
                                <div className="px-4 sm:px-6 py-3.5 sm:py-5 border-b border-border flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <div className="p-1.5 sm:p-2 rounded-lg bg-primary/10 border border-primary/20 text-primary shrink-0">
                                            <User className="w-4 h-4" />
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="text-sm sm:text-base font-bold text-foreground truncate">
                                                Personal Details
                                            </h3>
                                            <p className="text-[10px] sm:text-[11px] text-muted-foreground truncate">
                                                Your profile registration data
                                            </p>
                                        </div>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setIsModalOpen(true)}
                                        aria-label="Edit personal details"
                                        className="gap-1.5 shrink-0 min-h-[36px]"
                                    >
                                        <Edit3 className="w-3.5 h-3.5" />
                                        Edit Profile
                                    </Button>
                                </div>

                                <div className="p-3.5 sm:p-6 flex flex-col">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                        <ProfileDetailCard
                                            icon={User}
                                            label="Full Name"
                                            value={user?.name || '—'}
                                            isCopyable
                                            copyLabel="Name"
                                        />
                                        <ProfileDetailCard
                                            icon={Mail}
                                            label="Email Address"
                                            value={user?.email || '—'}
                                            isCopyable
                                            copyLabel="Email"
                                        />
                                        <ProfileDetailCard
                                            icon={Phone}
                                            label="Phone Number"
                                            value={user?.phone || 'Not provided'}
                                            isCopyable={Boolean(user?.phone)}
                                            copyLabel="Phone"
                                        />
                                        <ProfileDetailCard
                                            icon={CalendarClock}
                                            label="Member Since"
                                            value={memberSinceText}
                                        />
                                        <div className="sm:col-span-2">
                                            <ProfileDetailCard
                                                icon={RotateCcw}
                                                label="Last Active Session"
                                                value={lastUpdatedText}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </ProfileCardErrorBoundary>

                        {/* Communication Channels */}
                        <ProfileCardErrorBoundary>
                            <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden shrink-0">
                                <div className="px-4 sm:px-6 py-3.5 sm:py-5 flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <div className="p-1.5 sm:p-2 rounded-lg bg-success-bg border border-success-border text-success-text shrink-0">
                                            <Bell className="w-4 h-4" />
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="text-sm sm:text-base font-bold text-foreground truncate">
                                                Communication Channels
                                            </h3>
                                            <p className="text-[10px] sm:text-[11px] text-muted-foreground truncate">
                                                Configure alert channels and push tokens
                                            </p>
                                        </div>
                                    </div>

                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setPrefsOpen(!prefsOpen)}
                                        aria-expanded={prefsOpen}
                                        aria-label={prefsOpen ? 'Hide notification preferences' : 'Manage notification preferences'}
                                        className="gap-1.5 shrink-0 min-h-[36px]"
                                    >
                                        {prefsOpen ? (
                                            <ChevronUp className="w-3.5 h-3.5" />
                                        ) : (
                                            <ChevronDown className="w-3.5 h-3.5" />
                                        )}
                                        <span className="hidden sm:inline">{prefsOpen ? 'Hide Preferences' : 'Manage Preferences'}</span>
                                        <span className="sm:hidden">{prefsOpen ? 'Hide' : 'Manage'}</span>
                                    </Button>
                                </div>

                                <AnimatePresence initial={false}>
                                    {prefsOpen && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                                            className="overflow-hidden border-t border-border"
                                        >
                                            <div className="p-3.5 sm:p-6">
                                                {prefsLoading ? (
                                                    <div className="flex items-center gap-2.5 justify-center py-6 sm:py-8">
                                                        <Spinner size="sm" color="current" className="text-primary" />
                                                        <span className="text-xs text-muted-foreground font-medium">
                                                            Synchronizing preferences…
                                                        </span>
                                                    </div>
                                                ) : prefsError ? (
                                                    <div className="flex flex-col items-center gap-2 py-6 sm:py-8 text-center">
                                                        <div className="p-2 sm:p-2.5 rounded-lg bg-danger-bg border border-danger-border text-danger-text">
                                                            <WifiOff className="w-4 h-4 sm:w-5 sm:h-5" />
                                                        </div>
                                                        <p className="text-xs sm:text-sm font-semibold text-foreground">
                                                            Failed to load channels
                                                        </p>
                                                        <p className="text-[11px] sm:text-xs text-muted-foreground max-w-xs leading-normal">
                                                            Verify your network connection and server settings.
                                                        </p>
                                                        <button
                                                            type="button"
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
                                                            className="mt-3 px-3.5 py-1.5 text-xs font-semibold rounded-lg border border-border text-muted-foreground hover:bg-muted transition-colors active:scale-95 shadow-2xs min-h-[36px]"
                                                        >
                                                            Retry Handshake
                                                        </button>
                                                    </div>
                                                ) : notifPrefs ? (
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                                        <NotificationToggle
                                                            icon={Smartphone}
                                                            iconBg="bg-primary/10"
                                                            iconColor="text-primary"
                                                            title="FCM Push Notifications"
                                                            description={
                                                                fcmSupported
                                                                    ? fcmEnabled
                                                                        ? 'Subscribed to alerts'
                                                                        : 'Inactive'
                                                                    : 'Not supported on this browser'
                                                            }
                                                            enabled={fcmEnabled}
                                                            loading={fcmLoading}
                                                            onToggle={toggleFcm}
                                                            error={fcmError}
                                                        />
                                                        <NotificationToggle
                                                            icon={MailIcon}
                                                            iconBg="bg-primary/10"
                                                            iconColor="text-primary"
                                                            title="Email Notifications"
                                                            description={notifPrefs.email ? 'Alerts enabled' : 'Alerts disabled'}
                                                            enabled={Boolean(notifPrefs.email)}
                                                            loading={false}
                                                            onToggle={() => handlePrefsUpdate({ email: !notifPrefs.email })}
                                                        />
                                                        <div className="sm:col-span-2">
                                                            <NotificationToggle
                                                                icon={Moon}
                                                                iconBg="bg-primary/10"
                                                                iconColor="text-primary"
                                                                title="Quiet Hours (DND)"
                                                                description={
                                                                    notifPrefs.quietHours?.enabled
                                                                        ? `${notifPrefs.quietHours.start || '22:00'} – ${notifPrefs.quietHours.end || '08:00'}`
                                                                        : 'Inactive'
                                                                }
                                                                enabled={Boolean(notifPrefs.quietHours?.enabled)}
                                                                loading={false}
                                                                onToggle={() =>
                                                                    handlePrefsUpdate({
                                                                        quietHours: {
                                                                            ...notifPrefs.quietHours,
                                                                            enabled: !notifPrefs.quietHours?.enabled,
                                                                        },
                                                                    })
                                                                }
                                                            />
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col items-center gap-2 py-6 sm:py-8 text-center">
                                                        <div className="p-2 rounded-lg bg-muted border border-border">
                                                            <Bell className="w-4 h-4 text-muted-foreground" />
                                                        </div>
                                                        <p className="text-xs sm:text-sm font-semibold text-muted-foreground">
                                                            No preference schema
                                                        </p>
                                                        <p className="text-[11px] sm:text-xs text-muted-foreground">
                                                            Contact admin to provision notification parameters.
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </ProfileCardErrorBoundary>
                    </div>
                </div>

                {/* ── Edit Profile Modal ── */}
                <EditModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} initialData={user} />

                {/* ── Deactivation Confirmation Dialog ── */}
                <ConfirmDialog
                    isOpen={showDeactivateConfirm}
                    onClose={() => setShowDeactivateConfirm(false)}
                    onConfirm={handleDeactivate}
                    title="Deactivate Account"
                    description="This action is irreversible. All of your historical metrics, billing logs, and membership states will be terminated immediately."
                    confirmLabel="Deactivate Account"
                    cancelLabel="Cancel"
                    variant="danger"
                    isConfirming={deactivationLoading}
                />
            </div>
        </MainLayout>
    );
};

export default ProfilePage;
