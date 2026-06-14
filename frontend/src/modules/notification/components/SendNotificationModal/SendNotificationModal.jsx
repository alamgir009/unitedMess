import { useState, useEffect, useCallback } from 'react';
import { useModalAnimation } from '@/shared/hooks/useModalAnimation';
import { cn } from '@/core/utils/helpers/string.helper';
import { X, Send, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { useSelector } from 'react-redux';
import NotificationService from '../../services/notification.service';
import { Spinner } from '@/shared/components/ui';
import toast from 'react-hot-toast';

const TYPES = [
    'PAYMENT', 'TRANSFER', 'DEPOSIT', 'WITHDRAWAL', 'ACCOUNT',
    'SECURITY', 'BILLING', 'SYSTEM', 'INVESTMENT', 'REWARD', 'CUSTOM'
];

const PRIORITIES = ['LOW', 'NORMAL', 'HIGH', 'CRITICAL'];

const targetTypes = [
    { value: 'ALL', label: 'All Users' },
    { value: 'USER', label: 'Specific User' },
    { value: 'ROLE', label: 'By Role' },
];

const SendNotificationModal = ({ isOpen, onClose }) => {
    const { user } = useSelector((state) => state.auth);
    const { shouldRender, exiting } = useModalAnimation(isOpen, { exitTimeout: 120 });

    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [type, setType] = useState('SYSTEM');
    const [priority, setPriority] = useState('NORMAL');
    const [targetType, setTargetType] = useState('ALL');
    const [userId, setUserId] = useState('');
    const [actionRequired, setActionRequired] = useState(false);
    const [actionUrl, setActionUrl] = useState('');
    const [showPreview, setShowPreview] = useState(false);
    const [confirmBroadcast, setConfirmBroadcast] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [estimatedRecipients, setEstimatedRecipients] = useState(0);

    useEffect(() => {
        if (targetType === 'ALL' && shouldRender && !exiting) {
            import('@/services/api/client/apiClient').then(({ default: api }) => {
                api.get('/users/count/active').then((res) => {
                    setEstimatedRecipients(res.data?.data?.count || 0);
                }).catch(() => setEstimatedRecipients(0));
            });
        }
    }, [targetType, shouldRender, exiting]);

    const reset = useCallback(() => {
        setTitle('');
        setMessage('');
        setType('SYSTEM');
        setPriority('NORMAL');
        setTargetType('ALL');
        setUserId('');
        setActionRequired(false);
        setActionUrl('');
        setShowPreview(false);
        setConfirmBroadcast(false);
        setSubmitting(false);
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!title.trim() || !message.trim()) return;

        if (targetType === 'ALL' && !confirmBroadcast) {
            setConfirmBroadcast(true);
            return;
        }

        setSubmitting(true);

        try {
            const payload = {
                targetType,
                title: title.trim(),
                message: message.trim(),
                type,
                priority,
                actionRequired,
                ...(actionUrl.trim() && { actionUrl: actionUrl.trim() }),
                ...(targetType === 'USER' && { userId }),
                ...(targetType === 'ROLE' && { userId }),
            };

            const res = await NotificationService.sendAdminNotification(payload);

            if (res.statusCode === 202) {
                toast.success(res.message || 'Broadcast queued successfully');
            } else {
                toast.success('Notification sent successfully');
            }

            reset();
            onClose();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to send notification');
        } finally {
            setSubmitting(false);
        }
    };

    if (!shouldRender || user?.role !== 'admin') return null;

    const previewNotification = {
        type,
        priority,
        title: title || 'Notification Title',
        message: message || 'Notification message preview',
        isRead: false,
        createdAt: new Date().toISOString(),
        actionRequired,
    };

    return (
        <div className={cn(
            'fixed inset-0 z-50 flex items-center justify-center p-4',
            'modal-animate-backdrop',
            exiting ? 'modal-exit-backdrop' : 'modal-enter'
        )}>
            <div
                onClick={() => { reset(); onClose(); }}
                className="absolute inset-0 bg-black/40"
            />

            <div
                className={cn(
                    'relative w-full max-w-lg bg-card rounded-2xl shadow-2xl border border-border overflow-hidden',
                    'modal-animate modal-gpu',
                    exiting ? 'modal-exit' : 'modal-enter'
                )}
            >
                <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                    <h2 className="text-lg font-semibold text-foreground">
                        {confirmBroadcast ? 'Confirm Broadcast' : 'Send Notification'}
                    </h2>
                    <button
                        onClick={() => { reset(); onClose(); }}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {confirmBroadcast ? (
                    <div className="p-6 space-y-4">
                        <div className="flex items-start gap-3 p-4 bg-warning-bg border border-warning-border rounded-xl">
                            <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-semibold text-warning">
                                    Broadcast to all {estimatedRecipients} active users
                                </p>
                                <p className="text-xs text-warning mt-1">
                                    This will send a notification to every active user in the system. This action is logged for audit purposes.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 pt-2">
                            <button
                                onClick={() => setConfirmBroadcast(false)}
                                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border border-border text-muted-foreground hover:bg-muted transition-all"
                            >
                                Edit
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={submitting}
                                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium bg-warning text-white hover:bg-warning/90 disabled:opacity-50 transition-all"
                            >
                                {submitting ? 'Sending...' : `Send to ${estimatedRecipients} users`}
                            </button>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="p-6 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1.5">
                                Send to
                            </label>
                            <div className="flex gap-2">
                                {targetTypes.map((t) => (
                                    <button
                                        key={t.value}
                                        type="button"
                                        onClick={() => setTargetType(t.value)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                            targetType === t.value
                                                ? 'bg-primary text-white'
                                                : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                        }`}
                                    >
                                        {t.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {(targetType === 'USER' || targetType === 'ROLE') && (
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1.5">
                                    {targetType === 'USER' ? 'User ID' : 'Role'}
                                </label>
                                {targetType === 'USER' ? (
                                    <input
                                        type="text"
                                        value={userId}
                                        onChange={(e) => setUserId(e.target.value)}
                                        placeholder="Enter user ID"
                                        className="w-full px-3 py-2 rounded-xl border border-border bg-card text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                    />
                                ) : (
                                    <select
                                        value={userId}
                                        onChange={(e) => setUserId(e.target.value)}
                                        className="w-full px-3 py-2 rounded-xl border border-border bg-card text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                    >
                                        <option value="">Select role</option>
                                        <option value="admin">Admin</option>
                                        <option value="user">User</option>
                                    </select>
                                )}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1.5">
                                Title <span className="text-danger">*</span>
                                <span className="text-xs text-muted-foreground ml-1">({title.length}/80)</span>
                            </label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value.slice(0, 80))}
                                required
                                maxLength={80}
                                placeholder="Notification title"
                                className="w-full px-3 py-2 rounded-xl border border-border bg-card text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1.5">
                                Message <span className="text-danger">*</span>
                                <span className="text-xs text-muted-foreground ml-1">({message.length}/300)</span>
                            </label>
                            <textarea
                                value={message}
                                onChange={(e) => setMessage(e.target.value.slice(0, 300))}
                                required
                                maxLength={300}
                                rows={3}
                                placeholder="Notification message"
                                className="w-full px-3 py-2 rounded-xl border border-border bg-card text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1.5">Type</label>
                                <select
                                    value={type}
                                    onChange={(e) => setType(e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl border border-border bg-card text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                >
                                    {TYPES.map((t) => (
                                        <option key={t} value={t}>{t}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1.5">Priority</label>
                                <select
                                    value={priority}
                                    onChange={(e) => setPriority(e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl border border-border bg-card text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                >
                                    {PRIORITIES.map((p) => (
                                        <option key={p} value={p}>{p}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={actionRequired}
                                    onChange={(e) => setActionRequired(e.target.checked)}
                                    className="rounded border-border text-primary focus:ring-primary"
                                />
                                <span className="text-sm text-foreground">Requires action</span>
                            </label>

                            {actionRequired && (
                                <input
                                    type="url"
                                    value={actionUrl}
                                    onChange={(e) => setActionUrl(e.target.value)}
                                    placeholder="Action URL (optional)"
                                    className="w-full px-3 py-2 rounded-xl border border-border bg-card text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                />
                            )}
                        </div>

                        <button
                            type="button"
                            onClick={() => setShowPreview(!showPreview)}
                            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-all"
                        >
                            {showPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            {showPreview ? 'Hide preview' : 'Show preview'}
                        </button>

                        {showPreview && (
                            <div className="p-3 bg-muted rounded-xl border border-border">
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Preview</p>
                                <div className="flex items-start gap-3 p-3 bg-card rounded-lg border border-border">
                                    <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                                        priority === 'CRITICAL' ? 'bg-danger-bg text-danger' :
                                        priority === 'HIGH' ? 'bg-warning-bg text-warning' :
                                        'bg-muted text-muted-foreground'
                                    }`}>
                                        {type.charAt(0)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-foreground">{previewNotification.title}</p>
                                        <p className="text-xs text-muted-foreground mt-0.5">{previewNotification.message}</p>
                                        {actionRequired && (
                                            <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-warning-bg text-warning">
                                                Action needed
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex items-center gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => { reset(); onClose(); }}
                                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border border-border text-muted-foreground hover:bg-muted transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={submitting || !title.trim() || !message.trim()}
                                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium bg-primary text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-1.5"
                            >
                                {submitting ? (
                                    <>
                                        <Spinner size="sm" color="white" className="!w-4 !h-4" />
                                        Sending...
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-4 h-4" />
                                        {targetType === 'ALL' ? 'Broadcast' : 'Send'}
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default SendNotificationModal;
