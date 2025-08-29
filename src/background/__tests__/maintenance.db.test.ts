import { describe, it, expect } from 'vitest';
import { DatabaseManager } from '../db/DatabaseManager';
import { DbMaintenance } from '../maintenance/DbMaintenance';

describe('Perf 6.2 DB maintenance', () => {
  it('runs maintenance commands without throwing', async () => {
    const db = new DatabaseManager('memory'); await db.init();
    const m = new DbMaintenance(db);
    await m.vacuum();
    await m.analyze();
    await m.reindex();
    expect(true).toBe(true);
  });
});

