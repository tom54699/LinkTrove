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
}

export interface TagRow { id: number; name: string; color?: string }
export interface BookmarkTagRow { bookmark_id: number; tag_id: number }

export class DatabaseManager {
  private ready = false;
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

  async init(): Promise<void> {
    // In a future patch, attempt to load SQLite-WASM and mount OPFS.
    // For now, mark as ready for in-memory fallback.
    this.ready = true;
  }

  isReady(): boolean { return this.ready; }

  // Very small helper – not part of public API in the future
  private nextId(table: TableName): number {
    this.seq[table] = (this.seq[table] || 0) + 1;
    return this.seq[table];
  }

  async transaction<T>(fn: () => Promise<T>): Promise<T> {
    // In-memory impl is atomic by function scope; for SQLite we'll BEGIN/COMMIT
    return await fn();
  }

  // Category ops
  async insertCategory(row: Omit<CategoryRow, 'id' | 'created_at'>): Promise<number> {
    const id = this.nextId('categories');
    const now = Date.now();
    const r: CategoryRow = { id, created_at: now, sort_order: row.sort_order ?? 0, ...row } as any;
    this.categories.set(id, r);
    return id;
  }
  async getCategory(id: number): Promise<CategoryRow | undefined> { return this.categories.get(id); }
  async listCategories(): Promise<CategoryRow[]> { return Array.from(this.categories.values()).sort((a,b)=> (a.sort_order??0)-(b.sort_order??0)); }

  // Bookmark ops
  async insertBookmark(row: Omit<BookmarkRow, 'id'|'created_at'|'updated_at'>): Promise<number> {
    const id = this.nextId('bookmarks');
    const now = Date.now();
    const r: BookmarkRow = { id, created_at: now, updated_at: now, visit_count: 0, ...row } as any;
    this.bookmarks.set(id, r);
    return id;
  }
  async getBookmark(id: number): Promise<BookmarkRow | undefined> { return this.bookmarks.get(id); }
  async updateBookmark(id: number, patch: Partial<BookmarkRow>): Promise<void> {
    const cur = this.bookmarks.get(id);
    if (!cur) return;
    const next = { ...cur, ...patch, updated_at: Date.now() } as BookmarkRow;
    this.bookmarks.set(id, next);
  }
  async deleteBookmark(id: number): Promise<void> {
    this.bookmarks.delete(id);
    // remove any tag links
    for (const key of Array.from(this.bookmarkTags)) {
      if (key.startsWith(id + ':')) this.bookmarkTags.delete(key);
    }
  }
  async listBookmarksByCategory(categoryId?: number | null): Promise<BookmarkRow[]> {
    const all = Array.from(this.bookmarks.values());
    return all
      .filter(b => (categoryId == null ? true : (b.category_id ?? null) === categoryId))
      .sort((a,b)=> (a.created_at)-(b.created_at));
  }
  async fullTextSearch(q: string): Promise<BookmarkRow[]> {
    const kw = (q || '').toLowerCase();
    if (!kw) return [];
    return Array.from(this.bookmarks.values()).filter(b =>
      (b.title||'').toLowerCase().includes(kw) ||
      (b.description||'').toLowerCase().includes(kw) ||
      (b.url||'').toLowerCase().includes(kw)
    );
  }

  // Tags
  async insertTag(row: Omit<TagRow,'id'>): Promise<number> {
    const id = this.nextId('tags');
    this.tags.set(id, { id, ...row });
    return id;
  }
  async tagBookmark(bookmarkId: number, tagId: number): Promise<void> {
    this.bookmarkTags.add(`${bookmarkId}:${tagId}`);
  }
}

