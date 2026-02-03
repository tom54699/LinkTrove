import { createExportImportService } from './exportImport';
import { createStorageService } from '../../background/storageService';
import * as drive from './cloud/googleDrive';
import type { DriveFileInfo } from './cloud/googleDrive';
import { mergeLWW, type ExportPayload } from './mergeService';
import { isEdgeBrowser } from '@/utils/browser';

type SyncStatus = {
  connected: boolean;
  syncing: boolean;
  syncPhase?: 'checking' | 'downloading' | 'merging' | 'importing' | 'uploading';
  blocking?: boolean;
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
  blocking: false,
};

let autoEnabled = false;
let pendingPush = false;
let pushTimer: ReturnType<typeof setTimeout> | null = null;
let pushing = false;
let restoring = false;
let storageListenerAttached = false;

async function triggerAutoGC(lastSyncedAt?: string) {
  if (!lastSyncedAt) return;
  try {
    const gcModule = await import('./gcService');
    await gcModule.runAutoGC({ lastSyncedAt });
  } catch {}
}

function setLocalStatus(patch: Partial<SyncStatus>) {
  status = { ...status, ...patch };
  status.auto = autoEnabled;
  status.pendingPush = pendingPush;
  try {
    chrome.storage?.local?.set?.({ 'cloudSync.status': { ...status } });
  } catch {}
}

function payloadHasData(payload: any): boolean {
  if (!payload || typeof payload !== 'object') return false;
  return [
    payload.webpages?.length,
    payload.categories?.length,
    payload.subcategories?.length,
    payload.organizations?.length,
  ].some((n) => (n || 0) > 0);
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

// Check if Edge token cache is valid (without triggering auth popup)
async function checkEdgeTokenCache(): Promise<boolean> {
  try {
    const result: any = await new Promise((resolve) => {
      chrome.storage.local.get(['edgeGoogleToken'], resolve);
    });
    const cache = result?.edgeGoogleToken;
    if (cache && cache.token && cache.expiresAt) {
      const BUFFER_MS = 5 * 60 * 1000; // 5 minutes
      return Date.now() < cache.expiresAt - BUFFER_MS;
    }
  } catch {}
  return false;
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
      status.blocking = false;
      status.syncPhase = undefined;
      if (stored.connected) {
        try {
          // Edge: check token cache without triggering auth popup
          if (isEdgeBrowser()) {
            const hasValidToken = await checkEdgeTokenCache();
            status.connected = hasValidToken;
            if (!hasValidToken) {
              console.log('[Sync] Edge token cache expired, user needs to reconnect');
            }
          } else {
            // Chrome: use standard non-interactive auth check
            await drive.connect(false);
            status.connected = true;
          }
        } catch (e) {
          status.connected = false;
          console.warn('[Sync] Failed to verify connection:', e);
        }
      }
    }
  } catch {}
  ensureStorageListener();
  setLocalStatus({});
  if (autoEnabled && status.connected) {
    void ensureRemoteFreshness({ blocking: false });
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
    await backupNow({ blocking: false });
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
  const checksumChanged = !!(info.md5Checksum && info.md5Checksum !== status.lastChecksum);
  return (isFinite(remoteTime) && remoteTime > newestLocal) || checksumChanged;
}

async function ensureRemoteFreshness(options?: { blocking?: boolean }) {
  if (!autoEnabled || !status.connected) return;
  const useBlocking = options?.blocking !== false;
  let started = false;
  if (useBlocking) {
    started = true;
    setLocalStatus({ syncing: true, syncPhase: 'checking', blocking: true, error: undefined });
  }
  try {
    const info = await drive.getFile();
    if (!info) {
      if (started) setLocalStatus({ syncing: false, syncPhase: undefined, blocking: false });
      return;
    }
    if (!remoteIsNewer(info)) {
      if (started) setLocalStatus({ syncing: false, syncPhase: undefined, blocking: false });
      return;
    }
    // Use merge mode for auto sync to preserve local changes
    await restoreNow(info, true, { blocking: useBlocking });
  } catch (error) {
    const message = (error as any)?.message || String(error);
    // Handle Edge token expiration with user-friendly message
    const friendlyMessage = message === 'EDGE_TOKEN_EXPIRED'
      ? '授權已過期，請重新連接 Google Drive'
      : message;

    if (started) {
      setLocalStatus({ syncing: false, syncPhase: undefined, blocking: false, error: friendlyMessage });
    } else {
      setLocalStatus({ error: friendlyMessage });
    }

    // If token expired, mark as disconnected
    if (message === 'EDGE_TOKEN_EXPIRED') {
      status.connected = false;
    }
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
    await ensureRemoteFreshness({ blocking: false });
  }
}

