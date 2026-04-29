import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchNotifications, markAsRead, markAllAsRead } from '../../store/notification.slice';
import NotificationItem from '../NotificationItem/NotificationItem';
import { BellRing, CheckCircle2 } from 'lucide-react'; 

const NotificationList = ({ closeMenu }) => {
    const dispatch = useDispatch();
    const { items, loading, unreadCount } = useSelector((state) => state.notification);

    useEffect(() => {
        dispatch(fetchNotifications({ page: 1, limit: 15 }));
    }, [dispatch]);

    const handleMarkAsRead = (id) => {
        dispatch(markAsRead(id));
    };

    const handleMarkAllAsRead = (e) => {
        e.preventDefault();
        e.stopPropagation();
        dispatch(markAllAsRead());
    };

    return (
        <div className="w-80 md:w-96 flex flex-col max-h-[85vh] bg-white dark:bg-slate-900 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50">
                <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-base">Notifications</h3>
                    {unreadCount > 0 && (
                        <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400 py-0.5 px-2 rounded-full text-xs font-semibold shadow-sm">
                            {unreadCount} new
                        </span>
                    )}
                </div>
                {unreadCount > 0 && (
                    <button 
                        onClick={handleMarkAllAsRead}
                        className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium transition-colors flex items-center gap-1"
                    >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Mark all read
                    </button>
                )}
            </div>
            
            <div className="overflow-y-auto flex-1 p-3 space-y-2" style={{ maxHeight: '60vh' }}>
                {loading && items.length === 0 ? (
                    <div className="p-8 text-center text-sm text-gray-500 animate-pulse">Loading notifications...</div>
                ) : items.length === 0 ? (
                    <div className="p-10 text-center flex flex-col items-center gap-3">
                        <div className="w-14 h-14 rounded-full bg-gray-50 dark:bg-slate-800 flex items-center justify-center border border-gray-100 dark:border-slate-700">
                            <BellRing className="w-6 h-6 text-gray-400" />
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">All caught up!</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">No new notifications to show.</p>
                        </div>
                    </div>
                ) : (
                    items.map((notification) => (
                        <NotificationItem 
                            key={notification._id || notification.id} 
                            notification={notification} 
                            onRead={handleMarkAsRead} 
                        />
                    ))
                )}
            </div>
            
            {items.length > 0 && (
                <div className="p-3 border-t border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50 text-center">
                    <button 
                        onClick={closeMenu}
                        className="text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                    >
                        Close
                    </button>
                </div>
            )}
        </div>
    );
};

export default NotificationList;
