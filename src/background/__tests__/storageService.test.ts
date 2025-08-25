import { describe, it, expect, beforeEach, vi } from 'vitest';

declare global { var chrome: any }

function mockStorageArea() {
  const store: Record<string, any> = {};
  return {
    get: vi.fn((keys?: any, cb?: any) => {
      let result: any = {};
      if (!keys) result = { ...store };
      else if (typeof keys === 'string') result[keys] = store[keys];
      else if (Array.isArray(keys)) keys.forEach((k) => (result[k] = store[k]));
      else if (typeof keys === 'object') {
        // keys as defaults
        result = { ...keys, ...store };
      }
      cb && cb(result);
    }),
    set: vi.fn((items: any, cb?: any) => { Object.assign(store, items); cb && cb(); }),
    clear: vi.fn((cb?: any) => { Object.keys(store).forEach((k) => delete store[k]); cb && cb(); }),
    _dump: () => ({ ...store })
  };
}

beforeEach(async () => {
  globalThis.chrome = {
    storage: {
      local: mockStorageArea(),
      sync: mockStorageArea(),
    },
  };
});

describe('storageService', () => {
  it('saves and loads webpages in local', async () => {
    const { createStorageService } = await import('../storageService');
    const s = createStorageService();
    const pages = [
      { id: '1', title: 'A', url: 'https://a', favicon: '', note: '', category: 'default', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    ];
    await s.saveToLocal(pages);
    const loaded = await s.loadFromLocal();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].url).toBe('https://a');
  });

  it('saves and loads categories in sync', async () => {
    const { createStorageService } = await import('../storageService');
    const s = createStorageService();
    const cats = [
      { id: 'c1', name: 'Default', color: '#fff', order: 0 },
    ];
    await s.saveToSync(cats);
    const loaded = await s.loadFromSync();
    expect(loaded).toEqual(cats);
  });

  it('exports and imports data as JSON', async () => {
    const { createStorageService } = await import('../storageService');
    const s = createStorageService();
    const pages = [
      { id: '1', title: 'A', url: 'https://a', favicon: '', note: '', category: 'default', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    ];
    const cats = [ { id: 'c1', name: 'Default', color: '#fff', order: 0 } ];
    await s.saveToLocal([]);
    await s.saveToSync([]);
    const json = JSON.stringify({ webpages: pages, categories: cats });
    await s.importData(json);
    const dump = await s.exportData();
    const obj = JSON.parse(dump);
    expect(obj.webpages[0].title).toBe('A');
    expect(obj.categories[0].name).toBe('Default');
  });

  it('rejects invalid data on import', async () => {
    const { createStorageService } = await import('../storageService');
    const s = createStorageService();
    await expect(s.importData('{"webpages":[{"bad":true}]}')).rejects.toThrow();
  });
});

