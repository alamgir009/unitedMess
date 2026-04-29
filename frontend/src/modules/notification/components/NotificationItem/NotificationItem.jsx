import { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
    Info, AlertCircle, CreditCard, UserCog, TrendingUp,
    ShieldCheck, Wallet, DollarSign, Clock, CheckCircle2, Sparkles,
} from 'lucide-react';
import { cn } from '@/core/utils/helpers/string.helper';

// ─── Icon registry ────────────────────────────────────────────────────────────
const ICON_MAP = {
    PAYMENT:    { Icon: CreditCard,  color: 'text-emerald-500', bg: 'bg-emerald-50    dark:bg-emerald-950/30' },
    TRANSFER:   { Icon: TrendingUp,  color: 'text-blue-500',    bg: 'bg-blue-50       dark:bg-blue-950/30'    },
    DEPOSIT:    { Icon: Wallet,      color: 'text-green-500',   bg: 'bg-green-50      dark:bg-green-950/30'   },
    WITHDRAWAL: { Icon: DollarSign,  color: 'text-amber-500',   bg: 'bg-amber-50      dark:bg-amber-950/30'   },
    ACCOUNT:    { Icon: UserCog,     color: 'text-indigo-500',  bg: 'bg-indigo-50     dark:bg-indigo-950/30'  },
    SECURITY:   { Icon: ShieldCheck, color: 'text-purple-500',  bg: 'bg-purple-50     dark:bg-purple-950/30'  },
    BILLING:    { Icon: AlertCircle, color: 'text-amber-500',   bg: 'bg-amber-50      dark:bg-amber-950/30'   },
    SYSTEM:     { Icon: Info,        color: 'text-slate-500',   bg: 'bg-slate-50      dark:bg-slate-800/50'   },
    INVESTMENT: { Icon: TrendingUp,  color: 'text-teal-500',    bg: 'bg-teal-50       dark:bg-teal-950/30'    },
    REWARD:     { Icon: Sparkles,    color: 'text-amber-500',   bg: 'bg-amber-50      dark:bg-amber-950/30'   },
};
const FALLBACK_ICON = { Icon: Info, color: 'text-slate-400', bg: 'bg-slate-50 dark:bg-slate-800/50' };

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatRelativeTime = (date) => {
    const diffSec = Math.floor((Date.now() - new Date(date)) / 1000);
    if (diffSec < 60)     return 'just now';
    if (diffSec < 3600)   return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400)  return `${Math.floor(diffSec / 3600)}h ago`;
    if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;
    return new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

// ─── Sub-components ───────────────────────────────────────────────────────────
const NotificationIcon = ({ type }) => {
    const { Icon, color, bg } = ICON_MAP[type] ?? FALLBACK_ICON;
    return (
        <div className={cn('shrink-0 rounded-xl p-2 shadow-sm transition-all group-hover:shadow-md', bg)}>
            <Icon className={cn('w-4.5 h-4.5', color)} aria-hidden />
        </div>
    );
};

const UnreadPulse = () => (
    <span className="relative shrink-0 flex h-2 w-2 mt-1" aria-hidden>
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
    </span>
);

// ─── Main component ───────────────────────────────────────────────────────────
const NotificationItem = memo(({ notification, onSelect }) => {
    const { isRead, priority, type, title, message, createdAt, actionRequired, metadata, _id, id } = notification;

    const isUnread = !isRead;
    const isUrgent = priority === 'HIGH' || type === 'SECURITY';
    const notifId  = _id ?? id;

    const relativeTime = useMemo(() => formatRelativeTime(createdAt), [createdAt]);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{   opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            role="listitem"
            aria-label={`${isUnread ? 'Unread: ' : ''}${title}`}
            onClick={() => onSelect?.(notification)}
            className={cn(
                'group relative flex items-start gap-4 px-5 py-4',
                'cursor-pointer transition-all duration-200',
                'hover:bg-slate-50 dark:hover:bg-slate-800/40',
                isUnread && !isUrgent && 'bg-blue-50/30 dark:bg-blue-900/10',
                isUrgent && isUnread  && 'bg-red-50/30 dark:bg-red-950/20 border-l-[3px] border-red-500',
                !isUnread             && 'opacity-70 hover:opacity-100',
            )}
        >
            <NotificationIcon type={type} />

            <div className="flex-1 min-w-0 space-y-1">
                {/* Title row */}
                <div className="flex items-start justify-between gap-2">
                    <p className={cn(
                        'text-sm leading-snug transition-colors',
                        isUnread
                            ? 'font-semibold text-slate-900 dark:text-slate-100'
                            : 'font-medium text-slate-500 dark:text-slate-400',
                        isUrgent && 'text-red-700 dark:text-red-400',
                    )}>
                        {title}
                    </p>
                    {isUnread && <UnreadPulse />}
                </div>

                {/* Message */}
                <p className={cn(
                    "text-[13px] leading-relaxed line-clamp-2",
                    isUnread ? "text-slate-600 dark:text-slate-300" : "text-slate-500 dark:text-slate-400"
                )}>
                    {message}
                </p>

                {/* Meta row */}
                <div className="flex items-center gap-2 pt-0.5 flex-wrap">
                    <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" aria-hidden />
                        {relativeTime}
                    </span>

                    {actionRequired && (
                        <span className="
                            text-[10px] px-1.5 py-0.5 rounded-full font-medium
                            bg-amber-100 text-amber-700
                            dark:bg-amber-900/40 dark:text-amber-400
                        ">
                            Action needed
                        </span>
                    )}

                    {type === 'PAYMENT' && metadata?.amount && (
                        <span className="text-[10px] font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                            {metadata.amount}
                        </span>
                    )}
                </div>
            </div>

            {/* Hover check — mark read affordance */}
            <motion.div
                initial={{ opacity: 0 }}
                whileHover={{ opacity: 1 }}
                className="
                    absolute right-3 top-1/2 -translate-y-1/2
                    w-6 h-6 rounded-full
                    bg-slate-100 dark:bg-slate-700
                    border border-slate-200 dark:border-slate-600
                    flex items-center justify-center
                    opacity-0 group-hover:opacity-100
                    transition-opacity duration-150
                "
                aria-hidden
            >
                <CheckCircle2 className="w-3.5 h-3.5 text-slate-400 dark:text-slate-400" />
            </motion.div>
        </motion.div>
    );
});

NotificationItem.displayName = 'NotificationItem';
export default NotificationItem;