import { describe, it, expect, beforeEach } from 'vitest';
import { DatabaseManager } from '../db/DatabaseManager';
import { BookmarkService } from '../db/BookmarkService';

describe('DatabaseManager + BookmarkService (in-memory fallback)', () => {
  let db: DatabaseManager;
  let svc: BookmarkService;

  beforeEach(async () => {
    db = new DatabaseManager();
    await db.init();
    svc = new BookmarkService(db);
  });

  it('initializes and is ready', () => {
    expect(db.isReady()).toBe(true);
  });

  it('creates, reads, updates, deletes a bookmark', async () => {
    const id = await svc.create({
      title: 'Hello',
      url: 'https://a.test',
      description: 'World',
    });
    const got1 = await svc.get(id);
    expect(got1?.title).toBe('Hello');
    expect(got1?.url).toBe('https://a.test');

    await svc.update(id, { title: 'Hi' });
    const got2 = await svc.get(id);
    expect(got2?.title).toBe('Hi');

    await svc.remove(id);
    const got3 = await svc.get(id);
    expect(got3).toBeUndefined();
  });

  it('filters by category and supports search', async () => {
    const catA = 1; // no strict category table needed for this test
    const catB = 2;
    const a = await svc.create({
      title: 'SQLite Intro',
      url: 'https://sq.test',
      categoryId: catA,
    });
    const b = await svc.create({
      title: 'React Patterns',
      url: 'https://re.test',
      categoryId: catB,
    });
    const c = await svc.create({
      title: 'Vite Guide',
      url: 'https://vi.test',
      categoryId: catA,
      description: 'Build tool',
    });

    const listA = await svc.byCategory(catA);
    expect(listA.map((x) => x.id).sort()).toEqual([a, c].sort());

    const q1 = await svc.search('react');
    expect(q1.map((x) => x.id)).toEqual([b]);
    const q2 = await svc.search('Build');
    expect(q2.map((x) => x.id)).toEqual([c]);
  });
});
