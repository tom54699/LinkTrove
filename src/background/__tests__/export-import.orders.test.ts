import { beforeEach, describe, it, expect } from 'vitest';

async function resetDb() {
  try {
    await new Promise((res, rej) => {
      const req = indexedDB.deleteDatabase('linktrove');
      req.onsuccess = () => res(null);
      req.onerror = () => rej(req.error);
    });
  } catch {}
}

function nowIso() {
  return new Date().toISOString();
}

describe('Export/Import includes per-group orders', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('exports orders.subcategories and restores group order on import', async () => {
    const { createStorageService } = await import('../storageService');
    const { createWebpageService } = await import('../webpageService');
    const s = createStorageService();
    const svc = createWebpageService({ storage: s });

    // Seed
    await s.saveToSync([{ id: 'c1', name: 'C1', color: '#888', order: 0 }] as any);
    const g1 = await (s as any).createSubcategory('c1', 'G1');
    await s.saveToLocal([
      { id: 'a', title: 'A', url: 'https://a', favicon: '', note: '', category: 'c1', subcategoryId: g1.id, createdAt: nowIso(), updatedAt: nowIso() },
      { id: 'b', title: 'B', url: 'https://b', favicon: '', note: '', category: 'c1', subcategoryId: g1.id, createdAt: nowIso(), updatedAt: nowIso() },
      { id: 'c', title: 'C', url: 'https://c', favicon: '', note: '', category: 'c1', subcategoryId: g1.id, createdAt: nowIso(), updatedAt: nowIso() },
    ] as any);
    // Reorder: a before c -> expected order [b, a, c]
    await svc.reorderWebpages('a', 'c');

    // Export
    const json = await s.exportData();
    const data = JSON.parse(json);
    expect(data.schemaVersion).toBe(1);
    expect(data.orders && data.orders.subcategories).toBeTruthy();
    const ord = data.orders.subcategories[g1.id] as string[] | undefined;
    expect(Array.isArray(ord)).toBe(true);
    // ord should reflect [b, a, c] or at least contain ids in a non-empty array
    expect(ord && ord.length).toBeGreaterThan(0);

    // Reset DB and import
    await resetDb();
    const s2 = createStorageService();
    const svc2 = createWebpageService({ storage: s2 });
    await s2.importData(json);
    const after = await svc2.loadWebpages();
    const g1Ids = after.filter((w: any) => w.subcategoryId === g1.id).map((w) => w.id);
    // Exact order match
    expect(g1Ids).toEqual(['b', 'a', 'c']);
  });
});

