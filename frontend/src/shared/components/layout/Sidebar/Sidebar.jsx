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
  ReceiptIndianRupee,
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
      'group relative flex items-center gap-3 px-3 py-2.5 min-h-[44px] text-sm rounded-lg transition-all duration-150',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
      isActive
        ? 'bg-primary/10 text-primary font-semibold before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-6 before:w-[3px] before:rounded-r-full before:bg-primary'
        : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground font-medium',
    );

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-[45] bg-overlay transition-opacity lg:hidden', /* z-[45]: above Header z-40 on mobile */
          isOpen ? 'opacity-100 ease-out duration-[var(--duration-slow)]' : 'opacity-0 ease-in duration-[var(--duration-base)] pointer-events-none',
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        className={cn(
          'fixed inset-y-0 left-0 w-64 surface-raised border-r border-border text-foreground',
          'z-50 transition-all duration-[var(--duration-slow)] transform lg:translate-x-0 lg:static lg:inset-auto lg:flex lg:flex-col lg:z-auto lg:transition-none',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        )}
        aria-label="Main navigation"
      >
          <div className="flex h-16 shrink-0 items-center justify-between px-6 border-b border-border">
            <div className="flex items-center gap-1.5">
              <img
                src="/assets/icons/resize_logo.png"
                alt="UnitedMess"
                className="w-8 h-8 object-contain shrink-0"
              />
              <span className="font-bold text-base tracking-tight text-foreground">
                United<span className="text-gradient">Mess</span>
              </span>
            </div>
          <button
            type="button"
            className="lg:hidden flex items-center justify-center w-9 h-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring touch-target"
            onClick={onClose}
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-1 overscroll-contain" aria-label="Sidebar">
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              className={linkClass}
              aria-label={item.name}
            >
              <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
              <span className="truncate">{item.name}</span>
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-border px-4 py-4 space-y-1">
          {user?.role === 'admin' && (
            <>
              <NavLink to="/unresolved-bills" className={linkClass} aria-label="Unresolved Bills">
                <ReceiptIndianRupee className="h-5 w-5 shrink-0" aria-hidden="true" />
                <span className="truncate">Unresolved Bills</span>
              </NavLink>
              <NavLink to="/settings" className={linkClass} aria-label="System Settings">
                <Settings className="h-5 w-5 shrink-0" aria-hidden="true" />
                <span className="truncate">System Settings</span>
              </NavLink>
            </>
          )}
          <NavLink to="/profile" className={linkClass} aria-label="Profile">
            <UserCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
            <span className="truncate">Profile</span>
          </NavLink>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 min-h-[44px] text-sm font-medium rounded-lg text-danger hover:bg-danger-bg transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Logout"
          >
            <LogOut className="h-5 w-5 shrink-0" aria-hidden="true" />
            <span className="truncate">Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
};

Sidebar.displayName = 'Sidebar';
export default Sidebar;
