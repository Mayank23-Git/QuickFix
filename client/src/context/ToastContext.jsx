import { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((message, type = 'info') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev.slice(-3), { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4200);
  }, []);

  const toast = {
    success: (msg) => addToast(msg, 'success'),
    error: (msg) => addToast(msg, 'error'),
    info: (msg) => addToast(msg, 'info'),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div
        aria-live="polite"
        className="fixed bottom-20 md:bottom-5 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
      >
        {toasts.map((t) => {
          const Icon = t.type === 'success' ? CheckCircle2 : t.type === 'error' ? AlertCircle : Info;
          const borderColor =
            t.type === 'success'
              ? 'border-emerald-200 dark:border-[#2DD4BF]/40 bg-white dark:bg-[#1E293B] text-zinc-900 dark:text-[#F8FAFC]'
              : t.type === 'error'
              ? 'border-rose-200 dark:border-rose-500/40 bg-white dark:bg-[#1E293B] text-zinc-900 dark:text-[#F8FAFC]'
              : 'border-zinc-200 dark:border-[#334155] bg-white dark:bg-[#1E293B] text-zinc-900 dark:text-[#F8FAFC]';
          const iconColor =
            t.type === 'success'
              ? 'text-emerald-600 dark:text-[#2DD4BF]'
              : t.type === 'error'
              ? 'text-rose-600 dark:text-rose-400'
              : 'text-indigo-600 dark:text-[#818CF8]';

          return (
            <div
              key={t.id}
              role="status"
              className={`pointer-events-auto flex items-start gap-3 rounded-xl border p-3.5 shadow-sm dark:shadow-lg dark:shadow-black/30 transition-all duration-150 ${borderColor}`}
            >
              <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${iconColor}`} />
              <p className="text-sm text-zinc-800 dark:text-[#F8FAFC] flex-1 leading-snug">{t.message}</p>
              <button
                type="button"
                onClick={() => removeToast(t.id)}
                aria-label="Dismiss notification"
                className="text-zinc-400 dark:text-[#94A3B8] hover:text-zinc-700 dark:hover:text-[#F8FAFC] p-0.5 rounded"
              >
                <X className="w-4 h-4" />
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
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}
