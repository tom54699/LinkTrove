export interface SpanRecord {
  name: string;
  durationMs: number;
  ts: number;
}

export class Profiler {
  private records: SpanRecord[] = [];
  start(name: string): () => void {
    const t0 = performance.now?.() ?? Date.now();
    return () => {
      const t1 = performance.now?.() ?? Date.now();
      this.records.push({ name, durationMs: t1 - t0, ts: Date.now() });
    };
  }
  record(name: string, fn: () => void | Promise<void>) {
    const end = this.start(name);
    try { const r = fn(); if (r && typeof (r as any).then === 'function') return (r as Promise<void>).finally(end); } finally { if (!(fn as any)?.then) end(); }
  }
  top(n = 5): SpanRecord[] { return this.records.slice().sort((a,b)=> b.durationMs - a.durationMs).slice(0,n); }
  clear() { this.records = []; }
  getAll() { return this.records.slice(); }
}

