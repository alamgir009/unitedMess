import { useState, useEffect, useCallback } from 'react';
import { Send, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { useSelector } from 'react-redux';
import NotificationService from '../../services/notification.service';
import { Modal, Button, IconSelect } from '@/shared/components/ui';
import { FiUser, FiShield } from 'react-icons/fi';
import { HiOutlineBell, HiOutlineFlag } from 'react-icons/hi2';
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

const inputClasses = 'w-full h-11 px-3 py-2.5 rounded-xl surface-elevated border border-border text-sm text-foreground placeholder:text-muted-foreground caret-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring transition-[border-color,box-shadow] duration-150';

const SendNotificationModal = ({ isOpen, onClose }) => {
    const { user } = useSelector((state) => state.auth);

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
        if (targetType === 'ALL' && isOpen) {
            import('@/services/api/client/apiClient').then(({ default: api }) => {
                api.get('/users/count/active').then((res) => {
                    setEstimatedRecipients(res.data?.data?.count || 0);
                }).catch(() => setEstimatedRecipients(0));
            });
        }
    }, [targetType, isOpen]);

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

    const handleClose = useCallback(() => {
        reset();
        onClose();
    }, [reset, onClose]);

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

    if (user?.role !== 'admin') return null;

    const previewNotification = {
        type,
        priority,
        title: title || 'Notification Title',
        message: message || 'Notification message preview',
        isRead: false,
        createdAt: new Date().toISOString(),
        actionRequired,
    };

    const footer = confirmBroadcast ? (
        <div className="flex gap-2.5 w-full">
            <Button variant="ghost" size="sm" className="flex-1" onClick={() => setConfirmBroadcast(false)}>
                Edit
            </Button>
            <Button variant="warning" size="sm" className="flex-[2]" onClick={handleSubmit} disabled={submitting} isLoading={submitting}>
                Send to {estimatedRecipients} users
            </Button>
        </div>
    ) : (
        <div className="flex gap-2.5 w-full">
            <Button variant="ghost" size="sm" className="flex-1" onClick={handleClose}>
                Cancel
            </Button>
            <Button variant="primary" size="sm" className="flex-[2]" type="submit" disabled={submitting || !title.trim() || !message.trim()} isLoading={submitting}>
                <Send className="w-4 h-4" />
                {targetType === 'ALL' ? 'Broadcast' : 'Send'}
            </Button>
        </div>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={submitting ? undefined : handleClose}
            title={confirmBroadcast ? 'Confirm Broadcast' : 'Send Notification'}
            size="lg"
            mobileSheet
            closeOnOverlayClick={!submitting}
            footer={footer}
        >
            {confirmBroadcast ? (
                <div className="space-y-4">
                    <div className="flex items-start gap-3 p-4 rounded-xl bg-warning-bg border border-warning-border">
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
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Send to</label>
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
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                {targetType === 'USER' ? 'User ID' : 'Role'}
                            </label>
                            {targetType === 'USER' ? (
                                <input
                                    type="text"
                                    value={userId}
                                    onChange={(e) => setUserId(e.target.value)}
                                    placeholder="Enter user ID"
                                    className={inputClasses}
                                />
                            ) : (
                                <IconSelect
                                    name="userId"
                                    value={userId}
                                    onChange={(e) => setUserId(e.target.value)}
                                    placeholder="Select role"
                                    options={[
                                        { value: 'admin', label: 'Admin', Icon: FiShield, iconClass: 'text-[var(--brand)]' },
                                        { value: 'user', label: 'User', Icon: FiUser, iconClass: 'text-[var(--text-secondary)]' },
                                    ]}
                                />
                            )}
                        </div>
                    )}

                    <div className="flex flex-col gap-1.5">
                        <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Title <span className="text-destructive">*</span>
                            <span className="text-xs text-muted-foreground ml-1">({title.length}/80)</span>
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value.slice(0, 80))}
                            required
                            maxLength={80}
                            placeholder="Notification title"
                            className={inputClasses}
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Message <span className="text-destructive">*</span>
                            <span className="text-xs text-muted-foreground ml-1">({message.length}/300)</span>
                        </label>
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value.slice(0, 300))}
                            required
                            maxLength={300}
                            rows={3}
                            placeholder="Notification message"
                            className={`${inputClasses} resize-none`}
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Type</label>
                            <IconSelect
                                name="type"
                                value={type}
                                onChange={(e) => setType(e.target.value)}
                                options={TYPES.map(t => ({ value: t, label: t, Icon: HiOutlineBell, iconClass: 'text-[var(--brand)]' }))}
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Priority</label>
                            <IconSelect
                                name="priority"
                                value={priority}
                                onChange={(e) => setPriority(e.target.value)}
                                options={PRIORITIES.map(p => ({
                                    value: p,
                                    label: p,
                                    Icon: HiOutlineFlag,
                                    iconClass: p === 'CRITICAL' ? 'text-[var(--danger)]' : p === 'HIGH' ? 'text-[var(--warning)]' : 'text-[var(--text-secondary)]',
                                }))}
                            />
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
                                className={inputClasses}
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
                        <div className="p-3 rounded-xl bg-muted border border-border">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Preview</p>
                            <div className="flex items-start gap-3 p-3 rounded-lg bg-card border border-border">
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
                </form>
            )}
        </Modal>
    );
};

export default SendNotificationModal;
