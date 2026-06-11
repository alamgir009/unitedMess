import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { HiOutlineXMark } from "react-icons/hi2";

const useMediaQuery = (query) => {
  const getMatches = () =>
    typeof window !== "undefined" ? window.matchMedia(query).matches : false;

  const [matches, setMatches] = useState(getMatches);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mql = window.matchMedia(query);
    const handler = (e) => setMatches(e.matches);

    setMatches(mql.matches);

    mql.addEventListener?.("change", handler);
    return () => mql.removeEventListener?.("change", handler);
  }, [query]);

  return matches;
};

export const EditModal = ({ isOpen, onClose, title, children }) => {
  const isMobile = useMediaQuery("(max-width: 767px)");

  const transition = useMemo(
    () => ({
      modal: { duration: isMobile ? 0.12 : 0.18, ease: [0.16, 1, 0.3, 1] },
    }),
    [isMobile]
  );

  const initialState = isMobile
    ? { opacity: 0, scale: 0.985, y: 14 }
    : { opacity: 0, scale: 0.96, y: 24 };

  useEffect(() => {
    if (!isOpen || typeof document === "undefined") return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleEscape = (event) => {
      if (event.key === "Escape") onClose?.();
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[1000] contain-[layout_style_paint]">
          {/* Static backdrop, zero GPU overlay paint cost */}
          <div
            aria-label="Close modal"
            onClick={onClose}
            className="absolute inset-0 w-full h-full bg-black/60 md:bg-black/50"
          />

          {/* Centering shell */}
          <div className="relative flex min-h-full items-center justify-center p-3 sm:p-4">
            <motion.div
              initial={initialState}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={initialState}
              transition={transition.modal}
              role="dialog"
              aria-modal="true"
              aria-labelledby="edit-modal-title"
              className="
                relative w-full max-w-lg overflow-hidden rounded-xl border
                border-slate-200 dark:border-slate-800
                bg-white dark:bg-slate-900 text-slate-900 dark:text-white
                shadow-xl
              "
            >
              {/* Header */}
              <div className="relative z-10 flex items-center justify-between border-b border-slate-200 dark:border-slate-800/80 px-4 py-4 sm:px-6 sm:py-5">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="h-5 w-1 shrink-0 rounded-full bg-gradient-to-b from-blue-500 to-indigo-600" />
                  <h2
                    id="edit-modal-title"
                    className="truncate text-base font-semibold sm:text-lg"
                  >
                    {title || "Edit Profile"}
                  </h2>
                </div>

                <button
                  onClick={onClose}
                  aria-label="Close dialog"
                  className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <HiOutlineXMark className="h-5 w-5" />
                </button>
              </div>

              {/* Body */}
              <div className="relative z-10 max-h-[82dvh] overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
                {children}
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};