import type { FSAdapter } from '../../background/sync/FileSystemSync';
import type { CloudAdapter, CloudFileMeta } from '../../background/sync/CloudSync';

function now() { return Date.now(); }

export class LocalStorageFSAdapter implements FSAdapter {
  private key(path: string) { return `fs:${path}`; }
  async writeFile(path: string, content: string): Promise<void> {
    localStorage.setItem(this.key(path), content);
  }
  async readFile(path: string): Promise<string> {
    const v = localStorage.getItem(this.key(path));
    if (v == null) throw new Error('ENOENT');
    return v;
  }
  async exists(path: string): Promise<boolean> {
    return localStorage.getItem(this.key(path)) != null;
  }
}

export class LocalStorageCloudAdapter implements CloudAdapter {
  private key(path: string) { return `cloud:${path}`; }
  async authorize(): Promise<void> { /* no-op */ }
  async stat(path: string): Promise<CloudFileMeta | null> {
    const v = localStorage.getItem(this.key(path));
    if (v == null) return null;
    const meta = localStorage.getItem(this.key(path)+':meta');
    try { return meta ? JSON.parse(meta) : { size: v.length, modifiedTime: now(), etag: 'ls-'+String(v.length) }; } catch { return { size: v.length, modifiedTime: now(), etag: 'ls-'+String(v.length) }; }
  }
  async download(path: string): Promise<string> {
    const v = localStorage.getItem(this.key(path));
    if (v == null) throw new Error('404');
    return v;
  }
  async upload(path: string, content: string): Promise<CloudFileMeta> {
    localStorage.setItem(this.key(path), content);
    const meta: CloudFileMeta = { size: content.length, modifiedTime: now(), etag: 'ls-'+Math.random().toString(36).slice(2) };
    localStorage.setItem(this.key(path)+':meta', JSON.stringify(meta));
    return meta;
  }
}

