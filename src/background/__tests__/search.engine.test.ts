import { describe, it, expect } from 'vitest';
import { DatabaseManager } from '../db/DatabaseManager';
import { BookmarkService } from '../db/BookmarkService';
import { SearchEngine } from '../search/SearchEngine';

describe('SearchEngine 4.1', () => {
  it('returns results with scoring and highlight', async () => {
    const db = new DatabaseManager('memory');
    await db.init();
    const bms = new BookmarkService(db);
    const se = new SearchEngine(db);
    await bms.create({ title: 'React Guide', url: 'https://react.dev', description: 'Learn React' });
    await bms.create({ title: 'Vite Docs', url: 'https://vitejs.dev', description: 'Build tool' });
    const res = await se.fullText('React', { limit: 5 });
    expect(res.length).toBeGreaterThan(0);
    expect(res[0].highlight.title?.includes('<mark>React</mark>') || res[0].highlight.description?.includes('<mark>React</mark>')).toBe(true);
    // Cache hit path
    const res2 = await se.fullText('React', { limit: 5 });
    expect(res2.length).toBe(res.length);
  });
});

