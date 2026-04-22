import { Fragment } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { Bell, Menu as MenuIcon, User } from 'lucide-react';
import { cn } from '@/core/utils/helpers/string.helper';
import { useSelector, useDispatch } from 'react-redux';
import { logout, toggleAdminHistory } from '@/modules/auth/store/auth.slice';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTheme } from '@/app/providers/ThemeProvider';

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
        <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8 transition-colors duration-300">
            <button
                type="button"
                className="-m-2.5 p-2.5 text-gray-700 dark:text-gray-200 lg:hidden"
                onClick={onMenuClick}
            >
                <span className="sr-only">Open sidebar</span>
                <MenuIcon className="h-6 w-6" aria-hidden="true" />
            </button>

            <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
                <form className="relative flex flex-1" action="#" method="GET">
                    {/* Search placeholder if needed */}
                </form>
                <div className="flex items-center gap-x-4 lg:gap-x-6">
                    {/* Admin History Toggle */}
                    {user?.role === 'admin' && (
                        <div className="flex items-center gap-2 mr-2">
                            <span className="hidden sm:inline text-sm text-gray-600 dark:text-gray-300 font-medium">All History</span>
                            <button
                                onClick={() => dispatch(toggleAdminHistory())}
                                className={cn(
                                    "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900",
                                    adminShowHistory ? "bg-blue-600" : "bg-gray-200 dark:bg-slate-700"
                                )}
                            >
                                <span className="sr-only">Toggle historical data</span>
                                <span
                                    className={cn(
                                        "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                                        adminShowHistory ? "translate-x-5" : "translate-x-0"
                                    )}
                                />
                            </button>
                        </div>
                    )}

                    {/* Theme Toggle */}
                    <button
                        onClick={toggleTheme}
                        aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
                        className="p-2 rounded-xl text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
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

                    {/* Notifications */}
                    <button type="button" className="-m-2.5 p-2.5 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition-all">
                        <span className="sr-only">View notifications</span>
                        <Bell className="h-5 w-5" aria-hidden="true" />
                    </button>

                    {/* Separator */}
                    <div className="hidden lg:block lg:h-6 lg:w-px lg:bg-gray-200 dark:lg:bg-slate-800" aria-hidden="true" />

                    {/* Profile dropdown */}
                    <Menu as="div" className="relative">
                        <Menu.Button className="-m-1.5 flex items-center p-1.5 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 transition-all">
                            <span className="sr-only">Open user menu</span>

                            <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-semibold ring-1 ring-white dark:ring-slate-800 overflow-hidden">
                                {user?.image ? (
                                    <img
                                        src={user.image}
                                        alt={user?.name || "User"}
                                        className="w-full h-full object-cover"
                                    />
                                ) : user?.name ? (
                                    user.name.charAt(0).toUpperCase()
                                ) : (
                                    <User className="h-5 w-5" />
                                )}
                            </div>

                            <span className="hidden lg:flex lg:items-center">
                                <span
                                    className="ml-4 text-sm font-semibold leading-6 text-gray-900 dark:text-gray-100"
                                    aria-hidden="true"
                                >
                                    {user?.name || "User"}
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
                            <Menu.Items className="absolute right-0 z-10 mt-2.5 w-32 origin-top-right rounded-xl bg-white dark:bg-slate-900 py-2 shadow-lg ring-1 ring-gray-900/5 dark:ring-white/10 focus:outline-none">
                                <Menu.Item>
                                    {({ active }) => (
                                        <Link
                                            to="/profile"
                                            className={cn(
                                                active ? 'bg-gray-50 dark:bg-slate-800' : '',
                                                'block px-3 py-1.5 text-sm leading-6 text-gray-900 dark:text-gray-200 transition-colors'
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
                                                e.preventDefault(); // stop immediate navigation
                                                await dispatch(logout()); // perform logout
                                                window.location.href = "/"; // redirect to home
                                            }}
                                            className={cn(
                                                active ? 'bg-gray-50 dark:bg-slate-800' : '',
                                                'block px-3 py-1.5 text-sm leading-6 text-red-600 dark:text-red-400 transition-colors'
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
