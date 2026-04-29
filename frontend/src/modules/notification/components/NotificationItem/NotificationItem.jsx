import { Info, AlertCircle, CreditCard, UserCog } from 'lucide-react';
import { cn } from '@/core/utils/helpers/string.helper';

const getIcon = (type) => {
    switch (type) {
        case 'PAYMENT': return <CreditCard className="w-5 h-5 text-emerald-500" />;
        case 'ACCOUNT': return <UserCog className="w-5 h-5 text-blue-500" />;
        case 'BILLING': return <AlertCircle className="w-5 h-5 text-amber-500" />;
        case 'SYSTEM': return <Info className="w-5 h-5 text-indigo-500" />;
        default: return <Info className="w-5 h-5 text-gray-500" />;
    }
};

const NotificationItem = ({ notification, onRead }) => {
    return (
        <div 
            onClick={() => !notification.isRead && onRead(notification._id || notification.id)}
            className={cn(
                "flex items-start gap-3 p-3 transition-all duration-200 cursor-pointer rounded-xl",
                notification.isRead 
                    ? "bg-transparent hover:bg-gray-50 dark:hover:bg-slate-800" 
                    : "bg-blue-50/60 hover:bg-blue-100/60 dark:bg-slate-800/80 dark:hover:bg-slate-800"
            )}
        >
            <div className="mt-1 shrink-0 bg-white dark:bg-slate-900 p-2 rounded-full shadow-sm border border-gray-100 dark:border-slate-700">
                {getIcon(notification.type)}
            </div>
            <div className="flex-1 space-y-1">
                <p className={cn(
                    "text-sm",
                    notification.isRead ? "font-medium text-gray-700 dark:text-gray-300" : "font-semibold text-gray-900 dark:text-gray-100"
                )}>
                    {notification.title}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                    {notification.message}
                </p>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                    {new Date(notification.createdAt).toLocaleString()}
                </p>
            </div>
            {!notification.isRead && (
                <div className="shrink-0 mt-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500 block shadow-[0_0_8px_rgba(59,130,246,0.8)]"></span>
                </div>
            )}
        </div>
    );
};

export default NotificationItem;
