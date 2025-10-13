import { createExportImportService } from './exportImport';
import { createStorageService } from '../../background/storageService';
import * as drive from './cloud/googleDrive';
import type { DriveFileInfo } from './cloud/googleDrive';
import { mergeLWW, type ExportPayload } from './mergeService';

type SyncStatus = {
  connected: boolean;
  syncing: boolean;
  lastSyncedAt?: string;
  error?: string;
  lastDownloadedAt?: string;
  lastUploadedAt?: string;
  lastChecksum?: string;
  auto?: boolean;
  pendingPush?: boolean;
};

const AUTO_PUSH_DEBOUNCE_MS = 2000;

let status: SyncStatus = {
  connected: false,
  syncing: false,
  auto: false,
  pendingPush: false,
};

let autoEnabled = false;
let pendingPush = false;
let pushTimer: ReturnType<typeof setTimeout> | null = null;
let pushing = false;
let restoring = false;
let storageListenerAttached = false;

function setLocalStatus(patch: Partial<SyncStatus>) {
  status = { ...status, ...patch };
  status.auto = autoEnabled;
  status.pendingPush = pendingPush;
  try {
    chrome.storage?.local?.set?.({ 'cloudSync.status': { ...status } });
  } catch {}
}

export function getStatus(): SyncStatus {
  return status;
}

function ensureStorageListener() {
  if (storageListenerAttached) return;
  try {
    // Listen to IndexedDB changes via custom event (dispatched from db.ts)
    const handleIdbChange = (e: CustomEvent) => {
      if (!autoEnabled || !status.connected) return;
      if (restoring) return;
      const stores = e.detail?.stores || [];
      const dataChanged = stores.some((s: string) => ['webpages', 'categories', 'templates', 'subcategories', 'organizations'].includes(s));
      if (dataChanged) scheduleAutoBackup();
    };
    window.addEventListener('idb:changed', handleIdbChange as any);
    storageListenerAttached = true;
  } catch {
    storageListenerAttached = true;
  }
}

async function bootstrapStatus() {
  try {
    const got: any = await new Promise((resolve) => {
      try {
        chrome.storage?.local?.get?.({ 'cloudSync.status': { ...status } }, resolve);
      } catch {
        resolve({});
      }
    });
    const stored = got?.['cloudSync.status'];
    if (stored && typeof stored === 'object') {
      status = { ...status, ...stored };
      autoEnabled = !!stored.auto;
      pendingPush = !!stored.pendingPush;
      status.auto = autoEnabled;
      status.pendingPush = pendingPush;
      status.syncing = false;
      if (stored.connected) {
        try {
          await drive.connect(false);
          status.connected = true;
        } catch {
          status.connected = false;
        }
      }
    }
  } catch {}
  ensureStorageListener();
  setLocalStatus({});
  if (autoEnabled && status.connected) {
    void ensureRemoteFreshness();
  }
}

void bootstrapStatus();

function scheduleAutoBackup() {
  if (!autoEnabled || !status.connected) return;
  pendingPush = true;
  setLocalStatus({});
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushTimer = null;
    void runAutoBackup();
  }, AUTO_PUSH_DEBOUNCE_MS);
}

async function runAutoBackup() {
  if (!autoEnabled || !status.connected) return;
  if (pushing) {
    pendingPush = true;
    setLocalStatus({});
    return;
  }
  pendingPush = false;
  pushing = true;
  try {
    await backupNow();
  } catch {
    pendingPush = true;
    setLocalStatus({});
  } finally {
    pushing = false;
  }
}

function remoteIsNewer(info: DriveFileInfo): boolean {
  const remoteTime = info.modifiedTime ? Date.parse(info.modifiedTime) : NaN;
  const lastDownload = status.lastDownloadedAt ? Date.parse(status.lastDownloadedAt) : NaN;
  const lastUpload = status.lastUploadedAt ? Date.parse(status.lastUploadedAt) : NaN;
  const newestLocal = Math.max(isFinite(lastDownload) ? lastDownload : 0, isFinite(lastUpload) ? lastUpload : 0);
  const checksumChanged = info.md5Checksum && info.md5Checksum !== status.lastChecksum;
  return (isFinite(remoteTime) && remoteTime > newestLocal) || checksumChanged;
}

async function ensureRemoteFreshness() {
  if (!autoEnabled || !status.connected) return;
  try {
    const info = await drive.getFile();
    if (!info) return;
    if (!remoteIsNewer(info)) return;
    // Use merge mode for auto sync to preserve local changes
    await restoreNow(info, true);
  } catch (error) {
    const message = (error as any)?.message || String(error);
    setLocalStatus({ error: message });
  }
}

export function isAutoSyncEnabled(): boolean {
  return autoEnabled;
}

