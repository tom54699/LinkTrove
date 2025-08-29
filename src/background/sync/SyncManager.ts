import { DatabaseManager, type BookmarkRow, type CategoryRow, type TagRow, type BookmarkTagRow } from '../db/DatabaseManager';

export interface ExportBundle {
  version: string;
  timestamp: number;
  bookmarks: BookmarkRow[];
  categories: CategoryRow[];
  tags: TagRow[];
  bookmark_tags: BookmarkTagRow[];
}

export class SyncManager {
  constructor(private db: DatabaseManager) {}

  async exportToJSON(): Promise<string> {
    const snap = await this.db.exportSnapshot();
    const bundle: ExportBundle = {
      version: '1',
      timestamp: Date.now(),
      bookmarks: snap.bookmarks,
      categories: snap.categories,
      tags: snap.tags,
      bookmark_tags: snap.bookmark_tags,
    };
    return JSON.stringify(bundle);
  }

  async exportToNetscapeHTML(): Promise<string> {
    const snap = await this.db.exportSnapshot();
    const children = new Map<number | null, CategoryRow[]>();
    for (const c of snap.categories) {
      const pid = (c.parent_id ?? null) as any;
      if (!children.has(pid)) children.set(pid, []);
      children.get(pid)!.push(c);
    }
    const byCat = new Map<number | null, BookmarkRow[]>();
    for (const b of snap.bookmarks) {
      const cid = (b.category_id ?? null) as any;
      if (!byCat.has(cid)) byCat.set(cid, []);
      byCat.get(cid)!.push(b);
    }
    const esc = (s: string) => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    function renderFolder(id: number | null, name: string): string {
      let out = `\n<DT><H3>${esc(name)}</H3>\n<DL><p>`;
      const items = byCat.get(id) || [];
      for (const b of items) {
        out += `\n<DT><A HREF=\"${esc(b.url)}\">${esc(b.title || b.url)}</A>`;
      }
      const kids = children.get(id) || [];
      for (const c of kids) out += renderFolder(c.id, c.name);
      out += `\n</DL><p>`;
      return out;
    }
    const html = [
      '<!DOCTYPE NETSCAPE-Bookmark-file-1>',
      '<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">',
      '<TITLE>Bookmarks</TITLE>',
      '<H1>Bookmarks</H1>',
      '<DL><p>',
      renderFolder(null, 'ROOT'),
      '</DL><p>'
    ].join('\n');
    return html;
  }

  async exportToChromeFormat(): Promise<string> {
    const snap = await this.db.exportSnapshot();
    const children = new Map<number | null, CategoryRow[]>();
    for (const c of snap.categories) {
      const pid = (c.parent_id ?? null) as any;
      if (!children.has(pid)) children.set(pid, []);
      children.get(pid)!.push(c);
    }
    const byCat = new Map<number | null, BookmarkRow[]>();
    for (const b of snap.bookmarks) {
      const cid = (b.category_id ?? null) as any;
      if (!byCat.has(cid)) byCat.set(cid, []);
      byCat.get(cid)!.push(b);
    }
    function asNode(id: number | null, name: string) {
      const kids = children.get(id) || [];
      const items = byCat.get(id) || [];
      return {
        name,
        type: 'folder',
        children: [
          ...kids.map((c) => asNode(c.id, c.name)),
          ...items.map((b) => ({ name: b.title || b.url, type: 'url', url: b.url }))
        ]
      } as any;
    }
    const root = { roots: { bookmark_bar: asNode(null, 'Bookmarks bar') }, version: 1 }; // minimal shape
    return JSON.stringify(root);
  }

  async importFromJSON(json: string): Promise<{ imported: number; skipped: number }>
  {
    let data: any;
    try { data = JSON.parse(json); } catch { throw new Error('Invalid JSON'); }
    if (!data || !Array.isArray(data.bookmarks) || !Array.isArray(data.categories)) throw new Error('Invalid bundle');
    // Normalize categories by name: keep existing and create missing
    const snap = await this.db.exportSnapshot();
    const nameToId = new Map<string, number>();
    for (const c of snap.categories) nameToId.set(c.name, c.id);
    const idMap = new Map<number, number>();
    for (const c of data.categories as CategoryRow[]) {
      if (!c?.name) continue;
      if (nameToId.has(c.name)) { idMap.set(c.id, nameToId.get(c.name)!); continue; }
      const newId = await this.db.insertCategory({ name: c.name, color: c.color, icon: (c as any).icon, parent_id: null, sort_order: c.sort_order ?? 0 });
      nameToId.set(c.name, newId); idMap.set(c.id, newId);
    }
    // Duplicate URL handling
    const norm = (u: string) => (u||'').replace(/^https?:\/\//,'').replace(/^www\./,'').replace(/\/$/,'').toLowerCase();
    const existing = new Set<string>((await this.db.listBookmarksByCategory(undefined)).map(b => norm(b.url)));
    let imported = 0, skipped = 0;
    await this.db.transaction(async () => {
      for (const b of data.bookmarks as BookmarkRow[]) {
        const title = (b.title || b.url || '').trim(); const url = (b.url || '').trim();
        if (!title || !url) { skipped++; continue; }
        const key = norm(url); if (existing.has(key)) { skipped++; continue; }
        const cid = (b.category_id != null && idMap.has(b.category_id)) ? idMap.get(b.category_id)! : null;
        await this.db.insertBookmark({ title, url, description: b.description || '', category_id: cid, favicon: b.favicon || '', meta: b.meta || {}, sort_order: b.sort_order ?? 0 });
        existing.add(key); imported++;
      }
    });
    return { imported, skipped };
  }

  async importFromChromeFormat(chromeJson: string): Promise<{ imported: number }> {
    let data: any; try { data = JSON.parse(chromeJson); } catch { throw new Error('Invalid Chrome JSON'); }
    const walk = (node: any, currentCat: number | null, imported: { n: number }) => {
      if (!node) return;
      if (Array.isArray(node.children)) {
        for (const child of node.children) {
          if (child.type === 'folder' || child.type === 'folderNode' || child.children) {
            // Create or reuse category by name
            // For simplicity, flatten under root
            // In a full impl, preserve hierarchy
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            (async () => {
              const id = await this.db.insertCategory({ name: child.name || 'Folder', color: undefined, icon: undefined, parent_id: currentCat, sort_order: 0 });
              walk(child, id, imported);
            })();
          } else if (child.type === 'url' || child.url) {
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            (async () => {
              try { await this.db.insertBookmark({ title: child.name || child.url, url: child.url, description: '', category_id: currentCat, favicon: '', meta: {}, sort_order: 0 }); imported.n++; } catch {}
            })();
          }
        }
      }
    };
    const root = data?.roots?.bookmark_bar || data?.roots?.other || data?.roots?.synced || data;
    const counter = { n: 0 };
    walk(root, null, counter);
    return { imported: counter.n };
  }
}

