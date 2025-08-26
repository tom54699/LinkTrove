import { describe, it, expect } from 'vitest';
import {
  createExportImportService,
  type StorageLike,
} from '../data/exportImport';

function makeStorage(
  initial: { pages?: any[]; cats?: any[] } = {}
): StorageLike {
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
    exportData: async () =>
      JSON.stringify({ webpages: pages, categories: cats }),
    importData: async (json) => {
      const obj = JSON.parse(json);
      pages = obj.webpages ?? [];
      cats = obj.categories ?? [];
    },
  };
}

describe('export/import service (task 10)', () => {
  it('exports JSON string from storage', async () => {
    const storage = makeStorage({
      pages: [{ id: '1', title: 'A', url: 'https://a' }],
      cats: [],
    });
    const svc = createExportImportService({ storage });
    const json = await svc.exportJson();
    const obj = JSON.parse(json);
    expect(obj.webpages[0].url).toBe('https://a');
  });

  it('merges on import by url/id and reports counts', async () => {
    const storage = makeStorage({
      pages: [{ id: '1', title: 'A', url: 'https://a' }],
      cats: [{ id: 'c1', name: 'Default', color: '#fff', order: 0 }],
    });
    const svc = createExportImportService({ storage });
    const incoming = {
      webpages: [
        { id: 'x', title: 'Dup A', url: 'https://a' },
        { id: '2', title: 'B', url: 'https://b' },
      ],
      categories: [
        { id: 'c1', name: 'Default', color: '#fff', order: 0 },
        { id: 'c2', name: 'Work', color: '#0f0', order: 1 },
      ],
    };
    const res = await svc.importJsonMerge(JSON.stringify(incoming));
    expect(res.addedPages).toBe(1);
    expect(res.addedCategories).toBe(1);
    const exported = JSON.parse(await storage.exportData());
    expect(exported.webpages.map((p: any) => p.url)).toEqual([
      'https://a',
      'https://b',
    ]);
    expect(exported.categories.map((c: any) => c.id)).toEqual(['c1', 'c2']);
  });

  it('rejects invalid JSON', async () => {
    const storage = makeStorage();
    const svc = createExportImportService({ storage });
    await expect(svc.importJsonMerge('{bad json')).rejects.toThrow(
      /invalid json/i
    );
  });
});
