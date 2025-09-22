import { describe, it, expect, beforeEach, vi } from 'vitest';
import { clearStore, putAll, getAll } from '../idb/db';

declare global { var chrome: any; }

function mockStorageArea() {
  const store: Record<string, any> = {};
  return {
    get: (keys?: any, cb?: any) => {
      let result: any = {};
      if (!keys) result = { ...store };
      else if (typeof keys === 'string') result[keys] = store[keys];
      else if (Array.isArray(keys)) keys.forEach((k) => (result[k] = store[k]));
      else if (typeof keys === 'object') { result = { ...keys, ...store }; }
      cb && cb(result);
    },
    set: (items: any, cb?: any) => { Object.assign(store, items); cb && cb(); },
    clear: (cb?: any) => { Object.keys(store).forEach((k) => delete store[k]); cb && cb(); },
    _dump: () => ({ ...store }),
  };
}

async function reset() {
  await clearStore('webpages');
  await clearStore('categories');
  await clearStore('templates');
  try { await clearStore('subcategories' as any); } catch {}
  try { await clearStore('organizations' as any); } catch {}
  try { await clearStore('meta'); } catch {}
}

// Mock pageMeta to simulate extraction after tab completes
vi.mock('../pageMeta', () => ({
  waitForTabComplete: vi.fn(async () => {}),
  extractMetaForTab: vi.fn(async () => ({
    description: 'Auto Desc',
    siteName: 'AutoSite',
    author: 'AutoAuthor',
    url: 'https://ex.com/',
  })),
}));

beforeEach(async () => {
  globalThis.chrome = { storage: { local: mockStorageArea(), sync: mockStorageArea() } } as any;
  await reset();
});

describe('addTabToGroup enrichment (non-blocking)', () => {
  it('fills note from description when empty and tabId present', async () => {
    const { createWebpageService } = await import('../webpageService');
    await putAll('categories', [{ id: 'c1', name: 'C1', color: '#888', order: 0, defaultTemplateId: 't1' }] as any);
    await putAll('templates', [{ id: 't1', name: 'T', fields: [{ key: 'siteName' }, { key: 'author' }] }] as any);
    await putAll('subcategories' as any, [{ id: 'g1', categoryId: 'c1', name: 'group', order: 0, createdAt: Date.now(), updatedAt: Date.now() }] as any);

    const svc = createWebpageService();
    const created = await (svc as any).addTabToGroup({ id: 10, url: 'https://ex.com/page', title: 'X' }, 'c1', 'g1');
    expect(created.note).toBe('');
    // wait a tick for enrichment
    await new Promise((r) => setTimeout(r, 10));
    const pages = await getAll('webpages');
    const one = (pages as any[]).find((p) => p.id === created.id);
    expect(one?.note).toBe('Auto Desc');
    // should also backfill siteName/author when template fields exist and empty
    expect((one?.meta || {}).siteName).toBe('AutoSite');
    expect((one?.meta || {}).author).toBe('AutoAuthor');
  });
});

