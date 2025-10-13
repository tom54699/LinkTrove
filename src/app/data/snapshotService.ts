import { createStorageService } from '../../background/storageService';
import type { ExportPayload } from './mergeService';

export interface Snapshot {
  id: string;
  createdAt: string;
  reason: 'before-restore' | 'before-merge' | 'manual';
  data: ExportPayload;
  summary: {
    webpages: number;
    categories: number;
    templates: number;
    subcategories: number;
    organizations: number;
  };
}

const STORAGE_KEY = 'cloudSync.snapshots';
const MAX_SNAPSHOTS = 3;

/**
 * Get all snapshots from storage
 */
export async function listSnapshots(): Promise<Snapshot[]> {
  try {
    const result: any = await new Promise((resolve) => {
      try {
        chrome.storage?.local?.get?.({ [STORAGE_KEY]: [] }, resolve);
      } catch {
        resolve({});
      }
    });
    return result[STORAGE_KEY] || [];
  } catch {
    return [];
  }
}

/**
 * Create a new snapshot of current local data
 */
export async function createSnapshot(reason: Snapshot['reason']): Promise<Snapshot> {
  const storage = createStorageService();
  const exportData = await (storage as any).exportData();
  const payload: ExportPayload = JSON.parse(exportData);

  const snapshot: Snapshot = {
    id: `snapshot-${Date.now()}`,
    createdAt: new Date().toISOString(),
    reason,
    data: payload,
    summary: {
      webpages: Array.isArray(payload.webpages) ? payload.webpages.length : 0,
      categories: Array.isArray(payload.categories) ? payload.categories.length : 0,
      templates: Array.isArray(payload.templates) ? payload.templates.length : 0,
      subcategories: Array.isArray(payload.subcategories) ? payload.subcategories.length : 0,
      organizations: Array.isArray(payload.organizations) ? payload.organizations.length : 0,
    },
  };

  // Get existing snapshots and add new one
  const snapshots = await listSnapshots();
  snapshots.unshift(snapshot); // Add to beginning

  // Keep only MAX_SNAPSHOTS
  const trimmed = snapshots.slice(0, MAX_SNAPSHOTS);

  // Save to storage
  await new Promise<void>((resolve, reject) => {
    try {
      chrome.storage?.local?.set?.({ [STORAGE_KEY]: trimmed }, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    } catch (e) {
      reject(e);
    }
  });

  return snapshot;
}

/**
 * Restore data from a snapshot
 */
export async function restoreSnapshot(snapshotId: string): Promise<void> {
  const snapshots = await listSnapshots();
  const snapshot = snapshots.find((s) => s.id === snapshotId);

  if (!snapshot) {
    throw new Error('快照不存在');
  }

  const storage = createStorageService();
  const jsonData = JSON.stringify(snapshot.data);
  await (storage as any).importData(jsonData);

  // Update chrome.storage.local to trigger UI refresh
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

    // Dispatch events for UI refresh
    try {
      window.dispatchEvent(new CustomEvent('snapshot:restored', {
        detail: {
          snapshotId,
          createdAt: snapshot.createdAt,
        },
      }));
    } catch {}
    try {
      window.dispatchEvent(new CustomEvent('groups:changed'));
    } catch {}
  } catch {}
}

/**
 * Delete a specific snapshot
 */
export async function deleteSnapshot(snapshotId: string): Promise<void> {
  const snapshots = await listSnapshots();
  const filtered = snapshots.filter((s) => s.id !== snapshotId);

  await new Promise<void>((resolve, reject) => {
    try {
      chrome.storage?.local?.set?.({ [STORAGE_KEY]: filtered }, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    } catch (e) {
      reject(e);
    }
  });
}

/**
 * Delete all snapshots
 */
export async function clearAllSnapshots(): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    try {
      chrome.storage?.local?.set?.({ [STORAGE_KEY]: [] }, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    } catch (e) {
      reject(e);
    }
  });
}
