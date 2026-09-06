import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

interface ToastContextType {
  toast: {
    success: (message: string, title?: string) => void;
    error: (message: string, title?: string) => void;
    warning: (message: string, title?: string) => void;
    info: (message: string, title?: string) => void;
  };
  confirm: (options: {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    isDestructive?: boolean;
  }) => Promise<boolean>;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // Confirm state
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    cancelText: string;
    isDestructive: boolean;
    resolve?: (value: boolean) => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    isDestructive: false,
  });

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (type: ToastType, message: string, title?: string, duration = 5000) => {
      const id = Math.random().toString(36).substring(2, 9);
      setToasts((prev) => [...prev, { id, type, title, message, duration }]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const toast = {
    success: (message: string, title?: string) => addToast('success', message, title),
    error: (message: string, title?: string) => addToast('error', message, title, 7000),
    warning: (message: string, title?: string) => addToast('warning', message, title, 6000),
    info: (message: string, title?: string) => addToast('info', message, title),
  };

  const confirm = useCallback(
    (options: {
      title: string;
      message: string;
      confirmText?: string;
      cancelText?: string;
      isDestructive?: boolean;
    }): Promise<boolean> => {
      return new Promise<boolean>((resolve) => {
        setConfirmState({
          isOpen: true,
          title: options.title,
          message: options.message,
          confirmText: options.confirmText || 'Confirm',
          cancelText: options.cancelText || 'Cancel',
          isDestructive: options.isDestructive ?? true,
          resolve,
        });
      });
    },
    []
  );

  const handleConfirmClose = (result: boolean) => {
    if (confirmState.resolve) {
      confirmState.resolve(result);
    }
    setConfirmState((prev) => ({ ...prev, isOpen: false, resolve: undefined }));
  };

  return (
    <ToastContext.Provider value={{ toast, confirm }}>
      {children}

      {/* Floating Toasts */}
      <div
        className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
        role="region"
        aria-label="Notifications"
      >
        {toasts.map((t) => {
          const isError = t.type === 'error';
          const isSuccess = t.type === 'success';
          const isWarning = t.type === 'warning';

          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-lg transition-all transform translate-y-0 opacity-100 ${
                isError
                  ? 'bg-red-50 border-red-200 text-red-900'
                  : isSuccess
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : isWarning
                      ? 'bg-amber-50 border-amber-200 text-amber-900'
                      : 'bg-zinc-50 border-zinc-200 text-zinc-900'
              }`}
            >
              <div className="shrink-0 mt-0.5">
                {isError && <XCircle className="w-5 h-5 text-red-600" />}
                {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                {isWarning && <AlertTriangle className="w-5 h-5 text-amber-600" />}
                {!isError && !isSuccess && !isWarning && <Info className="w-5 h-5 text-zinc-600" />}
              </div>
              <div className="flex-1 text-xs">
                {t.title && <div className="font-bold text-sm mb-0.5">{t.title}</div>}
                <div className="leading-relaxed whitespace-pre-wrap">{t.message}</div>
              </div>
              <button
                onClick={() => removeToast(t.id)}
                className="shrink-0 p-1 rounded-lg text-zinc-400 hover:text-zinc-700 transition-colors"
                aria-label="Close notification"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>

      {/* In-App Confirm Dialog */}
      {confirmState.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => handleConfirmClose(false)}
          />
          <div className="relative bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl z-10 border border-zinc-200 space-y-4">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  confirmState.isDestructive
                    ? 'bg-red-50 text-red-600'
                    : 'bg-zinc-100 text-zinc-700'
                }`}
              >
                {confirmState.isDestructive ? (
                  <AlertTriangle className="w-5 h-5" />
                ) : (
                  <Info className="w-5 h-5" />
                )}
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-900">{confirmState.title}</h3>
              </div>
            </div>
            <p className="text-sm text-zinc-600 leading-relaxed">{confirmState.message}</p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => handleConfirmClose(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-700 hover:bg-zinc-100 border border-zinc-200 transition-all"
              >
                {confirmState.cancelText}
              </button>
              <button
                type="button"
                onClick={() => handleConfirmClose(true)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold text-white shadow-sm transition-all ${
                  confirmState.isDestructive
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-mehndi-600 hover:bg-mehndi-700'
                }`}
              >
                {confirmState.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    return {
      toast: {
        success: (msg: string, title?: string) => console.log('[Toast SUCCESS]', title, msg),
        error: (msg: string, title?: string) => console.error('[Toast ERROR]', title, msg),
        warning: (msg: string, title?: string) => console.warn('[Toast WARNING]', title, msg),
        info: (msg: string, title?: string) => console.info('[Toast INFO]', title, msg),
      },
      confirm: async () => true,
    };
  }
  return context;
};
