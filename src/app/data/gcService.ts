// Garbage Collection service for cleaning up old tombstones
// Reduces IndexedDB storage and improves merge performance

import { createStorageService } from '../../background/storageService';

export interface GCStats {
  totalTombstones: number;
  oldestTombstone?: string; // ISO date
  categories: {
    webpages: number;
    categories: number;
    subcategories: number;
    templates: number;
    organizations: number;
  };
}

export interface GCResult {
  cleaned: number;
  categories: {
    webpages: number;
    categories: number;
    subcategories: number;
    templates: number;
    organizations: number;
  };
}

const GC_STORAGE_KEY = 'cloudSync.lastGCTime';
const AUTO_GC_INTERVAL_DAYS = 7;

/**
 * Get tombstone statistics
 */
export async function getGCStats(): Promise<GCStats> {
  const storage = createStorageService();
  const idbStorage = storage as any;

  // Get all data including deleted items (bypass filters)
  const db = await openDB();
  const tx = db.transaction(['webpages', 'categories', 'subcategories', 'templates', 'organizations'], 'readonly');

  const webpagesReq = tx.objectStore('webpages').getAll();
  const categoriesReq = tx.objectStore('categories').getAll();
  const subcategoriesReq = tx.objectStore('subcategories').getAll();
  const templatesReq = tx.objectStore('templates').getAll();
  const organizationsReq = tx.objectStore('organizations').getAll();

  await tx.done;

  const webpagesRaw = await webpagesReq;
  const categoriesRaw = await categoriesReq;
  const subcategoriesRaw = await subcategoriesReq;
  const templatesRaw = await templatesReq;
  const organizationsRaw = await organizationsReq;

  const webpages = Array.isArray(webpagesRaw) ? webpagesRaw : [];
  const categories = Array.isArray(categoriesRaw) ? categoriesRaw : [];
  const subcategories = Array.isArray(subcategoriesRaw) ? subcategoriesRaw : [];
  const templates = Array.isArray(templatesRaw) ? templatesRaw : [];
  const organizations = Array.isArray(organizationsRaw) ? organizationsRaw : [];

  // Filter deleted items
  const deletedWebpages = webpages.filter((w: any) => w.deleted);
  const deletedCategories = categories.filter((c: any) => c.deleted);
  const deletedSubcategories = subcategories.filter((s: any) => s.deleted);
  const deletedTemplates = templates.filter((t: any) => t.deleted);
  const deletedOrganizations = organizations.filter((o: any) => o.deleted);

  // Find oldest tombstone
  let oldestTime = Infinity;
  const allDeleted = [
    ...deletedWebpages.map((w: any) => w.deletedAt),
    ...deletedCategories.map((c: any) => c.deletedAt),
    ...deletedSubcategories.map((s: any) => s.deletedAt),
    ...deletedTemplates.map((t: any) => t.deletedAt),
    ...deletedOrganizations.map((o: any) => o.deletedAt),
  ];

  for (const deletedAt of allDeleted) {
    if (!deletedAt) continue;
    const time = typeof deletedAt === 'string' ? Date.parse(deletedAt) : deletedAt;
    if (!isNaN(time) && time < oldestTime) {
      oldestTime = time;
    }
  }

  const totalTombstones =
    deletedWebpages.length +
    deletedCategories.length +
    deletedSubcategories.length +
    deletedTemplates.length +
    deletedOrganizations.length;

  return {
    totalTombstones,
    oldestTombstone: oldestTime < Infinity ? new Date(oldestTime).toISOString() : undefined,
    categories: {
      webpages: deletedWebpages.length,
      categories: deletedCategories.length,
      subcategories: deletedSubcategories.length,
      templates: deletedTemplates.length,
      organizations: deletedOrganizations.length,
    },
  };
}

/**
 * Run garbage collection to clean up old tombstones
 * @param retentionDays - Keep tombstones newer than this many days (default: 30)
 */
export async function runGC(retentionDays: number = 30): Promise<GCResult> {
  const cutoffTime = Date.now() - retentionDays * 24 * 60 * 60 * 1000;

  const db = await openDB();
  const tx = db.transaction(['webpages', 'categories', 'subcategories', 'templates', 'organizations'], 'readwrite');

  const stores = {
    webpages: tx.objectStore('webpages'),
    categories: tx.objectStore('categories'),
    subcategories: tx.objectStore('subcategories'),
    templates: tx.objectStore('templates'),
    organizations: tx.objectStore('organizations'),
  };

  const result: GCResult = {
    cleaned: 0,
    categories: {
      webpages: 0,
      categories: 0,
      subcategories: 0,
      templates: 0,
      organizations: 0,
    },
  };

  // Helper to check if item should be cleaned
  const shouldClean = (item: any): boolean => {
    if (!item.deleted || !item.deletedAt) return false;
    const deletedTime = typeof item.deletedAt === 'string' ? Date.parse(item.deletedAt) : item.deletedAt;
    if (isNaN(deletedTime)) return false;
    return deletedTime < cutoffTime;
  };

  // Clean each store
  for (const [storeName, store] of Object.entries(stores)) {
    const allReq = store.getAll();
    const allRaw = await allReq;
    const all = Array.isArray(allRaw) ? allRaw : [];
    const toDelete = all.filter(shouldClean);

    for (const item of toDelete) {
      await store.delete(item.id);
    }

    result.categories[storeName as keyof typeof result.categories] = toDelete.length;
    result.cleaned += toDelete.length;
  }

  await tx.done;

  // Record GC time
  await recordGCTime();

  return result;
}

/**
 * Check if automatic GC should run
 */
export async function shouldAutoGC(): Promise<boolean> {
  try {
    const result: any = await new Promise((resolve) => {
      chrome.storage?.local?.get?.({ [GC_STORAGE_KEY]: 0 }, resolve);
    });

    const lastGCTime = result[GC_STORAGE_KEY] || 0;
    const daysSinceLastGC = (Date.now() - lastGCTime) / (24 * 60 * 60 * 1000);

    return daysSinceLastGC >= AUTO_GC_INTERVAL_DAYS;
  } catch {
    return false;
  }
}

/**
 * Record last GC time
 */
async function recordGCTime(): Promise<void> {
  try {
    await new Promise<void>((resolve, reject) => {
      chrome.storage?.local?.set?.({ [GC_STORAGE_KEY]: Date.now() }, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  } catch (e) {
    console.warn('Failed to record GC time:', e);
  }
}

/**
 * Get last GC time
 */
export async function getLastGCTime(): Promise<number | undefined> {
  try {
    const result: any = await new Promise((resolve) => {
      chrome.storage?.local?.get?.({ [GC_STORAGE_KEY]: 0 }, resolve);
    });
    const time = result[GC_STORAGE_KEY];
    return time > 0 ? time : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Helper to open IndexedDB directly
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('linktrove', 3);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
