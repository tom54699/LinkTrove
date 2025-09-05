import { describe, it, expect } from 'vitest';
import { createExportImportService, type StorageLike } from '../data/exportImport';
import { getAll, clearStore } from '../../background/idb/db';

function makeStorage(initial: { pages?: any[]; cats?: any[] } = {}): StorageLike {
  let pages = initial.pages ?? [];
  let cats = initial.cats ?? [];
  return {
    saveToLocal: async (d) => {
      pages = d as any;
    },
    loadFromLocal: async () => pages as any,
    saveToSync: async (d) => {
      cats = d as any;
    },
    loadFromSync: async () => cats as any,
    loadTemplates: async () => [],
    saveTemplates: async () => {},
    exportData: async () => JSON.stringify({ webpages: pages, categories: cats }),
    importData: async () => {},
  };
}

describe('export/import subcategories (task 13.3)', () => {
  it('creates default group per collection and assigns subcategoryId on import when missing', async () => {
    await clearStore('webpages');
    await clearStore('categories');
    await clearStore('templates');
    try { await clearStore('subcategories' as any); } catch {}
    const storage = makeStorage();
    const svc = createExportImportService({ storage });
    const incoming = {
      webpages: [
        { id: '1', title: 'A', url: 'https://a', category: 'c1' },
        { id: '2', title: 'B', url: 'https://b', category: 'c2' },
      ],
      categories: [
        { id: 'c1', name: 'Col1', color: '#fff', order: 0 },
        { id: 'c2', name: 'Col2', color: '#0f0', order: 1 },
      ],
      // no subcategories field
    } as any;
    await svc.importJsonMerge(JSON.stringify(incoming));
    const subcats = (await getAll('subcategories' as any)) as any[];
    expect(subcats.length).toBeGreaterThanOrEqual(2);
    const pages = await storage.loadFromLocal();
    expect(pages.every((p: any) => typeof p.subcategoryId === 'string')).toBe(true);
    for (const p of pages as any[]) {
      const sc = subcats.find((s) => s.id === p.subcategoryId);
      expect(sc).toBeTruthy();
      expect(sc.categoryId).toBe(p.category);
    }
  });
});

