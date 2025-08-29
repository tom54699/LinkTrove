import { describe, it, expect } from 'vitest';
import { DatabaseManager } from '../db/DatabaseManager';
import { BookmarkService } from '../db/BookmarkService';
import { CloudSync, WebDAVAdapter, InMemoryCloudState } from '../sync/CloudSync';

class MockWebDAVClient2 {
  private store = new Map<string, { content: string; etag: string; modified: number }>();
  async authorize() { /* no-op */ }
  async stat(path: string) { const v = this.store.get(path); if (!v) return null; return { etag: v.etag, modifiedTime: v.modified, size: v.content.length }; }
  async get(path: string) { const v = this.store.get(path); if (!v) throw new Error('404'); return v.content; }
  async put(path: string, content: string) { const etag = Math.random().toString(36).slice(2); const modified = Date.now(); this.store.set(path, { content, etag, modified }); return { etag, modifiedTime: modified, size: content.length }; }
}

describe('Sync 5.3 conflict detection and merge', () => {
  it('detects both-changed and merges by importing remote then uploading merged', async () => {
    const db = new DatabaseManager('memory'); await db.init();
    const bms = new BookmarkService(db);
    await bms.create({ title: 'A', url: 'https://a' });
    const client = new MockWebDAVClient2();
    const adapter = new WebDAVAdapter(client as any);
    const state = new InMemoryCloudState();
    const cs = new CloudSync(db, adapter, { state });

    // initial upload + set state
    await cs.syncNow();

    // mutate both sides: local add B, remote change A->C
    await bms.create({ title: 'B', url: 'https://b' });
    const remote = await client.get('/linktrove.bundle.json');
    await client.put('/linktrove.bundle.json', remote.replace('https://a','https://c'));

    const r = await cs.syncNow();
    expect(r.conflicts.length).toBeGreaterThan(0);
    // After merge, local should contain both local and remote updates
    const all = await db.listBookmarksByCategory(undefined);
    const urls = new Set(all.map(x => x.url));
    expect(urls.has('https://b')).toBe(true);
    expect(urls.has('https://c')).toBe(true);
  });
});

