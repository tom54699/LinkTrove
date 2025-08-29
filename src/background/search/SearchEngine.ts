import type { BookmarkRow } from '../db/DatabaseManager';
import { DatabaseManager } from '../db/DatabaseManager';

export interface SearchOptions {
  limit?: number;
}

export interface SearchResultItem extends BookmarkRow {
  score: number;
  highlight: {
    title?: string;
    description?: string;
    url?: string;
  };
}

export class SearchEngine {
  private cache = new Map<string, SearchResultItem[]>();
  private cacheOrder: string[] = [];
  private cacheSize = 20;
  private history: string[] = [];
  private historyMax = 20;

  constructor(private db: DatabaseManager) {}

  private setCache(key: string, value: SearchResultItem[]) {
    if (this.cache.has(key)) {
      this.cache.set(key, value);
      // move to end
      this.cacheOrder = this.cacheOrder.filter(k => k !== key).concat(key);
      return;
    }
    this.cache.set(key, value);
    this.cacheOrder.push(key);
    if (this.cacheOrder.length > this.cacheSize) {
      const k = this.cacheOrder.shift();
      if (k) this.cache.delete(k);
    }
  }

  async fullText(query: string, opts: SearchOptions = {}): Promise<SearchResultItem[]> {
    const q = (query || '').trim();
    if (!q) return [];
    const key = `${q}|${opts.limit ?? ''}`;
    if (this.cache.has(key)) return this.cache.get(key)!;

    const raw = await this.db.fullTextSearch(q);
    const items: SearchResultItem[] = raw.map((b) => ({
      ...b,
      score: this.score(b, q),
      highlight: this.highlight(b, q),
    }));
    items.sort((a, b) => b.score - a.score || (b.updated_at - a.updated_at));
    const out = (opts.limit ? items.slice(0, opts.limit) : items);
    this.setCache(key, out);
    this.saveSearchQuery(q);
    return out;
  }

  private score(b: BookmarkRow, q: string): number {
    const lc = q.toLowerCase();
    let s = 0;
    const add = (str?: string, w = 1) => {
      if (!str) return;
      const m = str.toLowerCase().split(lc).length - 1;
      s += m * w;
    };
    // title weight > description > url
    add(b.title, 5);
    add(b.description, 2);
    add(b.url, 1);
    return s;
  }

  private highlight(b: BookmarkRow, q: string): { title?: string; description?: string; url?: string } {
    const mark = (text?: string) => {
      if (!text) return undefined;
      try {
        const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        return text.replace(re, (m) => `<mark>${m}</mark>`);
      } catch {
        // Fallback: case-insensitive simple split
        const lc = text.toLowerCase();
        const idx = lc.indexOf(q.toLowerCase());
        if (idx === -1) return text;
        return text.slice(0, idx) + '<mark>' + text.slice(idx, idx + q.length) + '</mark>' + text.slice(idx + q.length);
      }
    };
    return {
      title: mark(b.title),
      description: mark(b.description),
      url: mark(b.url),
    };
  }
}

// Advanced search
export type SortBy = 'relevance' | 'date' | 'title' | 'visits';
export interface AdvancedOptions {
  categories?: number[]; // when provided, only these categories; includeChildren applies if true
  includeChildren?: boolean;
  tags?: number[];
  dateRange?: { start?: number; end?: number }; // epoch ms on created_at/updated_at
  sortBy?: SortBy;
  limit?: number;
  offset?: number;
}

export class AdvancedSearch {
  constructor(private db: DatabaseManager, private se: SearchEngine) {}

  async run(query: string, opts: AdvancedOptions = {}): Promise<SearchResultItem[]> {
    const q = (query || '').trim();
    // Base candidates from full-text (or all when empty)
    let base: BookmarkRow[];
    if (q) base = await this.db.fullTextSearch(q);
    else base = await this.db.listBookmarksByCategory(undefined);

    // Filter by categories (with optional children)
    if (opts.categories && opts.categories.length) {
      let allowed = new Set<number>();
      if (opts.includeChildren) {
        const snap = await this.db.exportSnapshot();
        const children = new Map<number, number[]>();
        for (const c of snap.categories) {
          const pid = (c.parent_id ?? -1) as any;
          if (!children.has(pid)) children.set(pid, []);
          children.get(pid)!.push(c.id);
        }
        const visit = (id: number) => {
          allowed.add(id);
          const kids = children.get(id) || [];
          for (const k of kids) visit(k);
        };
        for (const cid of opts.categories) visit(cid);
      } else {
        allowed = new Set(opts.categories);
      }
      base = base.filter(b => (b.category_id != null) && allowed.has(b.category_id));
    }

    // Filter by tags (intersection)
    if (opts.tags && opts.tags.length) {
      const snap = await this.db.exportSnapshot();
      const tagSet = new Set(opts.tags);
      const bmHasTag = new Map<number, boolean>();
      for (const link of snap.bookmark_tags) {
        if (tagSet.has(link.tag_id)) bmHasTag.set(link.bookmark_id, true);
      }
      base = base.filter(b => bmHasTag.get(b.id));
    }

    // Date range (created_at or updated_at)
    if (opts.dateRange && (opts.dateRange.start || opts.dateRange.end)) {
      const s = opts.dateRange.start ?? -Infinity;
      const e = opts.dateRange.end ?? Infinity;
      base = base.filter(b => (b.created_at >= s && b.created_at <= e) || (b.updated_at >= s && b.updated_at <= e));
    }

    // Score + highlight
    const withScore: SearchResultItem[] = base.map((b) => ({
      ...b,
      score: q ? this.se['score'](b, q) : 0,
      highlight: q ? this.se['highlight'](b, q) : { title: b.title, description: b.description, url: b.url },
    }));

    // Sort
    const sortBy = opts.sortBy || (q ? 'relevance' : 'date');
    withScore.sort((a, b) => {
      if (sortBy === 'relevance') return b.score - a.score || (b.updated_at - a.updated_at);
      if (sortBy === 'title') return a.title.localeCompare(b.title) || (b.updated_at - a.updated_at);
      if (sortBy === 'visits') return (b.visit_count ?? 0) - (a.visit_count ?? 0) || (b.updated_at - a.updated_at);
      // date
      return (b.updated_at) - (a.updated_at);
    });

    // Pagination
    const start = opts.offset ?? 0;
    const end = opts.limit ? start + opts.limit : undefined;
    return withScore.slice(start, end);
  }
}

// Suggestions & history
export interface SuggestionOptions { limit?: number }
export async function getSearchSuggestions(db: DatabaseManager, partial: string, opts: SuggestionOptions = {}): Promise<string[]> {
  const p = (partial || '').trim().toLowerCase();
  if (!p) return [];
  const all = await db.listBookmarksByCategory(undefined);
  const set = new Set<string>();
  for (const b of all) {
    if ((b.title || '').toLowerCase().includes(p)) set.add(b.title);
    if ((b.url || '').toLowerCase().includes(p)) set.add(b.url);
    if (set.size >= (opts.limit ?? 10)) break;
  }
  return Array.from(set).slice(0, opts.limit ?? 10);
}

export interface HistoryProvider {
  save(query: string): void;
  list(): string[];
}

export class InMemoryHistory implements HistoryProvider {
  private items: string[] = [];
  private max = 20;
  save(query: string) {
    const q = (query || '').trim();
    if (!q) return;
    this.items = [q, ...this.items.filter((x) => x !== q)].slice(0, this.max);
  }
  list(): string[] { return this.items.slice(); }
}

