import { NavLink, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    Utensils,
    ShoppingBag,
    CreditCard,
    Users,
    MessageSquare,
    Bell,
    Settings,
    UserCircle,
    LogOut,
    X
} from 'lucide-react';
import { cn } from '@/core/utils/helpers/string.helper';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '@/modules/auth/store/auth.slice';

const Sidebar = ({ isOpen, onClose }) => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { user } = useSelector((state) => state.auth);

    const navigation = [
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { name: 'Meals', href: '/meals', icon: Utensils },
        { name: 'Markets', href: '/markets', icon: ShoppingBag },
        { name: 'Payments', href: '/payments', icon: CreditCard },
        { name: 'Members', href: '/members', icon: Users },
        { name: 'Messages', href: '/messages', icon: MessageSquare },
        { name: 'Notifications', href: '/notifications', icon: Bell },
    ];

    const handleLogout = () => {
        dispatch(logout());
        navigate('/');
    };

    return (
        <>
            {/* Mobile overlay */}
            <div
                className={cn(
                    "fixed inset-0 z-40 bg-gray-600 bg-opacity-75 transition-opacity lg:hidden",
                    isOpen ? "opacity-100 ease-out duration-300" : "opacity-0 ease-in duration-200 pointer-events-none"
                )}
                onClick={onClose}
            />

            <div className={cn(
                "fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800 text-gray-900 dark:text-white transition-all duration-300 transform lg:translate-x-0 lg:static lg:inset-auto lg:flex lg:flex-col",
                isOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                {/* Header */}
                <div className="flex h-16 shrink-0 items-center justify-between px-6 bg-gray-50 dark:bg-slate-950 transition-colors duration-300">
                    <div className="flex items-center">
                         {/* Logo image */}
                        <div className="relative shrink-0">
                            <img
                                src="/assets/icons/unitedmess-icon-1024.png"
                                alt="UnitedMess Logo"
                                className="w-10 h-10 object-contain"
                                
                            />
                        </div>
                        <span className="font-bold text-base tracking-tight text-foreground leading-none">
                            United<span className="text-gradient">Mess</span>
                        </span>
                    </div>
                    <button
                        type="button"
                        className="lg:hidden text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
                        onClick={onClose}
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
                    {navigation.map((item) => (
                        <NavLink
                            key={item.name}
                            to={item.href}
                            className={({ isActive }) => cn(
                                "group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors",
                                isActive
                                    ? "bg-blue-50 dark:bg-blue-600/10 text-blue-600 dark:text-blue-400"
                                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white"
                            )}
                        >
                            <item.icon className="mr-3 h-5 w-5 flex-shrink-0" />
                            {item.name}
                        </NavLink>
                    ))}
                </nav>

                {/* Footer actions */}
                <div className="border-t border-gray-200 dark:border-slate-800 p-4 space-y-1 transition-colors duration-300">
                    {user?.role === 'admin' && (
                        <NavLink
                            to="/settings"
                            className={({ isActive }) => cn(
                                "group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors",
                                isActive
                                    ? "bg-blue-50 dark:bg-blue-600/10 text-blue-600 dark:text-blue-400"
                                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white"
                            )}
                        >
                            <Settings className="mr-3 h-5 w-5 flex-shrink-0" />
                            System Settings
                        </NavLink>
                    )}
                    <NavLink
                        to="/profile"
                        className={({ isActive }) => cn(
                            "group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors",
                            isActive
                                ? "bg-blue-50 dark:bg-blue-600/10 text-blue-600 dark:text-blue-400"
                                : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white"
                        )}
                    >
                        <UserCircle className="mr-3 h-5 w-5 flex-shrink-0" />
                        Profile
                    </NavLink>
                    <button
                        onClick={handleLogout}
                        className="w-full group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-400/10 transition-colors"
                    >
                        <LogOut className="mr-3 h-5 w-5 flex-shrink-0" />
                        Logout
                    </button>
                </div>
            </div>
        </>
    );
};

export default Sidebar;
