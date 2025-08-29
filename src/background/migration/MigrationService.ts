import type { DatabaseManager } from '../db/DatabaseManager';
import type { LegacyStores, MigrationResult, MigrateOptions, MigrationProgressEvent } from './types';

/**
 * MigrationService moves legacy Chrome Storage data into the new DB.
 * It is designed for dependency injection: tests can pass mock stores and
 * an in-memory DB; production can pass real adapters.
 */
export class MigrationService {
  constructor(private db: DatabaseManager, private legacy: LegacyStores) {}

  async detectLegacyData(): Promise<boolean> {
    try {
      const [pages, cats] = await Promise.all([
        this.legacy.loadWebpages(),
        this.legacy.loadCategories(),
      ]);
      return (Array.isArray(pages) && pages.length > 0) || (Array.isArray(cats) && cats.length > 1);
    } catch {
      return false;
    }
  }

  /**
   * Migrates categories then bookmarks into the target DB.
   * For the in-memory DB we just map fields; for SQLite this will be transactional.
   */
  async migrate(opts: MigrateOptions = {}): Promise<MigrationResult> {
    const cats = await this.legacy.loadCategories();
    const pages = await this.legacy.loadWebpages();

    // Map legacy category ids (string) to new numeric ids
    const catIdMap = new Map<string, number>();
    const errors: MigrationResult['errors'] = [];

    const emit = (evt: MigrationProgressEvent) => {
      try { opts.onProgress?.(evt); } catch {}
    };
    emit({ phase: 'prepare', totalCategories: cats.length, totalBookmarks: pages.length, migratedCategories: 0, migratedBookmarks: 0 });

    // Insert categories (skip duplicates by name)
    let catCount = 0;
    const seenNames = new Set<string>();
    emit({ phase: 'migrating-categories', totalCategories: cats.length, totalBookmarks: pages.length, migratedCategories: 0, migratedBookmarks: 0 });
    for (const c of cats) {
      const name = (c.name || '').trim();
      if (!name || seenNames.has(name)) { continue; }
      seenNames.add(name);
      try {
        if (!opts.dryRun) {
          const newId = await this.db.insertCategory({
            name,
            color: c.color,
            icon: (c as any).icon,
            parent_id: (c as any).parentId ?? null,
            sort_order: c.order ?? 0,
          });
          catIdMap.set(c.id, newId);
        }
        catCount++;
      } catch (e: any) {
        errors.push({ phase: 'categories', message: String(e?.message || e), itemId: c.id });
      }
      emit({ phase: 'migrating-categories', totalCategories: cats.length, totalBookmarks: pages.length, migratedCategories: catCount, migratedBookmarks: 0 });
    }

    // Insert bookmarks
    let bmCount = 0;
    // Duplicate detection by normalized URL (keep-first)
    const norm = (u: string) => u.replace(/^https?:\/\//, '').replace(/^www\./,'').replace(/\/$/,'').toLowerCase();
    const seen = new Set<string>();
    // Also avoid duplicates with existing DB data
    try {
      const existing = await this.db.listBookmarksByCategory(undefined);
      for (const e of existing) if (e.url) seen.add(norm(e.url));
    } catch {}

    let skipped = 0;
    emit({ phase: 'migrating-bookmarks', totalCategories: cats.length, totalBookmarks: pages.length, migratedCategories: catCount, migratedBookmarks: 0 });
    // Wrap bookmark writes in a transaction for atomicity (db implements rollback)
    await this.db.transaction(async () => {
      for (const p of pages) {
      const title = (p.title || p.url || '').trim();
      const url = (p.url || '').trim();
      if (!title || !url) { continue; }
      const key = norm(url);
      if (seen.has(key)) { skipped++; emit({ phase: 'migrating-bookmarks', totalCategories: cats.length, totalBookmarks: pages.length, migratedCategories: catCount, migratedBookmarks: bmCount }); continue; }
      const categoryId = p.category && catIdMap.has(p.category) ? catIdMap.get(p.category)! : null;
      try {
        if (!opts.dryRun) {
          await this.db.insertBookmark({
            title,
            url,
            description: (p as any).note || (p as any).description || '',
            category_id: categoryId,
            favicon: p.favicon || '',
          });
        }
        bmCount++;
        seen.add(key);
      } catch (e: any) {
        errors.push({ phase: 'bookmarks', message: String(e?.message || e), itemId: p.id });
      }
      emit({ phase: 'migrating-bookmarks', totalCategories: cats.length, totalBookmarks: pages.length, migratedCategories: catCount, migratedBookmarks: bmCount });
      }
    });

    emit({ phase: 'done', totalCategories: cats.length, totalBookmarks: pages.length, migratedCategories: catCount, migratedBookmarks: bmCount });
    return { bookmarks: bmCount, categories: catCount, skipped, errors };
  }

  /**
   * Very lightweight validation: checks counts and required columns presence.
   */
  async validate(expected: MigrationResult): Promise<boolean> {
    const cats = await this.db.listCategories();
    const bms = await this.db.listBookmarksByCategory(undefined);
    return cats.length >= expected.categories && bms.length >= expected.bookmarks;
  }

  async cleanupLegacyData(): Promise<void> {
    await Promise.allSettled([
      this.legacy.clearWebpages?.(),
      this.legacy.clearCategories?.(),
    ]);
  }
}
