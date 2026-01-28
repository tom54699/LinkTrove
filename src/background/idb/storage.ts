import type {
  WebpageData,
  CategoryData,
  TemplateData,
  StorageService,
} from '../storageService';
import { getAll, putAll, setMeta, getMeta, clearStore, tx, StoreName } from './db';
import { areOrdersEqual, normalizeGroupOrder } from '../../utils/order-utils';
import {
  DEFAULT_CATEGORY_NAME,
  DEFAULT_GROUP_NAME,
  DEFAULT_ORGANIZATION_NAME,
  createEntityId,
} from '../../utils/defaults';
import { nowMs, toIso, toMs } from '../../utils/time';

// Entity limits for UI layout constraints
export const ENTITY_LIMITS = {
  MAX_ORGANIZATIONS: 8,
  MAX_CATEGORIES_PER_ORG: 20,
  MAX_GROUPS_PER_CATEGORY: 50,
} as const;

// Custom error for limit exceeded
export class LimitExceededError extends Error {
  code = 'LIMIT_EXCEEDED';
  constructor(message: string) {
    super(message);
    this.name = 'LimitExceededError';
  }
}

const TIMESTAMP_FIELDS = ['createdAt', 'updatedAt', 'deletedAt'] as const;

function normalizeTimestampFields<T extends Record<string, any>>(item: T): T {
  let changed = false;
  const next = { ...item } as T;
  for (const key of TIMESTAMP_FIELDS) {
    if (!(key in next)) continue;
    const ms = toMs((next as any)[key]);
    if (ms !== undefined && (next as any)[key] !== ms) {
      (next as any)[key] = ms;
      changed = true;
    }
  }
  return changed ? next : item;
}

function serializeTimestampFields<T extends Record<string, any>>(item: T): T {
  const next = { ...item } as T;
  for (const key of TIMESTAMP_FIELDS) {
    if (!(key in next)) continue;
    const iso = toIso((next as any)[key]);
    if (iso) (next as any)[key] = iso;
  }
  return next;
}

async function migrateOnce(): Promise<void> {
  try {
    const migrated = await getMeta<boolean>('migratedToIdb');
    if (migrated) return;
  } catch {}
  try {
    const localAny: any = await new Promise((resolve) => {
      try {
        const getter = chrome.storage?.local?.get;
        if (!getter) return resolve({});
        getter({ webpages: [] }, resolve);
      } catch {
        resolve({});
      }
    });
    const syncAny: any = await new Promise((resolve) => {
      try {
        const getter = chrome.storage?.sync?.get;
        if (!getter) return resolve({});
        getter({ categories: [], templates: [] }, resolve);
      } catch {
        resolve({});
      }
    });
    const webpages: WebpageData[] = Array.isArray(localAny?.webpages)
      ? localAny.webpages.map((w: any) => normalizeTimestampFields(w))
      : [];
    const categories: CategoryData[] = Array.isArray(syncAny?.categories)
      ? syncAny.categories.map((c: any) => normalizeTimestampFields(c))
      : [];
    const templates: TemplateData[] = Array.isArray(syncAny?.templates)
      ? syncAny.templates.map((t: any) => normalizeTimestampFields(t))
      : [];
    if (webpages.length + categories.length + templates.length > 0) {
      if (webpages.length) await putAll('webpages', webpages);
      if (categories.length) await putAll('categories', categories);
      if (templates.length) await putAll('templates', templates);
    }
  } catch {
    // ignore
  }
  try {
    await setMeta('migratedToIdb', true);
  } catch {}
}

