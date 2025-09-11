import { describe, it, expect, beforeEach } from 'vitest';
import { clearStore, putAll, getAll } from '../idb/db';
import { importTobyV3IntoGroup } from '../importers/toby';

async function reset() {
  await clearStore('webpages');
  await clearStore('categories');
  await clearStore('templates');
  try { await clearStore('subcategories' as any); } catch {}
}

describe('Toby import into group (cards-only JSON)', () => {
  beforeEach(async () => { await reset(); });

  it('imports cards array into the specified group and preserves order list', async () => {
    await putAll('categories', [{ id: 'c1', name: 'Dev', color: '#fff', order: 0 }] as any);
    const now = Date.now();
    const g = { id: 'g1', categoryId: 'c1', name: 'G', order: 0, createdAt: now, updatedAt: now } as any;
    await putAll('subcategories' as any, [g]);
    const data = { version: 3, cards: [
      { title: 'A', url: 'https://a.example.com' },
      { customTitle: 'B', url: 'https://b.example.com' },
    ] };
    const res = await importTobyV3IntoGroup('g1', 'c1', JSON.stringify(data));
    expect(res.pagesCreated).toBe(2);
    const pages = await getAll('webpages');
    const inG = pages.filter((p: any) => p.subcategoryId === 'g1');
    expect(inG.length).toBe(2);
  });
});

