import { describe, it, expect, beforeEach } from 'vitest';

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

beforeEach(async () => {
  globalThis.chrome = {
    storage: { local: mockStorageArea(), sync: mockStorageArea() },
  };
});

describe('WebpageService (task 6.1)', () => {
  it('adds webpage from tab and loads it', async () => {
    const { createWebpageService } = await import('../webpageService');
    const svc = createWebpageService();
    const created = await svc.addWebpageFromTab({
      id: 10,
      title: '  Example  ',
      url: 'https://ex.com',
      favIconUrl: '',
    });
    expect(created.title).toBe('Example');
    const list = await svc.loadWebpages();
    expect(list.length).toBe(1);
    expect(list[0].url).toBe('https://ex.com/');
  });

  it('allows duplicate by url and creates unique ids', async () => {
    const { createWebpageService } = await import('../webpageService');
    const svc = createWebpageService();
    const a = await svc.addWebpageFromTab({
      url: 'https://dup.com',
      title: 'A',
      favIconUrl: '',
    });
    const b = await svc.addWebpageFromTab({
      url: 'https://dup.com',
      title: 'B',
      favIconUrl: '',
    });
    expect(a.id).not.toBe(b.id);
    const list = await svc.loadWebpages();
    expect(list.length).toBe(2);
  });

  it('updates a webpage and bumps updatedAt', async () => {
    const { createWebpageService } = await import('../webpageService');
    const svc = createWebpageService();
    const created = await svc.addWebpageFromTab({
      url: 'https://upd.com',
      title: 'T',
      favIconUrl: '',
    });
    const before = created.updatedAt;
    // ensure timestamp tick
    await new Promise((r) => setTimeout(r, 2));
    const updated = await svc.updateWebpage(created.id, { note: 'hello' });
    expect(updated.note).toBe('hello');
    expect(new Date(updated.updatedAt).getTime()).toBeGreaterThan(
      new Date(before).getTime()
    );
  });

  it('deletes a webpage', async () => {
    const { createWebpageService } = await import('../webpageService');
    const svc = createWebpageService();
    const created = await svc.addWebpageFromTab({
      url: 'https://del.com',
      title: 'Del',
      favIconUrl: '',
    });
    await svc.deleteWebpage(created.id);
    const list = await svc.loadWebpages();
    expect(list.length).toBe(0);
  });

  it('rejects invalid urls', async () => {
    const { createWebpageService } = await import('../webpageService');
    const svc = createWebpageService();
    await expect(
      svc.addWebpageFromTab({ url: 'javascript:alert(1)', title: 'bad' } as any)
    ).rejects.toThrow();
  });
});
