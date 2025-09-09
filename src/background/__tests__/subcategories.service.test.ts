import { beforeEach, describe, expect, it } from 'vitest';

async function resetDb() {
  try {
    await new Promise((res, rej) => {
      const req = indexedDB.deleteDatabase('linktrove');
      req.onsuccess = () => res(null);
      req.onerror = () => rej(req.error);
    });
  } catch {}
}

describe('StorageService subcategories (groups) API', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('creates, lists, renames and reorders groups in a collection', async () => {
    const { createStorageService } = await import('../storageService');
    const s = createStorageService();
    // seed categories
    await s.saveToSync([
      { id: 'c1', name: 'Work', color: '#888', order: 0 },
    ] as any);
    const a = await s.createSubcategory!('c1', 'A');
    const b = await s.createSubcategory!('c1', 'B');
    let list = await s.listSubcategories!('c1');
    expect(list.map((x) => x.name)).toEqual(['A', 'B']);
    // rename
    await s.renameSubcategory!(a.id, 'A1');
    list = await s.listSubcategories!('c1');
    expect(list[0].name).toBe('A1');
    // reorder
    await s.reorderSubcategories!('c1', [b.id, a.id]);
    list = await s.listSubcategories!('c1');
    expect(list.map((x) => x.id)).toEqual([b.id, a.id]);
  });

  it('reassigns webpages when deleting a group', async () => {
    const { createStorageService } = await import('../storageService');
    const s = createStorageService();
    await s.saveToSync([
      { id: 'c1', name: 'Work', color: '#888', order: 0 },
    ] as any);
    const g1 = await s.createSubcategory!('c1', 'G1');
    const g2 = await s.createSubcategory!('c1', 'G2');
    const now = new Date().toISOString();
    await s.saveToLocal([
      { id: 'p1', title: 'A', url: 'https://a', favicon: '', note: '', category: 'c1', subcategoryId: g1.id, createdAt: now, updatedAt: now },
      { id: 'p2', title: 'B', url: 'https://b', favicon: '', note: '', category: 'c1', subcategoryId: g1.id, createdAt: now, updatedAt: now },
    ] as any);
    await s.deleteSubcategory!(g1.id, g2.id);
    const pages = await s.loadFromLocal();
    expect(pages.every((p) => p.subcategoryId === g2.id)).toBe(true);
  });

  it('deletes webpages under the group when using deleteSubcategoryAndPages', async () => {
    const { createStorageService } = await import('../storageService');
    const s = createStorageService();
    await s.saveToSync([
      { id: 'c1', name: 'Work', color: '#888', order: 0 },
    ] as any);
    const g1 = await s.createSubcategory!('c1', 'G1');
    const g2 = await s.createSubcategory!('c1', 'G2');
    const now = new Date().toISOString();
    await s.saveToLocal([
      { id: 'p1', title: 'A', url: 'https://a', favicon: '', note: '', category: 'c1', subcategoryId: g1.id, createdAt: now, updatedAt: now },
      { id: 'p2', title: 'B', url: 'https://b', favicon: '', note: '', category: 'c1', subcategoryId: g1.id, createdAt: now, updatedAt: now },
      { id: 'p3', title: 'C', url: 'https://c', favicon: '', note: '', category: 'c1', subcategoryId: g2.id, createdAt: now, updatedAt: now },
    ] as any);
    await (s as any).deleteSubcategoryAndPages(g1.id);
    const pages = await s.loadFromLocal();
    expect(pages.find((p: any) => p.id === 'p1')).toBeFalsy();
    expect(pages.find((p: any) => p.id === 'p2')).toBeFalsy();
    expect(pages.find((p: any) => p.id === 'p3')).toBeTruthy();
  });
});
