export type TableName = 'categories' | 'bookmarks' | 'tags' | 'bookmark_tags';

export interface CategoryRow {
  id: number;
  name: string;
  color?: string;
  icon?: string;
  parent_id?: number | null;
  sort_order?: number;
  created_at: number; // epoch ms
}

export interface BookmarkRow {
  id: number;
  title: string;
  url: string;
  description?: string;
  category_id?: number | null;
  favicon?: string;
  visit_count?: number;
  last_visited?: number | null;
  created_at: number;
  updated_at: number;
  // Extensions to preserve original project semantics
  meta?: any; // JSON of custom fields / site metadata
  sort_order?: number; // position within category
}

export interface TagRow { id: number; name: string; color?: string }
export interface BookmarkTagRow { bookmark_id: number; tag_id: number }

export class DatabaseManager {
  private ready = false;
  private backendKind: 'memory' | 'sqlite' = 'memory';
  // sqlite runtime handle (when available)
  private sqlite: any = null;
  private sqliteDb: any = null;
  private hasFts5 = false;
  // In-memory fallback store
  private seq: Record<TableName, number> = {
    categories: 0,
    bookmarks: 0,
    tags: 0,
    bookmark_tags: 0, // not used, but kept for uniformity
  } as any;
  private categories = new Map<number, CategoryRow>();
  private bookmarks = new Map<number, BookmarkRow>();
  private tags = new Map<number, TagRow>();
  private bookmarkTags = new Set<string>(); // `${bid}:${tid}`

  constructor(kind: 'memory' | 'sqlite' = 'memory') {
    this.backendKind = kind;
  }

  async init(): Promise<void> {
    if (this.backendKind === 'sqlite') {
      const ok = await this.tryInitSqlite();
      if (ok) { this.ready = true; return; }
      // fallback to memory if sqlite failed
      this.backendKind = 'memory';
    }
    this.ready = true;
  }

  isReady(): boolean { return this.ready; }
  getBackend(): 'memory' | 'sqlite' { return this.backendKind; }

  private async tryInitSqlite(): Promise<boolean> {
    try {
      // Dynamic import; if library is absent, this will throw and we fallback
      // Note: This is a placeholder import path; real integration can adjust.
      const mod: any = await import(/* @vite-ignore */ '@sqlite.org/sqlite-wasm');
      this.sqlite = mod;
      // Open an OPFS-backed database if available, else memory db
      // Many sqlite-wasm builds expose `sqlite3InitModule` and `oo1.DB` helpers
      const sqlite3 = await (mod.sqlite3InitModule ? mod.sqlite3InitModule() : mod.default?.());
      const cap = sqlite3?.opfs?.isAvailable ? 'opfs' : 'memory';
      const dbName = 'linktrove.db';
      this.sqliteDb = cap === 'opfs'
        ? new sqlite3.oo1.OpfsDb(dbName)
        : new sqlite3.oo1.DB(dbName, 'ct');
      await this.createSchemaIfMissing();
      this.backendKind = 'sqlite';
      return true;
    } catch {
      return false;
    }
  }

