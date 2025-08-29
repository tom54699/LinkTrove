import { describe, it, expect } from 'vitest';
import { Profiler } from '../perf/Profiler';

describe('Perf 6.2 Profiler', () => {
  it('records spans and returns top results', async () => {
    const p = new Profiler();
    const end1 = p.start('fast');
    end1();
    const end2 = p.start('slow');
    await new Promise(r => setTimeout(r, 5));
    end2();
    const top = p.top(1);
    expect(top[0].name).toBe('slow');
    expect(p.getAll().length).toBeGreaterThan(0);
  });
});

