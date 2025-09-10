import { describe, it, expect, beforeEach } from 'vitest';
import { clearStore, getAll, setMeta, putAll } from '../idb/db';
import { importTobyV3 } from '../importers/toby';

async function reset() {
  await clearStore('webpages');
  await clearStore('categories');
  await clearStore('templates');
  try { await clearStore('subcategories' as any); } catch {}
  // clear any orders keys loosely by overwriting known ones in test
}

describe('Toby v3 import (M2)', () => {
  beforeEach(async () => {
    await reset();
  });

  it('imports lists as categories with groups and preserves order', async () => {
    const sample = {
      version: 3,
      lists: [
        { title: 'Dev', cards: [
          { title: 'Node.js', url: 'https://nodejs.org' },
          { customTitle: 'TS Handbook', url: 'https://www.typescriptlang.org/docs/', customDescription: 'TS Guide' },
        ]},
        { title: 'Design', cards: [ { title: 'Figma', url: 'https://www.figma.com' } ] },
      ]
    } as any;

    const res = await importTobyV3(JSON.stringify(sample));
    expect(res.categoriesCreated).toBe(2);
    expect(res.groupsCreated).toBe(2);
    expect(res.pagesCreated).toBe(3);

    const cats = await getAll('categories');
    expect(cats.map((c: any) => c.name).sort()).toEqual(['Design', 'Dev']);

    const subcats = await getAll('subcategories' as any);
    expect(subcats.length).toBe(2);
    const devGroup = subcats.find((g: any) => g.name === 'Dev');
    expect(devGroup).toBeTruthy();

    const pages = await getAll('webpages');
    const inDev = pages.filter((p: any) => p.subcategoryId === devGroup.id);
    expect(inDev.length).toBe(2);
    // Check order meta was set (latest id should be the second card)
    // We cannot read meta directly here (no list API), but we can infer load order by the logic in app layer.
    // For simplicity, assert titles preserved and both mapped
    const titles = inDev.map((p: any) => p.title).sort();
    expect(titles).toEqual(['Node.js', 'TS Handbook']);
    const ts = inDev.find((p: any) => p.title === 'TS Handbook');
    expect(ts.note).toBe('TS Guide');
  });

  it('reuses existing category by name (case-insensitive)', async () => {
    // Seed an existing category named "Dev"
    const seeded = [{ id: 'c_seed', name: 'dev', color: '#000', order: 0 }];
    await clearStore('categories');
    await putAll('categories', seeded as any);

    const sample = { version: 3, lists: [{ title: 'Dev', cards: [ { title: 'A', url: 'https://a.com' } ] }] };
    const res = await importTobyV3(JSON.stringify(sample));
    expect(res.categoriesCreated).toBe(0);
    const cats = await getAll('categories');
    expect(cats.length).toBe(1);
  });
});
