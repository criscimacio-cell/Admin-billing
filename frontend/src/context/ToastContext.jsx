import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { IconCheckCircle, IconXCircle, IconInfoCircle, IconX } from '../components/icons.jsx';

const ToastContext = createContext(null);
const DEFAULT_DURATION = 4000;

const VARIANTS = {
  success: { icon: IconCheckCircle, iconClass: 'text-emerald-500', barClass: 'bg-emerald-500' },
  error: { icon: IconXCircle, iconClass: 'text-red-500', barClass: 'bg-red-500' },
  info: { icon: IconInfoCircle, iconClass: 'text-brand-500', barClass: 'bg-brand-500' },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((ts) => ts.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (type, message, duration = DEFAULT_DURATION) => {
      const id = ++nextId.current;
      setToasts((ts) => [...ts, { id, type, message }]);
      if (duration > 0) setTimeout(() => dismiss(id), duration);
      return id;
    },
    [dismiss]
  );

  const toast = {
    success: (message, duration) => push('success', message, duration),
    error: (message, duration) => push('error', message, duration),
    info: (message, duration) => push('info', message, duration),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="pointer-events-none fixed bottom-6 right-6 z-50 flex w-full max-w-sm flex-col gap-2">
        {toasts.map((t) => {
          const { icon: Icon, iconClass, barClass } = VARIANTS[t.type];
          return (
            <div
              key={t.id}
              className="animate-toast-in pointer-events-auto relative flex items-start gap-3 overflow-hidden rounded-lg border border-slate-200 bg-white py-3 pl-4 pr-3 shadow-popover"
            >
              <span className={`absolute inset-y-0 left-0 w-1 ${barClass}`} />
              <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${iconClass}`} />
              <p className="flex-1 text-sm text-slate-700">{t.message}</p>
              <button
                onClick={() => dismiss(t.id)}
                className="shrink-0 rounded-md p-0.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                <IconX className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
