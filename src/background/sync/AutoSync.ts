export interface AutoSyncOptions {
  intervalMs?: number; // base interval
  maxBackoffMs?: number; // cap for backoff
  jitterMs?: number; // add random jitter up to this many ms
}

export class AutoSync {
  private intervalMs: number;
  private maxBackoffMs: number;
  private jitterMs: number;
  private timer: any = null;
  private running = false;
  private backoffMs: number | null = null;

  constructor(private runner: () => Promise<void>, opts: AutoSyncOptions = {}) {
    this.intervalMs = opts.intervalMs ?? 60_000;
    this.maxBackoffMs = opts.maxBackoffMs ?? 15 * 60_000;
    this.jitterMs = opts.jitterMs ?? 500;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.schedule(this.intervalMs);
  }

  stop() {
    this.running = false;
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
    this.backoffMs = null;
  }

  async triggerNow() {
    if (!this.running) return;
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
    await this.runOnce();
    // schedule next based on current policy
    const d = this.backoffMs ?? this.intervalMs;
    this.schedule(d);
  }

  private schedule(delayMs: number) {
    if (!this.running) return;
    const jitter = Math.floor(Math.random() * this.jitterMs);
    const d = Math.max(0, delayMs + jitter);
    this.timer = setTimeout(() => { this.runOnce().finally(() => this.schedule(this.backoffMs ?? this.intervalMs)); }, d);
  }

  private async runOnce() {
    try {
      await this.runner();
      // success resets backoff
      this.backoffMs = null;
    } catch {
      // exponential backoff capped
      const next = this.backoffMs ? Math.min(this.backoffMs * 2, this.maxBackoffMs) : this.intervalMs * 2;
      this.backoffMs = next;
    }
  }
}

