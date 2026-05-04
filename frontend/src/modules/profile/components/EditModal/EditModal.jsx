import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { HiOutlineXMark } from "react-icons/hi2";
import { Button } from "@/shared/components/ui";

/* ------------------------------------------------------------------ */
/*  SSR-safe responsive media query hook                               */
/* ------------------------------------------------------------------ */
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

/* ------------------------------------------------------------------ */
/*  EditModal                                                         */
/* ------------------------------------------------------------------ */
export const EditModal = ({ isOpen, onClose, title, children }) => {
  const isMobile = useMediaQuery("(max-width: 767px)");

  const easing = useMemo(() => [0.16, 1, 0.3, 1], []);

  const transition = useMemo(
    () => ({
      backdrop: { duration: isMobile ? 0.12 : 0.18, ease: easing },
      modal: { duration: isMobile ? 0.16 : 0.2, ease: easing },
    }),
    [isMobile, easing]
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
        <div className="fixed inset-0 z-[1000]">
          {/* Backdrop */}
          <motion.button
            type="button"
            aria-label="Close modal"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={transition.backdrop}
            className={[
              "absolute inset-0 h-full w-full",
              "bg-black/70",
              "md:bg-black/50 md:backdrop-blur-sm",
            ].join(" ")}
            style={{ willChange: "opacity" }}
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
              className={[
                "relative w-full max-w-lg overflow-hidden rounded-3xl border",
                "shadow-[0_24px_80px_rgba(0,0,0,0.25)]",
                "bg-[rgb(248,250,252)] border-black/10 text-slate-900",
                "dark:bg-slate-900 dark:border-white/10 dark:text-white",
                "md:bg-white/70 md:backdrop-blur-xl",
                "md:dark:bg-slate-900/60",
              ].join(" ")}
              style={{ willChange: "transform, opacity" }}
            >
              {/* Solid mobile layer to prevent bleed-through */}
              <div className="absolute inset-0 md:hidden bg-[rgb(231,235,240)] dark:bg-slate-900" />

              {/* Subtle premium glow */}
              <div
                className={[
                  "pointer-events-none absolute left-1/2 top-0 h-24 w-72 -translate-x-1/2 rounded-full",
                  "bg-blue-500/10 blur-2xl md:blur-3xl",
                ].join(" ")}
              />

              {/* Border refinement */}
              <div className="pointer-events-none absolute inset-0 rounded-3xl border border-black/5 dark:border-white/10" />

              {/* Header */}
              <div className="relative z-10 flex items-center justify-between border-b border-black/10 px-4 py-4 sm:px-6 sm:py-5 dark:border-white/10">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="h-6 w-1 shrink-0 rounded-full bg-gradient-to-b from-blue-500 to-blue-700" />
                  <h2
                    id="edit-modal-title"
                    className="truncate text-lg font-semibold tracking-tight text-slate-900 dark:text-white"
                  >
                    {title || "Edit Profile"}
                  </h2>
                </div>

                <Button variant="danger" iconOnly onClick={onClose} aria-label="Close">
                  <HiOutlineXMark className="h-5 w-5" />
                </Button>
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