import { describe, it, expect } from 'vitest';
import { DatabaseManager } from '../db/DatabaseManager';
import { BookmarkService } from '../db/BookmarkService';

describe('BookmarkService (3.1)', () => {
  it('validates URL and supports batch ops', async () => {
    const db = new DatabaseManager('memory');
    await db.init();
    const svc = new BookmarkService(db);

    await expect(svc.create({ title: 'x', url: '' } as any)).rejects.toThrow();
    await expect(svc.create({ title: 'x', url: 'ftp://bad' } as any)).rejects.toThrow();

    const ids = await svc.createMany([
      { title: 'A', url: 'https://a' },
      { title: 'B', url: 'https://b' },
    ]);
    expect(ids.length).toBe(2);
    const all = await svc.byCategory(null);
    expect(all.length).toBe(2);

    await svc.deleteMany(ids);
    const left = await svc.byCategory(null);
    expect(left.length).toBe(0);
  });
});

