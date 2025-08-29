import { describe, it, expect, vi } from 'vitest';
import { DatabaseManager } from '../db/DatabaseManager';
import { MigrationService } from '../migration/MigrationService';
import type { LegacyStores } from '../migration/types';

function legacyWith(countCats = 2, countPages = 3): LegacyStores {
  const cats = Array.from({ length: countCats }).map((_, i) => ({ id: `c${i}`, name: `Cat ${i}`, color: '#000', order: i }));
  const pages = Array.from({ length: countPages }).map((_, i) => ({ id: `p${i}`, title: `T${i}`, url: `https://u/${i}`, favicon: '', note: '', category: cats[0]?.id || 'default', createdAt: '', updatedAt: '' }));
  if (!cats.find(c=>c.id==='default')) cats.unshift({ id: 'default', name: 'Default', color: '#64748b', order: -1 } as any);
  return {
    async loadCategories() { return cats as any; },
    async loadWebpages() { return pages as any; },
  };
}

describe('MigrationService progress and dry-run', () => {
  it('emits progress and performs dry-run without writing', async () => {
    const db = new DatabaseManager('memory');
    await db.init();
    const m = new MigrationService(db, legacyWith(2, 3));
    const onProgress = vi.fn();
    const res = await m.migrate({ dryRun: true, onProgress });
    expect(onProgress).toHaveBeenCalled();
    expect(res.categories).toBeGreaterThan(0);
    expect(res.bookmarks).toBeGreaterThan(0);
    // Dry-run should not insert anything
    const afterCats = await db.listCategories();
    const afterBms = await db.listBookmarksByCategory(undefined);
    expect(afterCats.length).toBe(0);
    expect(afterBms.length).toBe(0);
  });

  it('continues on per-item error and records errors', async () => {
    const db = new DatabaseManager('memory');
    await db.init();
    const legacy: LegacyStores = {
      async loadCategories() { return [{ id: 'default', name: 'Default', color: '#333', order: 0 } as any, { id: 'bad', name: 'Bad', color: '', order: 1 } as any]; },
      async loadWebpages() { return [{ id: 'x', title: 'X', url: 'https://x', favicon: '', note: '', category: 'bad', createdAt: '', updatedAt: '' } as any]; },
    };
    // Monkey patch db to throw when inserting certain category
    const origInsert = db.insertCategory.bind(db);
    db.insertCategory = (row: any) => {
      if (row.name === 'Bad') return Promise.reject(new Error('boom'));
      return origInsert(row);
    };
    const m = new MigrationService(db, legacy);
    const res = await m.migrate();
    expect(res.errors && res.errors.length).toBeGreaterThan(0);
    // Successful ones still migrated
    const cats = await db.listCategories();
    expect(cats.find(c => c.name === 'Default')).toBeTruthy();
  });
});

