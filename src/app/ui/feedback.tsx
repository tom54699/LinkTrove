import React, { createContext, useContext, useMemo, useState } from 'react';
import { useI18n } from '../i18n';

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
  const { t } = useI18n();
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
            {t('loading')}
          </div>
        </div>
      )}
      {/* Toast container */}
      <div className="fixed bottom-4 right-4 z-[99999] space-y-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            style={{ animation: 'toast-slide-in 0.2s ease-out' }}
            className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm shadow-lg backdrop-blur-sm min-w-[240px] max-w-[90vw] ${
              t.kind === 'success'
                ? 'bg-emerald-900/90 text-emerald-100 border border-emerald-700/50'
                : t.kind === 'error'
                  ? 'bg-red-900/90 text-red-100 border border-red-700/50'
                  : 'bg-slate-800/90 text-slate-100 border border-slate-600/50'
            }`}
          >
            {t.kind === 'success' && (
              <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
            {t.kind === 'error' && (
              <svg className="w-4 h-4 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            {t.kind === 'info' && (
              <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
};

export function useFeedback(): FeedbackCtx {
  const v = useContext(Ctx);
  // 測試與部分元件在未包 Provider 時也需安全可用
  if (!v) {
    return {
      showToast: () => {},
      setLoading: () => {},
    };
  }
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
