import { SyncManager } from './SyncManager';
import type { DatabaseManager } from '../db/DatabaseManager';

export interface CloudFileMeta {
  etag?: string;
  modifiedTime?: number; // epoch ms
  size?: number;
}

export interface CloudAdapter {
  authorize(): Promise<void>;
  stat(path: string): Promise<CloudFileMeta | null>;
  download(path: string): Promise<string>; // returns JSON bundle
  upload(path: string, content: string): Promise<CloudFileMeta>;
}

export interface CloudSyncOptions {
  remotePath?: string; // default '/linktrove.bundle.json'
  state?: CloudSyncState; // persistence of last sync markers
  onProgress?: (phase: 'auth'|'export'|'download'|'merge'|'upload'|'idle') => void;
}

export interface CloudSyncState {
  get(): Promise<{ lastLocalHash?: string; lastRemoteEtag?: string } | null>;
  set(v: { lastLocalHash?: string; lastRemoteEtag?: string }): Promise<void>;
}

export interface CloudSyncResult {
  uploaded: boolean;
  imported: number;
  skipped: number;
  conflicts: Array<{ reason: 'both-changed'; remoteEtag?: string }>;
  localHash: string;
  remoteEtag?: string;
}

export class InMemoryCloudState implements CloudSyncState {
  private v: { lastLocalHash?: string; lastRemoteEtag?: string } | null = null;
  async get() { return this.v; }
  async set(v: { lastLocalHash?: string; lastRemoteEtag?: string }) { this.v = v; }
}

export class CloudSync {
  private path: string;
  private sync: SyncManager;
  private state: CloudSyncState;
  private onProgress: (p: 'auth'|'export'|'download'|'merge'|'upload'|'idle') => void;
  constructor(private db: DatabaseManager, private adapter: CloudAdapter, opts: CloudSyncOptions = {}) {
    this.path = opts.remotePath || '/linktrove.bundle.json';
    this.sync = new SyncManager(db);
    this.state = opts.state || new InMemoryCloudState();
    this.onProgress = opts.onProgress || (()=>{});
  }

  private hash(s: string): string {
    let h = 5381 >>> 0;
    for (let i = 0; i < s.length; i++) { h = (((h << 5) + h) + s.charCodeAt(i)) >>> 0; }
    return ('00000000' + h.toString(16)).slice(-8);
  }

  async syncNow(): Promise<CloudSyncResult> {
    this.onProgress('auth');
    await this.adapter.authorize();
    const prev = (await this.state.get()) || {};
    const localJson = await this.sync.exportToJSON();
    const localHash = this.hash(localJson);
    const stat = await this.adapter.stat(this.path);
    const remoteMeta = stat || undefined;
    let remoteJson = '';
    let imported = 0, skipped = 0, uploaded = false;
    const conflicts: CloudSyncResult['conflicts'] = [];

    if (remoteMeta) {
      this.onProgress('download');
      remoteJson = await this.adapter.download(this.path);
      const remoteHash = this.hash(remoteJson);
      const remoteChanged = !prev.lastRemoteEtag || (remoteMeta.etag && remoteMeta.etag !== prev.lastRemoteEtag);
      const localChanged = !prev.lastLocalHash || (localHash !== prev.lastLocalHash);
      if (remoteChanged && localChanged) {
        // Both sides changed since last sync → conflict: prefer merge by importing remote then uploading merged result.
        conflicts.push({ reason: 'both-changed', remoteEtag: remoteMeta.etag });
        this.onProgress('merge');
        try {
          const res = await this.sync.importFromJSON(remoteJson);
          imported = res.imported; skipped = res.skipped;
        } catch { /* ignore invalid remote */ }
        // Export merged and upload
        const mergedJson = await this.sync.exportToJSON();
        this.onProgress('upload');
        const up = await this.adapter.upload(this.path, mergedJson);
        uploaded = true;
        await this.state.set({ lastLocalHash: this.hash(mergedJson), lastRemoteEtag: up.etag || remoteMeta.etag });
        this.onProgress('idle');
        return { uploaded, imported, skipped, conflicts, localHash: this.hash(mergedJson), remoteEtag: up.etag || remoteMeta.etag };
      }
      if (remoteChanged && !localChanged) {
        // Fast-forward local
        this.onProgress('merge');
        try {
          const res = await this.sync.importFromJSON(remoteJson);
          imported = res.imported; skipped = res.skipped;
        } catch {}
        await this.state.set({ lastLocalHash: this.hash(await this.sync.exportToJSON()), lastRemoteEtag: remoteMeta.etag });
        this.onProgress('idle');
        return { uploaded, imported, skipped, conflicts, localHash, remoteEtag: remoteMeta.etag };
      }
      if (!remoteChanged && localChanged) {
        // Upload our changes
        this.onProgress('upload');
        const up = await this.adapter.upload(this.path, localJson);
        uploaded = true;
        await this.state.set({ lastLocalHash: localHash, lastRemoteEtag: up.etag || remoteMeta.etag });
        this.onProgress('idle');
        return { uploaded, imported, skipped, conflicts, localHash, remoteEtag: up.etag || remoteMeta.etag };
      }
      // No changes
      await this.state.set({ lastLocalHash: localHash, lastRemoteEtag: remoteMeta.etag });
      this.onProgress('idle');
      return { uploaded, imported, skipped, conflicts, localHash, remoteEtag: remoteMeta.etag };
    }
    // No remote: upload local snapshot
    this.onProgress('upload');
    const up = await this.adapter.upload(this.path, localJson);
    uploaded = true;
    await this.state.set({ lastLocalHash: localHash, lastRemoteEtag: up.etag });
    this.onProgress('idle');
    return { uploaded, imported, skipped, conflicts, localHash, remoteEtag: up.etag };
  }
}

// Adapters (skeletons)
export class WebDAVAdapter implements CloudAdapter {
  constructor(private client: { stat(path: string): Promise<CloudFileMeta | null>; get(path: string): Promise<string>; put(path: string, content: string): Promise<CloudFileMeta>; authorize(): Promise<void> }) {}
  async authorize() { await this.client.authorize(); }
  async stat(path: string) { return this.client.stat(path); }
  async download(path: string) { return this.client.get(path); }
  async upload(path: string, content: string) { return this.client.put(path, content); }
}

export class GoogleDriveAdapter implements CloudAdapter {
  constructor(private client: { authorize(): Promise<void>; stat(fileName: string): Promise<CloudFileMeta | null>; download(fileName: string): Promise<string>; upload(fileName: string, content: string): Promise<CloudFileMeta> }) {}
  async authorize() { await this.client.authorize(); }
  async stat(path: string) { return this.client.stat(path); }
  async download(path: string) { return this.client.download(path); }
  async upload(path: string, content: string) { return this.client.upload(path, content); }
}

