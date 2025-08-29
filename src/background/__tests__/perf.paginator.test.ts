import { describe, it, expect } from 'vitest';
import { DatabaseManager } from '../db/DatabaseManager';
import { BookmarkService } from '../db/BookmarkService';
import { BookmarkPaginator } from '../perf/Paginator';

describe('Perf 6.1 Paginator', () => {
  it('paginates and caches pages', async () => {
    const db = new DatabaseManager('memory'); await db.init();
    const bms = new BookmarkService(db);
    for (let i=0;i<25;i++) await bms.create({ title: 'T'+i, url: `https://u/${i}` });
    const p = new BookmarkPaginator(db);
    const a = await p.get(null, 0, 10);
    expect(a.items.length).toBe(10);
    const b = await p.get(null, 1, 10);
    expect(b.items.length).toBe(10);
    const c = await p.get(null, 2, 10);
    expect(c.items.length).toBe(5);
    const again = await p.get(null, 0, 10);
    expect(again.items[0].url).toBe(a.items[0].url); // cached
  });
});

