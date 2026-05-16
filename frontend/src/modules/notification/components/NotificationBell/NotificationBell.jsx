import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Bell, Wifi, WifiOff } from 'lucide-react';
import { useSelector } from 'react-redux';
import useNotifications from '../../hooks/useNotifications';
import NotificationList from '../NotificationList/NotificationList';
import useSocket, { STATUS } from '../../hooks/useSocket';

const PANEL_VARIANTS = {
    hidden:  { opacity: 0, scale: 0.96, y: -8 },
    visible: { opacity: 1, scale: 1,    y: 0, transition: { duration: 0.18, ease: [0.16, 1, 0.3, 1] } },
    exit:    { opacity: 0, scale: 0.96, y: -8, transition: { duration: 0.12, ease: 'easeIn' } },
};

const ConnectionDot = ({ status }) => {
    const dotClass = status === STATUS.CONNECTED
        ? 'bg-green-500'
        : status === STATUS.CONNECTING
        ? 'bg-amber-400 animate-pulse'
        : 'bg-red-500';

    return (
        <div className="absolute -bottom-0.5 -right-0.5 flex items-center justify-center" title={
            status === STATUS.CONNECTED ? 'Connected' :
            status === STATUS.CONNECTING ? 'Connecting...' :
            'Disconnected'
        }>
            <span className={`w-2.5 h-2.5 rounded-full ring-2 ring-white dark:ring-slate-900 ${dotClass}`} />
        </div>
    );
};

const NotificationBell = () => {
    const prefersReducedMotion = useReducedMotion();
    const { unreadCount, lastRealtimeUpdate } = useSelector(s => s.notification);
    useNotifications({ autoFetch: false });

    const [open, setOpen]           = useState(false);
    const [isShaking, setIsShaking] = useState(false);
    const prevCount                 = useRef(unreadCount);
    const panelRef                  = useRef(null);
    const isOpening                 = useRef(false);

    const { status } = useSocket();

    useEffect(() => {
        if (isOpening.current || !lastRealtimeUpdate || unreadCount <= prevCount.current) {
            prevCount.current = unreadCount;
            return;
        }
        setIsShaking(true);
        isOpening.current = true;
        const id = setTimeout(() => { setIsShaking(false); isOpening.current = false; }, 600);
        prevCount.current = unreadCount;
        return () => clearTimeout(id);
    }, [unreadCount, lastRealtimeUpdate]);

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

    useEffect(() => {
        const handler = (e) => { if (e.key === 'Escape') setOpen(false); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, []);

    const badgeLabel = unreadCount > 99 ? '99+' : unreadCount;

    return (
        <div ref={panelRef} className="relative inline-block">
            <motion.button
                type="button"
                whileTap={prefersReducedMotion ? {} : { scale: 0.93 }}
                onClick={() => setOpen(v => !v)}
                aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
                aria-haspopup="true"
                aria-expanded={open}
                className="relative flex items-center justify-center w-11 h-11 rounded-xl border transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 bg-transparent border-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-100/70 dark:hover:bg-slate-800/70 hover:border-slate-200 dark:hover:border-slate-700"
            >
                <motion.span
                    animate={!prefersReducedMotion && isShaking ? { rotate: [0, -14, 14, -10, 10, -6, 6, 0], transition: { duration: 0.55, ease: 'easeInOut' } } : { rotate: 0 }}
                    className="relative"
                >
                    <Bell className="w-5 h-5" aria-hidden />
                    <ConnectionDot status={status} />
                </motion.span>

                <AnimatePresence>
                    {unreadCount > 0 && (
                        <motion.span
                            key="badge"
                            initial={{ scale: 0.4, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.4, opacity: 0 }}
                            transition={{ duration: 0.2, ease: 'easeOut' }}
                            className="absolute top-0 right-0 -translate-y-[2px] translate-x-[2px] flex h-5 min-w-[20px] items-center justify-center px-1.5 rounded-full bg-gradient-to-br from-red-500 to-rose-600 text-[10px] font-bold leading-none text-white ring-2 ring-white dark:ring-slate-900 shadow-sm"
                        >
                            {badgeLabel}
                        </motion.span>
                    )}
                </AnimatePresence>

                {status !== STATUS.CONNECTED && !open && (
                    <span className="absolute -bottom-1 -left-1">
                        {status === STATUS.DISCONNECTED
                            ? <WifiOff className="w-3 h-3 text-red-400" />
                            : <Wifi className="w-3 h-3 text-amber-400 animate-pulse" />
                        }
                    </span>
                )}
            </motion.button>

            <AnimatePresence>
                {open && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            onClick={() => setOpen(false)}
                            className="fixed inset-0 z-40 bg-slate-900/20 sm:hidden"
                        />

                        <motion.div
                            key="panel"
                            variants={PANEL_VARIANTS}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            role="dialog"
                            aria-label="Notifications panel"
                            style={{ willChange: 'transform, opacity' }}
                            className="fixed inset-x-0 top-[calc(64px+env(safe-area-inset-top,0px))] z-50 origin-top sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:mt-2 sm:origin-top-right w-auto sm:w-[420px] rounded-none sm:rounded-3xl overflow-hidden bg-white dark:bg-slate-900 border-t sm:border border-slate-200/60 dark:border-slate-800/60 shadow-[0_20px_50px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)] backdrop-blur-lg sm:backdrop-blur-2xl transform-gpu"
                        >
                            {status !== STATUS.CONNECTED && (
                                <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-100 dark:border-amber-800/30">
                                    {status === STATUS.ERROR
                                        ? <WifiOff className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
                                        : <Wifi className="w-3 h-3 text-amber-600 dark:text-amber-400 animate-pulse shrink-0" />
                                    }
                                    <span className="text-[11px] text-amber-700 dark:text-amber-300 font-medium">
                                        {status === STATUS.CONNECTING ? 'Connecting...' : 'Reconnecting...'}
                                    </span>
                                </div>
                            )}
                            <NotificationList closeMenu={() => setOpen(false)} />
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

export default NotificationBell;