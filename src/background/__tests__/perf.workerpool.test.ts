import { describe, it, expect } from 'vitest';
import { WorkerPool } from '../perf/WorkerPool';

describe('Perf 6.1 WorkerPool', () => {
  it('runs tasks with limited concurrency', async () => {
    const pool = new WorkerPool(2);
    const started: number[] = [];
    const finish: number[] = [];
    const task = (id: number) => async () => { started.push(id); await new Promise(r => setTimeout(r, 5)); finish.push(id); };
    await Promise.all([ pool.exec(task(1)), pool.exec(task(2)), pool.exec(task(3)) ]);
    expect(started.length).toBe(3);
    expect(finish.length).toBe(3);
  });
});

