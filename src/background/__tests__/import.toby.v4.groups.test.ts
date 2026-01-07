import 'fake-indexeddb/auto';
import { describe, it, expect } from 'vitest';
import { getAll } from '../idb/db';

const GROUPS_ONLY = JSON.stringify({
  groups: [
    {
      name: 'Group1',
      lists: [
        { title: 'L1', cards: [{ title: 'Hello', url: 'https://hello.example.com' }] },
        { title: 'L2', cards: [{ title: 'World', url: 'https://world.example.com' }] },
      ],
    },
  ],
});

describe('Toby v4 import groups-only', () => {
  it('creates organization from group and categories from lists', async () => {
    const { importTobyV4WithOrganizations } = await import('../importers/toby');
    const res = await importTobyV4WithOrganizations(GROUPS_ONLY);
    expect(res.orgsCreated).toBe(1); // 1 organization (Group1)
    expect(res.categoriesCreated).toBe(1); // 1 category (Group1)
    expect(res.groupsCreated).toBe(2); // 2 subcategories (L1, L2)
    expect(res.pagesCreated).toBe(2);

    const orgs = (await getAll('organizations' as any)) as any[];
    expect(orgs.length).toBe(1);
    expect(orgs[0].name).toBe('Imported'); // groups-only defaults to Imported org name

    const cats = (await getAll('categories')) as any[];
    expect(cats.length).toBe(1); // Group1 becomes category
    expect(cats[0].name).toBe('Group1');

    const subcats = (await getAll('subcategories' as any)) as any[];
    expect(subcats.length).toBe(2); // L1/L2 become subcategories

    const pages = (await getAll('webpages')) as any[];
    expect(pages.length).toBe(2);
  });
});
