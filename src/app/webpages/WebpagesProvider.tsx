import React from 'react';
import { computeAutoMeta } from './metaAutoFill';
import type { TabItemData } from '../tabs/types';
import {
  createWebpageService,
  type WebpageService,
} from '../../background/webpageService';
import type { WebpageCardData } from './WebpageCard';

interface CtxValue {
  items: WebpageCardData[];
  actions: {
    load: () => Promise<void>;
    addFromTab: (tab: TabItemData) => Promise<string>;
    deleteMany: (ids: string[]) => Promise<void>;
    deleteOne: (id: string) => Promise<void>;
    updateNote: (id: string, note: string) => Promise<void>; // deprecated alias
    updateDescription: (id: string, description: string) => Promise<void>;
    updateCard: (id: string, patch: Partial<{ title: string; description: string; url: string; meta: Record<string,string> }>) => Promise<void>;
    updateTitle: (id: string, title: string) => Promise<void>;
    updateUrl: (id: string, url: string) => Promise<void>;
    updateCategory: (id: string, category: string) => Promise<void>;
    updateMeta: (id: string, meta: Record<string, string>) => Promise<void>;
    reorder: (fromId: string, toId: string) => void;
    moveToEnd: (id: string) => void;
  };
}

const Ctx = React.createContext<CtxValue | null>(null);

function toCard(d: any): WebpageCardData {
  return {
    id: d.id,
    title: d.title,
    url: d.url,
    favicon: d.favicon,
    description: d.note,
    category: d.category,
    meta: d.meta,
  };
}

function shouldUseDb() {
  try {
    return (
      typeof window !== 'undefined' &&
      localStorage.getItem('linktrove.backend') === 'sqlite' &&
      localStorage.getItem('migrated.v1') === 'true'
    );
  } catch { return false; }
}

