import { ErrorLog } from './ErrorLog';

let inited = false;
export function initDiagnostics(onGlobalError?: (msg: string) => void) {
  if (inited) return;
  inited = true;
  if (typeof window !== 'undefined') {
    window.addEventListener('error', (e) => {
      ErrorLog.log(e.error || e.message || 'WindowError', 'window.error');
      try { onGlobalError?.('Unexpected error occurred'); } catch {}
    });
    window.addEventListener('unhandledrejection', (e: any) => {
      const reason = e?.reason || 'Unhandled rejection';
      ErrorLog.log(reason, 'unhandledrejection');
      try { onGlobalError?.('Operation failed'); } catch {}
    });
  }
}

