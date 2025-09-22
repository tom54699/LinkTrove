import { describe, it, expect, beforeEach } from 'vitest';
import { clearStore, putAll, getAll } from '../idb/db';

declare global {
  var chrome: any;
}

function mockStorageArea() {
  const store: Record<string, any> = {};
  return {
    get: (keys?: any, cb?: any) => {
      let result: any = {};
      if (!keys) result = { ...store };
      else if (typeof keys === 'string') result[keys] = store[keys];
      else if (Array.isArray(keys)) keys.forEach((k) => (result[k] = store[k]));
      else if (typeof keys === 'object') {
        result = { ...keys, ...store };
      }
      cb && cb(result);
    },
    set: (items: any, cb?: any) => {
      Object.assign(store, items);
      cb && cb();
    },
    clear: (cb?: any) => {
      Object.keys(store).forEach((k) => delete store[k]);
      cb && cb();
    },
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

beforeEach(async () => {
  globalThis.chrome = { storage: { local: mockStorageArea(), sync: mockStorageArea() } } as any;
  await reset();
});

describe('webpageService.addTabToGroup (atomic add)', () => {
  it('adds a card into target category/group and appears in load', async () => {
    const { createWebpageService } = await import('../webpageService');
    await putAll('categories', [{ id: 'c1', name: 'C1', color: '#888', order: 0 }] as any);
    await putAll('subcategories' as any, [{ id: 'g1', categoryId: 'c1', name: 'group', order: 0, createdAt: Date.now(), updatedAt: Date.now() }] as any);

    const svc = createWebpageService();
    const created = await (svc as any).addTabToGroup({ url: 'https://ex.com', title: 'Ex' }, 'c1', 'g1');
    expect(created.category).toBe('c1');
    expect((created as any).subcategoryId).toBe('g1');

    const list = await svc.loadWebpages();
    const inGroup = (list as any[]).filter((w) => (w as any).subcategoryId === 'g1');
    expect(inGroup.map((w: any) => w.url)).toContain('https://ex.com/');
  });

  it('respects beforeId insertion within group order', async () => {
    const { createWebpageService } = await import('../webpageService');
    await putAll('categories', [{ id: 'c1', name: 'C1', color: '#888', order: 0 }] as any);
    await putAll('subcategories' as any, [{ id: 'g1', categoryId: 'c1', name: 'group', order: 0, createdAt: Date.now(), updatedAt: Date.now() }] as any);
    const svc = createWebpageService();

    const a = await (svc as any).addTabToGroup({ url: 'https://a.com', title: 'A' }, 'c1', 'g1');
    const b = await (svc as any).addTabToGroup({ url: 'https://b.com', title: 'B' }, 'c1', 'g1');
    const c = await (svc as any).addTabToGroup({ url: 'https://c.com', title: 'C' }, 'c1', 'g1', a.id);

    const list = await svc.loadWebpages();
    const ids = (list as any[]).filter((w) => (w as any).subcategoryId === 'g1').map((w) => (w as any).id);
    // Expect C inserted before A, then B remains after
    const orderStr = ids.join(',');
    expect(orderStr.indexOf(c.id)).toBeLessThan(orderStr.indexOf(a.id));
  });

  it('does not include title/description in meta even if template defines them', async () => {
    const { createWebpageService } = await import('../webpageService');
    // Category with template defining title/description/siteName
    await putAll('categories', [{ id: 'c1', name: 'C1', color: '#888', order: 0, defaultTemplateId: 't1' }] as any);
    await putAll('templates', [{ id: 't1', name: 'T', fields: [{ key: 'title' }, { key: 'description' }, { key: 'siteName' }] }] as any);
    await putAll('subcategories' as any, [{ id: 'g1', categoryId: 'c1', name: 'group', order: 0, createdAt: Date.now(), updatedAt: Date.now() }] as any);

    const svc = createWebpageService();
    const created = await (svc as any).addTabToGroup({ url: 'https://site.com/page', title: 'MyTitle' }, 'c1', 'g1');
    const meta = (created as any).meta || {};
    expect('title' in meta).toBe(false);
    expect('description' in meta).toBe(false);
  });

  it('deduplicates same URL within a short window', async () => {
    const { createWebpageService } = await import('../webpageService');
    await putAll('categories', [{ id: 'c1', name: 'C1', color: '#888', order: 0 }] as any);
    await putAll('subcategories' as any, [{ id: 'g1', categoryId: 'c1', name: 'group', order: 0, createdAt: Date.now(), updatedAt: Date.now() }] as any);
    const svc = createWebpageService();
    await (svc as any).addTabToGroup({ url: 'https://dup.com', title: 'A' }, 'c1', 'g1');
    await (svc as any).addTabToGroup({ url: 'https://dup.com', title: 'B' }, 'c1', 'g1');
    const list = await svc.loadWebpages();
    const dupByUrl = (list as any[]).filter((w) => w.url === 'https://dup.com/');
    expect(dupByUrl.length).toBe(1);
  });
});

