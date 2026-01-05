// LWW (Last-Write-Wins) merge service for cloud sync
// Merges local and remote data by comparing updatedAt/createdAt timestamps

import type {
  WebpageData,
  CategoryData,
  TemplateData,
  SubcategoryData,
  OrganizationData,
} from '../../background/storageService';

export interface ExportPayload {
  schemaVersion: number;
  webpages: WebpageData[];
  categories: CategoryData[];
  templates: TemplateData[];
  subcategories: SubcategoryData[];
  organizations: OrganizationData[];
  settings?: {
    theme?: string;
    selectedCategoryId?: string;
    selectedOrganizationId?: string;
  };
  orders: {
    subcategories: Record<string, string[]>;
  };
  exportedAt?: string;
}

export interface MergeResult {
  webpages: WebpageData[];
  categories: CategoryData[];
  templates: TemplateData[];
  subcategories: SubcategoryData[];
  organizations: OrganizationData[];
  orders: {
    subcategories: Record<string, string[]>;
  };
  settings?: {
    theme?: string;
    selectedCategoryId?: string;
    selectedOrganizationId?: string;
  };
  stats: {
    webpagesLocal: number;
    webpagesRemote: number;
    webpagesMerged: number;
    categoriesLocal: number;
    categoriesRemote: number;
    categoriesMerged: number;
    templatesLocal: number;
    templatesRemote: number;
    templatesMerged: number;
  };
}

type HasTimestamp = { id: string; updatedAt?: number; createdAt?: number; deleted?: boolean; deletedAt?: string | number };

/**
 * Merge two arrays by ID, keeping the item with the latest timestamp
 * Handles tombstone (soft delete) logic:
 * - If either side is deleted, check deletedAt vs updatedAt
 * - Deleted item wins if deletedAt is newer than the other's updatedAt
 * - Filter out deleted items from final result
 */
function mergeByTimestamp<T extends HasTimestamp>(
  local: T[],
  remote: T[]
): T[] {
  const merged = new Map<string, T>();

  // Helper to convert timestamp to number (handles both ISO string and unix timestamp)
  const toTimestamp = (item: HasTimestamp): number => {
    const updated = item.updatedAt;
    const created = item.createdAt;

    // Try updatedAt first
    if (updated) {
      if (typeof updated === 'string') {
        const parsed = Date.parse(updated);
        if (!isNaN(parsed)) return parsed;
      }
      if (typeof updated === 'number') return updated;
    }

    // Fallback to createdAt
    if (created) {
      if (typeof created === 'string') {
        const parsed = Date.parse(created);
        if (!isNaN(parsed)) return parsed;
      }
      if (typeof created === 'number') return created;
    }

    return 0;
  };

  // Helper to get deletion timestamp
  const getDeletedTime = (item: HasTimestamp): number => {
    if (!item.deleted || !item.deletedAt) return 0;
    if (typeof item.deletedAt === 'string') {
      const parsed = Date.parse(item.deletedAt);
      return isNaN(parsed) ? 0 : parsed;
    }
    if (typeof item.deletedAt === 'number') return item.deletedAt;
    return 0;
  };

  // Add all local items
  for (const item of local) {
    merged.set(item.id, item);
  }

  // Merge remote items - keep if newer or doesn't exist locally
  for (const remoteItem of remote) {
    const localItem = merged.get(remoteItem.id);
    if (!localItem) {
      // New item from remote
      merged.set(remoteItem.id, remoteItem);
    } else {
      // Both exist - handle tombstone logic
      const localDeleted = localItem.deleted;
      const remoteDeleted = remoteItem.deleted;

      if (localDeleted && remoteDeleted) {
        // Both deleted - keep the one with latest deletedAt
        const localDeletedTime = getDeletedTime(localItem);
        const remoteDeletedTime = getDeletedTime(remoteItem);
        if (remoteDeletedTime > localDeletedTime) {
          merged.set(remoteItem.id, remoteItem);
        }
        // else keep local
      } else if (localDeleted) {
        // Local deleted, remote not deleted
        // Keep deleted if deletedAt > remote's updatedAt
        const localDeletedTime = getDeletedTime(localItem);
        const remoteTime = toTimestamp(remoteItem);
        if (localDeletedTime > remoteTime) {
          // Deletion is newer, keep deleted
          merged.set(remoteItem.id, localItem);
        } else {
          // Remote update is newer, keep remote (un-delete)
          merged.set(remoteItem.id, remoteItem);
        }
      } else if (remoteDeleted) {
        // Remote deleted, local not deleted
        const remoteDeletedTime = getDeletedTime(remoteItem);
        const localTime = toTimestamp(localItem);
        if (remoteDeletedTime > localTime) {
          // Deletion is newer, mark as deleted
          merged.set(remoteItem.id, remoteItem);
        }
        // else keep local (un-deleted)
      } else {
        // Neither deleted - compare timestamps normally
        const localTime = toTimestamp(localItem);
        const remoteTime = toTimestamp(remoteItem);
        if (remoteTime > localTime) {
          merged.set(remoteItem.id, remoteItem);
        }
        // else keep local
      }
    }
  }

  // Filter out deleted items from final result
  return Array.from(merged.values()).filter(item => !item.deleted);
}

