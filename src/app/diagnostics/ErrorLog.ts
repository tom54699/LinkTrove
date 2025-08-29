export interface ErrorEntry {
  id: string;
  ts: number;
  message: string;
  stack?: string;
  context?: string;
}

class _ErrorLog {
  private buf: ErrorEntry[] = [];
  private max = 100;
  log(err: any, context?: string) {
    const e: ErrorEntry = {
      id: Math.random().toString(36).slice(2, 9),
      ts: Date.now(),
      message: (err && (err.message || err.toString())) || 'Unknown error',
      stack: err && err.stack || undefined,
      context,
    };
    this.buf.push(e);
    if (this.buf.length > this.max) this.buf.shift();
    try { console.error('[ErrorLog]', e.message, e.stack || ''); } catch {}
  }
  list(): ErrorEntry[] { return this.buf.slice().reverse(); }
  clear() { this.buf = []; }
  export(): string { return JSON.stringify(this.buf, null, 2); }
}

export const ErrorLog = new _ErrorLog();

