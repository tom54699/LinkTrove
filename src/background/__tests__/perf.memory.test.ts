import { describe, it, expect } from 'vitest';
import { MemoryMonitor } from '../perf/MemoryMonitor';

describe('Perf 6.1 MemoryMonitor', () => {
  it('collects memory samples (best-effort)', () => {
    const mm = new MemoryMonitor();
    const s = mm.sample();
    expect(s.ts).toBeGreaterThan(0);
    expect(mm.getSamples().length).toBeGreaterThan(0);
  });
});

