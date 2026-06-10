import { useEffect } from 'react';
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

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/');
  };

  const linkClass = ({ isActive }) =>
    cn(
      'group flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors duration-150',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
      isActive
        ? 'bg-primary/10 text-primary'
        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
    );

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/50 transition-opacity lg:hidden',
          isOpen ? 'opacity-100 ease-out duration-300' : 'opacity-0 ease-in duration-200 pointer-events-none',
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border text-foreground',
          'transition-all duration-300 transform lg:translate-x-0 lg:static lg:inset-auto lg:flex lg:flex-col',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        )}
        aria-label="Main navigation"
      >
          <div className="flex h-16 shrink-0 items-center justify-between px-6 bg-muted/30 border-b border-border">
            <div className="flex items-center gap-2.5">
              <img
                src="/assets/icons/unitedmess-icon-1024.png"
                alt="UnitedMess"
                className="w-8 h-8 object-contain shrink-0"
              />
              <span className="font-bold text-base tracking-tight text-foreground">
                United<span className="text-gradient">Mess</span>
              </span>
            </div>
          <button
            type="button"
            className="lg:hidden flex items-center justify-center w-9 h-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={onClose}
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-1" aria-label="Sidebar">
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              className={linkClass}
              aria-label={item.name}
            >
              <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
              {item.name}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-border px-4 py-4 space-y-1">
          {user?.role === 'admin' && (
            <NavLink to="/settings" className={linkClass} aria-label="System Settings">
              <Settings className="h-5 w-5 shrink-0" aria-hidden="true" />
              System Settings
            </NavLink>
          )}
          <NavLink to="/profile" className={linkClass} aria-label="Profile">
            <UserCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
            Profile
          </NavLink>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg text-danger hover:bg-danger-bg transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Logout"
          >
            <LogOut className="h-5 w-5 shrink-0" aria-hidden="true" />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
