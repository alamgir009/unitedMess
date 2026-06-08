import { Fragment } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { Bell, Menu as MenuIcon, User } from 'lucide-react';
import { cn } from '@/core/utils/helpers/string.helper';
import { useSelector, useDispatch } from 'react-redux';
import { logout, toggleAdminHistory } from '@/modules/auth/store/auth.slice';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTheme } from '@/app/providers/ThemeProvider';
import NotificationBell from '@/modules/notification/components/NotificationBell/NotificationBell';

const SunIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
  </svg>
);

const MoonIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
  </svg>
);

const Header = ({ onMenuClick }) => {
  const { user, adminShowHistory } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const { theme, toggleTheme, isDark } = useTheme();

  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-border bg-card px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8 transition-colors duration-200">
      <button
        type="button"
        className="-m-2.5 p-2.5 text-muted-foreground hover:text-foreground lg:hidden touch-target"
        onClick={onMenuClick}
      >
        <span className="sr-only">Open sidebar</span>
        <MenuIcon className="h-6 w-6" aria-hidden="true" />
      </button>

      <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
        <div className="flex flex-1" />
        <div className="flex items-center gap-x-4 lg:gap-x-6">
          {user?.role === 'admin' && (
            <div className="flex items-center gap-2 mr-2">
              <span className="hidden sm:inline text-sm text-muted-foreground font-medium">All History</span>
              <button
                onClick={() => dispatch(toggleAdminHistory())}
                className={cn(
                  'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                  adminShowHistory ? 'bg-primary' : 'bg-muted-foreground/30',
                )}
                role="switch"
                aria-checked={adminShowHistory}
                aria-label="Toggle historical data"
              >
                <span
                  className={cn(
                    'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                    adminShowHistory ? 'translate-x-5' : 'translate-x-0',
                  )}
                />
              </button>
            </div>
          )}

          <button
            onClick={toggleTheme}
            aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
            className="touch-target p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <motion.span
              key={theme}
              initial={{ rotate: -20, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              transition={{ duration: 0.2 }}
              className="block"
            >
              {isDark ? <SunIcon /> : <MoonIcon />}
            </motion.span>
          </button>

          <NotificationBell />

          <div className="hidden lg:block lg:h-6 lg:w-px lg:bg-border" aria-hidden="true" />

          <Menu as="div" className="relative">
            <Menu.Button className="-m-1.5 flex items-center p-1.5 rounded-lg hover:bg-muted transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <span className="sr-only">Open user menu</span>

              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold ring-1 ring-border overflow-hidden">
                {user?.image ? (
                  <img
                    src={user.image}
                    alt={user?.name || 'User'}
                    className="w-full h-full object-cover"
                  />
                ) : user?.name ? (
                  user.name.charAt(0).toUpperCase()
                ) : (
                  <User className="h-5 w-5" />
                )}
              </div>

              <span className="hidden lg:flex lg:items-center">
                <span className="ml-4 text-sm font-semibold leading-6 text-foreground" aria-hidden="true">
                  {user?.name || 'User'}
                </span>
              </span>
            </Menu.Button>
            <Transition
              as={Fragment}
              enter="transition ease-out duration-100"
              enterFrom="transform opacity-0 scale-95"
              enterTo="transform opacity-100 scale-100"
              leave="transition ease-in duration-75"
              leaveFrom="transform opacity-100 scale-100"
              leaveTo="transform opacity-0 scale-95"
            >
              <Menu.Items className="absolute right-0 z-dropdown mt-2.5 w-32 origin-top-right rounded-lg bg-card border border-border py-2 shadow-lg focus:outline-none">
                <Menu.Item>
                  {({ active }) => (
                    <Link
                      to="/profile"
                      className={cn(
                        active ? 'bg-muted' : '',
                        'block px-3 py-1.5 text-sm leading-6 text-foreground transition-colors focus-visible:outline-none',
                      )}
                    >
                      Your Profile
                    </Link>
                  )}
                </Menu.Item>
                <Menu.Item>
                  {({ active }) => (
                    <Link
                      to="/"
                      onClick={async (e) => {
                        e.preventDefault();
                        await dispatch(logout());
                        window.location.href = '/';
                      }}
                      className={cn(
                        active ? 'bg-danger-bg' : '',
                        'block px-3 py-1.5 text-sm leading-6 text-danger transition-colors focus-visible:outline-none',
                      )}
                    >
                      Sign out
                    </Link>
                  )}
                </Menu.Item>
              </Menu.Items>
            </Transition>
          </Menu>
        </div>
      </div>
    </header>
  );
};

export default Header;
