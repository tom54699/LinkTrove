import type { ExportImportService } from '../data/exportImport';
import { sha256Hex } from '../../background/crypto/CryptoBox';

export interface EncryptorLike { encrypt(plain: string): Promise<string>; decrypt(payload: string): Promise<string>; }

export async function backupWithEI(ei: ExportImportService, write: (content: string)=>Promise<void>, encryptor?: EncryptorLike, onProgress?: (p: string)=>void) {
  onProgress?.('export');
  let json = await ei.exportJson();
  if (encryptor) json = await encryptor.encrypt(json);
  onProgress?.('write');
  await write(json);
  onProgress?.('idle');
  return { hash: await sha256Hex(json), bytes: json.length };
}

export async function cloudSyncWithEI(ei: ExportImportService, cloud: {
  authorize: ()=>Promise<void>;
  stat: ()=>Promise<{ etag?: string } | null>;
  download: ()=>Promise<string>;
  upload: (content: string)=>Promise<{ etag?: string }>;
}, state: { get: ()=>Promise<{ lastLocalHash?: string; lastRemoteEtag?: string } | null>; set: (v: { lastLocalHash?: string; lastRemoteEtag?: string })=>Promise<void> }, encryptor?: EncryptorLike, onProgress?: (p: string)=>void) {
  onProgress?.('auth');
  await cloud.authorize();
  const prev = (await state.get()) || {};
  const localPlain = await ei.exportJson();
  const localHash = await sha256Hex(localPlain);
  const remoteMeta = await cloud.stat();
  let imported = 0, skipped = 0, uploaded = false;
  if (remoteMeta) {
    onProgress?.('download');
    let remote = await cloud.download();
    if (encryptor) {
      try { remote = await encryptor.decrypt(remote); } catch {}
    }
    const remoteChanged = !prev.lastRemoteEtag || (remoteMeta.etag && remoteMeta.etag !== prev.lastRemoteEtag);
    const localChanged = !prev.lastLocalHash || (localHash !== prev.lastLocalHash);
    if (remoteChanged && localChanged) {
      onProgress?.('merge');
      const res = await ei.importJsonMerge(remote);
      imported = res.addedPages || 0; skipped = 0;
      let merged = await ei.exportJson();
      if (encryptor) merged = await encryptor.encrypt(merged);
      onProgress?.('upload');
      const up = await cloud.upload(merged); uploaded = true;
      await state.set({ lastLocalHash: await sha256Hex(merged), lastRemoteEtag: up.etag || remoteMeta.etag });
      onProgress?.('idle');
      return { uploaded, imported, skipped };
    }
    if (remoteChanged && !localChanged) {
      onProgress?.('merge');
      const res = await ei.importJsonMerge(remote);
      imported = res.addedPages || 0;
      await state.set({ lastLocalHash: await sha256Hex(await ei.exportJson()), lastRemoteEtag: remoteMeta.etag });
      onProgress?.('idle');
      return { uploaded, imported, skipped };
    }
    if (!remoteChanged && localChanged) {
      let to = localPlain; if (encryptor) to = await encryptor.encrypt(to);
      onProgress?.('upload');
      const up = await cloud.upload(to); uploaded = true;
      await state.set({ lastLocalHash: localHash, lastRemoteEtag: up.etag || remoteMeta.etag });
      onProgress?.('idle');
      return { uploaded, imported, skipped };
    }
    await state.set({ lastLocalHash: localHash, lastRemoteEtag: remoteMeta.etag });
    onProgress?.('idle');
    return { uploaded, imported, skipped };
  }
  // no remote
  let payload = localPlain; if (encryptor) payload = await encryptor.encrypt(payload);
  onProgress?.('upload');
  const up = await cloud.upload(payload);
  uploaded = true;
  await state.set({ lastLocalHash: await sha256Hex(payload), lastRemoteEtag: up.etag });
  onProgress?.('idle');
  return { uploaded, imported, skipped };
}