/**
 * Merge categories - special handling for order field
 */
function mergeCategories(
  local: CategoryData[],
  remote: CategoryData[]
): CategoryData[] {
  const merged = new Map<string, CategoryData>();
  const localById = new Map(local.map((c) => [c.id, c]));
  const remoteById = new Map(remote.map((c) => [c.id, c]));

  // Merge by ID
  for (const item of local) {
    merged.set(item.id, item);
  }

  for (const remoteItem of remote) {
    const localItem = merged.get(remoteItem.id);
    if (!localItem) {
      merged.set(remoteItem.id, remoteItem);
    } else {
      // For categories, we don't have updatedAt, so prefer remote if different
      // In future we should add updatedAt to CategoryData
      merged.set(remoteItem.id, remoteItem);
    }
  }

  return Array.from(merged.values());
}

/**
 * Merge templates - similar to categories
 */
function mergeTemplates(
  local: TemplateData[],
  remote: TemplateData[]
): TemplateData[] {
  const merged = new Map<string, TemplateData>();

  for (const item of local) {
    merged.set(item.id, item);
  }

  for (const remoteItem of remote) {
    const localItem = merged.get(remoteItem.id);
    if (!localItem) {
      merged.set(remoteItem.id, remoteItem);
    } else {
      // Prefer remote for now (templates don't have timestamps yet)
      // TODO: Add updatedAt to TemplateData
      merged.set(remoteItem.id, remoteItem);
    }
  }

  return Array.from(merged.values());
}

/**
 * Merge subcategory orders
 * Keep the order array that was modified more recently (based on exportedAt or manual comparison)
 */
function mergeOrders(
  localOrders: Record<string, string[]>,
  remoteOrders: Record<string, string[]>,
  localTime: number,
  remoteTime: number
): Record<string, string[]> {
  const merged: Record<string, string[]> = {};

  // Collect all group IDs
  const allGroupIds = new Set([
    ...Object.keys(localOrders),
    ...Object.keys(remoteOrders),
  ]);

  for (const gid of allGroupIds) {
    const localOrder = localOrders[gid];
    const remoteOrder = remoteOrders[gid];

    if (!remoteOrder) {
      // Only in local
      merged[gid] = localOrder;
    } else if (!localOrder) {
      // Only in remote
      merged[gid] = remoteOrder;
    } else {
      // Both exist - use timestamp to decide
      if (remoteTime > localTime) {
        merged[gid] = remoteOrder;
      } else {
        merged[gid] = localOrder;
      }
    }
  }

  return merged;
}

/**
 * Merge local and remote data using Last-Write-Wins strategy
 */
export function mergeLWW(
  local: ExportPayload,
  remote: ExportPayload
): MergeResult {
  const localTime = local.exportedAt ? Date.parse(local.exportedAt) : 0;
  const remoteTime = remote.exportedAt ? Date.parse(remote.exportedAt) : 0;

  // Merge webpages by timestamp
  const webpages = mergeByTimestamp(local.webpages as any, remote.webpages as any) as unknown as WebpageData[];

  // Merge subcategories by timestamp
  const subcategories = mergeByTimestamp(
    local.subcategories as any,
    remote.subcategories as any
  ) as SubcategoryData[];

  // Merge organizations by timestamp (they have createdAt/updatedAt)
  const organizations = mergeByTimestamp(
    local.organizations as any,
    remote.organizations as any
  ) as unknown as OrganizationData[];

  // Merge categories (no timestamps, prefer remote for simplicity)
  const categories = mergeCategories(local.categories, remote.categories);

  // Merge templates (no timestamps, prefer remote for simplicity)
  const templates = mergeTemplates(local.templates, remote.templates);

  // Merge orders
  const orders = {
    subcategories: mergeOrders(
      local.orders?.subcategories || {},
      remote.orders?.subcategories || {},
      localTime,
      remoteTime
    ),
  };

  // Settings: prefer remote if timestamps favor it, otherwise local
  const settings =
    remoteTime > localTime ? remote.settings : local.settings || remote.settings;

  return {
    webpages,
    categories,
    templates,
    subcategories,
    organizations,
    orders,
    settings,
    stats: {
      webpagesLocal: local.webpages.length,
      webpagesRemote: remote.webpages.length,
      webpagesMerged: webpages.length,
      categoriesLocal: local.categories.length,
      categoriesRemote: remote.categories.length,
      categoriesMerged: categories.length,
      templatesLocal: local.templates.length,
      templatesRemote: remote.templates.length,
      templatesMerged: templates.length,
    },
  };
}
