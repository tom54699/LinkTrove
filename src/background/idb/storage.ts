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
  void migrateSubcategoriesOnce();

  async function listSubcategoriesImpl(categoryId: string): Promise<any[]> {
    return await tx(['subcategories' as any], 'readonly', async (t) => {
      const s = t.objectStore('subcategories' as any);
      let useIdx = false;
      try {
        // prefer composite index for ordering
        if (s.indexNames.contains('by_categoryId_order')) useIdx = true;
      } catch {}
      if (useIdx) {
        // Query by categoryId via index
        const idx = s.index('by_categoryId_order');
        const range = IDBKeyRange.bound([categoryId, -Infinity], [categoryId, Infinity]);
        const rows = await new Promise<any[]>((resolve, reject) => {
          const req = idx.getAll(range);
          req.onsuccess = () => resolve(req.result || []);
          req.onerror = () => reject(req.error);
        });
        // 去重（以 id 為準）
        const byId = new Map<string, any>();
        for (const r of rows) if (!byId.has(r.id)) byId.set(r.id, r);
        return Array.from(byId.values());
      }
      // Fallback: getAll then filter/sort
      const all = await new Promise<any[]>((resolve, reject) => {
        const req = s.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });
      // 去重（以 id 為準）
      const byId = new Map<string, any>();
      for (const r of all) if (!byId.has(r.id)) byId.set(r.id, r);
      return Array.from(byId.values())
        .filter((x) => x.categoryId === categoryId)
        .sort((a, b) => a.order - b.order);
    });
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
    const [webpages, categories, templates, subcategories] = await Promise.all([
      getAll('webpages'),
      getAll('categories'),
      getAll('templates'),
      getAll('subcategories' as any).catch(() => []),
    ]);
    // Include minimal settings (theme, selectedCategoryId)
    let theme: any = undefined;
    let selectedCategoryId: any = undefined;
    try {
      const got: any = await new Promise((resolve) => {
        try {
          chrome.storage?.local?.get?.(
            { theme: undefined, selectedCategoryId: undefined },
            resolve
          );
        } catch {
          resolve({});
        }
      });
      theme = got?.theme;
      selectedCategoryId = got?.selectedCategoryId;
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
    const settings: any = {};
    if (theme !== undefined) settings.theme = theme;
    if (selectedCategoryId !== undefined)
      settings.selectedCategoryId = selectedCategoryId;
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
      settings,
      orders,
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
    await clearStore('webpages');
    if (cats.length) await putAll('categories', cats);
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
          for (const it of list) s.delete(it.id);
        } catch {
          // Fallback: getAll then filter
          const all: any[] = await new Promise((resolve, reject) => {
            const req = s.getAll();
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = () => reject(req.error);
          });
          for (const it of all) if (it.categoryId === categoryId) s.delete(it.id);
        }
      });
    },
  };
}
