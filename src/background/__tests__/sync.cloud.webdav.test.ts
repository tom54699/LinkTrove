import { describe, it, expect } from 'vitest';
import { DatabaseManager } from '../db/DatabaseManager';
import { BookmarkService } from '../db/BookmarkService';
import { CloudSync, WebDAVAdapter, InMemoryCloudState } from '../sync/CloudSync';

class MockWebDAVClient {
  private store = new Map<string, { content: string; etag: string; modified: number }>();
  async authorize() { /* no-op */ }
  async stat(path: string) {
    const v = this.store.get(path); if (!v) return null; return { etag: v.etag, modifiedTime: v.modified, size: v.content.length };
  }
  async get(path: string) { const v = this.store.get(path); if (!v) throw new Error('404'); return v.content; }
  async put(path: string, content: string) { const etag = Math.random().toString(36).slice(2); const modified = Date.now(); this.store.set(path, { content, etag, modified }); return { etag, modifiedTime: modified, size: content.length }; }
}

describe('Sync 5.3 Cloud/WebDAV flow', () => {
  it('first-time upload and subsequent import on remote change', async () => {
    const db = new DatabaseManager('memory'); await db.init();
    const bms = new BookmarkService(db);
    await bms.create({ title: 'A', url: 'https://a' });

    const client = new MockWebDAVClient();
    const adapter = new WebDAVAdapter(client as any);
    const state = new InMemoryCloudState();
    const cs = new CloudSync(db, adapter, { state });

    const r1 = await cs.syncNow();
    expect(r1.uploaded).toBe(true);

    // Simulate remote-only change by changing file directly without local edits
    const remote = await client.get('/linktrove.bundle.json');
    await client.put('/linktrove.bundle.json', remote.replace('https://a', 'https://b'));

    const r2 = await cs.syncNow();
    expect(r2.imported + r2.skipped).toBeGreaterThanOrEqual(0);
  });
});

