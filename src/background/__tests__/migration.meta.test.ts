import { describe, it, expect } from 'vitest';
import { DatabaseManager } from '../db/DatabaseManager';
import { MigrationService } from '../migration/MigrationService';
import type { LegacyStores } from '../migration/types';

describe('Migration preserves meta/custom fields', () => {
  it('migrates webpage.meta into bookmark.meta JSON', async () => {
    const db = new DatabaseManager('memory');
    await db.init();
    const legacy: LegacyStores = {
      async loadCategories() { return [{ id: 'default', name: 'Default', color: '#333', order: 0 } as any]; },
      async loadWebpages() { return [{ id: 'w1', title: 'A', url: 'https://a', favicon: '', note: 'n', category: 'default', meta: { siteName: 'SN', author: 'AU' }, createdAt: '', updatedAt: '' } as any]; },
    };
    const m = new MigrationService(db, legacy);
    await m.migrate();
    const all = await db.listBookmarksByCategory(undefined);
    expect(all[0].meta).toBeDefined();
    expect(all[0].meta.siteName).toBe('SN');
    expect(all[0].meta.author).toBe('AU');
  });
});

