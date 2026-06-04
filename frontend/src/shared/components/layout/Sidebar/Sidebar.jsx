import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingBag,
  CreditCard,
  Users,
  Bell,
  Settings,
  UserCircle,
  LogOut,
  X,
} from 'lucide-react';
import { IoFastFoodOutline } from 'react-icons/io5';
import { cn } from '@/core/utils/helpers/string.helper';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '@/modules/auth/store/auth.slice';

const Sidebar = ({ isOpen, onClose }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Meals', href: '/meals', icon: IoFastFoodOutline },
    { name: 'Markets', href: '/markets', icon: ShoppingBag },
    { name: 'Payments', href: '/payments', icon: CreditCard },
    { name: 'Members', href: '/members', icon: Users },
    { name: 'Notifications', href: '/notifications', icon: Bell },
  ];

  const handleLogout = () => {
    dispatch(logout());
    navigate('/');
  };

  const linkClass = ({ isActive }) =>
    cn(
      'group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors duration-150',
      isActive
        ? 'bg-primary/10 text-primary'
        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
    );

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/50 transition-opacity lg:hidden',
          isOpen ? 'opacity-100 ease-out duration-300' : 'opacity-0 ease-in duration-200 pointer-events-none',
        )}
        onClick={onClose}
      />

      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border text-foreground',
          'transition-all duration-300 transform lg:translate-x-0 lg:static lg:inset-auto lg:flex lg:flex-col',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Header */}
        <div className="flex h-16 shrink-0 items-center justify-between px-6 bg-muted/30 border-b border-border transition-colors">
          <div className="flex items-center gap-2">
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
            className="lg:hidden text-muted-foreground hover:text-foreground transition-colors"
            onClick={onClose}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
          {navigation.map((item) => (
            <NavLink key={item.name} to={item.href} className={linkClass}>
              <item.icon className="mr-3 h-5 w-5 flex-shrink-0" />
              {item.name}
            </NavLink>
          ))}
        </nav>

        {/* Footer actions */}
        <div className="border-t border-border p-4 space-y-1">
          {user?.role === 'admin' && (
            <NavLink to="/settings" className={linkClass}>
              <Settings className="mr-3 h-5 w-5 flex-shrink-0" />
              System Settings
            </NavLink>
          )}
          <NavLink to="/profile" className={linkClass}>
            <UserCircle className="mr-3 h-5 w-5 flex-shrink-0" />
            Profile
          </NavLink>
          <button
            onClick={handleLogout}
            className="w-full group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg text-danger hover:bg-danger-bg transition-colors duration-150"
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
