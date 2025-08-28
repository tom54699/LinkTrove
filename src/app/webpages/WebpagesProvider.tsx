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

export const WebpagesProvider: React.FC<{
  children: React.ReactNode;
  svc?: WebpageService;
}> = ({ children, svc }) => {
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
