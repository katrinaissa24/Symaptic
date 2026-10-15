import { Toast as RT } from 'radix-ui';
import { create } from 'zustand';
import { X } from 'lucide-react';

export interface ToastItem {
  id: number;
  title: string;
  description?: string;
  kind: 'info' | 'success' | 'error';
  action?: { label: string; onClick(): void };
  duration?: number;
}

interface ToastState {
  items: ToastItem[];
  push(t: Omit<ToastItem, 'id'>): number;
  dismiss(id: number): void;
}

let seq = 1;
export const useToasts = create<ToastState>((set) => ({
  items: [],
  push(t) {
    const id = seq++;
    set((s) => ({ items: [...s.items.slice(-3), { ...t, id }] }));
    return id;
  },
  dismiss(id) {
    set((s) => ({ items: s.items.filter((t) => t.id !== id) }));
  },
}));

export const toast = {
  info: (title: string, o: Partial<ToastItem> = {}) => useToasts.getState().push({ title, kind: 'info', ...o }),
  success: (title: string, o: Partial<ToastItem> = {}) => useToasts.getState().push({ title, kind: 'success', ...o }),
  error: (title: string, o: Partial<ToastItem> = {}) => useToasts.getState().push({ title, kind: 'error', duration: 8000, ...o }),
  dismiss: (id: number) => useToasts.getState().dismiss(id),
};

export function Toaster() {
  const items = useToasts((s) => s.items);
  const dismiss = useToasts((s) => s.dismiss);
  return (
    <RT.Provider swipeDirection="right" duration={4000}>
      {items.map((t) => (
        <RT.Root
          key={t.id}
          className={`toast toast-${t.kind}`}
          duration={t.duration}
          onOpenChange={(open) => !open && dismiss(t.id)}
        >
          <div className="toast-body">
            <RT.Title className="toast-title">
              <span className="toast-dot" aria-hidden />
              {t.title}
            </RT.Title>
            {t.description && <RT.Description className="toast-desc">{t.description}</RT.Description>}
          </div>
          {t.action && (
            <RT.Action altText={t.action.label} asChild>
              <button
                className="toast-action"
                onClick={() => {
                  t.action!.onClick();
                  dismiss(t.id);
                }}
              >
                {t.action.label}
              </button>
            </RT.Action>
          )}
          <RT.Close className="toast-close" aria-label="Dismiss">
            <X />
          </RT.Close>
        </RT.Root>
      ))}
      <RT.Viewport className="toast-viewport" label="Notifications" />
    </RT.Provider>
  );
}