  private async createSchemaIfMissing(): Promise<void> {
    if (!this.sqliteDb?.exec) return;
    const exec = (sql: string) => this.sqliteDb.exec({ sql });
    // Basic tables; FTS to be added when confirmed supported in build
    exec(`CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      color TEXT,
      icon TEXT,
      parent_id INTEGER,
      sort_order INTEGER DEFAULT 0,
      created_at INTEGER
    );`);
    exec(`CREATE TABLE IF NOT EXISTS bookmarks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      url TEXT NOT NULL,
      description TEXT,
      category_id INTEGER,
      favicon TEXT,
      meta TEXT,
      sort_order INTEGER DEFAULT 0,
      visit_count INTEGER DEFAULT 0,
      last_visited INTEGER,
      created_at INTEGER,
      updated_at INTEGER
    );`);
    exec(`CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      color TEXT
    );`);
    exec(`CREATE TABLE IF NOT EXISTS bookmark_tags (
      bookmark_id INTEGER,
      tag_id INTEGER,
      PRIMARY KEY (bookmark_id, tag_id)
    );`);
    exec('CREATE INDEX IF NOT EXISTS idx_bookmarks_url ON bookmarks(url);');
    exec('CREATE INDEX IF NOT EXISTS idx_bookmarks_title ON bookmarks(title);');
    exec('CREATE INDEX IF NOT EXISTS idx_bookmarks_category ON bookmarks(category_id);');
    exec('CREATE INDEX IF NOT EXISTS idx_bookmarks_created ON bookmarks(created_at);');

    // Meta KV for versioning
    exec(`CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT
    );`);
    // Set initial version if absent
    exec(`INSERT INTO meta(key,value)
          SELECT 'db_version','1'
          WHERE NOT EXISTS (SELECT 1 FROM meta WHERE key='db_version');`);

    // Try FTS5 support
    try {
      exec(`CREATE VIRTUAL TABLE IF NOT EXISTS bookmarks_fts
            USING fts5(title, description, url, content='bookmarks', content_rowid='id');`);
      // Triggers to keep FTS in sync
      exec(`CREATE TRIGGER IF NOT EXISTS bookmarks_ai AFTER INSERT ON bookmarks BEGIN
              INSERT INTO bookmarks_fts(rowid, title, description, url)
              VALUES (new.id, new.title, new.description, new.url);
            END;`);
      exec(`CREATE TRIGGER IF NOT EXISTS bookmarks_ad AFTER DELETE ON bookmarks BEGIN
              INSERT INTO bookmarks_fts(bookmarks_fts, rowid) VALUES('delete', old.id);
            END;`);
      exec(`CREATE TRIGGER IF NOT EXISTS bookmarks_au AFTER UPDATE ON bookmarks BEGIN
              INSERT INTO bookmarks_fts(bookmarks_fts, rowid) VALUES('delete', old.id);
              INSERT INTO bookmarks_fts(rowid, title, description, url)
              VALUES (new.id, new.title, new.description, new.url);
            END;`);
      this.hasFts5 = true;
    } catch {
      this.hasFts5 = false;
    }
  }

  // --- Helpers for sqlite path ---
  private run(sql: string): void {
    if (!this.sqliteDb) return;
    this.sqliteDb.exec({ sql });
  }
  private select<T=any>(sql: string): T[] {
    if (!this.sqliteDb) return [] as any;
    const rows: T[] = [];
    this.sqliteDb.exec({ sql, rowMode: 'object', callback: (row: any) => rows.push(row) });
    return rows;
  }

  // Very small helper – not part of public API in the future
  private nextId(table: TableName): number {
    this.seq[table] = (this.seq[table] || 0) + 1;
    return this.seq[table];
  }

  async transaction<T>(fn: () => Promise<T>): Promise<T> {
    if (this.backendKind === 'sqlite' && this.sqliteDb?.exec) {
      try {
        this.sqliteDb.exec({ sql: 'BEGIN' });
        const out = await fn();
        this.sqliteDb.exec({ sql: 'COMMIT' });
        return out;
      } catch (e) {
        try { this.sqliteDb.exec({ sql: 'ROLLBACK' }); } catch {}
        throw e;
      }
    }
    // In-memory: best-effort; clone state and rollback on throw
    const cats = new Map(this.categories);
    const bms = new Map(this.bookmarks);
    const tags = new Map(this.tags);
    const links = new Set(this.bookmarkTags);
    const seq = { ...this.seq } as any;
    try {
      const out = await fn();
      return out;
    } catch (e) {
      this.categories = cats;
      this.bookmarks = bms;
      this.tags = tags;
      this.bookmarkTags = links;
      this.seq = seq;
      throw e;
    }
  }

