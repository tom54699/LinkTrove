import { describe, it, expect } from 'vitest';
import { DatabaseManager } from '../db/DatabaseManager';
import { BookmarkService } from '../db/BookmarkService';
import { CategoryService } from '../db/CategoryService';
import { TagService } from '../db/TagService';
import { AdvancedSearch, getSearchSuggestions, InMemoryHistory, SearchEngine } from '../search/SearchEngine';

describe('Search 4.2 advanced', () => {
  it('filters by categories (with children), tags, and sorts', async () => {
    const db = new DatabaseManager('memory');
    await db.init();
    const cats = new CategoryService(db);
    const bms = new BookmarkService(db);
    const tags = new TagService(db);
    const se = new SearchEngine(db);
    const adv = new AdvancedSearch(db, se);

    const root = await cats.create({ name: 'Root' });
    const dev = await cats.create({ name: 'Dev', parentId: root });
    const life = await cats.create({ name: 'Life', parentId: root });
    const tid = await tags.create('react');

    const a = await bms.create({ title: 'React Guide', url: 'https://react.dev', description: 'learn', categoryId: dev });
    const b = await bms.create({ title: 'Cooking', url: 'https://cook.dev', description: 'recipe', categoryId: life });
    await tags.attach(a, tid);

    const r1 = await adv.run('react', { categories: [root], includeChildren: true });
    expect(r1.find(x => x.title === 'React Guide')).toBeTruthy();
    const r2 = await adv.run('react', { categories: [life], includeChildren: true });
    expect(r2.length).toBe(0);

    const r3 = await adv.run('react', { tags: [tid] });
    expect(r3.length).toBe(1);

    const r4 = await adv.run('', { sortBy: 'title' });
    expect(r4.length).toBe(2);
  });

  it('suggestions and history', async () => {
    const db = new DatabaseManager('memory');
    await db.init();
    const bms = new BookmarkService(db);
    const se = new SearchEngine(db);
    await bms.create({ title: 'React Guide', url: 'https://react.dev' });
    const s = await getSearchSuggestions(db, 're');
    expect(s.length).toBeGreaterThan(0);
    await se.fullText('react');
    await se.fullText('vite');
    const hist = new InMemoryHistory();
    hist.save('react'); hist.save('react'); hist.save('vite');
    expect(hist.list()[0]).toBe('vite');
    expect(hist.list()[1]).toBe('react');
  });
});

