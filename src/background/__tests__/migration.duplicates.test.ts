import { describe, it, expect } from 'vitest';
import { DatabaseManager } from '../db/DatabaseManager';
import { MigrationService } from '../migration/MigrationService';
import type { LegacyStores } from '../migration/types';

describe('Migration duplicate handling', () => {
  it('skips duplicate URLs and reports skipped count', async () => {
    const db = new DatabaseManager('memory');
    await db.init();
    const legacy: LegacyStores = {
      async loadCategories() { return [{ id: 'default', name: 'Default', color: '#333', order: 0 } as any]; },
      async loadWebpages() {
        return [
          { id: 'a', title: 'One', url: 'https://ex.com' } as any,
          { id: 'b', title: 'Dup', url: 'https://ex.com/' } as any,
          { id: 'c', title: 'Two', url: 'https://ex2.com' } as any,
        ];
      },
    };
    const m = new MigrationService(db, legacy);
    const res = await m.migrate();
    expect(res.skipped).toBeGreaterThanOrEqual(1);
    const all = await db.listBookmarksByCategory(undefined);
    // Only two unique remain
    expect(all.length).toBe(2);
  });
});

