import { describe, it, expect, beforeEach } from 'vitest';
import { clearStore, getAll } from '../idb/db';
import { importNetscapeHtmlAsNewCategory } from '../importers/html';

async function reset() {
  await clearStore('webpages');
  await clearStore('categories');
  await clearStore('templates');
  try { await clearStore('subcategories' as any); } catch {}
}

const HTML = `
<DL><p>
  <DT><H3>AAA</H3>
  <DL><p>
    <DT><A HREF="https://a.com">A</A>
    <DT><A HREF="https://b.com">B</A>
  </DL><p>
  <DT><H3>BBB</H3>
  <DL><p>
    <DT><A HREF="https://c.com">C</A>
  </DL><p>
  <DT><A HREF="https://d.com">D</A>
</DL><p>`;

describe('HTML import (flat mode into new collection)', () => {
  beforeEach(async () => { await reset(); });

  it('creates a single target group and flattens all anchors', async () => {
    const res = await importNetscapeHtmlAsNewCategory(HTML, { name: 'Flat', mode: 'flat', flatGroupName: 'All' });
    expect(res.categoryId).toBeTruthy();
    const subcats = await getAll('subcategories' as any);
    const groups = subcats.filter((s: any) => s.categoryId === res.categoryId);
    expect(groups.length).toBe(1);
    expect(groups[0].name).toBe('All');
    const pages = await getAll('webpages');
    const inCat = pages.filter((p: any) => p.category === res.categoryId);
    expect(inCat.length).toBe(4);
    // verify all pages are in the single group
    const inGroup = inCat.every((p: any) => p.subcategoryId === groups[0].id);
    expect(inGroup).toBe(true);
  });
});

