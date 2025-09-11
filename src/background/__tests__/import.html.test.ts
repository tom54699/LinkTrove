import { describe, it, expect, beforeEach } from 'vitest';
import { clearStore, putAll, getAll } from '../idb/db';
import { importNetscapeHtmlIntoGroup, parseNetscapeAnchors } from '../importers/html';

async function reset() {
  await clearStore('webpages');
  await clearStore('categories');
  await clearStore('templates');
  try { await clearStore('subcategories' as any); } catch {}
}

describe('Netscape HTML import (M2)', () => {
  beforeEach(async () => {
    await reset();
  });

  it('parses anchors and optional DD', () => {
    const html = `
      <DL><p>
        <DT><A HREF="https://a.com">A Site</A>
        <DD>Alpha
        <DT><A HREF="https://b.com">B</A>
      </DL>
    `;
    const got = parseNetscapeAnchors(html);
    expect(got.length).toBe(2);
    expect(got[0].url).toBe('https://a.com');
    expect(got[0].title).toBe('A Site');
    expect(got[0].desc).toBe('Alpha');
    expect(got[1].url).toBe('https://b.com');
  });

  it('imports into an existing group preserving order', async () => {
    const c = [{ id: 'c1', name: 'Dev', color: '#fff', order: 0 }];
    const g = [{ id: 'g1', categoryId: 'c1', name: 'group', order: 0, createdAt: Date.now(), updatedAt: Date.now() }];
    await putAll('categories', c as any);
    await putAll('subcategories' as any, g as any);
    const html = `
      <DL><p>
        <DT><A HREF="https://nodejs.org">Node.js</A>
        <DT><A HREF="https://www.typescriptlang.org/docs/">TS Handbook</A>
      </DL>
    `;
    const res = await importNetscapeHtmlIntoGroup('g1', 'c1', html);
    expect(res.pagesCreated).toBe(2);
    const pages = await getAll('webpages');
    const inGroup = pages.filter((p: any) => p.subcategoryId === 'g1');
    expect(inGroup.length).toBe(2);
    const titles = inGroup.map((p: any) => p.title).sort();
    expect(titles).toEqual(['Node.js', 'TS Handbook']);
  });
});

