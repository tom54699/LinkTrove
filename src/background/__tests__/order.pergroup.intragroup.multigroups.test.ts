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

describe('Per-group ordering with multiple groups', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('reorders within G1 (first → middle) without affecting G2', async () => {
    const { createStorageService } = await import('../storageService');
    const { createWebpageService } = await import('../webpageService');
    const s = createStorageService();
    const svc = createWebpageService({ storage: s });

    await s.saveToSync([{ id: 'c1', name: 'Work', color: '#888', order: 0 }] as any);
    const g1 = await s.createSubcategory!('c1', 'G1');
    const g2 = await s.createSubcategory!('c1', 'G2');
    await s.saveToLocal([
      { id: 'a', title: 'A', url: 'https://a', favicon: '', note: '', category: 'c1', subcategoryId: g1.id, createdAt: nowIso(), updatedAt: nowIso() },
      { id: 'b', title: 'B', url: 'https://b', favicon: '', note: '', category: 'c1', subcategoryId: g1.id, createdAt: nowIso(), updatedAt: nowIso() },
      { id: 'c', title: 'C', url: 'https://c', favicon: '', note: '', category: 'c1', subcategoryId: g1.id, createdAt: nowIso(), updatedAt: nowIso() },
      { id: 'x', title: 'X', url: 'https://x', favicon: '', note: '', category: 'c1', subcategoryId: g2.id, createdAt: nowIso(), updatedAt: nowIso() },
      { id: 'y', title: 'Y', url: 'https://y', favicon: '', note: '', category: 'c1', subcategoryId: g2.id, createdAt: nowIso(), updatedAt: nowIso() },
    ] as any);

    // Move 'a' before 'c' within G1 → expected: [b, a, c]
    await svc.reorderWebpages('a', 'c');
    const all = await svc.loadWebpages();
    const g1Ids = all.filter((w: any) => w.subcategoryId === g1.id).map((w) => w.id);
    const g2Ids = all.filter((w: any) => w.subcategoryId === g2.id).map((w) => w.id);
    expect(g1Ids).toEqual(['b', 'a', 'c']);
    expect(g2Ids).toEqual(['x', 'y']);
  });
});

