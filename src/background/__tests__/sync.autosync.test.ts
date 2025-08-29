import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AutoSync } from '../sync/AutoSync';

describe('Sync 5.2 AutoSync scheduler', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('runs on interval and stops', async () => {
    const runner = vi.fn().mockResolvedValue(undefined);
    const as = new AutoSync(runner, { intervalMs: 1000, jitterMs: 0 });
    as.start();
    expect(runner).toHaveBeenCalledTimes(0);
    await vi.advanceTimersByTimeAsync(1000);
    expect(runner).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1000);
    expect(runner).toHaveBeenCalledTimes(2);
    as.stop();
    await vi.advanceTimersByTimeAsync(2000);
    expect(runner).toHaveBeenCalledTimes(2);
  });

  it('backs off on error then resumes', async () => {
    const runner = vi.fn()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValue(undefined);
    const as = new AutoSync(runner, { intervalMs: 1000, jitterMs: 0, maxBackoffMs: 10_000 });
    as.start();
    // first tick
    await vi.advanceTimersByTimeAsync(1000);
    expect(runner).toHaveBeenCalledTimes(1);
    // backoff should be 2000ms now; advancing 1000 should not trigger
    await vi.advanceTimersByTimeAsync(1000);
    expect(runner).toHaveBeenCalledTimes(1);
    // advance another 1000 to hit 2000 backoff
    await vi.advanceTimersByTimeAsync(1000);
    expect(runner).toHaveBeenCalledTimes(2);
    as.stop();
  });
});

