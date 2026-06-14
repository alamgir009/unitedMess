import { useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useModalAnimation } from "@/shared/hooks/useModalAnimation";
import { cn } from "@/core/utils/helpers/string.helper";
import { HiOutlineXMark } from "react-icons/hi2";

export const EditModal = ({ isOpen, onClose, title, children }) => {
  const { shouldRender, exiting } = useModalAnimation(isOpen, { exitTimeout: 120 });

  useEffect(() => {
    if (!shouldRender || exiting || typeof document === "undefined") return;
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
  }, [shouldRender, exiting, onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    shouldRender ? (
      <div
        className={cn(
          'fixed inset-0 z-[1000]',
          'modal-animate-backdrop',
          exiting ? 'modal-exit-backdrop' : 'modal-enter'
        )}
        style={{ pointerEvents: exiting ? 'none' : 'auto' }}
      >
        <div
          aria-label="Close modal"
          onClick={onClose}
          className="absolute inset-0 w-full h-full bg-black/60 md:bg-black/50"
        />

        <div className="relative flex min-h-full items-center justify-center p-3 sm:p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-modal-title"
            className={cn(
              'relative w-full max-w-lg overflow-hidden rounded-xl border',
              'border-slate-200 dark:border-slate-800',
              'bg-white dark:bg-slate-900 text-slate-900 dark:text-white',
              'shadow-xl',
              'modal-animate modal-gpu',
              exiting ? 'modal-exit' : 'modal-enter'
            )}
          >
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

            <div className="relative z-10 max-h-[82dvh] overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
              {children}
            </div>
          </div>
        </div>
      </div>
    ) : null,
    document.body
  );
};
