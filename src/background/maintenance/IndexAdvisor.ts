import { DatabaseManager } from '../db/DatabaseManager';

export interface IndexSuggestion {
  table: string;
  reason: string;
  recommendation: string;
}

export class IndexAdvisor {
  constructor(private db: DatabaseManager) {}

  supported(): boolean { return this.db.getBackend() === 'sqlite'; }

  private select<T=any>(sql: string): T[] { return (this.db as any).select?.(sql) || []; }

  isFtsEnabled(): boolean {
    try {
      const rows = this.select<{ name: string }>("SELECT name FROM sqlite_master WHERE type='table' AND name='bookmarks_fts'");
      return rows.length > 0;
    } catch { return false; }
  }

  explain(sql: string): string[] {
    try {
      const rows = this.select<any>(`EXPLAIN QUERY PLAN ${sql}`);
      // Row has columns: id, parent, notused, detail (varies). Collect detail.
      return rows.map((r: any) => String(r.detail || r['selectid'] || JSON.stringify(r)));
    } catch {
      return [];
    }
  }

  suggestions(): IndexSuggestion[] {
    if (!this.supported()) return [];
    const out: IndexSuggestion[] = [];

    // Typical list by category query
    const plan1 = this.explain('SELECT * FROM bookmarks WHERE category_id = 1 ORDER BY sort_order ASC, created_at ASC LIMIT 50');
    if (plan1.join(' | ').toUpperCase().includes('SCAN') && plan1.join(' | ').toLowerCase().includes('bookmarks')) {
      out.push({ table: 'bookmarks', reason: 'Sequential scan for category listing', recommendation: 'Add index on bookmarks(category_id, sort_order, created_at)' });
    }

    // LIKE fallback search (when FTS not available)
    const plan2 = this.explain("SELECT * FROM bookmarks WHERE title LIKE '%abc%' OR description LIKE '%abc%' OR url LIKE '%abc%' LIMIT 50");
    if (!this.isFtsEnabled() && plan2.length) {
      out.push({ table: 'bookmarks', reason: 'LIKE-based search detected and FTS not enabled', recommendation: 'Enable FTS5 virtual table for bookmarks (bookmarks_fts) to speed up full-text search' });
    }

    // URL exact match checks
    const plan3 = this.explain("SELECT * FROM bookmarks WHERE url = 'https://example.com'");
    if (plan3.join(' | ').toUpperCase().includes('SCAN') && !plan3.join(' | ').toLowerCase().includes('idx_bookmarks_url')) {
      out.push({ table: 'bookmarks', reason: 'Sequential scan on url equality', recommendation: 'Ensure index on bookmarks(url)' });
    }
    return out;
  }
}