  // Category ops
  async insertCategory(row: Omit<CategoryRow, 'id' | 'created_at'>): Promise<number> {
    if (this.backendKind === 'sqlite') {
      const now = Date.now();
      this.run(`INSERT INTO categories(name,color,icon,parent_id,sort_order,created_at)
                VALUES (${q(row.name)}, ${q(row.color)}, ${q(row.icon)}, ${n(row.parent_id)}, ${n(row.sort_order ?? 0)}, ${now});`);
      const idRow = this.select<{ id: number }>('SELECT last_insert_rowid() AS id')[0];
      return idRow?.id ?? 0;
    }
    const id = this.nextId('categories');
    const now = Date.now();
    const r: CategoryRow = { id, created_at: now, sort_order: row.sort_order ?? 0, ...row } as any;
    this.categories.set(id, r);
    return id;
  }
  async getCategory(id: number): Promise<CategoryRow | undefined> { return this.categories.get(id); }
  async listCategories(): Promise<CategoryRow[]> {
    if (this.backendKind === 'sqlite') {
      return this.select<CategoryRow>('SELECT * FROM categories ORDER BY sort_order ASC, id ASC');
    }
    return Array.from(this.categories.values()).sort((a,b)=> (a.sort_order??0)-(b.sort_order??0));
  }

