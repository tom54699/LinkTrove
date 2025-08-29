import { DatabaseManager, type TagRow, type BookmarkRow } from './DatabaseManager';

export class TagService {
  constructor(private db: DatabaseManager) {}

  async create(name: string, color?: string): Promise<number> {
    const n = (name || '').trim();
    if (!n) throw new Error('Tag name required');
    return this.db.insertTag({ name: n, color });
  }

  async rename(id: number, name: string): Promise<void> {
    const n = (name || '').trim();
    if (!n) throw new Error('Tag name required');
    const snap = await this.db.exportSnapshot();
    const tags = snap.tags.map(t => t.id === id ? { ...t, name: n } : t);
    await this.db.importSnapshot({ ...snap, tags });
  }

  async remove(id: number): Promise<void> {
    const snap = await this.db.exportSnapshot();
    const tags = snap.tags.filter(t => t.id !== id);
    const bts = snap.bookmark_tags.filter(x => x.tag_id !== id);
    await this.db.importSnapshot({ ...snap, tags, bookmark_tags: bts });
  }

  async attach(bookmarkId: number, tagId: number): Promise<void> {
    await this.db.tagBookmark(bookmarkId, tagId);
  }
  async detach(bookmarkId: number, tagId: number): Promise<void> {
    const snap = await this.db.exportSnapshot();
    const bts = snap.bookmark_tags.filter(x => !(x.bookmark_id === bookmarkId && x.tag_id === tagId));
    await this.db.importSnapshot({ ...snap, bookmark_tags: bts });
  }

  async bookmarks(tagId: number): Promise<BookmarkRow[]> {
    const snap = await this.db.exportSnapshot();
    const ids = new Set(snap.bookmark_tags.filter(x => x.tag_id === tagId).map(x => x.bookmark_id));
    return snap.bookmarks.filter(b => ids.has(b.id));
  }

  async tagsFor(bookmarkId: number): Promise<TagRow[]> {
    const snap = await this.db.exportSnapshot();
    const ids = new Set(snap.bookmark_tags.filter(x => x.bookmark_id === bookmarkId).map(x => x.tag_id));
    return snap.tags.filter(t => ids.has(t.id));
  }

  async stats(): Promise<Array<{ tag: TagRow; count: number }>> {
    const snap = await this.db.exportSnapshot();
    const count = new Map<number, number>();
    for (const x of snap.bookmark_tags) count.set(x.tag_id, (count.get(x.tag_id) || 0) + 1);
    return snap.tags.map(t => ({ tag: t, count: count.get(t.id) || 0 }));
  }

  async suggest(prefix: string): Promise<TagRow[]> {
    const p = (prefix || '').toLowerCase();
    if (!p) return [];
    const snap = await this.db.exportSnapshot();
    return snap.tags.filter(t => (t.name || '').toLowerCase().startsWith(p)).slice(0, 10);
  }
}

