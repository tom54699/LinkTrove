import type {
  WebpageData,
  CategoryData,
  TemplateData,
  StorageService,
} from '../storageService';
import { getAll, putAll, setMeta, getMeta, clearStore, tx } from './db';

async function migrateOnce(): Promise<void> {
  try {
    const migrated = await getMeta<boolean>('migratedToIdb');
    if (migrated) return;
  } catch {}
  try {
    const localAny: any = await new Promise((resolve) => {
      try {
        chrome.storage?.local?.get?.({ webpages: [] }, resolve);
      } catch {
        resolve({});
      }
    });
    const syncAny: any = await new Promise((resolve) => {
      try {
        chrome.storage?.sync?.get?.({ categories: [], templates: [] }, resolve);
      } catch {
        resolve({});
      }
    });
    const webpages: WebpageData[] = Array.isArray(localAny?.webpages)
      ? localAny.webpages
      : [];
    const categories: CategoryData[] = Array.isArray(syncAny?.categories)
      ? syncAny.categories
      : [];
    const templates: TemplateData[] = Array.isArray(syncAny?.templates)
      ? syncAny.templates
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
  void migrateOnce();
  void migrateOrganizationsOnce();
  void migrateSubcategoriesOnce();

  async function listSubcategoriesImpl(categoryId: string): Promise<any[]> {
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
          return Array.from(byId.values()).sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));
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
          .filter((x) => x.categoryId === categoryId)
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
      const orgId = 'o_default';
      await tx('organizations' as any, 'readwrite', async (t) => {
        const s = t.objectStore('organizations' as any);
        try {
          const existing: any[] = await new Promise((resolve, reject) => {
            const req = s.getAll();
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = () => reject(req.error);
          });
          // 只有在完全沒有任何組織時才建立 o_default，避免污染既有資料與測試期望
          if ((existing || []).length === 0) {
            s.put({ id: orgId, name: 'Personal', color: '#64748b', order: 0 });
          }
        } catch {
          // 讀取失敗（例如新資料庫），直接建立預設
          try { s.put({ id: orgId, name: 'Personal', color: '#64748b', order: 0 }); } catch {}
        }
      });

      // Load categories, attach missing organizationId, and normalize order within each org
      const categories = (await getAll('categories')) as CategoryData[];
      if (categories.length) {
        // Attach missing org id
        const next = categories.map((c) =>
          (!('organizationId' in c) || !(c as any).organizationId)
            ? ({ ...(c as any), organizationId: 'o_default' } as any)
            : (c as any)
        );
        // Reorder categories per organization to be contiguous
        const byOrg: Record<string, any[]> = {};
        for (const c of next as any[]) {
          const oid = (c as any).organizationId || 'o_default';
          if (!byOrg[oid]) byOrg[oid] = [];
          byOrg[oid].push(c);
        }
        for (const [oid, list] of Object.entries(byOrg)) {
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
      const now = Date.now();
      const byCatHasAny: Record<string, boolean> = {};
      for (const sc of subcats as any[]) byCatHasAny[sc.categoryId] = true;
      const defaults: Record<string, any> = {};
      const toCreate: any[] = [];
      for (const c of categories as any[]) {
        if (!byCatHasAny[c.id]) {
          // Use deterministic id to avoid duplicate default creation in race conditions
          const id = `g_default_${c.id}`;
          const sc = {
            id,
            categoryId: c.id,
            name: 'group',
            order: 0,
            createdAt: now,
            updatedAt: now,
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
    const orders: { subcategories: Record<string, string[]> } = { subcategories: {} };
    try {
      for (const sc of (subcategories as any[])) {
        const key = `order.subcat.${sc.id}`;
        try {
          const vals = (await getMeta<string[]>(key)) || [];
          if (Array.isArray(vals) && vals.length > 0) orders.subcategories[sc.id] = vals.slice();
        } catch {}
      }
    } catch {}

    const payload = {
      schemaVersion: 1,
      webpages,
      categories,
      templates,
      subcategories,
      organizations,
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
    const orgs: any[] = Array.isArray(parsed?.organizations)
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
    if (orgs.length) await putAll('organizations' as any, orgs);
    if (!orgs.length) {
      // Ensure default organization exists
      try {
        await tx('organizations' as any, 'readwrite', async (t) => {
          const s = t.objectStore('organizations' as any);
          const def = { id: 'o_default', name: 'Personal', color: '#64748b', order: 0 } as any;
          s.put(def);
        });
      } catch {}
    }
    // Backfill missing category.organizationId when absent
    const catsNormalized = (cats as any[]).map((c: any) =>
      ('organizationId' in c && c.organizationId) ? c : { ...c, organizationId: 'o_default' }
    );
    if (catsNormalized.length) await putAll('categories', catsNormalized as any);
    if (tmpls.length) await putAll('templates', tmpls);
    if (subcats.length) await putAll('subcategories' as any, subcats);
    if (pages.length) await putAll('webpages', pages);
    // Restore per-group orders for groups present
    try {
      const presentGroups: Set<string> = new Set((subcats as any[]).map((s: any) => s.id));
      for (const [gid, arr] of Object.entries(ordersSubcats || {})) {
        if (!presentGroups.has(gid)) continue;
        const key = `order.subcat.${gid}`;
        try {
          const ids = Array.isArray(arr) ? (arr as string[]) : [];
          await setMeta(key, ids);
        } catch {}
      }
    } catch {}
  }

  return {
    // naming preserved for compatibility; replace full set to persist deletions
    saveToLocal: async (data: WebpageData[]) => {
      await clearStore('webpages');
      await putAll('webpages', data || []);
    },
    loadFromLocal: async () => (await getAll('webpages')) as WebpageData[],
    // Replace categories set to ensure deletions persist
    saveToSync: async (data: CategoryData[]) => {
      await clearStore('categories');
      await putAll('categories', data || []);
    },
    loadFromSync: async () => (await getAll('categories')) as CategoryData[],
    // Replace templates set to ensure deletions persist
    saveTemplates: async (data: TemplateData[]) => {
      await clearStore('templates');
      await putAll('templates', data || []);
    },
    loadTemplates: async () => (await getAll('templates')) as TemplateData[],
    exportData,
    importData,
    // Subcategories (groups)
    listSubcategories: async (categoryId: string) => listSubcategoriesImpl(categoryId),
    createSubcategory: async (categoryId: string, name: string) => {
      const list = await listSubcategoriesImpl(categoryId);
      // 若同名已存在（忽略大小寫），直接回傳現有的，避免重複建立
      const exists = list.find(
        (g) => String(g.name || '').toLowerCase() === String(name || '').toLowerCase()
      );
      if (exists) return exists as any;
      const now = Date.now();
      const id = 'g_' + Math.random().toString(36).slice(2, 9);
      const sc = { id, categoryId, name, order: (list[list.length - 1]?.order ?? -1) + 1, createdAt: now, updatedAt: now } as any;
      await tx(['subcategories' as any], 'readwrite', async (t) => {
        const s = t.objectStore('subcategories' as any);
        // 交易內再次檢查同名，避免競態
        try {
          const all: any[] = await new Promise((resolve, reject) => {
            const req = s.getAll();
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = () => reject(req.error);
          });
          const dup = all.find(
            (g: any) => g.categoryId === categoryId && String(g.name || '').toLowerCase() === String(name || '').toLowerCase()
          );
          if (dup) return; // 已有同名，放棄寫入
        } catch {}
        s.put(sc);
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
        cur.name = name;
        cur.updatedAt = Date.now();
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
        // Delete the subcategory
        ss.delete(id);
      });
      // Clean up order metadata for the deleted group
      try { await setMeta(`order.subcat.${id}`, []); } catch {}
    },
    // Delete the subcategory and all webpages referencing it in one transaction
    deleteSubcategoryAndPages: async (id: string) => {
      await tx(['subcategories' as any, 'webpages'], 'readwrite', async (t) => {
        const ss = t.objectStore('subcategories' as any);
        const ws = t.objectStore('webpages');
        const cur = await new Promise<any>((resolve, reject) => {
          const req = ss.get(id);
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
        });
        if (!cur) return;
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
        for (const p of pages) ws.delete(p.id);
        ss.delete(id);
      });
      try { await setMeta(`order.subcat.${id}`, []); } catch {}
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
          cur.updatedAt = Date.now();
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
        cur.updatedAt = new Date().toISOString();
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
          for (const it of list) {
            s.delete(it.id);
            deletedIds.push(it.id);
          }
        } catch {
          // Fallback: getAll then filter
          const all: any[] = await new Promise((resolve, reject) => {
            const req = s.getAll();
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = () => reject(req.error);
          });
          for (const it of all) {
            if (it.categoryId === categoryId) {
              s.delete(it.id);
              deletedIds.push(it.id);
            }
          }
        }
      });
      // Clean up order metadata for all deleted groups
      for (const id of deletedIds) {
        try { await setMeta(`order.subcat.${id}`, []); } catch {}
      }
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
      const list = (await getAll('organizations' as any).catch(() => [])) as any[];
      const arr = Array.isArray(list) ? list.slice() : [];
      arr.sort(
        (a: any, b: any) => (a.order ?? 0) - (b.order ?? 0) || String(a.name || '').localeCompare(String(b.name || ''))
      );
      return arr as any;
    },
    createOrganization: async (name: string, color?: string) => {
      const existing = (await getAll('organizations' as any).catch(() => [])) as any[];
      const order = existing.length ? Math.max(...existing.map((o: any) => o.order ?? 0)) + 1 : 0;
      const org = { id: 'o_' + Math.random().toString(36).slice(2, 9), name: (name || 'Org').trim() || 'Org', color, order } as any;
      await tx('organizations' as any, 'readwrite', async (t) => {
        t.objectStore('organizations' as any).put(org);
      });
      return org as any;
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
        s.put(cur);
      });
    },
    deleteOrganization: async (id: string, options?: { reassignTo?: string }) => {
      await tx(['organizations' as any, 'categories'], 'readwrite', async (t) => {
        const os = t.objectStore('organizations' as any);
        const cs = t.objectStore('categories');
        // Ensure a target organization exists
        let targetId = options?.reassignTo || 'o_default';
        // Create default if missing or if target equals deleted id
        const orgs = await new Promise<any[]>((resolve, reject) => {
          const req = os.getAll();
          req.onsuccess = () => resolve(req.result || []);
          req.onerror = () => reject(req.error);
        });
        if (!orgs.some((o) => o.id === targetId) || targetId === id) {
          // pick first other org
          const alt = orgs.find((o) => o.id !== id);
          if (alt) targetId = alt.id;
          else {
            const def = { id: 'o_default', name: 'Personal', color: '#64748b', order: 0 } as any;
            os.put(def);
            targetId = def.id;
          }
        }
        // Reassign categories to target
        const cats = await new Promise<any[]>((resolve, reject) => {
          const req = cs.getAll();
          req.onsuccess = () => resolve(req.result || []);
          req.onerror = () => reject(req.error);
        });
        // Determine next order base in target org
        let base = 0;
        for (const c of cats) if ((c as any).organizationId === targetId) base = Math.max(base, (c as any).order ?? 0);
        for (const c of cats) {
          if ((c as any).organizationId === id) {
            (c as any).organizationId = targetId;
            (c as any).order = ++base;
            cs.put(c);
          }
        }
        // Delete org
        os.delete(id);
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
      const orgId = organizationId || 'o_default';
      const id = 'c_' + Math.random().toString(36).slice(2, 9);
      // compute next order within org
      let nextOrder = 0;
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
            nextOrder = list.length ? Math.max(...list.map((c: any) => c.order ?? 0)) + 1 : 0;
          } catch {
            const list: any[] = await new Promise((resolve, reject) => {
              const rq = s.getAll();
              rq.onsuccess = () => resolve(rq.result || []);
              rq.onerror = () => reject(rq.error);
            });
            nextOrder = list.filter((c: any) => c.organizationId === orgId).length;
          }
        });
      } catch {}
      const cat = {
        id,
        name: (name || 'Collection').trim() || 'Collection',
        color: color || '#64748b',
        order: nextOrder,
        organizationId: orgId,
      } as any;
      await tx('categories', 'readwrite', async (t) => {
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
        s.put(cur);
      });
    },
  };
}
