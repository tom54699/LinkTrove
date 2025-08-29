export interface MemorySample { usedJSHeapSize?: number; totalJSHeapSize?: number; jsHeapSizeLimit?: number; ts: number }

export class MemoryMonitor {
  private samples: MemorySample[] = [];
  sample() {
    const perf: any = (globalThis as any).performance;
    const mem = perf && perf.memory ? { usedJSHeapSize: perf.memory.usedJSHeapSize, totalJSHeapSize: perf.memory.totalJSHeapSize, jsHeapSizeLimit: perf.memory.jsHeapSizeLimit } : {};
    const s: MemorySample = { ...mem, ts: Date.now() };
    this.samples.push(s);
    if (this.samples.length > 100) this.samples.shift();
    return s;
  }
  getSamples() { return this.samples.slice(); }
}