export async function setAutoSync(enabled: boolean): Promise<void> {
  autoEnabled = enabled;
  if (!enabled) {
    pendingPush = false;
    if (pushTimer) {
      clearTimeout(pushTimer);
      pushTimer = null;
    }
    setLocalStatus({});
    return;
  }
  ensureStorageListener();
  setLocalStatus({});
  if (status.connected) {
    await ensureRemoteFreshness();
  }
}

export async function connect(): Promise<void> {
  await drive.connect();
  setLocalStatus({ connected: true, error: undefined });
  ensureStorageListener();

  // Auto-enable Auto Sync on first connect, but don't trigger immediate sync
  // UI layer (SettingsModal) will handle conflict detection after connect
  if (!autoEnabled) {
    autoEnabled = true;
    setLocalStatus({});
  }
}

export async function disconnect(): Promise<void> {
  await drive.disconnect();
  if (pushTimer) {
    clearTimeout(pushTimer);
    pushTimer = null;
  }
  pendingPush = false;
  setLocalStatus({ connected: false, syncing: false });
}

export async function backupNow(): Promise<void> {
  const storage = createStorageService();
  const ei = createExportImportService({ storage });
  setLocalStatus({ syncing: true, error: undefined });
  try {
    const json = await ei.exportJson();
    const info = await drive.createOrUpdate(json);
    const now = new Date().toISOString();
    pendingPush = false;
    setLocalStatus({
      syncing: false,
      lastSyncedAt: now,
      lastUploadedAt: now,
      lastChecksum: info?.md5Checksum ?? status.lastChecksum,
    });
  } catch (e: any) {
    setLocalStatus({ syncing: false, error: String(e?.message || e) });
    throw e;
  }
}

export async function restoreNow(info?: DriveFileInfo, merge = false): Promise<void> {
  const storage = createStorageService();
  setLocalStatus({ syncing: true, error: undefined });
  restoring = true;
  try {
    const fileInfo = info ?? (await drive.getFile());
    if (!fileInfo) throw new Error('雲端尚無備份');
    const remoteText = await drive.download(fileInfo.fileId);

    if (merge) {
      // LWW merge mode
      const [localText, remoteData] = await Promise.all([
        (storage as any).exportData(),
        Promise.resolve(remoteText),
      ]);
      const local: ExportPayload = JSON.parse(localText);
      const remote: ExportPayload = JSON.parse(remoteData);
      const merged = mergeLWW(local, remote);

      // Write merged data back
      const mergedPayload = {
        schemaVersion: 1,
        webpages: merged.webpages,
        categories: merged.categories,
        templates: merged.templates,
        subcategories: merged.subcategories,
        organizations: merged.organizations,
        settings: merged.settings,
        orders: merged.orders,
        exportedAt: new Date().toISOString(),
      };
      await (storage as any).importData(JSON.stringify(mergedPayload));
    } else {
      // Full replace mode (original behavior)
      await (storage as any).importData(remoteText);
    }
    try {
      const [pages, cats, tmpls, orgs] = await Promise.all([
        storage.loadFromLocal().catch(() => []),
        storage.loadFromSync().catch(() => []),
        (storage as any).loadTemplates?.().catch?.(() => []),
        (storage as any).listOrganizations?.().catch?.(() => []),
      ]);
      try {
        chrome.storage?.local?.set?.({ webpages: pages });
      } catch {}
      try {
        chrome.storage?.local?.set?.({ categories: cats });
      } catch {}
      if (Array.isArray(tmpls)) {
        try {
          chrome.storage?.local?.set?.({ templates: tmpls });
        } catch {}
      }
      if (Array.isArray(orgs)) {
        try {
          chrome.storage?.local?.set?.({ organizations: orgs });
        } catch {}
      }
      try {
        window.dispatchEvent(new CustomEvent('cloudsync:restored', {
          detail: {
            pagesCount: Array.isArray(pages) ? pages.length : undefined,
            categoriesCount: Array.isArray(cats) ? cats.length : undefined,
            templatesCount: Array.isArray(tmpls) ? tmpls.length : undefined,
            organizationsCount: Array.isArray(orgs) ? orgs.length : undefined,
          },
        }));
      } catch {}
      try {
        window.dispatchEvent(new CustomEvent('groups:changed'));
      } catch {}
    } catch {}
    const now = new Date().toISOString();
    pendingPush = false;
    setLocalStatus({
      syncing: false,
      lastSyncedAt: now,
      lastDownloadedAt: now,
      lastChecksum: fileInfo.md5Checksum ?? status.lastChecksum,
      error: undefined,
    });
  } catch (e: any) {
    setLocalStatus({ syncing: false, error: String(e?.message || e) });
    throw e;
  } finally {
    restoring = false;
  }
}

export async function syncNow(): Promise<void> {
  await backupNow();
}
