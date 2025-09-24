import { createExportImportService } from './exportImport';
import { createStorageService } from '../../background/storageService';
import * as drive from './cloud/googleDrive';

type SyncStatus = {
  connected: boolean;
  lastSyncedAt?: string;
  syncing: boolean;
  error?: string;
};

let status: SyncStatus = { connected: false, syncing: false };

function setLocalStatus(patch: Partial<SyncStatus>) {
  status = { ...status, ...patch };
  try { chrome.storage?.local?.set?.({ 'cloudSync.status': status }); } catch {}
}

export function getStatus(): SyncStatus {
  return status;
}

export async function connect(): Promise<void> {
  await drive.connect();
  setLocalStatus({ connected: true });
}

export async function disconnect(): Promise<void> {
  await drive.disconnect();
  setLocalStatus({ connected: false });
}

export async function backupNow(): Promise<void> {
  const storage = createStorageService();
  const ei = createExportImportService({ storage });
  setLocalStatus({ syncing: true, error: undefined });
  try {
    const json = await ei.exportJson();
    await drive.createOrUpdate(json);
    const now = new Date().toISOString();
    setLocalStatus({ syncing: false, lastSyncedAt: now });
  } catch (e: any) {
    setLocalStatus({ syncing: false, error: String(e?.message || e) });
    throw e;
  }
}

export async function restoreNow(): Promise<void> {
  const storage = createStorageService();
  const ei = createExportImportService({ storage });
  setLocalStatus({ syncing: true, error: undefined });
  try {
    const f = await drive.getFile();
    if (!f) throw new Error('雲端尚無備份');
    const text = await drive.download(f.fileId);
    await (storage as any).importData(text);
    const now = new Date().toISOString();
    setLocalStatus({ syncing: false, lastSyncedAt: now });
  } catch (e: any) {
    setLocalStatus({ syncing: false, error: String(e?.message || e) });
    throw e;
  }
}

export async function syncNow(): Promise<void> {
  // Phase 1: 等價於 backupNow；Phase 2 再做合併
  await backupNow();
}

