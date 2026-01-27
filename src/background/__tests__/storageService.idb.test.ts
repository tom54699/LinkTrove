import { describe, it, expect, beforeEach } from 'vitest';

async function resetDb() {
  try {
    await new Promise((res, rej) => {
      const req = indexedDB.deleteDatabase('linktrove');
      req.onsuccess = () => res(null);
      req.onerror = () => rej(req.error);
    });
  } catch {}
}

describe('createStorageService (IDB)', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('saves and loads webpages/categories/templates', async () => {
    const { createStorageService } = await import('../storageService');
    const s = createStorageService();
    const pages = [
      {
        id: 'p1',
        title: 'T',
        url: 'https://x',
        favicon: '',
        note: '',
        category: 'c1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
    const cats = [{ id: 'c1', name: 'Bookmarks', color: '#999', order: 0 }];
    const tmpls = [{ id: 't1', name: 'Basic', fields: [] }];
    await s.saveToLocal(pages as any);
    await s.saveToSync(cats as any);
    await s.saveTemplates(tmpls as any);
    expect((await s.loadFromLocal()).length).toBe(1);
    expect((await s.loadFromSync()).length).toBe(1);
    expect((await s.loadTemplates()).length).toBe(1);
  });
});
