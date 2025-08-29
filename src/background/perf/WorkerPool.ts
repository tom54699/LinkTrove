export type Task<T=any> = () => Promise<T> | T;

export class WorkerPool {
  private queue: Array<{ task: Task; resolve: (v:any)=>void; reject: (e:any)=>void }> = [];
  private concurrency: number;
  private running = 0;
  constructor(concurrency = 2) { this.concurrency = Math.max(1, concurrency); }
  exec<T>(task: Task<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => { this.queue.push({ task, resolve, reject }); this.pump(); });
  }
  private pump() {
    while (this.running < this.concurrency && this.queue.length) {
      const { task, resolve, reject } = this.queue.shift()!;
      this.running++;
      // Defer to next tick to avoid blocking
      setTimeout(async () => {
        try { const res = await task(); resolve(res); } catch (e) { reject(e); } finally { this.running--; this.pump(); }
      }, 0);
    }
  }
}

