import React, { createContext, useContext, useMemo, useState } from 'react';

type ToastKind = 'info' | 'success' | 'error';

interface Toast {
  id: string;
  message: string;
  kind: ToastKind;
}

interface FeedbackCtx {
  showToast: (message: string, kind?: ToastKind) => void;
  setLoading: (v: boolean) => void;
}

const Ctx = createContext<FeedbackCtx | null>(null);

export const FeedbackProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [loading, setLoading] = useState(false);

  const showToast = (message: string, kind: ToastKind = 'info') => {
    const id = Math.random().toString(36).slice(2, 9);
    const toast: Toast = { id, message, kind };
    setToasts((t) => [...t, toast]);
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 3000);
  };

  const value = useMemo(() => ({ showToast, setLoading }), []);

  return (
    <Ctx.Provider value={value}>
      {children}
      {/* Loading overlay */}
      {loading && (
        <div
          role="status"
          aria-live="polite"
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40"
          onClick={() => setLoading(false)}
        >
          <div className="rounded border border-slate-700 bg-[var(--bg)] px-4 py-2">
            Loading...
          </div>
        </div>
      )}
      {/* Toast container */}
      <div className="fixed bottom-4 right-4 z-[70] space-y-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`rounded border px-3 py-2 text-sm shadow ${
              t.kind === 'success'
                ? 'border-emerald-500 bg-emerald-950/30'
                : t.kind === 'error'
                  ? 'border-red-600 bg-red-950/30'
                  : 'border-slate-700 bg-slate-900'
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
};

export function useFeedback(): FeedbackCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('FeedbackProvider missing');
  return v;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; message?: string }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(err: Error) {
    return { hasError: true, message: err?.message };
  }
  componentDidCatch(err: Error) {
    // eslint-disable-next-line no-console
    console.error(err);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 rounded border border-red-600 bg-red-950/30">
          Something went wrong.
          {this.state.message && (
            <div className="mt-1 text-sm opacity-80">{this.state.message}</div>
          )}
        </div>
      );
    }
    return this.props.children as any;
  }
}
