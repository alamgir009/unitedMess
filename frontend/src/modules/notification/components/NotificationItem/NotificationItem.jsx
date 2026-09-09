import { memo } from 'react';
import { Check, Clock, CreditCard, FileText, MessageSquare, AlertTriangle, Bell } from 'lucide-react';
import { cn } from '@/core/utils/helpers/string.helper';

/* ─── Icon Registry ──────────────────────────────────────────────────────── */
const ICON_REGISTRY = {
    payment: { icon: CreditCard, color: 'text-success', bg: 'bg-success-bg' },
    expense: { icon: CreditCard, color: 'text-danger', bg: 'bg-danger-bg' },
    schedule: { icon: Clock, color: 'text-primary', bg: 'bg-primary-bg' },
    expense_reminder: { icon: Clock, color: 'text-warning', bg: 'bg-warning-bg' },
    duty: { icon: FileText, color: 'text-accent', bg: 'bg-accent-bg' },
    chat: { icon: MessageSquare, color: 'text-muted-foreground', bg: 'bg-muted' },
    market_duty: { icon: FileText, color: 'text-primary', bg: 'bg-primary-bg' },
    fine: { icon: AlertTriangle, color: 'text-danger', bg: 'bg-danger-bg' },
    expense_recurring: { icon: CreditCard, color: 'text-warning', bg: 'bg-warning-bg' },
    default: { icon: Bell, color: 'text-muted-foreground', bg: 'bg-muted' },
};

const getIconConfig = (type) => ICON_REGISTRY[type] || ICON_REGISTRY.default;

/* ─── Helpers ────────────────────────────────────────────────────────────── */
const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMs / 3600000);

    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    if (diffHr < 48) return 'Yesterday';
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const formatPayment = (payment) => {
    if (typeof payment !== 'number' || payment <= 0) return null;
    return `₹${payment.toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;
};

/* ─── Component ──────────────────────────────────────────────────────────── */
const NotificationItem = ({ notification, onSelect, expanded = false }) => {
    const { icon: IconComp, color, bg } = getIconConfig(notification.type);

    const isRead = notification.isRead;
    const isUrgent = notification.priority === 'urgent';
    const paymentDisplay = formatPayment(notification.payment);

    const handleClick = () => onSelect?.(notification);

    return (
        <button
            type="button"
            role="listitem"
            onClick={handleClick}
            className={cn(
                'group flex items-start w-full text-left',
                'gap-2.5 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3',
                'rounded-none transition-all duration-150',
                'border-b border-border/50 last:border-0',
                'active:scale-[0.99]',
                isUrgent && 'bg-danger-bg sm:border-l-[3px] border-l-2 border-l-danger',
                !isUrgent && notification.isRead === false && 'bg-primary/[0.06]',
            )}
        >
            {/* ── Avatar ── */}
            <div className={cn(
                'shrink-0 rounded-lg p-1.5',
                'transition-colors duration-150',
                'bg-card',
                bg,
            )}>
                <IconComp className={cn('w-4 h-4', color)} aria-hidden />
            </div>

            {/* ── Content ── */}
            <div className="flex-1 min-w-0 space-y-1">
                <p className={cn(
                    'text-body font-medium',
                    'leading-snug',
                    !expanded && 'line-clamp-2',
                    'text-foreground',
                    isRead && 'text-secondary-foreground',
                )}>
                    {notification.message}
                </p>

                <div className="flex items-center gap-2 pt-0.5">
                    <span className="text-caption font-mono text-muted-foreground">
                        {formatTime(notification.createdAt)}
                    </span>

                    {paymentDisplay && (
                        <span className="text-caption font-mono font-medium text-muted-foreground">
                            · {paymentDisplay}
                        </span>
                    )}
                </div>

                {notification.actionNeeded && (
                    <span className={cn(
                        'inline-flex items-center px-2 py-0.5 mt-1',
                        'rounded-full text-caption font-medium',
                        'bg-primary/10 text-primary',
                        'border border-primary/20',
                    )}>
                        Action needed
                    </span>
                )}
            </div>

            {/* ── Mark Read Affordance ── */}
            {!isRead && (
                <div className={cn(
                    'shrink-0 self-center opacity-0 group-hover:opacity-100',
                    'transition-opacity duration-150',
                )} aria-hidden="true">
                    <Check className="w-4 h-4 text-primary" />
                </div>
            )}
        </button>
    );
};

export default memo(NotificationItem);