export async function connect(options?: { blockingOnSync?: boolean }): Promise<void> {
  await drive.connect();
  setLocalStatus({ connected: true, error: undefined });
  ensureStorageListener();

  // Auto-enable Auto Sync on first connect, but don't trigger immediate sync
  // UI layer (SettingsModal) will handle conflict detection after connect
  if (!autoEnabled) {
    autoEnabled = true;
    setLocalStatus({});
  }
  // Check remote freshness only when explicit blocking is requested (UI connect)
  if (options?.blockingOnSync) {
    void ensureRemoteFreshness({ blocking: true });
  }
}

export async function disconnect(): Promise<void> {
  await drive.disconnect();
  if (pushTimer) {
    clearTimeout(pushTimer);
    pushTimer = null;
  }
  pendingPush = false;
  setLocalStatus({ connected: false, syncing: false, syncPhase: undefined, blocking: false });
}

export async function backupNow(options?: { blocking?: boolean }): Promise<void> {
  const storage = createStorageService();
  const ei = createExportImportService({ storage });
  const useBlocking = options?.blocking !== false;
  setLocalStatus({ syncing: true, syncPhase: 'uploading', blocking: useBlocking, error: undefined });
  try {
    const json = await ei.exportJson();
    const info = await drive.createOrUpdate(json);
    const now = new Date().toISOString();
    pendingPush = false;
    setLocalStatus({
      syncing: false,
      syncPhase: undefined,
      blocking: false,
      lastSyncedAt: now,
      lastUploadedAt: now,
      lastChecksum: info?.md5Checksum ?? status.lastChecksum,
    });
    void triggerAutoGC(now);
  } catch (e: any) {
    const message = e?.message || String(e);
    // Handle Edge token expiration with user-friendly message
    const friendlyMessage = message === 'EDGE_TOKEN_EXPIRED'
      ? '授權已過期，請重新連接 Google Drive'
      : message;

    setLocalStatus({ syncing: false, syncPhase: undefined, blocking: useBlocking, error: friendlyMessage });

    // If token expired, mark as disconnected
    if (message === 'EDGE_TOKEN_EXPIRED') {
      status.connected = false;
    }

    throw e;
  }
}

export async function restoreNow(
  info?: DriveFileInfo,
  merge = false,
  options?: { blocking?: boolean }
): Promise<void> {
  const storage = createStorageService();
  const useBlocking = options?.blocking !== false;
  setLocalStatus({ syncing: true, syncPhase: 'checking', blocking: useBlocking, error: undefined });
  restoring = true;
  let blockingActive = useBlocking;
  try {
    const fileInfo = info ?? (await drive.getFile());
    if (!fileInfo) throw new Error('雲端尚無備份');
    setLocalStatus({ syncPhase: 'downloading' });
    const remoteText = await drive.download(fileInfo.fileId);
    let remoteHasData = false;
    let remoteParsed: any | null = null;
    try {
      remoteParsed = JSON.parse(remoteText);
      remoteHasData = payloadHasData(remoteParsed);
    } catch {}
    if (merge) {
      // LWW merge mode
      setLocalStatus({ syncPhase: 'merging' });
      const [localText, remoteData] = await Promise.all([
        (storage as any).exportData(),
        Promise.resolve(remoteText),
      ]);
      const local: ExportPayload = JSON.parse(localText);
      const remote: ExportPayload = remoteParsed || JSON.parse(remoteData);
      const merged = mergeLWW(local, remote);

      // Write merged data back
      setLocalStatus({ syncPhase: 'importing' });
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
      setLocalStatus({ syncPhase: 'importing' });
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
      syncPhase: undefined,
      blocking: false,
      lastSyncedAt: now,
      lastDownloadedAt: now,
      lastChecksum: fileInfo.md5Checksum ?? status.lastChecksum,
      error: undefined,
    });
    void triggerAutoGC(now);
  } catch (e: any) {
    const message = e?.message || String(e);
    // Handle Edge token expiration with user-friendly message
    const friendlyMessage = message === 'EDGE_TOKEN_EXPIRED'
      ? '授權已過期，請重新連接 Google Drive'
      : message;

    setLocalStatus({ syncing: false, syncPhase: undefined, blocking: blockingActive, error: friendlyMessage });

    // If token expired, mark as disconnected
    if (message === 'EDGE_TOKEN_EXPIRED') {
      status.connected = false;
    }

    throw e;
  } finally {
    restoring = false;
  }
}

export function clearSyncError(): void {
  setLocalStatus({ error: undefined, blocking: false, syncPhase: undefined, syncing: false });
}
