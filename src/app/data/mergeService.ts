// LWW (Last-Write-Wins) merge service for cloud sync
// Merges local and remote data by comparing updatedAt/createdAt timestamps

import type {
  WebpageData,
  CategoryData,
  TemplateData,
  SubcategoryData,
  OrganizationData,
} from '../../background/storageService';
import { normalizeGroupOrder } from '../../utils/order-utils';
import {
  DEFAULT_CATEGORY_NAME,
  DEFAULT_GROUP_NAME,
  DEFAULT_ORGANIZATION_NAME,
  isDefaultName,
} from '../../utils/defaults';

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

  const toTimestamp = (item: any): number => {
    const updated = item?.updatedAt;
    const created = item?.createdAt;
    if (updated) {
      if (typeof updated === 'string') return Date.parse(updated) || 0;
      if (typeof updated === 'number') return updated;
    }
    if (created) {
      if (typeof created === 'string') return Date.parse(created) || 0;
      if (typeof created === 'number') return created;
    }
    return 0;
  };

  // Merge by ID
  for (const item of local) {
    merged.set(item.id, item);
  }

  for (const remoteItem of remote) {
    const localItem = merged.get(remoteItem.id);
    if (!localItem) {
      merged.set(remoteItem.id, remoteItem);
    } else {
      const localTime = toTimestamp(localItem as any);
      const remoteTime = toTimestamp(remoteItem as any);
      if (remoteTime === 0 && localTime === 0) {
        // No timestamps - prefer remote
        merged.set(remoteItem.id, remoteItem);
      } else if (remoteTime >= localTime) {
        merged.set(remoteItem.id, remoteItem);
      } else {
        merged.set(remoteItem.id, localItem);
      }
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

function cleanupDefaultHierarchy(
  merged: MergeResult,
  remoteHasData: boolean
): MergeResult {
  if (!remoteHasData) return merged;

  const orgs = merged.organizations || [];
  const cats = merged.categories || [];
  const subs = merged.subcategories || [];
  const pages = merged.webpages || [];

  const defaultOrg = orgs.find(
    (o) => o?.isDefault && isDefaultName(o?.name, DEFAULT_ORGANIZATION_NAME)
  );
  if (!defaultOrg) return merged;

  const catsInOrg = cats.filter((c) => c.organizationId === defaultOrg.id);
  if (catsInOrg.length !== 1) return merged;

  const defaultCat = catsInOrg[0];
  if (!defaultCat?.isDefault || !isDefaultName(defaultCat?.name, DEFAULT_CATEGORY_NAME)) {
    return merged;
  }

  const subsInCat = subs.filter((s) => s.categoryId === defaultCat.id);
  if (subsInCat.length !== 1) return merged;

  const defaultGroup = subsInCat[0];
  if (!defaultGroup?.isDefault || !isDefaultName(defaultGroup?.name, DEFAULT_GROUP_NAME)) {
    return merged;
  }

  const hasCards = pages.some((p: any) => !p?.deleted && p?.subcategoryId === defaultGroup.id);
  if (hasCards) return merged;

  const nextOrgs = orgs.filter((o) => o.id !== defaultOrg.id);
  const nextCats = cats.filter((c) => c.id !== defaultCat.id);
  const nextSubs = subs.filter((s) => s.id !== defaultGroup.id);
  const nextOrders = {
    ...merged.orders,
    subcategories: { ...(merged.orders?.subcategories || {}) },
  };
  delete nextOrders.subcategories[defaultGroup.id];

  return {
    ...merged,
    organizations: nextOrgs,
    categories: nextCats,
    subcategories: nextSubs,
    orders: nextOrders,
  };
}

/**
 * Merge subcategory orders
 * Keep the order array that was modified more recently (based on exportedAt or manual comparison)
 */
function mergeOrders(
  localOrders: Record<string, string[]>,
  remoteOrders: Record<string, string[]>,
  localTime: number,
  remoteTime: number,
  webpages: WebpageData[],
  subcategories: SubcategoryData[]
): Record<string, string[]> {
  const merged: Record<string, string[]> = {};
  const preferRemote = remoteTime > localTime;
  const byGroup: Record<string, WebpageData[]> = {};
  for (const page of webpages as any[]) {
    const gid = (page as any)?.subcategoryId as string | undefined;
    if (!gid) continue;
    (byGroup[gid] ||= []).push(page as any);
  }

  for (const sc of subcategories as any[]) {
    const gid = sc?.id as string | undefined;
    if (!gid) continue;
    const localOrder = Array.isArray(localOrders[gid]) ? localOrders[gid] : [];
    const remoteOrder = Array.isArray(remoteOrders[gid]) ? remoteOrders[gid] : [];
    const base = preferRemote ? remoteOrder : localOrder;
    const other = preferRemote ? localOrder : remoteOrder;
    const baseSet = new Set(base);
    const combined = base.concat(other.filter((id) => !baseSet.has(id)));
    merged[gid] = normalizeGroupOrder(byGroup[gid] || [], combined);
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
      remoteTime,
      webpages,
      subcategories
    ),
  };

  // Settings: prefer remote if timestamps favor it, otherwise local
  const settings =
    remoteTime > localTime ? remote.settings : local.settings || remote.settings;

  const mergedResult: MergeResult = {
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
  const remoteHasData = [
    remote.webpages?.length,
    remote.categories?.length,
    remote.subcategories?.length,
    remote.organizations?.length,
  ].some((n) => (n || 0) > 0);

  return cleanupDefaultHierarchy(mergedResult, remoteHasData);
}
