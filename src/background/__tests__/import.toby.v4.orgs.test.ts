import 'fake-indexeddb/auto';
import { describe, it, expect } from 'vitest';
import { getAll, getMeta } from '../idb/db';

const SAMPLE = JSON.stringify({
  organizations: [
    {
      name: 'Org A',
      groups: [
        {
          name: 'Project X',
          lists: [
            {
              title: 'Reading',
              cards: [
                { title: 'A', url: 'https://a.example.com' },
                { title: 'B', url: 'https://b.example.com' },
              ],
            },
          ],
        },
      ],
    },
    {
      name: 'Org B',
      groups: [
        {
          name: 'Project Y',
          lists: [
            {
              title: 'Inbox',
              cards: [{ title: 'C', url: 'https://c.example.com' }],
            },
          ],
        },
      ],
    },
  ],
});

describe('Toby v4 import with organizations', () => {
  it('creates organizations, categories under each, lists as groups, and pages with order.meta', async () => {
    const { importTobyV4WithOrganizations } = await import('../importers/toby');
    const res = await importTobyV4WithOrganizations(SAMPLE);
    expect(res.orgsCreated).toBe(2);
    expect(res.categoriesCreated).toBe(2);
    expect(res.groupsCreated).toBe(2);
    expect(res.pagesCreated).toBe(3);

    const orgs = (await getAll('organizations' as any)) as any[];
    expect(orgs.length).toBeGreaterThanOrEqual(2);
    const cats = (await getAll('categories')) as any[];
    // Each category should point to one of the created orgs
    const orgIds = new Set(orgs.map((o) => o.id));
    expect(cats.every((c) => orgIds.has(c.organizationId))).toBe(true);
    const subcats = (await getAll('subcategories' as any)) as any[];
    expect(subcats.length).toBe(2);
    // order meta exists for at least one group
    const key = `order.subcat.${subcats[0].id}`;
    const order = await getMeta<string[]>(key);
    expect(Array.isArray(order)).toBe(true);
  });
});

