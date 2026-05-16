import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell } from 'lucide-react';
import { useSelector } from 'react-redux';
import useNotifications from '../../hooks/useNotifications';
import NotificationList from '../NotificationList/NotificationList';

const OVERLAY_VARIANTS = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.2 } },
    exit: { opacity: 0, transition: { duration: 0.15 } },
};

const MOBILE_PANEL_VARIANTS = {
    hidden: { y: '100%' },
    visible: { y: 0, transition: { type: 'spring', stiffness: 400, damping: 35 } },
    exit: { y: '100%', transition: { duration: 0.15, ease: 'easeIn' } },
};

const DESKTOP_PANEL_VARIANTS = {
    hidden: { opacity: 0, scale: 0.96, y: -8 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] } },
    exit: { opacity: 0, scale: 0.96, y: -8, transition: { duration: 0.12, ease: 'easeIn' } },
};

const BELL_SHAKE = {
    animate: { rotate: [0, -14, 14, -10, 10, -6, 6, 0], transition: { duration: 0.55, ease: 'easeInOut' } },
    initial: { rotate: 0 },
};

const NotificationBell = () => {
    const { unreadCount, lastRealtimeUpdate } = useSelector(s => s.notification);
    useNotifications({ autoFetch: false });

    const [open, setOpen] = useState(false);
    const [isShaking, setIsShaking] = useState(false);
    const prevCount = useRef(unreadCount);

    useEffect(() => {
        if (lastRealtimeUpdate && unreadCount > prevCount.current) {
            setIsShaking(true);
            const id = setTimeout(() => setIsShaking(false), 600);
            return () => clearTimeout(id);
        }
        prevCount.current = unreadCount;
    }, [unreadCount, lastRealtimeUpdate]);

    useEffect(() => {
        const handler = (e) => { if (e.key === 'Escape') setOpen(false); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, []);

    const badgeLabel = unreadCount > 99 ? '99+' : unreadCount;

    return (
        <div className="relative inline-block">
            <motion.button
                type="button"
                whileTap={{ scale: 0.93 }}
                onClick={() => setOpen(v => !v)}
                aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
                aria-haspopup="true"
                aria-expanded={open}
                className={`
                    relative flex items-center justify-center
                    w-11 h-11 rounded-xl
                    border transition-all duration-200
                    focus:outline-none focus-visible:ring-2
                    focus-visible:ring-blue-500/50 focus-visible:ring-offset-2
                    dark:focus-visible:ring-offset-slate-900
                    ${open
                        ? 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100'
                        : 'bg-transparent border-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-100/70 dark:hover:bg-slate-800/70 hover:border-slate-200 dark:hover:border-slate-700'
                    }
                `}
            >
                <motion.span
                    animate={isShaking ? BELL_SHAKE.animate : BELL_SHAKE.initial}
                >
                    <Bell className="w-5 h-5" aria-hidden />
                </motion.span>

                <AnimatePresence>
                    {unreadCount > 0 && (
                        <motion.span
                            key="badge"
                            initial={{ scale: 0.4, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.4, opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 500, damping: 22 }}
                            className="
                                absolute top-0 right-0 -translate-y-[2px] translate-x-[2px]
                                flex h-5 min-w-[20px] items-center justify-center px-1.5
                                rounded-full bg-gradient-to-br from-red-500 to-rose-600
                                text-[10px] font-bold leading-none text-white
                                ring-2 ring-white dark:ring-slate-900
                                shadow-sm
                            "
                        >
                            {badgeLabel}
                        </motion.span>
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {isShaking && (
                        <motion.span
                            key="ring"
                            initial={{ scale: 0.8, opacity: 0.6 }}
                            animate={{ scale: 1.8, opacity: 0 }}
                            exit={{}}
                            transition={{ duration: 0.6 }}
                            className="absolute inset-0 rounded-full bg-blue-400 dark:bg-blue-500 pointer-events-none"
                        />
                    )}
                </AnimatePresence>
            </motion.button>

            <AnimatePresence>
                {open && (
                    <>
                        <motion.div
                            key="overlay"
                            variants={OVERLAY_VARIANTS}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            onClick={() => setOpen(false)}
                            className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xl"
                        />

                        <motion.div
                            key="panel-mobile"
                            variants={MOBILE_PANEL_VARIANTS}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            role="dialog"
                            aria-label="Notifications panel"
                            className="fixed inset-x-0 bottom-0 top-[64px] z-50 md:hidden bg-white dark:bg-slate-900 overflow-hidden rounded-t-3xl shadow-[0_-8px_30px_rgba(0,0,0,0.12)]"
                        >
                            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                            <NotificationList closeMenu={() => setOpen(false)} />
                        </motion.div>

                        <motion.div
                            key="panel-desktop"
                            variants={DESKTOP_PANEL_VARIANTS}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            role="dialog"
                            aria-label="Notifications panel"
                            className="hidden md:block fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-xl max-h-[80vh] bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-[0_25px_60px_rgba(0,0,0,0.3)]"
                        >
                            <NotificationList closeMenu={() => setOpen(false)} />
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

export default NotificationBell;
