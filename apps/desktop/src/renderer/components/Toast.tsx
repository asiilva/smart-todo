import { create } from 'zustand';
import { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface ToastState {
  toasts: Toast[];
  addToast: (message: string, type?: Toast['type']) => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast: (message, type = 'info') => {
    const id = Math.random().toString(36).substring(2) + Date.now().toString(36);
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 4000);
  },
  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
};

const borderColors = {
  success: '#2CC197',
  error: '#F0556E',
  info: '#7C5CFC',
};

export default function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const removeToast = useToastStore((s) => s.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] space-y-2">
      {toasts.map((toast) => {
        const Icon = icons[toast.type];
        return (
          <div
            key={toast.id}
            className="flex items-center gap-2.5 px-4 py-3 rounded-[14px] border border-border shadow animate-slide-in"
            style={{
              background: 'var(--color-surface)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              borderLeft: `3px solid ${borderColors[toast.type]}`,
            }}
          >
            <Icon size={16} style={{ color: borderColors[toast.type] }} className="flex-shrink-0" />
            <span className="text-[13px] font-medium text-text">{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="ml-2 text-text-dim hover:text-text transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
