import { Fragment, useEffect } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { Bell } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchNotifications } from '../../store/notification.slice';
import NotificationList from '../NotificationList/NotificationList';
import useSocket from '../../hooks/useSocket';

const NotificationBell = () => {
    const dispatch = useDispatch();
    const { unreadCount } = useSelector((state) => state.notification);

    // Initialize socket connection
    useSocket();

    useEffect(() => {
        dispatch(fetchNotifications({ page: 1, limit: 1 })); 
    }, [dispatch]);

    return (
        <Menu as="div" className="relative inline-block text-left z-50">
            {({ open, close }) => (
                <>
                    <Menu.Button className="relative p-2.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                        <span className="sr-only">View notifications</span>
                        <Bell className="h-5 w-5" aria-hidden="true" />
                        
                        {/* Notification Badge */}
                        {unreadCount > 0 && (
                            <span className="absolute top-1.5 right-1.5 h-4 min-w-[16px] px-1 rounded-full bg-red-500 flex items-center justify-center text-[10px] font-bold text-white shadow-sm ring-2 ring-white dark:ring-slate-900">
                                {unreadCount > 99 ? '99+' : unreadCount}
                            </span>
                        )}
                        
                        {/* Ping animation when there are unread notifications */}
                        {unreadCount > 0 && (
                            <span className="absolute top-2 right-2 h-3 w-3 rounded-full bg-red-400 opacity-60 animate-ping"></span>
                        )}
                    </Menu.Button>

                    <Transition
                        as={Fragment}
                        enter="transition ease-out duration-200"
                        enterFrom="opacity-0 translate-y-2 scale-95"
                        enterTo="opacity-100 translate-y-0 scale-100"
                        leave="transition ease-in duration-150"
                        leaveFrom="opacity-100 translate-y-0 scale-100"
                        leaveTo="opacity-0 translate-y-2 scale-95"
                    >
                        <Menu.Items className="absolute right-0 mt-2 origin-top-right rounded-2xl bg-white dark:bg-slate-900 shadow-2xl ring-1 ring-black/5 dark:ring-white/10 focus:outline-none overflow-hidden backdrop-blur-xl">
                            <NotificationList closeMenu={close} />
                        </Menu.Items>
                    </Transition>
                </>
            )}
        </Menu>
    );
};

export default NotificationBell;
