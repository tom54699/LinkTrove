import { describe, it, expect } from 'vitest';
import { DatabaseManager } from '../db/DatabaseManager';
import { CategoryService } from '../db/CategoryService';
import { BookmarkService } from '../db/BookmarkService';

describe('CategoryService stats (3.2)', () => {
  it('computes direct and withChildren counts', async () => {
    const db = new DatabaseManager('memory');
    await db.init();
    const cats = new CategoryService(db);
    const bms = new BookmarkService(db);

    const root = await cats.create({ name: 'Root' });
    const c1 = await cats.create({ name: 'C1', parentId: root });
    const c2 = await cats.create({ name: 'C2', parentId: c1 });

    await bms.create({ title: 'a', url: 'https://a', categoryId: root });
    await bms.create({ title: 'b', url: 'https://b', categoryId: c1 });
    await bms.create({ title: 'c', url: 'https://c', categoryId: c2 });

    const s = await cats.stats();
    const sRoot = s.find(x => x.id === root)!;
    const sC1 = s.find(x => x.id === c1)!;
    const sC2 = s.find(x => x.id === c2)!;
    expect(sRoot.direct).toBe(1);
    expect(sRoot.withChildren).toBe(3);
    expect(sC1.direct).toBe(1);
    expect(sC1.withChildren).toBe(2);
    expect(sC2.direct).toBe(1);
    expect(sC2.withChildren).toBe(1);
  });
});

