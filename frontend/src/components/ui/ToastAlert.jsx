import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

function ToastAlert({
  id,
  tone = "success",
  title,
  children,
  className = "",
  toastKey,
  duration,
  autoClose = true,
  onClose,
}) {
  const CLOSE_ANIMATION_MS = 180;
  const closeTimerRef = useRef(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const normalizedTone = tone === "warn" ? "warning" : tone;
  const resolvedDuration = useMemo(() => {
    if (typeof duration === "number") {
      return duration;
    }
    if (normalizedTone === "error") {
      return 4800;
    }
    if (normalizedTone === "warning") {
      return 4200;
    }
    return 3400;
  }, [duration, normalizedTone]);

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const handleClose = useCallback(() => {
    clearCloseTimer();
    setIsOpen(false);

    closeTimerRef.current = window.setTimeout(() => {
      setIsDismissed(true);
      if (onClose) {
        onClose();
      }
    }, CLOSE_ANIMATION_MS);
  }, [clearCloseTimer, onClose]);

  useEffect(() => {
    clearCloseTimer();
    setIsDismissed(false);
    setIsOpen(false);

    const rafId = window.requestAnimationFrame(() => {
      setIsOpen(true);
    });

    return () => {
      window.cancelAnimationFrame(rafId);
    };
  }, [toastKey, clearCloseTimer]);

  useEffect(() => {
    if (!autoClose || isDismissed) {
      return undefined;
    }

    const timerId = window.setTimeout(() => {
      handleClose();
    }, resolvedDuration);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [autoClose, handleClose, isDismissed, resolvedDuration]);

  useEffect(() => () => clearCloseTimer(), [clearCloseTimer]);

  if (isDismissed) {
    return null;
  }

  const toneMap = {
    success: {
      iconWrap: "text-emerald-700 bg-emerald-100",
      icon: (
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M5 11.917 9.724 16.5 19 7.5"
        />
      ),
    },
    error: {
      iconWrap: "text-rose-700 bg-rose-100",
      icon: (
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M6 18 17.94 6M18 18 6.06 6"
        />
      ),
    },
    warning: {
      iconWrap: "text-amber-700 bg-amber-100",
      icon: (
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M12 13V8m0 8h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
        />
      ),
    },
    info: {
      iconWrap: "text-sky-700 bg-sky-100",
      icon: (
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M12 8v.01M12 12v4m9-4a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
        />
      ),
    },
  };

  const toneConfig = toneMap[normalizedTone] || toneMap.info;

  return (
    <div
      className={`fixed bottom-4 left-4 z-[90] w-[calc(100vw-2rem)] max-w-sm sm:bottom-6 sm:left-6 pointer-events-none ${className}`.trim()}
    >
      <div
        id={id}
        className={`flex items-start w-full p-4 text-slate-700 bg-white rounded-xl shadow-lg border border-slate-200 transition-all duration-200 ease-out pointer-events-auto ${
          isOpen ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-2 scale-[0.98]"
        }`.trim()}
        role="alert"
      >
        <div
          className={`inline-flex items-center justify-center shrink-0 w-7 h-7 rounded ${toneConfig.iconWrap}`.trim()}
        >
          <svg className="w-5 h-5" aria-hidden="true" viewBox="0 0 24 24" fill="none">
            {toneConfig.icon}
          </svg>
          <span className="sr-only">{normalizedTone} icon</span>
        </div>

        <div className="ms-3 text-sm">
          {title ? <p className="font-semibold text-slate-900">{title}</p> : null}
          <div className={title ? "mt-0.5 font-normal text-slate-700" : "font-normal text-slate-700"}>
            {children}
          </div>
        </div>

        <button
          type="button"
          className="ms-auto flex items-center justify-center bg-transparent border border-transparent hover:bg-slate-100 focus:ring-4 focus:ring-slate-200 rounded text-sm h-8 w-8 focus:outline-none"
          aria-label="Close"
          onClick={handleClose}
        >
          <span className="sr-only">Close</span>
          <svg className="w-5 h-5" aria-hidden="true" viewBox="0 0 24 24" fill="none">
            <path
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M6 18 17.94 6M18 18 6.06 6"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default ToastAlert;
