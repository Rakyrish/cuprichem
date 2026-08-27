"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/**
 * Notifications.
 *
 * Deliberately quiet: only confirmations of things the operator actually did,
 * and errors they need to act on. Background chatter trains people to ignore
 * the corner of the screen where the important messages appear.
 */

type ToastKind = "success" | "error" | "info";

interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
  detail?: string;
}

interface ToastValue {
  notify: (kind: ToastKind, message: string, detail?: string) => void;
  success: (message: string, detail?: string) => void;
  error: (message: string, detail?: string) => void;
}

const ToastContext = createContext<ToastValue | null>(null);

const STYLES: Record<ToastKind, string> = {
  success: "border-l-lime bg-ok-tint text-ink",
  error: "border-l-danger bg-danger-tint text-ink",
  info: "border-l-blue bg-blue-tint text-ink",
};

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const notify = useCallback(
    (kind: ToastKind, message: string, detail?: string) => {
      const id = nextId++;
      setToasts((current) => [...current, { id, kind, message, detail }]);
      // Errors stay until dismissed; the operator may need to read them twice.
      if (kind !== "error") {
        setTimeout(() => dismiss(id), 4500);
      }
    },
    [dismiss],
  );

  const value = useMemo<ToastValue>(
    () => ({
      notify,
      success: (message, detail) => notify("success", message, detail),
      error: (message, detail) => notify("error", message, detail),
    }),
    [notify],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed bottom-5 right-5 z-100 flex w-full max-w-sm flex-col gap-2"
        role="status"
        aria-live="polite"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto rounded-[var(--radius)] border border-line border-l-4 px-4 py-3 shadow-lg ${STYLES[toast.kind]}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium">{toast.message}</p>
                {toast.detail && (
                  <p className="mt-1 text-xs text-muted">{toast.detail}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                aria-label="Dismiss"
                className="-mr-1 -mt-1 px-1 text-muted hover:text-ink"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside a ToastProvider.");
  return context;
}
