import { describe, it, expect } from 'vitest';
import { DatabaseManager } from '../db/DatabaseManager';
import { MigrationService } from '../migration/MigrationService';
import type { LegacyStores } from '../migration/types';

const sample = {
  cats: [
    { id: 'default', name: 'Default', color: '#64748b', order: 0 },
    { id: 'c1', name: 'Tech', color: '#1976d2', order: 1 },
  ],
  pages: [
    { id: 'w1', title: 'React', url: 'https://react.dev', favicon: '', note: '', category: 'c1', createdAt: '', updatedAt: '' },
    { id: 'w2', title: '', url: 'https://vitejs.dev', favicon: '', note: 'Build tool', category: 'c1', createdAt: '', updatedAt: '' },
  ],
};

function makeLegacy(data = sample): LegacyStores {
  return {
    async loadWebpages() { return data.pages as any; },
    async loadCategories() { return data.cats as any; },
    async clearWebpages() { /* no-op */ },
    async clearCategories() { /* no-op */ },
  };
}

describe('MigrationService', () => {
  it('detects legacy and migrates into DB (memory backend)', async () => {
    const db = new DatabaseManager('memory');
    await db.init();
    const m = new MigrationService(db, makeLegacy());

    const has = await m.detectLegacyData();
    expect(has).toBe(true);

    const res = await m.migrate();
    expect(res.categories).toBeGreaterThanOrEqual(2);
    expect(res.bookmarks).toBe(2);

    const ok = await m.validate(res);
    expect(ok).toBe(true);
  });
});

