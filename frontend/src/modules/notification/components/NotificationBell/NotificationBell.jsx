import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchNotifications } from '../../store/notification.slice';
import NotificationList from '../NotificationList/NotificationList';
import useSocket from '../../hooks/useSocket';

// ─── Animation variants ──────────────────────────────────────────────────────
const PANEL_VARIANTS = {
    hidden:  { opacity: 0, scale: 0.96, y: -8 },
    visible: { opacity: 1, scale: 1,    y: 0,
        transition: { type: 'spring', stiffness: 380, damping: 28, mass: 0.8 } },
    exit:    { opacity: 0, scale: 0.96, y: -8,
        transition: { duration: 0.15, ease: 'easeIn' } },
};

const BELL_SHAKE = {
    animate: { rotate: [0, -14, 14, -10, 10, -6, 6, 0],
        transition: { duration: 0.55, ease: 'easeInOut' } },
    initial: { rotate: 0 },
};

// ─── Component ───────────────────────────────────────────────────────────────
const NotificationBell = () => {
    const dispatch = useDispatch();
    const { unreadCount, lastRealtimeUpdate } = useSelector(s => s.notification);

    const [open, setOpen]           = useState(false);
    const [isShaking, setIsShaking] = useState(false);
    const prevCount                 = useRef(unreadCount);
    const panelRef                  = useRef(null);

    useSocket();

    // Initial load
    useEffect(() => {
        dispatch(fetchNotifications({ page: 1, limit: 20 }));
    }, [dispatch]);

    // Bell shake on new notification
    useEffect(() => {
        if (lastRealtimeUpdate && unreadCount > prevCount.current) {
            setIsShaking(true);
            const id = setTimeout(() => setIsShaking(false), 600);
            return () => clearTimeout(id);
        }
        prevCount.current = unreadCount;
    }, [unreadCount, lastRealtimeUpdate]);

    // Close on outside click
    useEffect(() => {
        if (!open) return;
        const handler = (e) => {
            if (panelRef.current && !panelRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    // Close on Escape
    useEffect(() => {
        const handler = (e) => { if (e.key === 'Escape') setOpen(false); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, []);

    const badgeLabel = unreadCount > 99 ? '99+' : unreadCount;

    return (
        <div ref={panelRef} className="relative inline-block">
            {/* ── Trigger ── */}
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

                {/* Count badge */}
                <AnimatePresence>
                    {unreadCount > 0 && (
                        <motion.span
                            key="badge"
                            initial={{ scale: 0.4, opacity: 0 }}
                            animate={{ scale: 1,   opacity: 1 }}
                            exit={{   scale: 0.4, opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 500, damping: 22 }}
                            className="
                                absolute -top-1 -right-1
                                flex items-center justify-center
                                min-w-[18px] h-[18px] px-1
                                rounded-full text-[9px] font-bold font-mono text-white
                                bg-gradient-to-br from-red-500 to-rose-600
                                ring-2 ring-white dark:ring-slate-900
                                shadow-md
                            "
                        >
                            {badgeLabel}
                        </motion.span>
                    )}
                </AnimatePresence>

                {/* Pulse ring on new notification */}
                <AnimatePresence>
                    {isShaking && (
                        <motion.span
                            key="ring"
                            initial={{ scale: 0.8, opacity: 0.6 }}
                            animate={{ scale: 1.8, opacity: 0   }}
                            exit={{}}
                            transition={{ duration: 0.6 }}
                            className="absolute inset-0 rounded-full bg-blue-400 dark:bg-blue-500 pointer-events-none"
                        />
                    )}
                </AnimatePresence>
            </motion.button>

            {/* ── Dropdown panel ── */}
            <AnimatePresence>
                {open && (
                    <motion.div
                        key="panel"
                        variants={PANEL_VARIANTS}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        role="dialog"
                        aria-label="Notifications panel"
                        className="
                            absolute right-0 mt-2 z-50 origin-top-right
                            w-[calc(100vw-2rem)] max-w-[calc(100vw-2rem)]
                            sm:w-96 md:w-[400px]
                            rounded-2xl overflow-hidden
                            bg-white/95 dark:bg-slate-900/95
                            border border-slate-200/60 dark:border-slate-800/60
                            shadow-2xl shadow-slate-900/20 dark:shadow-slate-950/60
                            backdrop-blur-xl
                        "
                    >
                        <NotificationList closeMenu={() => setOpen(false)} />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default NotificationBell;