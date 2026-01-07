import { describe, it, expect, beforeEach, vi } from 'vitest';
import { waitFor } from '@testing-library/react';
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

const META_FIXTURE = {
  description: 'Auto Desc',
  siteName: 'AutoSite',
  author: 'AutoAuthor',
  url: 'https://ex.com/',
  // novel canonical fields
  bookTitle: '書名A',
  serialStatus: '連載中',
  genre: '奇幻',
  wordCount: '123456',
  latestChapter: '第10章 測試',
  coverImage: 'https://img.example/cover.jpg',
  bookUrl: 'https://ex.com/book',
  lastUpdate: '2025-01-02T03:04:05.000Z',
};

beforeEach(async () => {
  vi.resetModules();
  vi.doMock('../pageMeta', () => ({
    waitForTabComplete: vi.fn(async () => {}),
    extractMetaForTab: vi.fn(async () => META_FIXTURE),
    queuePendingExtraction: vi.fn(),
  }));
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
    await waitFor(async () => {
      const pages = await getAll('webpages');
      const one = (pages as any[]).find((p) => p.id === created.id);
      expect(one?.note).toBe('Auto Desc');
    });
    const pages = await getAll('webpages');
    const one = (pages as any[]).find((p) => p.id === created.id);
    // should also backfill siteName/author when template fields exist and empty
    expect((one?.meta || {}).siteName).toBe('AutoSite');
    expect((one?.meta || {}).author).toBe('AutoAuthor');
    // and fill canonical book fields regardless of template
    expect((one?.meta || {}).bookTitle).toBe('書名A');
    expect((one?.meta || {}).serialStatus).toBe('連載中');
    expect((one?.meta || {}).genre).toBe('奇幻');
    expect((one?.meta || {}).wordCount).toBe('123456');
    expect((one?.meta || {}).latestChapter).toBe('第10章 測試');
    expect((one?.meta || {}).coverImage).toBe('https://img.example/cover.jpg');
    expect((one?.meta || {}).bookUrl).toBe('https://ex.com/book');
    expect((one?.meta || {}).lastUpdate).toBe('2025-01-02T03:04:05.000Z');
  });
});