export const WebpagesProvider: React.FC<{
  children: React.ReactNode;
  svc?: WebpageService;
}> = ({ children, svc }) => {
  if (shouldUseDb()) return <DbWebpagesProvider>{children}</DbWebpagesProvider> as any;
  const service = React.useMemo(() => {
    if (svc) return svc;
    const hasChrome =
      typeof (globalThis as any).chrome !== 'undefined' &&
      !!(globalThis as any).chrome?.storage?.local;
    if (hasChrome) return createWebpageService();
    // Fallback in tests/non-extension env: simple in-memory impl
    let pages: any[] = [];
    function nowIso() {
      return new Date().toISOString();
    }
    return {
      async loadWebpages() {
        return pages;
      },
      async addWebpageFromTab(tab: any) {
        const url = tab.url || '';
        const title =
          (tab.title || '').trim() ||
          (url ? new URL(url).hostname : 'Untitled');
        const favicon = tab.favIconUrl || '';
        const id = 'mem_' + Math.random().toString(36).slice(2, 9);
        const item = {
          id,
          title,
          url,
          favicon,
          note: '',
          category: 'default',
          createdAt: nowIso(),
          updatedAt: nowIso(),
        };
        pages = [item, ...pages];
        return item;
      },
      async updateWebpage(id: string, updates: any) {
        const idx = pages.findIndex((p) => p.id === id);
        if (idx === -1) throw new Error('Not found');
        pages[idx] = { ...pages[idx], ...updates, updatedAt: nowIso() };
        return pages[idx];
      },
      async deleteWebpage(id: string) {
        pages = pages.filter((p) => p.id !== id);
      },
    } as WebpageService;
  }, [svc]);
  const [items, setItems] = React.useState<WebpageCardData[]>([]);

  const load = React.useCallback(async () => {
    const list = await service.loadWebpages();
    setItems(list.map(toCard));
  }, [service]);

  const addFromTab = React.useCallback(
    async (tab: TabItemData) => {
      const created = await service.addWebpageFromTab(tab as any);
      // Prefetch page meta and cache for later auto-fill (best-effort)
      try {
        if (typeof (globalThis as any).chrome !== 'undefined' && (tab as any).id != null) {
          const { extractMetaForTab, waitForTabComplete } = await import('../../background/pageMeta');
          // Wait for tab load complete to increase chance head/meta are ready
          const tid = (tab as any).id as number;
          void (async () => {
            try { await waitForTabComplete(tid); } catch {}
            const meta = await extractMetaForTab(tid);
            if (!meta) return;
            // Optionally refine card fields shortly after creation
            try {
              const patch: any = {};
              if (meta.title && meta.title.trim()) patch.title = meta.title.trim();
              // If note empty, use description as initial note
              const cur = created as any;
              if ((!cur.note || !cur.note.trim()) && meta.description && meta.description.trim()) {
                patch.note = meta.description.trim();
              }
              if (Object.keys(patch).length > 0) {
                const updated = await service.updateWebpage(created.id, patch);
                setItems((prev) => prev.map((p) => (p.id === created.id ? toCard(updated) : p)));
              }
            } catch {}
          })();
        }
      } catch {}
      // Prepend if new
      setItems((prev) => {
        if (prev.some((p) => p.id === created.id)) return prev;
        const card = toCard(created);
        return [card, ...prev];
      });
      return created.id;
    },
    [service]
  );

  const deleteMany = React.useCallback(
    async (ids: string[]) => {
      for (const id of ids) await service.deleteWebpage(id);
      await load();
    },
    [service, load]
  );

  const deleteOne = React.useCallback(
    async (id: string) => {
      await service.deleteWebpage(id);
      setItems((prev) => prev.filter((p) => p.id != id));
    },
    [service]
  );

  const updateNote = React.useCallback(
    async (id: string, note: string) => {
      const updated = await service.updateWebpage(id, { note });
      setItems((prev) => prev.map((p) => (p.id === id ? toCard(updated) : p)));
    },
    [service]
  );

  const updateDescription = React.useCallback(
    async (id: string, description: string) => {
      const updated = await service.updateWebpage(id, { note: description });
      setItems((prev) => prev.map((p) => (p.id === id ? toCard(updated) : p)));
    },
    [service]
  );

  const updateCard = React.useCallback(
    async (id: string, patch: Partial<{ title: string; description: string; url: string; meta: Record<string,string> }>) => {
      const payload: any = {};
      if (patch.title !== undefined) payload.title = patch.title;
      if (patch.description !== undefined) payload.note = patch.description;
      if (patch.url !== undefined) payload.url = patch.url;
      if (patch.meta !== undefined) payload.meta = patch.meta;
      const updated = await service.updateWebpage(id, payload);
      setItems((prev) => prev.map((p) => (p.id === id ? toCard(updated) : p)));
    },
    [service]
  );

  const updateTitle = React.useCallback(
    async (id: string, title: string) => {
      const updated = await service.updateWebpage(id, { title });
      setItems((prev) => prev.map((p) => (p.id === id ? toCard(updated) : p)));
    },
    [service]
  );

  const updateUrl = React.useCallback(
    async (id: string, url: string) => {
      const updated = await service.updateWebpage(id, { url });
      setItems((prev) => prev.map((p) => (p.id === id ? toCard(updated) : p)));
    },
    [service]
  );

  const updateCategory = React.useCallback(
    async (id: string, category: string) => {
      let updates: any = { category };
      try {
        const { createStorageService } = await import('../../background/storageService');
        const s = createStorageService();
        const [cats, tmpls] = await Promise.all([s.loadFromSync(), (s as any).loadTemplates()]);
        const cat = (cats as any[]).find((c) => c.id === category);
        const tpl = cat?.defaultTemplateId ? (tmpls as any[]).find((t) => t.id === cat.defaultTemplateId) : null;
        if (tpl) {
          const item = items.find((i) => i.id === id);
          let nextMeta = computeAutoMeta(
            item?.meta,
            (tpl.fields || []) as any,
            item ? { title: item.title, url: item.url, favicon: item.favicon } : undefined
          );
          // Treat card title/note as the canonical fields; do not persist
          // title/description into meta even if template has such keys.
          delete (nextMeta as any).title;
          delete (nextMeta as any).description;
          // Merge cached extracted meta for common keys (only if field exists and value empty)
          try {
            if (item) {
              const { getCachedMeta, extractMetaForTab } = await import('../../background/pageMeta');
              let cached = await getCachedMeta(item.url);
              const needKeys = ['siteName', 'author'] as const;
              const missing = (m?: any) => !m || needKeys.some((k) => !((m as any)[k] || '').trim());
              // Fallback: if cache missing or missing desired keys, try to find an open tab and extract live
              if ((missing(cached)) && typeof (globalThis as any).chrome !== 'undefined') {
                try {
                  await new Promise<void>((resolve) => {
                    chrome.tabs.query({}, async (tabs) => {
                      const { urlsRoughlyEqual, extractMetaForTab, waitForTabComplete } = await import('../../background/pageMeta');
                      const match = (tabs || []).find((t: any) => t.url && urlsRoughlyEqual(t.url, item.url));
                      if (match && match.id != null) {
                        try {
                          try { await waitForTabComplete(match.id as number); } catch {}
                          const live = await extractMetaForTab(match.id as number);
                          // Merge live into cached
                          cached = { ...(cached || {}), ...(live || {}) } as any;
                        } catch {}
                      }
                      resolve();
                    });
                  });
                } catch {}
              }
              const wantKeys = ['siteName', 'author'] as const;
              const fields = (tpl.fields || []) as any[];
              const hasField = (k: string) => fields.some((f) => f.key === k);
              const merged: Record<string, string> = { ...nextMeta };
              for (const k of wantKeys) {
                const cur = (merged[k] ?? '').trim();
                const val = (cached as any)?.[k] as string | undefined;
                if (!cur && val && hasField(k)) merged[k] = val;
              }
              nextMeta = merged;
            }
          } catch {}
          updates.meta = nextMeta;
        }
      } catch {}
      const updated = await service.updateWebpage(id, updates);
      setItems((prev) => prev.map((p) => (p.id === id ? toCard(updated) : p)));
      // Delay-and-check: in case cache is written slightly later, try once more
      try {
        const fields = (await (async () => {
          const { createStorageService } = await import('../../background/storageService');
          const s = createStorageService();
          const [cats, tmpls] = await Promise.all([s.loadFromSync(), (s as any).loadTemplates()]);
          const cat = (cats as any[]).find((c) => c.id === category);
          const tpl = cat?.defaultTemplateId ? (tmpls as any[]).find((t) => t.id === cat.defaultTemplateId) : null;
          return tpl?.fields || [];
        })());
        const hasSite = fields.some((f: any) => f.key === 'siteName');
        const hasAuthor = fields.some((f: any) => f.key === 'author');
        if (hasSite || hasAuthor) {
          setTimeout(async () => {
            try {
              const { getCachedMeta } = await import('../../background/pageMeta');
              const cached2 = await getCachedMeta(updated.url);
              if (!cached2) return;
              const curMeta = (updated as any).meta || {};
              const patchMeta: Record<string, string> = { ...curMeta };
              let changed = false;
              if (hasSite && !((patchMeta.siteName || '').trim()) && (cached2 as any).siteName) { patchMeta.siteName = String((cached2 as any).siteName); changed = true; }
              if (hasAuthor && !((patchMeta.author || '').trim()) && (cached2 as any).author) { patchMeta.author = String((cached2 as any).author); changed = true; }
              if (changed) {
                const upd2 = await service.updateWebpage(id, { meta: patchMeta });
                setItems((prev) => prev.map((p) => (p.id === id ? toCard(upd2) : p)));
              }
            } catch {}
          }, 500);
        }
      } catch {}
    },
    [service]
  );

  const updateMeta = React.useCallback(
    async (id: string, meta: Record<string, string>) => {
      const updated = await service.updateWebpage(id, { meta });
      setItems((prev) => prev.map((p) => (p.id === id ? toCard(updated) : p)));
    },
    [service]
  );

  const reorder = React.useCallback((fromId: string, toId: string) => {
    (async () => {
      const saved = await service.reorderWebpages(fromId, toId);
      setItems(saved.map(toCard));
    })();
  }, [service]);

  const moveToEnd = React.useCallback((id: string) => {
    (async () => {
      const saved = await (service as any).moveWebpageToEnd(id);
      setItems(saved.map(toCard));
    })();
  }, [service]);

  React.useEffect(() => {
    load().catch(() => {
      /* ignore */
    });
  }, [load]);

  const value = React.useMemo<CtxValue>(
    () => ({
      items,
      actions: { load, addFromTab, deleteMany, deleteOne, updateNote, updateDescription, updateCard, updateTitle, updateUrl, updateCategory, updateMeta, reorder, moveToEnd },
    }),
    [items, load, addFromTab, deleteMany, deleteOne, updateNote, updateDescription, updateCard, updateTitle, updateUrl, updateCategory, updateMeta, reorder, moveToEnd]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export function useWebpages() {
  const v = React.useContext(Ctx);
  if (!v) throw new Error('WebpagesProvider missing');
  return v;
}

// --- DB-backed provider (SQLite) ---
const DbWebpagesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { selectedId, categories } = require('../sidebar/categories').useCategories();
  const ReactRef = React as any;
  const [items, setItems] = React.useState<WebpageCardData[]>([]);
  const [db, setDb] = React.useState<any>(null);

  // Build mapping from sync category id -> db numeric id
  function readCatMap(): Record<string, number> {
    try { return JSON.parse(localStorage.getItem('linktrove.catmap') || '{}'); } catch { return {}; }
  }
  function writeCatMap(m: Record<string, number>) {
    try { localStorage.setItem('linktrove.catmap', JSON.stringify(m)); } catch {}
  }
  async function ensureCategoryMapping(dbase: any): Promise<Record<string, number>> {
    const map = readCatMap();
    const dbCats = await dbase.listCategories();
    const nameToId = new Map(dbCats.map((c: any)=>[c.name, c.id]));
    let changed = false;
    for (const c of categories as any[]) {
      if (!map[c.id]) {
        // Try by name; if not exist, create
        let id = nameToId.get(c.name);
        if (!id) {
          id = await dbase.insertCategory({ name: c.name, color: c.color, icon: (c as any).icon, parent_id: null, sort_order: c.order ?? 0 });
          nameToId.set(c.name, id);
        }
        map[c.id] = id; changed = true;
      }
    }
    if (changed) writeCatMap(map);
    return map;
  }
  function mapRowToCard(r: any): WebpageCardData {
    return {
      id: String(r.id),
      title: r.title,
      url: r.url,
      favicon: r.favicon,
      description: r.description,
      category: selectedId, // display uses sync id; authoritative mapping is in catmap
      meta: r.meta || {},
    } as any;
  }
  function numId(id: string) { const n = parseInt(id, 10); return isNaN(n) ? 0 : n; }

  React.useEffect(() => {
    (async () => {
      const { createDatabaseManager } = await import('../../background/db/createDatabase');
      const d = await createDatabaseManager('sqlite');
      setDb(d);
      const map = await ensureCategoryMapping(d);
      const dbCat = map[selectedId] ?? null;
      const list = await d.listBookmarksByCategory(dbCat);
      setItems(list.map(mapRowToCard));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, (categories as any[]).map((c)=>c.id+':'+c.name).join('|')]);

  const load = React.useCallback(async () => {
    if (!db) return;
    const map = readCatMap();
    const list = await db.listBookmarksByCategory(map[selectedId] ?? null);
    setItems(list.map(mapRowToCard));
  }, [db, selectedId]);

  const addFromTab = React.useCallback(async (tab: TabItemData) => {
    const map = readCatMap();
    const dbCat = map[selectedId] ?? null;
    const title = (tab.title || tab.url || '').trim();
    const url = (tab.url || '').trim();
    const id = await db.insertBookmark({ title, url, description: '', category_id: dbCat, favicon: (tab as any).favIconUrl || '', meta: {} });
    await load();
    return String(id);
  }, [db, selectedId, load]);

  const updateTitle = React.useCallback(async (id: string, title: string) => { await db.updateBookmark(numId(id), { title }); await load(); }, [db, load]);
  const updateUrl = React.useCallback(async (id: string, url: string) => { await db.updateBookmark(numId(id), { url }); await load(); }, [db, load]);
  const updateDescription = React.useCallback(async (id: string, description: string) => { await db.updateBookmark(numId(id), { description }); await load(); }, [db, load]);
  const updateMeta = React.useCallback(async (id: string, meta: Record<string,string>) => { await db.updateBookmark(numId(id), { meta }); await load(); }, [db, load]);
  const deleteOne = React.useCallback(async (id: string) => { await db.deleteBookmark(numId(id)); await load(); }, [db, load]);
  const deleteMany = React.useCallback(async (ids: string[]) => { for (const id of ids) await db.deleteBookmark(numId(id)); await load(); }, [db, load]);

  const updateCard = React.useCallback(async (id: string, patch: Partial<{ title: string; description: string; url: string; meta: Record<string,string> }>) => {
    const p: any = {};
    if (patch.title !== undefined) p.title = patch.title;
    if (patch.url !== undefined) p.url = patch.url;
    if (patch.description !== undefined) p.description = patch.description;
    if (patch.meta !== undefined) p.meta = patch.meta;
    await db.updateBookmark(numId(id), p);
    await load();
  }, [db, load]);

  const updateCategory = React.useCallback(async (id: string, category: string) => {
    const map = await ensureCategoryMapping(db);
    const dbCat = map[category] ?? null;
    await db.updateBookmark(numId(id), { category_id: dbCat });
    await load();
  }, [db, load]);

  const reorder = React.useCallback((fromId: string, toId: string) => {
    (async () => {
      const map = readCatMap();
      const dbCat = map[selectedId] ?? null;
      const list = await db.listBookmarksByCategory(dbCat);
      const order = list.map((r:any)=>r.id);
      const from = numId(fromId); const to = numId(toId);
      const arr = order.filter((x:number)=>x!==from);
      const idxTo = arr.indexOf(to);
      arr.splice(Math.max(0, idxTo), 0, from);
      let i = 0;
      for (const bid of arr) { await db.updateBookmark(bid, { sort_order: (i++) * 10 }); }
      await load();
    })();
  }, [db, selectedId, load]);

  const moveToEnd = React.useCallback((id: string) => {
    (async () => {
      const map = readCatMap();
      const dbCat = map[selectedId] ?? null;
      const list = await db.listBookmarksByCategory(dbCat);
      const max = list.reduce((m:number,r:any)=>Math.max(m, r.sort_order||0), 0);
      await db.updateBookmark(numId(id), { sort_order: max + 10 });
      await load();
    })();
  }, [db, selectedId, load]);

  const value = React.useMemo<CtxValue>(() => ({ items, actions: { load, addFromTab, deleteMany, deleteOne, updateNote: updateDescription, updateDescription, updateCard, updateTitle, updateUrl, updateCategory, updateMeta, reorder, moveToEnd } }), [items, load, addFromTab, deleteMany, deleteOne, updateDescription, updateCard, updateTitle, updateUrl, updateCategory, updateMeta, reorder, moveToEnd]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};