  // Bookmark ops
  async insertBookmark(row: Omit<BookmarkRow, 'id'|'created_at'|'updated_at'>): Promise<number> {
    if (this.backendKind === 'sqlite') {
      const now = Date.now();
      const metaJson = row.meta === undefined ? '{}' : (typeof row.meta === 'string' ? row.meta : JSON.stringify(row.meta));
      const orderVal = row.sort_order ?? 0;
      this.run(`INSERT INTO bookmarks(title,url,description,category_id,favicon,meta,sort_order,visit_count,last_visited,created_at,updated_at)
                VALUES (${q(row.title)}, ${q(row.url)}, ${q(row.description)}, ${n(row.category_id)}, ${q(row.favicon)}, ${q(metaJson)}, ${n(orderVal)}, 0, NULL, ${now}, ${now});`);
      const idRow = this.select<{ id: number }>('SELECT last_insert_rowid() AS id')[0];
      return idRow?.id ?? 0;
    }
    const id = this.nextId('bookmarks');
    const now = Date.now();
    const r: BookmarkRow = { id, created_at: now, updated_at: now, visit_count: 0, meta: row.meta ?? {}, sort_order: row.sort_order ?? 0, ...row } as any;
    this.bookmarks.set(id, r);
    return id;
  }
  async getBookmark(id: number): Promise<BookmarkRow | undefined> {
    if (this.backendKind === 'sqlite') {
      return this.select<BookmarkRow>(`SELECT * FROM bookmarks WHERE id=${id} LIMIT 1`)[0];
    }
    return this.bookmarks.get(id);
  }
  async updateBookmark(id: number, patch: Partial<BookmarkRow>): Promise<void> {
    if (this.backendKind === 'sqlite') {
      const sets: string[] = [];
      if (patch.title !== undefined) sets.push(`title=${q(patch.title)}`);
      if (patch.url !== undefined) sets.push(`url=${q(patch.url)}`);
      if (patch.description !== undefined) sets.push(`description=${q(patch.description)}`);
      if (patch.category_id !== undefined) sets.push(`category_id=${n(patch.category_id as any)}`);
      if (patch.favicon !== undefined) sets.push(`favicon=${q(patch.favicon)}`);
      if (patch.sort_order !== undefined) sets.push(`sort_order=${n(patch.sort_order)}`);
      if (patch.meta !== undefined) {
        const metaJson = typeof (patch.meta as any) === 'string' ? (patch.meta as any) : JSON.stringify(patch.meta);
        sets.push(`meta=${q(metaJson)}`);
      }
      sets.push(`updated_at=${Date.now()}`);
      if (sets.length) this.run(`UPDATE bookmarks SET ${sets.join(',')} WHERE id=${id}`);
      return;
    }
    const cur = this.bookmarks.get(id);
    if (!cur) return;
    const next = { ...cur, ...patch, updated_at: Date.now() } as BookmarkRow;
    this.bookmarks.set(id, next);
  }
  async deleteBookmark(id: number): Promise<void> {
    if (this.backendKind === 'sqlite') {
      this.run(`DELETE FROM bookmarks WHERE id=${id}`);
      return;
    }
    this.bookmarks.delete(id);
    for (const key of Array.from(this.bookmarkTags)) {
      if (key.startsWith(id + ':')) this.bookmarkTags.delete(key);
    }
  }
  async listBookmarksByCategory(categoryId?: number | null): Promise<BookmarkRow[]> {
    if (this.backendKind === 'sqlite') {
      if (categoryId == null) return this.select<BookmarkRow>('SELECT * FROM bookmarks ORDER BY sort_order ASC, created_at ASC');
      return this.select<BookmarkRow>(`SELECT * FROM bookmarks WHERE category_id ${categoryId===null?'IS NULL':'='+categoryId} ORDER BY sort_order ASC, created_at ASC`);
    }
    const all = Array.from(this.bookmarks.values());
    return all
      .filter(b => (categoryId == null ? true : (b.category_id ?? null) === categoryId))
      .sort((a,b)=> (a.sort_order??0)-(b.sort_order??0) || (a.created_at)-(b.created_at));
  }
  async listBookmarksPaged(categoryId: number | null | undefined, page: number, pageSize: number): Promise<{ items: BookmarkRow[]; total: number }> {
    const limit = Math.max(1, pageSize|0);
    const offset = Math.max(0, (page|0) * limit);
    if (this.backendKind === 'sqlite') {
      const where = categoryId == null ? '' : `WHERE category_id ${categoryId===null?'IS NULL':'='+categoryId}`;
      const total = this.select<{ n: number }>(`SELECT COUNT(1) AS n FROM bookmarks ${where}`).[0]?.n || 0;
      const items = this.select<BookmarkRow>(`SELECT * FROM bookmarks ${where} ORDER BY sort_order ASC, created_at ASC LIMIT ${limit} OFFSET ${offset}`);
      return { items, total };
    }
    const all = await this.listBookmarksByCategory(categoryId);
    return { items: all.slice(offset, offset + limit), total: all.length };
  }
  async fullTextSearch(q: string): Promise<BookmarkRow[]> {
    const kw = (q || '').trim();
    if (!kw) return [];
    if (this.backendKind === 'sqlite') {
      if (this.hasFts5) {
        return this.select<BookmarkRow>(`SELECT b.* FROM bookmarks_fts f JOIN bookmarks b ON b.id=f.rowid WHERE bookmarks_fts MATCH ${qv(kw)} LIMIT 50`);
      }
      const like = `%${kw.replace(/%/g,'').replace(/_/g,'')}%`;
      return this.select<BookmarkRow>(`SELECT * FROM bookmarks WHERE title LIKE ${q(like)} OR description LIKE ${q(like)} OR url LIKE ${q(like)} LIMIT 50`);
    }
    const l = kw.toLowerCase();
    return Array.from(this.bookmarks.values()).filter(b =>
      (b.title||'').toLowerCase().includes(l) ||
      (b.description||'').toLowerCase().includes(l) ||
      (b.url||'').toLowerCase().includes(l)
    );
  }

  // Tags
  async insertTag(row: Omit<TagRow,'id'>): Promise<number> {
    if (this.backendKind === 'sqlite') {
      this.run(`INSERT INTO tags(name,color) VALUES (${q(row.name)}, ${q(row.color)});`);
      const idRow = this.select<{ id: number }>('SELECT last_insert_rowid() AS id')[0];
      return idRow?.id ?? 0;
    }
    const id = this.nextId('tags');
    this.tags.set(id, { id, ...row });
    return id;
  }
  async tagBookmark(bookmarkId: number, tagId: number): Promise<void> {
    if (this.backendKind === 'sqlite') {
      this.run(`INSERT OR IGNORE INTO bookmark_tags(bookmark_id, tag_id) VALUES (${bookmarkId}, ${tagId});`);
      return;
    }
    this.bookmarkTags.add(`${bookmarkId}:${tagId}`);
  }