export function createIdbStorageService(): StorageService {
  // ensure migration runs once per session
  const migrationsReady = (async () => {
    try { await migrateOnce(); } catch {}
    try { await migrateOrganizationsOnce(); } catch {}
    try { await migrateSubcategoriesOnce(); } catch {}
    try { await migrateTimestampsOnce(); } catch {}
  })();

  async function ensureMigrationsReady(): Promise<void> {
    try { await migrationsReady; } catch {}
  }

  async function listSubcategoriesImpl(categoryId: string): Promise<any[]> {
    await ensureMigrationsReady();
    return await tx(['subcategories' as any], 'readonly', async (t) => {
      const s = t.objectStore('subcategories' as any);
      // 穩健做法：優先使用 by_categoryId 索引搭配 IDBKeyRange.only，再以 order 排序
      try {
        if (s.indexNames.contains('by_categoryId')) {
          const idx = s.index('by_categoryId');
          const range = IDBKeyRange.only(categoryId);
          const rows = await new Promise<any[]>((resolve, reject) => {
            const req = idx.getAll(range);
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = () => reject(req.error);
          });
          const byId = new Map<string, any>();
          for (const r of rows) if (!byId.has(r.id)) byId.set(r.id, r);
          return Array.from(byId.values())
            .filter((x) => !x.deleted)
            .sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));
        }
      } catch {}
      // 次要路徑：無 by_categoryId 索引時，全取再過濾/排序
      try {
        const all = await new Promise<any[]>((resolve, reject) => {
          const req = s.getAll();
          req.onsuccess = () => resolve(req.result || []);
          req.onerror = () => reject(req.error);
        });
        const byId = new Map<string, any>();
        for (const r of all) if (!byId.has(r.id)) byId.set(r.id, r);
        return Array.from(byId.values())
          .filter((x) => x.categoryId === categoryId && !x.deleted)
          .sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));
      } catch {
        return [];
      }
    });
  }

  async function migrateOrganizationsOnce(): Promise<void> {
    // Ensure a default organization exists and attach missing organizationId to categories
    try {
      const done = await getMeta<boolean>('migratedOrganizationsV1');
      if (done) return;
    } catch {}
    try {
      // Create default organization if missing
      const orgId = createEntityId('o');
      await tx('organizations' as any, 'readwrite', async (t) => {
        const s = t.objectStore('organizations' as any);
        try {
          const existing: any[] = await new Promise((resolve, reject) => {
            const req = s.getAll();
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = () => reject(req.error);
          });
          // 只有在完全沒有任何組織時才建立預設組織，避免污染既有資料與測試期望
          if ((existing || []).length === 0) {
            s.put({ id: orgId, name: DEFAULT_ORGANIZATION_NAME, color: '#64748b', order: 0, isDefault: true });
          }
        } catch {
          // 讀取失敗（例如新資料庫），直接建立預設
          try { s.put({ id: orgId, name: DEFAULT_ORGANIZATION_NAME, color: '#64748b', order: 0, isDefault: true }); } catch {}
        }
      });

      // Load categories, attach missing organizationId, and normalize order within each org
      const categories = (await getAll('categories')) as CategoryData[];
      if (categories.length) {
        let fallbackOrgId = orgId;
        try {
          const existingOrgs = (await getAll('organizations' as any).catch(() => [])) as any[];
          const withDefault = (existingOrgs || []).find((o: any) => o?.isDefault);
          fallbackOrgId = withDefault?.id || existingOrgs?.[0]?.id || orgId;
        } catch {}
        // Attach missing org id
        const next = categories.map((c) =>
          (!('organizationId' in c) || !(c as any).organizationId)
            ? ({ ...(c as any), organizationId: fallbackOrgId } as any)
            : (c as any)
        );
        // Reorder categories per organization to be contiguous
        const byOrg: Record<string, any[]> = {};
        for (const c of next as any[]) {
          const oid = (c as any).organizationId || fallbackOrgId;
          if (!byOrg[oid]) byOrg[oid] = [];
          byOrg[oid].push(c);
        }
        for (const [_oid, list] of Object.entries(byOrg)) {
          list.sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0) || String(a.name || '').localeCompare(String(b.name || '')));
          let i = 0;
          for (const c of list) c.order = i++;
        }
        // Persist back
        await putAll('categories', next as any);
      }
    } catch {
      // best-effort; ignore errors
    }
    try { await setMeta('migratedOrganizationsV1', true); } catch {}
  }

  async function migrateSubcategoriesOnce(): Promise<void> {
    try {
      const done = await getMeta<boolean>('migratedSubcategoriesV1');
      if (done) return;
    } catch {}
    try {
      const [categories, subcats, pages] = await Promise.all([
        getAll('categories'),
        getAll('subcategories' as any).catch(() => []),
        getAll('webpages'),
      ]);
      const now = nowMs();
      const byCatHasAny: Record<string, boolean> = {};
      for (const sc of subcats as any[]) byCatHasAny[sc.categoryId] = true;
      const defaults: Record<string, any> = {};
      const toCreate: any[] = [];
      for (const c of categories as any[]) {
        if (!byCatHasAny[c.id]) {
          const id = createEntityId('g');
          const sc = {
            id,
            categoryId: c.id,
            name: DEFAULT_GROUP_NAME,
            order: 0,
            createdAt: now,
            updatedAt: now,
            isDefault: !!(c as any)?.isDefault,
          };
          defaults[c.id] = sc;
          toCreate.push(sc);
        }
      }
      if (toCreate.length) {
        // Re-check current subcategories right before writing
        const current = (await getAll('subcategories' as any).catch(() => [])) as any[];
        const curByCat: Record<string, boolean> = {};
        for (const sc of current) curByCat[sc.categoryId] = true;
        const filtered = toCreate.filter((sc) => !curByCat[sc.categoryId]);
        if (filtered.length) await putAll('subcategories' as any, filtered);
      }
      // Assign missing subcategoryId on webpages
      const toUpdate: any[] = [];
      for (const p of pages as any[]) {
        if (!(p as any).subcategoryId) {
          const def = defaults[p.category];
          if (def) {
            (p as any).subcategoryId = def.id;
            toUpdate.push(p);
          }
        }
      }
      if (toUpdate.length) await putAll('webpages', toUpdate);
    } catch {
      // ignore
    }
    try { await setMeta('migratedSubcategoriesV1', true); } catch {}
  }

  async function migrateTimestampsOnce(): Promise<void> {
    let shouldMarkDone = false;
    try {
      const done = await getMeta<boolean>('migratedTimestampsV1');
      if (done) return;
    } catch {}
    try {
      const storeConfigs: Array<{ name: StoreName; fields: readonly string[] }> = [
        { name: 'webpages', fields: TIMESTAMP_FIELDS },
        { name: 'categories', fields: ['updatedAt', 'deletedAt'] },
        { name: 'templates', fields: ['updatedAt', 'deletedAt'] },
        { name: 'subcategories', fields: TIMESTAMP_FIELDS },
        { name: 'organizations', fields: ['updatedAt', 'deletedAt'] },
      ];
      for (const { name } of storeConfigs) {
        const items = (await getAll(name as any).catch(() => [])) as any[];
        if (!Array.isArray(items) || items.length === 0) continue;
        const changed: any[] = [];
        for (const item of items) {
          const next = normalizeTimestampFields(item);
          if (next !== item) changed.push(next);
        }
        if (changed.length) {
          await putAll(name as any, changed);
        }
      }
      shouldMarkDone = true;
    } catch {
      // ignore
    }
    if (shouldMarkDone) {
      try { await setMeta('migratedTimestampsV1', true); } catch {}
    }
  }

  async function buildNormalizedOrders(options?: {
    pages?: WebpageData[];
    subcategories?: any[];
    baseOrders?: Record<string, string[]>;
    persist?: boolean;
  }): Promise<Record<string, string[]>> {
    const pages = options?.pages ?? ((await getAll('webpages')) as WebpageData[]);
    const subcategories =
      options?.subcategories ??
      ((await getAll('subcategories' as any).catch(() => [])) as any[]);
    const baseOrders = options?.baseOrders || {};
    const persist = !!options?.persist;

    const byGroup = new Map<string, WebpageData[]>();
    for (const p of pages as any[]) {
      if ((p as any)?.deleted) continue;
      const gid = (p as any).subcategoryId as string | undefined;
      if (!gid) continue;
      if (!byGroup.has(gid)) byGroup.set(gid, []);
      byGroup.get(gid)!.push(p as any);
    }

    const orders: Record<string, string[]> = {};
    for (const sc of subcategories as any[]) {
      const gid = sc?.id as string | undefined;
      if (!gid) continue;
      const items = byGroup.get(gid) || [];
      let base: string[] = [];
      if (gid in baseOrders) {
        base = Array.isArray(baseOrders[gid]) ? baseOrders[gid] : [];
      } else {
        const stored = await getMeta<string[]>(`order.subcat.${gid}`);
        base = Array.isArray(stored) ? stored : [];
      }
      const normalized = normalizeGroupOrder(items, base);
      orders[gid] = normalized;
      if (persist && !areOrdersEqual(base, normalized)) {
        try {
          await setMeta(`order.subcat.${gid}`, normalized);
        } catch {}
      }
    }
    return orders;
  }

  async function exportData(): Promise<string> {
    const [webpages, categories, templates, subcategories, organizations] = await Promise.all([
      getAll('webpages'),
      getAll('categories'),
      getAll('templates'),
      getAll('subcategories' as any).catch(() => []),
      getAll('organizations' as any).catch(() => []),
    ]);
    // Include minimal settings (theme, selectedCategoryId)
    let theme: any = undefined;
    let selectedCategoryId: any = undefined;
    let selectedOrganizationId: any = undefined;
    try {
      const got: any = await new Promise((resolve) => {
        try {
          chrome.storage?.local?.get?.(
            { theme: undefined, selectedCategoryId: undefined, selectedOrganizationId: undefined },
            resolve
          );
        } catch {
          resolve({});
        }
      });
      theme = got?.theme;
      selectedCategoryId = got?.selectedCategoryId;
      selectedOrganizationId = got?.selectedOrganizationId;
    } catch {}
    if (theme === undefined) {
      try {
        theme = await getMeta('settings.theme');
      } catch {
        theme = undefined;
      }
    }
    if (selectedCategoryId === undefined) {
      try {
        selectedCategoryId = await getMeta('settings.selectedCategoryId');
      } catch {
        selectedCategoryId = undefined;
      }
    }
    if (selectedOrganizationId === undefined) {
      try {
        selectedOrganizationId = await getMeta('settings.selectedOrganizationId');
      } catch {
        selectedOrganizationId = undefined;
      }
    }
    const settings: any = {};
    if (theme !== undefined) settings.theme = theme;
    if (selectedCategoryId !== undefined)
      settings.selectedCategoryId = selectedCategoryId;
    if (selectedOrganizationId !== undefined)
      settings.selectedOrganizationId = selectedOrganizationId;
    // Export per-group orders
    let orders: { subcategories: Record<string, string[]> } = { subcategories: {} };
    try {
      const normalized = await buildNormalizedOrders({
        pages: webpages as WebpageData[],
        subcategories: subcategories as any[],
        persist: false,
      });
      orders = { subcategories: normalized };
    } catch {}

    const payload = {
      schemaVersion: 1,
      webpages: (webpages as any[]).map((p) => serializeTimestampFields(p)),
      categories: (categories as any[]).map((c) => serializeTimestampFields(c)),
      templates: (templates as any[]).map((t) => serializeTimestampFields(t)),
      subcategories: (subcategories as any[]).map((s) => serializeTimestampFields(s)),
      organizations: (organizations as any[]).map((o) => serializeTimestampFields(o)),
      settings,
      orders,
      exportedAt: new Date().toISOString(),
    } as any;
    return JSON.stringify(payload);
  }

  async function importData(jsonData: string): Promise<void> {
    let parsed: any;
    try {
      parsed = JSON.parse(jsonData);
    } catch {
      throw new Error('Invalid JSON');
    }
    const pages: WebpageData[] = Array.isArray(parsed?.webpages)
      ? parsed.webpages
      : [];
    const cats: CategoryData[] = Array.isArray(parsed?.categories)
      ? parsed.categories
      : [];
    const tmpls: TemplateData[] = Array.isArray(parsed?.templates)
      ? parsed.templates
      : [];
    const subcats: any[] = Array.isArray(parsed?.subcategories)
      ? parsed.subcategories
      : [];
    const orgsRaw: any[] = Array.isArray(parsed?.organizations)
      ? parsed.organizations
      : [];
    const ordersObj: any = parsed?.orders;
    const ordersSubcats: Record<string, string[]> =
      ordersObj && ordersObj.subcategories && typeof ordersObj.subcategories === 'object'
        ? ordersObj.subcategories
        : {};
    // Basic validation (keep same checks)
    if (!Array.isArray(pages)) throw new Error('Invalid webpages payload');
    if (!Array.isArray(cats)) throw new Error('Invalid categories payload');
    if (!Array.isArray(tmpls)) throw new Error('Invalid templates payload');
    // Replace semantics: clear then bulk put
    await clearStore('categories');
    await clearStore('templates');
    await clearStore('subcategories' as any);
    await clearStore('organizations' as any);
    await clearStore('webpages');
    const orgsNormalized = (orgsRaw as any[]).map((o: any) =>
      normalizeTimestampFields({
        ...o,
        isDefault: !!o?.isDefault,
      })
    );
    let fallbackOrgId: string | undefined = orgsNormalized[0]?.id;
    if (orgsNormalized.length) {
      const def = orgsNormalized.find((o: any) => o.isDefault);
      fallbackOrgId = def?.id || orgsNormalized[0]?.id;
      await putAll('organizations' as any, orgsNormalized);
    } else {
      // Ensure default organization exists
      const def = {
        id: createEntityId('o'),
        name: DEFAULT_ORGANIZATION_NAME,
        color: '#64748b',
        order: 0,
        isDefault: true,
      } as any;
      fallbackOrgId = def.id;
      try {
        await tx('organizations' as any, 'readwrite', async (t) => {
          const s = t.objectStore('organizations' as any);
          s.put(def);
        });
      } catch {}
    }
    // Backfill missing category.organizationId when absent
    const catsNormalized = (cats as any[]).map((c: any) =>
      normalizeTimestampFields({
        ...c,
        organizationId: ('organizationId' in c && c.organizationId) ? c.organizationId : fallbackOrgId,
        isDefault: !!(c as any)?.isDefault,
      })
    );
    if (catsNormalized.length) await putAll('categories', catsNormalized as any);
    const templatesNormalized = (tmpls as any[]).map((t: any) => normalizeTimestampFields(t));
    if (templatesNormalized.length) await putAll('templates', templatesNormalized as any);
    const subcatsNormalized = (subcats as any[]).map((s: any) =>
      normalizeTimestampFields({
        ...s,
        isDefault: !!(s as any)?.isDefault,
      })
    );
    if (subcatsNormalized.length) await putAll('subcategories' as any, subcatsNormalized as any);
    const pagesNormalized = (pages as any[]).map((p: any) => normalizeTimestampFields(p));
    if (pagesNormalized.length) await putAll('webpages', pagesNormalized as any);
    // Restore per-group orders for groups present
    try {
      const presentGroups: Set<string> = new Set((subcatsNormalized as any[]).map((s: any) => s.id));
      for (const [gid, arr] of Object.entries(ordersSubcats || {})) {
        if (!presentGroups.has(gid)) continue;
        const key = `order.subcat.${gid}`;
        try {
          const ids = Array.isArray(arr) ? (arr as string[]) : [];
          await setMeta(key, ids);
        } catch {}
      }
    } catch {}
    try {
      const baseOrders: Record<string, string[]> = {};
      for (const sc of subcatsNormalized as any[]) {
        const gid = sc?.id as string | undefined;
        if (!gid) continue;
        baseOrders[gid] = Array.isArray(ordersSubcats[gid])
          ? (ordersSubcats[gid] as string[])
          : [];
      }
      await buildNormalizedOrders({
        pages,
        subcategories: subcatsNormalized,
        baseOrders,
        persist: true,
      });
    } catch {}
  }

  return {
    // naming preserved for compatibility; replace full set to persist deletions
    saveToLocal: async (data: WebpageData[]) => {
      // Load all webpages including soft-deleted ones
      const all = (await getAll('webpages')) as WebpageData[];
      const allById = new Map(all.map(w => [w.id, w]));

      // Merge: keep soft-deleted items, update/add active items
      for (const w of data) {
        allById.set(w.id, normalizeTimestampFields(w as any));
      }

      // Save merged result
      await clearStore('webpages');
      const merged = Array.from(allById.values()).map((w) => normalizeTimestampFields(w as any));
      await putAll('webpages', merged);
    },
    loadFromLocal: async () => {
      const all = (await getAll('webpages')) as WebpageData[];
      // Filter out soft-deleted items
      return all.filter((w) => !w.deleted);
    },
    // Replace categories set to ensure deletions persist
    saveToSync: async (data: CategoryData[]) => {
      await clearStore('categories');
      const normalized = (data || []).map((c) => normalizeTimestampFields(c as any));
      await putAll('categories', normalized);
    },
    loadFromSync: async () => {
      const all = (await getAll('categories')) as CategoryData[];
      // Filter out soft-deleted items
      return all.filter((c) => !c.deleted);
    },
    // Replace templates set to ensure deletions persist
    saveTemplates: async (data: TemplateData[]) => {
      await clearStore('templates');
      const normalized = (data || []).map((t) => normalizeTimestampFields(t as any));
      await putAll('templates', normalized);
    },
    loadTemplates: async () => {
      const all = (await getAll('templates')) as TemplateData[];
      // Filter out soft-deleted items
      return all.filter((t) => !t.deleted);
    },
    exportData,
    importData,
    normalizeOrderMeta: async () => {
      await buildNormalizedOrders({ persist: true });
    },
    // Subcategories (groups)
    listSubcategories: async (categoryId: string) => listSubcategoriesImpl(categoryId),
    createSubcategory: async (
      categoryId: string,
      name: string,
      options?: { isDefault?: boolean; skipDefaultReset?: boolean }
    ) => {
      await ensureMigrationsReady();
      const list = await listSubcategoriesImpl(categoryId);

      // Check limit (list already filters deleted items)
      if (list.length >= ENTITY_LIMITS.MAX_GROUPS_PER_CATEGORY) {
        throw new LimitExceededError(`已達上限：每個 Collection 最多只能建立 ${ENTITY_LIMITS.MAX_GROUPS_PER_CATEGORY} 個 Group`);
      }

      // 若同名已存在（忽略大小寫），直接回傳現有的，避免重複建立
      const exists = list.find(
        (g) => String(g.name || '').toLowerCase() === String(name || '').toLowerCase()
      );
      if (exists) return exists as any;
      const now = nowMs();
      const id = createEntityId('g');
      const sc = {
        id,
        categoryId,
        name,
        order: (list[list.length - 1]?.order ?? -1) + 1,
        createdAt: now,
        updatedAt: now,
        isDefault: !!options?.isDefault,
      } as any;
      await tx(['subcategories' as any, 'categories'], 'readwrite', async (t) => {
        const s = t.objectStore('subcategories' as any);
        const cs = t.objectStore('categories');
        // 交易內再次檢查同名，避免競態（排除已刪除的）
        try {
          const all: any[] = await new Promise((resolve, reject) => {
            const req = s.getAll();
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = () => reject(req.error);
          });
          const dup = all.find(
            (g: any) => !g.deleted && g.categoryId === categoryId && String(g.name || '').toLowerCase() === String(name || '').toLowerCase()
          );
          if (dup) return; // 已有同名，放棄寫入
        } catch {}
        s.put(sc);

        // If adding another group under a default category, mark category as customized
        try {
          const cur = await new Promise<any>((resolve, reject) => {
            const req = cs.get(categoryId);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
          });
          if (cur && cur.isDefault && list.length > 0 && !options?.skipDefaultReset) {
            cur.isDefault = false;
            cur.updatedAt = nowMs();
            cs.put(cur);
          }
        } catch {}
      });
      return sc as any;
    },
    renameSubcategory: async (id: string, name: string) => {
      await tx(['subcategories' as any], 'readwrite', async (t) => {
        const s = t.objectStore('subcategories' as any);
        const cur = await new Promise<any>((resolve, reject) => {
          const req = s.get(id);
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
        });
        if (!cur) return;
        const nextName = name;
        if (String(cur.name || '') !== String(nextName || '') && cur.isDefault) {
          cur.isDefault = false;
        }
        cur.name = nextName;
        cur.updatedAt = nowMs();
        s.put(cur);
      });
    },
    deleteSubcategory: async (id: string, reassignTo: string) => {
      await tx(['subcategories' as any, 'webpages'], 'readwrite', async (t) => {
        const ss = t.objectStore('subcategories' as any);
        const ws = t.objectStore('webpages');
        const cur = await new Promise<any>((resolve, reject) => {
          const req = ss.get(id);
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
        });
        if (!cur) return;
        const target = await new Promise<any>((resolve, reject) => {
          const req = ss.get(reassignTo);
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
        });
        if (!target || target.categoryId !== cur.categoryId) {
          throw new Error('Invalid reassign target');
        }
        // Reassign all webpages referencing this subcategory
        const idx = (() => {
          try { return ws.index('category_subcategory'); } catch { return null as any; }
        })();
        const pages: any[] = await new Promise((resolve, reject) => {
          if (idx) {
            const range = IDBKeyRange.only([cur.categoryId, id]);
            const req = idx.getAll(range);
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = () => reject(req.error);
          } else {
            const rq = ws.getAll();
            rq.onsuccess = () => resolve((rq.result || []).filter((p: any) => p.category === cur.categoryId && p.subcategoryId === id));
            rq.onerror = () => reject(rq.error);
          }
        });
        for (const p of pages) {
          p.subcategoryId = reassignTo;
          ws.put(p);
        }
        // Soft-delete the subcategory
        const now = nowMs();
        ss.put({ ...cur, deleted: true, deletedAt: now, updatedAt: now });
      });
      // Keep order metadata for now, will be cleaned up by GC
    },
    // Soft-delete the subcategory and all webpages referencing it in one transaction
    deleteSubcategoryAndPages: async (id: string) => {
      const now = nowMs();
      await tx(['subcategories' as any, 'webpages'], 'readwrite', async (t) => {
        const ss = t.objectStore('subcategories' as any);
        const ws = t.objectStore('webpages');
        const cur = await new Promise<any>((resolve, reject) => {
          const req = ss.get(id);
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
        });
        if (!cur) return;
        // Skip if already deleted
        if (cur.deleted) return;

        // Query pages by composite index when available, fallback to scan
        const pages: any[] = await new Promise((resolve, reject) => {
          let idx: any = null;
          try { idx = ws.index('category_subcategory'); } catch {}
          if (idx) {
            const range = IDBKeyRange.only([cur.categoryId, id]);
            const req = idx.getAll(range);
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = () => reject(req.error);
          } else {
            const rq: any = ws.getAll();
            rq.onsuccess = () =>
              resolve((rq.result || []).filter((p: any) => p.category === cur.categoryId && p.subcategoryId === id));
            rq.onerror = () => reject(rq.error);
          }
        });
        // Soft-delete all webpages in this group
        for (const p of pages) {
          if (!p.deleted) {
            ws.put({ ...p, deleted: true, deletedAt: now, updatedAt: now });
          }
        }
        // Soft-delete the subcategory
        ss.put({ ...cur, deleted: true, deletedAt: now, updatedAt: now });
      });
      // Keep order metadata for now, will be cleaned up by GC
    },
    reorderSubcategories: async (categoryId: string, orderedIds: string[]) => {
      await tx(['subcategories' as any], 'readwrite', async (t) => {
        const s = t.objectStore('subcategories' as any);
        let order = 0;
        for (const id of orderedIds) {
          const cur = await new Promise<any>((resolve, reject) => {
            const req = s.get(id);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
          });
          if (!cur || cur.categoryId !== categoryId) continue;
          cur.order = order++;
          cur.updatedAt = nowMs();
          s.put(cur);
        }
      });
    },
    updateCardSubcategory: async (cardId: string, subcategoryId: string) => {
      await tx('webpages', 'readwrite', async (t) => {
        const s = t.objectStore('webpages');
        const cur = await new Promise<any>((resolve, reject) => {
          const req = s.get(cardId);
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
        });
        if (!cur) return;
        const prev = (cur as any).subcategoryId as string | undefined;
        const next = subcategoryId;
        cur.subcategoryId = next;
        cur.updatedAt = nowMs();
        s.put(cur);
        // Maintain per-group order lists
        try {
          if (prev && prev !== next) {
            const keyPrev = `order.subcat.${prev}`;
            const prevOrder = ((await getMeta<string[]>(keyPrev)) || []).filter((x) => x !== cardId);
            await setMeta(keyPrev, prevOrder);
          }
          if (next) {
            const keyNext = `order.subcat.${next}`;
            const nextOrder = ((await getMeta<string[]>(keyNext)) || []).filter((x) => x !== cardId);
            nextOrder.push(cardId);
            await setMeta(keyNext, nextOrder);
          }
        } catch {}
      });
    },
    deleteSubcategoriesByCategory: async (categoryId: string) => {
      const now = nowMs();
      let deletedIds: string[] = [];
      await tx(['subcategories' as any], 'readwrite', async (t) => {
        const s = t.objectStore('subcategories' as any);
        try {
          // Fast path via index
          const idx = s.index('by_categoryId');
          const range = IDBKeyRange.only(categoryId);
          const list: any[] = await new Promise((resolve, reject) => {
            const req = idx.getAll(range);
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = () => reject(req.error);
          });
          // Soft-delete subcategories (filter out already deleted)
          for (const it of list) {
            if (!it.deleted) {
              s.put({ ...it, deleted: true, deletedAt: now, updatedAt: now });
              deletedIds.push(it.id);
            }
          }
        } catch {
          // Fallback: getAll then filter
          const all: any[] = await new Promise((resolve, reject) => {
            const req = s.getAll();
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = () => reject(req.error);
          });
          for (const it of all) {
            if (it.categoryId === categoryId && !it.deleted) {
              s.put({ ...it, deleted: true, deletedAt: now, updatedAt: now });
              deletedIds.push(it.id);
            }
          }
        }
      });
      // Note: Keep order metadata for now, will be cleaned up by GC
      // This allows restoration to preserve original order
    },

    // Cleanup orphaned meta records
    cleanupOrphanedOrderMeta: async () => {
      const subcategories = (await getAll('subcategories' as any).catch(() => [])) as any[];
      const validGroupIds = new Set(subcategories.map((sc: any) => sc.id));

      // Get all meta keys that start with 'order.subcat.'
      const metaKeys = await tx('meta', 'readonly', async (t) => {
        const s = t.objectStore('meta');
        const allKeys: string[] = [];
        return new Promise<string[]>((resolve) => {
          const req = s.openCursor();
          req.onsuccess = (event) => {
            const cursor = (event.target as any).result;
            if (cursor) {
              const key = cursor.key as string;
              if (key.startsWith('order.subcat.')) {
                allKeys.push(key);
              }
              cursor.continue();
            } else {
              resolve(allKeys);
            }
          };
          req.onerror = () => resolve([]);
        });
      });

      // Clean up orphaned order meta records
      let cleanedCount = 0;
      for (const key of metaKeys) {
        const groupId = key.replace('order.subcat.', '');
        if (!validGroupIds.has(groupId)) {
          try {
            await setMeta(key, []);
            cleanedCount++;
          } catch {}
        }
      }

      return { cleanedCount, totalOrderKeys: metaKeys.length };
    },

    // Organizations API
    listOrganizations: async () => {
      await ensureMigrationsReady();
      const list = (await getAll('organizations' as any).catch(() => [])) as any[];
      const arr = Array.isArray(list) ? list.slice() : [];
      const filtered = arr.filter((o: any) => !o.deleted);
      filtered.sort(
        (a: any, b: any) => (a.order ?? 0) - (b.order ?? 0) || String(a.name || '').localeCompare(String(b.name || ''))
      );
      return filtered as any;
    },
    createOrganization: async (name: string, color?: string, options?: { createDefaultCollection?: boolean }) => {
      const { createDefaultCollection = true } = options || {};
      await ensureMigrationsReady();

      // Calculate order for Organization
      const existing = (await getAll('organizations' as any).catch(() => [])) as any[];
      const activeOrgs = existing.filter((o: any) => !o.deleted);

      // Check limit
      if (activeOrgs.length >= ENTITY_LIMITS.MAX_ORGANIZATIONS) {
        throw new LimitExceededError(`已達上限：最多只能建立 ${ENTITY_LIMITS.MAX_ORGANIZATIONS} 個 Organization`);
      }

      const order = existing.length ? Math.max(...existing.map((o: any) => o.order ?? 0)) + 1 : 0;

      // Generate IDs
      const orgId = createEntityId('o');
      const catId = createEntityId('c');

      // Create Organization object
      const org = {
        id: orgId,
        name: (name || 'Org').trim() || 'Org',
        color,
        order,
        isDefault: false,
      };

      // Create default Collection object
      const defaultCategory = createDefaultCollection ? {
        id: catId,
        name: DEFAULT_CATEGORY_NAME,
        color: color || '#64748b',
        order: 0,
        organizationId: orgId,
        isDefault: false,
        updatedAt: nowMs(),
      } : null;

      // Atomic transaction: write both or rollback
      await tx(['organizations' as any, 'categories'], 'readwrite', async (t) => {
        const orgStore = t.objectStore('organizations' as any);
        const catStore = t.objectStore('categories');

        // Write Organization
        orgStore.put(org);

        // Write default Collection if enabled
        if (defaultCategory) {
          catStore.put(defaultCategory);
        }
      });

      return {
        organization: org,
        defaultCollection: defaultCategory
      } as any;
    },
    renameOrganization: async (id: string, name: string) => {
      await tx('organizations' as any, 'readwrite', async (t) => {
        const s = t.objectStore('organizations' as any);
        const cur = await new Promise<any>((resolve, reject) => {
          const req = s.get(id);
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
        });
        if (!cur) return;
        cur.name = (name || '').trim() || cur.name;
        cur.updatedAt = nowMs();
        s.put(cur);
      });
    },
    reorderOrganizations: async (orderedIds: string[]) => {
      await tx('organizations' as any, 'readwrite', async (t) => {
        const s = t.objectStore('organizations' as any);
        const byId = new Map<string, any>();
        try {
          const all: any[] = await new Promise((resolve, reject) => {
            const req = s.getAll();
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = () => reject(req.error);
          });
          for (const o of all) byId.set(o.id, o);
        } catch {}
        let i = 0;
        for (const id of orderedIds) {
          const o = byId.get(id);
          if (!o) continue;
          o.order = i++;
          s.put(o);
          byId.delete(id);
        }
        for (const o of byId.values()) {
          o.order = i++;
          s.put(o);
        }
      });
    },

    // Categories helpers scoped by organization
    addCategory: async (name: string, color?: string, organizationId?: string) => {
      await ensureMigrationsReady();
      let orgId = organizationId;
      let createdDefaultOrg: any | null = null;
      try {
        if (!orgId) {
          const orgs = (await getAll('organizations' as any).catch(() => [])) as any[];
          const active = (orgs || []).filter((o: any) => !o.deleted);
          const def = active.find((o: any) => o.isDefault) || active[0];
          if (def) {
            orgId = def.id;
          } else {
            orgId = createEntityId('o');
            createdDefaultOrg = {
              id: orgId,
              name: DEFAULT_ORGANIZATION_NAME,
              color: '#64748b',
              order: 0,
              isDefault: true,
            };
          }
        }
      } catch {}
      if (!orgId) orgId = createEntityId('o');
      const id = createEntityId('c');
      // compute next order within org and check limit
      let nextOrder = 0;
      let currentCount = 0;
      let orgWasDefault = false;
      try {
        await tx('categories', 'readonly', async (t) => {
          const s = t.objectStore('categories');
          try {
            const idx = s.index('by_organizationId_order');
            const range = IDBKeyRange.bound([orgId, -Infinity], [orgId, Infinity]);
            const list: any[] = await new Promise((resolve, reject) => {
              const req = idx.getAll(range);
              req.onsuccess = () => resolve(req.result || []);
              req.onerror = () => reject(req.error);
            });
            const activeList = list.filter((c: any) => !c.deleted);
            currentCount = activeList.length;
            nextOrder = list.length ? Math.max(...list.map((c: any) => c.order ?? 0)) + 1 : 0;
          } catch {
            const list: any[] = await new Promise((resolve, reject) => {
              const rq = s.getAll();
              rq.onsuccess = () => resolve(rq.result || []);
              rq.onerror = () => reject(rq.error);
            });
            const filtered = list.filter((c: any) => c.organizationId === orgId && !c.deleted);
            currentCount = filtered.length;
            nextOrder = filtered.length;
          }
        });
      } catch {}
      try {
        const orgs = (await getAll('organizations' as any).catch(() => [])) as any[];
        const cur = orgs.find((o: any) => o.id === orgId);
        orgWasDefault = !!cur?.isDefault;
      } catch {}

      // Check limit
      if (currentCount >= ENTITY_LIMITS.MAX_CATEGORIES_PER_ORG) {
        throw new LimitExceededError(`已達上限：每個 Organization 最多只能建立 ${ENTITY_LIMITS.MAX_CATEGORIES_PER_ORG} 個 Collection`);
      }
      const cat = {
        id,
        name: (name || 'Collection').trim() || 'Collection',
        color: color || '#64748b',
        order: nextOrder,
        organizationId: orgId,
        isDefault: false,
        updatedAt: nowMs(),
      } as any;
      await tx(['categories', 'organizations' as any], 'readwrite', async (t) => {
        if (createdDefaultOrg) {
          t.objectStore('organizations' as any).put(createdDefaultOrg);
        }
        if (orgWasDefault && currentCount > 0) {
          try {
            const os = t.objectStore('organizations' as any);
            const cur = await new Promise<any>((resolve, reject) => {
              const req = os.get(orgId);
              req.onsuccess = () => resolve(req.result);
              req.onerror = () => reject(req.error);
            });
            if (cur && cur.isDefault) {
              cur.isDefault = false;
              cur.updatedAt = nowMs();
              os.put(cur);
            }
          } catch {}
        }
        t.objectStore('categories').put(cat);
      });
      return cat as any;
    },
    reorderCategories: async (categoryIds: string[], organizationId: string) => {
      await tx('categories', 'readwrite', async (t) => {
        const s = t.objectStore('categories');
        const all: any[] = await new Promise((resolve, reject) => {
          const req = s.getAll();
          req.onsuccess = () => resolve(req.result || []);
          req.onerror = () => reject(req.error);
        });
        const byId = new Map<string, any>(all.filter((c: any) => c.organizationId === organizationId).map((c: any) => [c.id, c]));
        let i = 0;
        for (const id of categoryIds) {
          const c = byId.get(id);
          if (!c) continue;
          c.order = i++;
          s.put(c);
          byId.delete(id);
        }
        // Append remaining in previous relative order
        for (const c of byId.values()) {
          c.order = i++;
          s.put(c);
        }
      });
    },
    updateCategoryOrganization: async (categoryId: string, toOrganizationId: string) => {
      await tx('categories', 'readwrite', async (t) => {
        const s = t.objectStore('categories');
        const cur = await new Promise<any>((resolve, reject) => {
          const req = s.get(categoryId);
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
        });
        if (!cur) return;
        // compute next order in target org
        let nextOrder = 0;
        try {
          const all: any[] = await new Promise((resolve, reject) => {
            const rq = s.getAll();
            rq.onsuccess = () => resolve(rq.result || []);
            rq.onerror = () => reject(rq.error);
          });
          nextOrder = all.filter((c: any) => c.organizationId === toOrganizationId).length;
        } catch {}
        cur.organizationId = toOrganizationId;
        cur.order = nextOrder;
        if (cur.isDefault) cur.isDefault = false;
        cur.updatedAt = nowMs();
        s.put(cur);
      });
    },
  };
}
