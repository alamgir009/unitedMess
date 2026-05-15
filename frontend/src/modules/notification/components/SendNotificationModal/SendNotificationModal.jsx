import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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

    // Fetch estimated recipients count for ALL broadcasts
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

    if (!isOpen || user?.role !== 'admin') return null;

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
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
                            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                                {confirmBroadcast ? 'Confirm Broadcast' : 'Send Notification'}
                            </h2>
                            <button
                                onClick={() => { reset(); onClose(); }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {confirmBroadcast ? (
                            /* Confirmation step for ALL broadcast */
                            <div className="p-6 space-y-4">
                                <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-xl">
                                    <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                                            Broadcast to all {estimatedRecipients} active users
                                        </p>
                                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                                            This will send a notification to every active user in the system. This action is logged for audit purposes.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 pt-2">
                                    <button
                                        onClick={() => setConfirmBroadcast(false)}
                                        className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={handleSubmit}
                                        disabled={submitting}
                                        className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium bg-amber-500 hover:bg-amber-600 text-white disabled:opacity-50 transition-all"
                                    >
                                        {submitting ? 'Sending...' : `Send to ${estimatedRecipients} users`}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            /* Form */
                            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                                {/* Target Type */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
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
                                                        ? 'bg-blue-500 text-white'
                                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                                                }`}
                                            >
                                                {t.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* User/Role ID */}
                                {(targetType === 'USER' || targetType === 'ROLE') && (
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                                            {targetType === 'USER' ? 'User ID' : 'Role'}
                                        </label>
                                        {targetType === 'USER' ? (
                                            <input
                                                type="text"
                                                value={userId}
                                                onChange={(e) => setUserId(e.target.value)}
                                                placeholder="Enter user ID"
                                                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                            />
                                        ) : (
                                            <select
                                                value={userId}
                                                onChange={(e) => setUserId(e.target.value)}
                                                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                            >
                                                <option value="">Select role</option>
                                                <option value="admin">Admin</option>
                                                <option value="user">User</option>
                                            </select>
                                        )}
                                    </div>
                                )}

                                {/* Title */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                                        Title <span className="text-red-500">*</span>
                                        <span className="text-xs text-slate-400 ml-1">({title.length}/80)</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value.slice(0, 80))}
                                        required
                                        maxLength={80}
                                        placeholder="Notification title"
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                    />
                                </div>

                                {/* Message */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                                        Message <span className="text-red-500">*</span>
                                        <span className="text-xs text-slate-400 ml-1">({message.length}/300)</span>
                                    </label>
                                    <textarea
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value.slice(0, 300))}
                                        required
                                        maxLength={300}
                                        rows={3}
                                        placeholder="Notification message"
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all resize-none"
                                    />
                                </div>

                                {/* Type & Priority */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Type</label>
                                        <select
                                            value={type}
                                            onChange={(e) => setType(e.target.value)}
                                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                        >
                                            {TYPES.map((t) => (
                                                <option key={t} value={t}>{t}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Priority</label>
                                        <select
                                            value={priority}
                                            onChange={(e) => setPriority(e.target.value)}
                                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                        >
                                            {PRIORITIES.map((p) => (
                                                <option key={p} value={p}>{p}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Action Required + URL */}
                                <div className="space-y-3">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={actionRequired}
                                            onChange={(e) => setActionRequired(e.target.checked)}
                                            className="rounded border-slate-300 dark:border-slate-600 text-blue-500 focus:ring-blue-500"
                                        />
                                        <span className="text-sm text-slate-700 dark:text-slate-300">Requires action</span>
                                    </label>

                                    {actionRequired && (
                                        <input
                                            type="url"
                                            value={actionUrl}
                                            onChange={(e) => setActionUrl(e.target.value)}
                                            placeholder="Action URL (optional)"
                                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                        />
                                    )}
                                </div>

                                {/* Preview Toggle */}
                                <button
                                    type="button"
                                    onClick={() => setShowPreview(!showPreview)}
                                    className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-all"
                                >
                                    {showPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                    {showPreview ? 'Hide preview' : 'Show preview'}
                                </button>

                                {showPreview && (
                                    <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">Preview</p>
                                        <div className="flex items-start gap-3 p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
                                            <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                                                priority === 'CRITICAL' ? 'bg-red-100 text-red-600' :
                                                priority === 'HIGH' ? 'bg-amber-100 text-amber-600' :
                                                'bg-slate-100 text-slate-600'
                                            }`}>
                                                {type.charAt(0)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{previewNotification.title}</p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{previewNotification.message}</p>
                                                {actionRequired && (
                                                    <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
                                                        Action needed
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Submit */}
                                <div className="flex items-center gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => { reset(); onClose(); }}
                                        className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submitting || !title.trim() || !message.trim()}
                                        className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-1.5"
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
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default SendNotificationModal;
