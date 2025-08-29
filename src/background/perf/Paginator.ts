import type { BookmarkRow } from '../db/DatabaseManager';
import { DatabaseManager } from '../db/DatabaseManager';

export interface Page<T> { items: T[]; total: number; page: number; pageSize: number }

export class LruCache<V> {
  private map = new Map<string, V>();
  constructor(private max = 10) {}
  get(k: string): V | undefined { const v = this.map.get(k); if (v !== undefined) { this.map.delete(k); this.map.set(k, v); } return v; }
  set(k: string, v: V) { if (this.map.has(k)) this.map.delete(k); this.map.set(k, v); if (this.map.size > this.max) { const f = this.map.keys().next().value; this.map.delete(f); } }
  clear() { this.map.clear(); }
}

export class BookmarkPaginator {
  private cache = new LruCache<Page<BookmarkRow>>(20);
  constructor(private db: DatabaseManager) {}
  async get(categoryId: number | null | undefined, page: number, pageSize: number): Promise<Page<BookmarkRow>> {
    const key = `${categoryId ?? 'all'}:${page}:${pageSize}`;
    const hit = this.cache.get(key);
    if (hit) return hit;
    const { items, total } = await this.db.listBookmarksPaged(categoryId, page, pageSize);
    const pg: Page<BookmarkRow> = { items, total, page, pageSize };
    this.cache.set(key, pg);
    return pg;
  }
  invalidate() { this.cache.clear(); }
}

