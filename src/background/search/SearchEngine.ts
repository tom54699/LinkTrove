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

