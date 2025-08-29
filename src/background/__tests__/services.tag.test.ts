import { describe, it, expect } from 'vitest';
import { DatabaseManager } from '../db/DatabaseManager';
import { TagService } from '../db/TagService';
import { BookmarkService } from '../db/BookmarkService';

describe('TagService (3.3)', () => {
  it('CRUD, attach/detach, stats and suggest', async () => {
    const db = new DatabaseManager('memory');
    await db.init();
    const tags = new TagService(db);
    const bms = new BookmarkService(db);

    const t1 = await tags.create('react', '#f00');
    const t2 = await tags.create('redux');
    await tags.rename(t2, 'reduxjs');

    const b1 = await bms.create({ title: 'React', url: 'https://react.dev' });
    const b2 = await bms.create({ title: 'Redux', url: 'https://redux.js.org' });
    await tags.attach(b1, t1);
    await tags.attach(b2, t1);
    await tags.attach(b2, t2);

    const s = await tags.stats();
    const reactStat = s.find(x => x.tag.id === t1)!;
    expect(reactStat.count).toBe(2);

    const suggested = await tags.suggest('re');
    expect(suggested.length).toBeGreaterThan(0);

    await tags.detach(b2, t2);
    const b2tags = await tags.tagsFor(b2);
    expect(b2tags.some(t => t.id === t2)).toBe(false);

    await tags.remove(t1);
    const s2 = await tags.stats();
    expect(s2.some(x => x.tag.id === t1)).toBe(false);
  });
});

