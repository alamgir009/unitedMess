import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell } from 'lucide-react';
import { useSelector } from 'react-redux';
import useNotifications from '../../hooks/useNotifications';
import NotificationList from '../NotificationList/NotificationList';

/* ─── Body Scroll Lock (SSR safe) ───────────────────────────────────────── */
let lockCount = 0;

function lockBodyScroll() {
    if (typeof document === 'undefined') return;
    if (lockCount === 0) {
        const scrollY = window.scrollY;
        document.body.style.overflow = 'hidden';
        document.body.style.paddingRight = `${window.innerWidth - document.documentElement.clientWidth}px`;
        document.body.dataset.scrollY = String(scrollY);
    }
    lockCount++;
}

function unlockBodyScroll() {
    if (typeof document === 'undefined') return;
    lockCount = Math.max(0, lockCount - 1);
    if (lockCount === 0) {
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
        delete document.body.dataset.scrollY;
    }
}

/* ─── Framer Variants ───────────────────────────────────────────────────── */
const BACKDROP_VARIANTS = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 },
};

const PANEL_VARIANTS = {
    hidden: { opacity: 0, y: 48, scale: 0.98 },
    visible: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: 48, scale: 0.98 },
};

const PANEL_TRANSITION = {
    type: 'spring',
    stiffness: 420,
    damping: 36,
    mass: 1,
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

    // Shake animation on new notification
    useEffect(() => {
        if (lastRealtimeUpdate && unreadCount > prevCount.current) {
            setIsShaking(true);
            const id = setTimeout(() => setIsShaking(false), 600);
            return () => clearTimeout(id);
        }
        prevCount.current = unreadCount;
    }, [unreadCount, lastRealtimeUpdate]);

    // Keyboard accessibility & Scroll locking
    useEffect(() => {
        if (!open) return;
        const handler = (e) => { if (e.key === 'Escape') setOpen(false); };
        window.addEventListener('keydown', handler);
        lockBodyScroll();
        return () => {
            window.removeEventListener('keydown', handler);
            unlockBodyScroll();
        };
    }, [open]);

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
                <motion.span animate={isShaking ? BELL_SHAKE.animate : BELL_SHAKE.initial}>
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
                                ring-2 ring-white dark:ring-slate-900 shadow-sm
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

            {typeof document !== 'undefined' && createPortal(
                <AnimatePresence mode="wait">
                    {open && (
                        <div
                            className="fixed inset-0 z-[1100] flex items-end sm:items-center justify-center"
                            style={{ isolation: 'isolate' }}
                        >
                            <motion.div
                                key="backdrop"
                                variants={BACKDROP_VARIANTS}
                                initial="hidden"
                                animate="visible"
                                exit="exit"
                                transition={{ duration: 0.18 }}
                                className="absolute inset-0 bg-black/60"
                                onClick={() => setOpen(false)}
                                aria-hidden="true"
                            />

                            <motion.div
                                key="panel"
                                role="dialog"
                                aria-label="Notifications panel"
                                variants={PANEL_VARIANTS}
                                initial="hidden"
                                animate="visible"
                                exit="exit"
                                transition={PANEL_TRANSITION}
                                style={{
                                    willChange: 'transform, opacity',
                                    transform: 'translateZ(0)',
                                }}
                                className={[
                                    'relative z-10 w-full sm:max-w-[480px] mx-auto',
                                    'rounded-t-[28px] sm:rounded-[28px]',
                                    'bg-white dark:bg-slate-900',
                                    'border-t border-x sm:border border-black/[0.08] dark:border-white/10',
                                    'shadow-2xl overflow-hidden',
                                    // Flex to manage NotificationList height
                                    'flex flex-col max-h-[85vh] sm:max-h-[80vh]'
                                ].join(' ')}
                            >
                                {/* Mobile Drag Indicator */}
                                <div className="flex justify-center pt-3 pb-2 sm:hidden shrink-0 bg-white dark:bg-slate-900" aria-hidden="true">
                                    <div className="w-10 h-1 rounded-full bg-black/10 dark:bg-white/20" />
                                </div>

                                <NotificationList closeMenu={() => setOpen(false)} />
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </div>
    );
};

export default NotificationBell;
