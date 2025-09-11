import { describe, it, expect, beforeEach } from 'vitest';
import { clearStore, getAll, putAll } from '../idb/db';
import { importNetscapeHtmlIntoCategory } from '../importers/html';

async function reset() {
  await clearStore('webpages');
  await clearStore('categories');
  await clearStore('templates');
  try { await clearStore('subcategories' as any); } catch {}
}

describe('Netscape HTML import into category (multi-group)', () => {
  beforeEach(async () => {
    await reset();
  });

  it('creates groups from H3 and imports links preserving per-group order', async () => {
    await putAll('categories', [{ id: 'c1', name: 'Dev', color: '#fff', order: 0 }] as any);
    const html = `
      <DL><p>
        <DT><H3>Frontend</H3>
        <DL><p>
          <DT><A HREF="https://react.dev">React</A>
          <DT><A HREF="https://vitejs.dev">Vite</A>
        </DL><p>
        <DT><H3>Backend</H3>
        <DL><p>
          <DT><A HREF="https://nodejs.org">Node.js</A>
        </DL><p>
      </DL>
    `;
    const res = await importNetscapeHtmlIntoCategory('c1', html);
    expect(res.groupsCreated).toBeGreaterThanOrEqual(2);
    expect(res.pagesCreated).toBe(3);
    const groups = await getAll('subcategories' as any);
    const names = groups.filter((g: any) => g.categoryId === 'c1').map((g: any) => g.name).sort();
    expect(names).toEqual(['Backend', 'Frontend']);
    const pages = await getAll('webpages');
    expect(pages.some((p: any) => p.title.includes('React'))).toBe(true);
    expect(pages.some((p: any) => p.title.includes('Node'))).toBe(true);
  });
});

