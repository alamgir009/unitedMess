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
/*  PaymentModal – buttery 60 fps on mobile, refined on desktop       */
/* ------------------------------------------------------------------ */
const PaymentModal = ({ isOpen, onClose, title, children }) => {
  const isMobile = useMediaQuery('(max-width: 767px)');

  // Shared easing – natural deceleration, zero bounce
  const ease = useMemo(() => [0.16, 1, 0.3, 1], []);

  // Transitions: 70 ms on mobile, 100 ms on desktop
  const transition = useMemo(
    () => ({
      backdrop: { duration: isMobile ? 0.07 : 0.1, ease },
      modal: { duration: isMobile ? 0.07 : 0.1, ease },
    }),
    [isMobile, ease]
  );

  // Tighter start on mobile to avoid visual overshoot
  const modalInitial = isMobile
    ? { opacity: 0, scale: 0.98, y: 12 }
    : { opacity: 0, scale: 0.94, y: 20 };
  const modalExit = modalInitial;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop – no blur on mobile */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={transition.backdrop}
            onClick={onClose}
            className={[
              'fixed inset-0 z-[100]',
              'bg-black/60',
              // desktop only: subtle blur
              'md:backdrop-blur-sm',
            ].join(' ')}
            style={{ willChange: 'opacity' }}
            aria-hidden="true"
          />

          {/* Dialog wrapper */}
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              key="modal"
              initial={modalInitial}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={modalExit}
              transition={transition.modal}
              className="w-full max-w-lg pointer-events-auto relative overflow-hidden rounded-3xl"
              style={{
                willChange: 'transform, opacity',
                boxShadow:
                  '0 0 0 1px rgba(255,255,255,0.12), 0 25px 60px rgba(0,0,0,0.5), 0 0 80px rgba(99,102,241,0.08)',
              }}
            >
              {/* Glass shell – lightweight blur on mobile */}
              <div
                className="absolute inset-0 rounded-3xl"
                style={{
                  background:
                    'var(--glass-bg, linear-gradient(135deg,rgba(15,20,40,0.88)0%,rgba(20,28,52,0.82)100%))',
                  backdropFilter: isMobile ? 'blur(14px)' : 'blur(28px)',
                  WebkitBackdropFilter: isMobile ? 'blur(14px)' : 'blur(28px)',
                }}
              />

              {/* Glow – smaller blur on mobile */}
              <div
                className={[
                  'absolute -top-16 left-1/2 -translate-x-1/2 w-72 h-32',
                  'bg-indigo-500/20 rounded-full pointer-events-none',
                  isMobile ? 'blur-2xl' : 'blur-3xl',
                ].join(' ')}
              />

              {/* Border – simple on mobile, fancy mask on desktop */}
              {isMobile ? (
                <div className="absolute inset-0 rounded-3xl border border-white/10 pointer-events-none" />
              ) : (
                <div
                  className="absolute inset-0 rounded-3xl pointer-events-none"
                  style={{
                    background:
                      'linear-gradient(135deg,rgba(255,255,255,0.14)0%,rgba(255,255,255,0.03)50%,rgba(255,255,255,0)100%)',
                    mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                    WebkitMask:
                      'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                    maskComposite: 'exclude',
                    WebkitMaskComposite: 'destination-out',
                    padding: '1px',
                  }}
                />
              )}

              {/* Header */}
              <div className="relative z-10 flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div
                    className="w-1 h-6 rounded-full flex-shrink-0"
                    style={{
                      background:
                        'linear-gradient(180deg,hsl(245,76%,60%)0%,hsl(245,76%,42%)100%)',
                    }}
                  />
                  <h2 className="text-lg font-bold tracking-tight text-foreground">
                    {title}
                  </h2>
                </div>
                <Button type="danger" iconOnly onClick={onClose}>
                  <HiOutlineXMark className="w-4 h-4 text-white" />
                </Button>
              </div>

              {/* Body – inner glow with reduced blur on mobile */}
              <div className="relative z-10 px-6 py-5 max-h-[82vh] overflow-y-auto">
                <div
                  className={[
                    'absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2',
                    'w-64 h-64 bg-indigo-500/5 rounded-full pointer-events-none -z-10',
                    isMobile ? 'blur-xl' : 'blur-3xl',
                  ].join(' ')}
                />
                {children}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

export default PaymentModal;