  // Snapshot/restore for rollback and export
  async exportSnapshot(): Promise<{
    categories: CategoryRow[];
    bookmarks: BookmarkRow[];
    tags: TagRow[];
    bookmark_tags: BookmarkTagRow[];
    meta?: Record<string,string>;
  }> {
    if (this.backendKind === 'sqlite') {
      const categories = this.select<CategoryRow>('SELECT * FROM categories');
      const bookmarks = this.select<BookmarkRow>('SELECT * FROM bookmarks');
      const tags = this.select<TagRow>('SELECT * FROM tags');
      const bt = this.select<{ bookmark_id: number; tag_id: number }>('SELECT * FROM bookmark_tags');
      const metaRows = this.select<{ key: string; value: string }>('SELECT key,value FROM meta');
      const meta: Record<string,string> = {};
      for (const m of metaRows) meta[m.key] = m.value;
      return { categories, bookmarks, tags, bookmark_tags: bt, meta };
    }
    return {
      categories: Array.from(this.categories.values()),
      bookmarks: Array.from(this.bookmarks.values()),
      tags: Array.from(this.tags.values()),
      bookmark_tags: Array.from(this.bookmarkTags).map((k)=>{
        const [b,t] = k.split(':').map(Number); return { bookmark_id: b, tag_id: t };
      }),
      meta: { db_version: '1' },
    };
  }

  async importSnapshot(s: { categories: CategoryRow[]; bookmarks: BookmarkRow[]; tags: TagRow[]; bookmark_tags: BookmarkTagRow[]; meta?: Record<string,string> }): Promise<void> {
    if (this.backendKind === 'sqlite') {
      await this.transaction(async () => {
        this.run('DELETE FROM bookmark_tags;');
        this.run('DELETE FROM bookmarks;');
        this.run('DELETE FROM categories;');
        this.run('DELETE FROM tags;');
        for (const c of s.categories) {
          this.run(`INSERT INTO categories(id,name,color,icon,parent_id,sort_order,created_at) VALUES (${c.id}, ${q(c.name)}, ${q(c.color)}, ${q(c.icon)}, ${n(c.parent_id)}, ${n(c.sort_order)}, ${n(c.created_at)});`);
        }
        for (const b of s.bookmarks) {
          this.run(`INSERT INTO bookmarks(id,title,url,description,category_id,favicon,visit_count,last_visited,created_at,updated_at) VALUES (${b.id}, ${q(b.title)}, ${q(b.url)}, ${q(b.description)}, ${n(b.category_id)}, ${q(b.favicon)}, ${n(b.visit_count)}, ${n(b.last_visited)}, ${n(b.created_at)}, ${n(b.updated_at)});`);
        }
        for (const t of s.tags) {
          this.run(`INSERT INTO tags(id,name,color) VALUES (${t.id}, ${q(t.name)}, ${q(t.color)});`);
        }
        for (const bt of s.bookmark_tags) {
          this.run(`INSERT INTO bookmark_tags(bookmark_id, tag_id) VALUES (${bt.bookmark_id}, ${bt.tag_id});`);
        }
      });
      return;
    }
    // memory
    this.categories = new Map(s.categories.map((c)=>[c.id,c]));
    this.bookmarks = new Map(s.bookmarks.map((b)=>[b.id,b]));
    this.tags = new Map(s.tags.map((t)=>[t.id,t]));
    this.bookmarkTags = new Set(s.bookmark_tags.map((x)=>`${x.bookmark_id}:${x.tag_id}`));
    // reset seq approximatively to max ids
    this.seq.categories = Math.max(0, ...s.categories.map(c=>c.id));
    this.seq.bookmarks = Math.max(0, ...s.bookmarks.map(b=>b.id));
    this.seq.tags = Math.max(0, ...s.tags.map(t=>t.id));
  }
}

// --- Tiny SQL helpers (for sqlite path only; tests use memory fallback) ---
function q(v: any): string { return v === undefined || v === null ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`; }
function qv(v: string): string { return `'${v.replace(/'/g, "''")}'`; }
function n(v: any): string { return v === undefined || v === null ? 'NULL' : String(v); }
