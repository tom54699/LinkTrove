import { DatabaseManager, BookmarkRow } from './DatabaseManager';

export interface BookmarkData {
  id?: number;
  title: string;
  url: string;
  description?: string;
  categoryId?: number | null;
  favicon?: string;
}

export class BookmarkService {
  constructor(private db: DatabaseManager) {}

  async create(data: BookmarkData): Promise<number> {
    if (!data.url || !/^https?:\/\//i.test(data.url)) throw new Error('Invalid URL');
    if (!(data.title || data.url)) throw new Error('Empty title');
    const id = await this.db.insertBookmark({
      title: data.title.trim(),
      url: data.url.trim(),
      description: data.description || '',
      category_id: data.categoryId ?? null,
      favicon: data.favicon || '',
    });
    return id;
  }

  async get(id: number): Promise<BookmarkRow | undefined> {
    return this.db.getBookmark(id);
  }

  async update(id: number, patch: Partial<BookmarkData>): Promise<void> {
    const p: Partial<BookmarkRow> = {};
    if (patch.title !== undefined) p.title = patch.title;
    if (patch.url !== undefined) p.url = patch.url;
    if (patch.description !== undefined) p.description = patch.description;
    if (patch.categoryId !== undefined) p.category_id = patch.categoryId;
    if (patch.favicon !== undefined) p.favicon = patch.favicon;
    await this.db.updateBookmark(id, p);
  }

  async remove(id: number): Promise<void> {
    await this.db.deleteBookmark(id);
  }

  async byCategory(categoryId?: number | null): Promise<BookmarkRow[]> {
    return this.db.listBookmarksByCategory(categoryId);
  }

  async search(q: string): Promise<BookmarkRow[]> {
    return this.db.fullTextSearch(q);
  }

  // Batch operations
  async createMany(arr: BookmarkData[]): Promise<number[]> {
    const out: number[] = [];
    await this.db.transaction(async () => {
      for (const d of arr) {
        out.push(await this.create(d));
      }
    });
    return out;
  }

  async deleteMany(ids: number[]): Promise<void> {
    await this.db.transaction(async () => {
      for (const id of ids) await this.remove(id);
    });
  }
}
