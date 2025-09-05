import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { putAll, getAll } from '../db';

async function resetDb() {
  try {
    await new Promise((res, rej) => {
      const req = indexedDB.deleteDatabase('linktrove');
      req.onsuccess = () => res(null);
      req.onerror = () => rej(req.error);
    });
  } catch {}
}

describe('IDB migration for subcategories (v2)', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('creates default group per collection and assigns webpages.subcategoryId', async () => {
    const cats = [
      { id: 'c1', name: 'Work', color: '#888', order: 0 },
      { id: 'c2', name: 'Home', color: '#777', order: 1 },
    ];
    const pages = [
      {
        id: 'p1',
        title: 'A',
        url: 'https://a',
        favicon: '',
        note: '',
        category: 'c1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'p2',
        title: 'B',
        url: 'https://b',
        favicon: '',
        note: '',
        category: 'c2',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    // Seed initial data (no subcategories and pages without subcategoryId)
    await putAll('categories', cats as any);
    await putAll('webpages', pages as any);

    // Trigger storage initialization (runs migrations)
    const { createStorageService } = await import('../../storageService');
    createStorageService();

    const subcats = (await getAll('subcategories' as any)) as any[];
    expect(subcats.length).toBeGreaterThanOrEqual(2);

    const pagesAfter = (await getAll('webpages')) as any[];
    for (const p of pagesAfter) {
      expect(p.subcategoryId).toBeTruthy();
      const sc = subcats.find((s) => s.id === p.subcategoryId);
      expect(sc).toBeTruthy();
      expect(sc.categoryId).toBe(p.category);
    }
  });

  it('exposes composite index on webpages: category_subcategory', async () => {
    const { openDb } = await import('../db');
    const db = await openDb();
    const t = db.transaction('webpages', 'readonly');
    const s = t.objectStore('webpages');
    // Should not throw
    const idx = s.index('category_subcategory');
    expect(idx).toBeTruthy();
  });
});
