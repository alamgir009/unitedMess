import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiOutlineXMark } from 'react-icons/hi2';
import { Button } from '@/shared/components/ui';

/* ------------------------------------------------------------------ */
/*  Responsive media query hook                                       */
/* ------------------------------------------------------------------ */
const useMediaQuery = (query) => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(query);
    setMatches(mql.matches);
    const handler = (e) => setMatches(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [query]);

  return matches;
};

/* ------------------------------------------------------------------ */
/*  MealModal                                                         */
/* ------------------------------------------------------------------ */
const MealModal = ({ isOpen, onClose, title, children }) => {
  const isMobile = useMediaQuery('(max-width: 767px)');

  // Transition durations: 70 ms on mobile, 100 ms on desktop
  const transition = useMemo(
    () => ({
      backdrop: { duration: isMobile ? 0.07 : 0.1 },
      modal: { duration: isMobile ? 0.07 : 0.1, ease: 'easeOut' },
    }),
    [isMobile]
  );

  // Slightly tighter initial scale on mobile for less visual travel
  const modalInitial = isMobile
    ? { opacity: 0, scale: 0.98, y: 12 }
    : { opacity: 0, scale: 0.96, y: 16 };
  const modalExit = modalInitial; // symmetric exit

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* ── Backdrop ── */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={transition.backdrop}
            onClick={onClose}
            className="fixed inset-0 z-[100] bg-black/40 dark:bg-black/70 md:bg-black/30 md:dark:bg-black/60 md:backdrop-blur-sm"
          />

          {/* ── Dialog Wrapper ── */}
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              key="modal"
              initial={modalInitial}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={modalExit}
              transition={transition.modal}
              className="w-full max-w-lg pointer-events-auto relative overflow-hidden rounded-3xl border border-black/5 dark:border-white/10 shadow-2xl md:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.15)] md:dark:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)]"
            >
              {/* Glass shell */}
              <div className="absolute inset-0 rounded-3xl bg-white/95 dark:bg-[#0f1428]/95 md:bg-white/80 md:dark:bg-[#0f1428]/80 md:backdrop-blur-md" />

              {/* Ambient top glow (desktop only) */}
              <div className="hidden md:block absolute -top-16 left-1/2 -translate-x-1/2 w-72 h-32 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/20 to-transparent pointer-events-none" />

              {/* ── Header ── */}
              <div className="relative z-10 flex items-center justify-between px-6 pt-5 pb-4 border-b border-black/5 dark:border-white/10">
                <div className="flex items-center gap-3">
                  <div
                    className="w-1 h-6 rounded-full flex-shrink-0"
                    style={{
                      background:
                        'linear-gradient(180deg, hsl(210,92%,60%) 0%, hsl(268,76%,60%) 100%)',
                    }}
                  />
                  <h2 className="text-lg font-bold tracking-tight text-foreground">
                    {title}
                  </h2>
                </div>

                <Button type="danger" iconOnly onClick={onClose}>
                  <HiOutlineXMark className="w-4 h-4 text-white group-hover:text-foreground transition-colors" />
                </Button>
              </div>

              {/* ── Body ── */}
              <div className="relative z-10 px-6 py-5 max-h-[82vh] overflow-y-auto">
                <div className="hidden md:block absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 to-transparent pointer-events-none -z-10" />
                {children}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

export default MealModal;