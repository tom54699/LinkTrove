import { describe, it, expect } from 'vitest';
import { DatabaseManager } from '../db/DatabaseManager';
import { IndexAdvisor } from '../maintenance/IndexAdvisor';

describe('Perf 6.2 IndexAdvisor', () => {
  it('returns suggestions or empty without throwing', async () => {
    const db = new DatabaseManager('sqlite');
    await db.init();
    const adv = new IndexAdvisor(db);
    if (!adv.supported()) {
      expect(adv.suggestions()).toEqual([]);
      return;
    }
    const s = adv.suggestions();
    expect(Array.isArray(s)).toBe(true);
  });
});

