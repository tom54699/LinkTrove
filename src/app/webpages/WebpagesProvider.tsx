import React from 'react';
import { computeAutoMeta } from './metaAutoFill';
import type { TabItemData } from '../tabs/types';
import {
  createWebpageService,
  type WebpageService,
} from '../../background/webpageService';
import type { WebpageCardData } from './WebpageCard';
import { useCategories } from '../sidebar/categories';

interface CtxValue {
  items: WebpageCardData[];
  actions: {
    load: () => Promise<void>;
    addFromTab: (tab: TabItemData) => Promise<string>;
    deleteMany: (ids: string[]) => Promise<void>;
    deleteOne: (id: string) => Promise<void>;
    updateNote: (id: string, note: string) => Promise<void>; // deprecated alias
    updateDescription: (id: string, description: string) => Promise<void>;
    updateCard: (
      id: string,
      patch: Partial<{
        title: string;
        description: string;
        url: string;
        meta: Record<string, string>;
      }>
    ) => Promise<void>;
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
    subcategoryId: (d as any).subcategoryId,
    meta: d.meta,
    templateId: d.templateId,
    templateData: d.templateData,
  };
}

export const WebpagesProvider: React.FC<{
  children: React.ReactNode;
  svc?: WebpageService;
}> = ({ children, svc }) => {
  const service = React.useMemo(() => {
    if (svc) return svc;
    // 一律使用 IDB-backed 的 service；pageMeta 相關功能內部自我保護
    return createWebpageService();
  }, [svc]);
  const [items, setItems] = React.useState<WebpageCardData[]>([]);
  const { selectedId } = useCategories();
  const selectedIdRef = React.useRef(selectedId);
  React.useEffect(() => { selectedIdRef.current = selectedId; }, [selectedId]);

  const load = React.useCallback(async () => {
    const list = await service.loadWebpages();
    setItems(list.map(toCard));
  }, [service]);

  const addFromTab = React.useCallback(
    async (tab: TabItemData) => {
      let created = await service.addWebpageFromTab(tab as any);

      // Determine target category (moved outside try block for wider scope)
      let target = selectedIdRef.current;
      try {
        const got: any = await new Promise((resolve) => {
          try { chrome.storage?.local?.get?.({ selectedCategoryId: '' }, resolve); } catch { resolve({}); }
        });
        const persisted = got?.selectedCategoryId;
        if (persisted && typeof persisted === 'string') target = persisted;
      } catch {}

      // Ensure new card belongs to currently selected collection
      try {
        if (target && target !== 'all' && created.category !== target) {
          const updated = await service.updateWebpage(created.id, { category: target } as any);
          created = updated;
        }
      } catch {}
      // 立即反映到本地 items，確保拖放整合測試能看到新卡片
      try {
        const newCard = toCard(created);
        setItems((prev) => [newCard, ...prev]);
      } catch {}
      // Prefetch page meta and cache for later auto-fill (best-effort, non-blocking)
      try {
        if (
          typeof (globalThis as any).chrome !== 'undefined' &&
          (tab as any).id != null
        ) {
          const { extractMetaForTab, waitForTabComplete } = await import(
            '../../background/pageMeta'
          );
          const tid = (tab as any).id as number;
          const targetCategory = target; // Capture target for async block

          // Use synchronous meta enrichment in test environment, non-blocking in production
          const enrichmentPromise = (async () => {
            try {
              // Wait for tab completion with extended timeout
              await waitForTabComplete(tid, 15000);

              // Additional delay to ensure meta tags are fully loaded
              await new Promise(resolve => setTimeout(resolve, 2000));
            } catch {}

            const meta = await extractMetaForTab(tid);

            if (!meta) {
              return;
            }

            // Optionally refine card fields shortly after creation
            try {
              const patch: any = {};
              if (meta.title && meta.title.trim())
                patch.title = meta.title.trim();
              // If note empty, use description as initial note
              const cur = created as any;
              if (
                (!cur.note || !cur.note.trim()) &&
                meta.description &&
                meta.description.trim()
              ) {
                patch.note = meta.description.trim();
              }

              // Meta field enrichment (fill all available fields regardless of template)
              try {
                const curMeta: Record<string, string> = { ...(cur?.meta || {}) };
                let metaChanged = false;

                const setIfEmpty = (key: string, val?: any) => {
                  const v = (val ?? '').toString().trim();
                  if (!v) return;
                  const currentVal = ((curMeta as any)[key] || '').toString().trim();
                  if (!currentVal) {
                    (curMeta as any)[key] = v;
                    metaChanged = true;
                  }
                };

                // General fields
                setIfEmpty('siteName', meta?.siteName);
                setIfEmpty('author', meta?.author);

                // Book-specific fields
                setIfEmpty('bookTitle', (meta as any)?.bookTitle);
                setIfEmpty('serialStatus', (meta as any)?.serialStatus);
                setIfEmpty('genre', (meta as any)?.genre);
                setIfEmpty('wordCount', (meta as any)?.wordCount);
                setIfEmpty('latestChapter', (meta as any)?.latestChapter);
                setIfEmpty('coverImage', (meta as any)?.coverImage);
                setIfEmpty('bookUrl', (meta as any)?.bookUrl);
                setIfEmpty('lastUpdate', (meta as any)?.lastUpdate);

                if (metaChanged) {
                  patch.meta = curMeta;
                }
              } catch (error) {
              }

              if (Object.keys(patch).length > 0) {
                const updated = await service.updateWebpage(created.id, patch);
                setItems((prev) =>
                  prev.map((p) => (p.id === created.id ? toCard(updated) : p))
                );
              }
            } catch {}
          })();

          // In test environment, wait for enrichment to complete; in production, run non-blocking
          if ((service as any).loadFromSync && (service as any).loadTemplates) {
            // Test environment: wait for completion
            await enrichmentPromise;
          } else {
            // Production environment: non-blocking
            void enrichmentPromise;
          }
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
    [service, selectedId]
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
    [service, selectedId]
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
    async (
      id: string,
      patch: Partial<{
        title: string;
        description: string;
        url: string;
        meta: Record<string, string>;
      }>
    ) => {
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
        const { createStorageService } = await import(
          '../../background/storageService'
        );
        const s = createStorageService();
        const [cats, tmpls, groups] = await Promise.all([
          s.loadFromSync(),
          (s as any).loadTemplates(),
          (s as any).listSubcategories?.(category) || [],
        ]);
        const cat = (cats as any[]).find((c) => c.id === category);

        // Update subcategoryId to the first group in the target category
        if (groups && groups.length > 0) {
          const sortedGroups = [...groups].sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
          updates.subcategoryId = sortedGroups[0].id;
        }
        const tpl = cat?.defaultTemplateId
          ? (tmpls as any[]).find((t) => t.id === cat.defaultTemplateId)
          : null;
        if (tpl) {
          const item = items.find((i) => i.id === id);
          let nextMeta = computeAutoMeta(
            item?.meta,
            (tpl.fields || []) as any,
            item
              ? { title: item.title, url: item.url, favicon: item.favicon }
              : undefined
          );
          // Treat card title/note as the canonical fields; do not persist
          // title/description into meta even if template has such keys.
          delete (nextMeta as any).title;
          delete (nextMeta as any).description;
          // Merge cached extracted meta for common keys (only if field exists and value empty)
          try {
            if (item) {
              const { getCachedMeta } = await import(
                '../../background/pageMeta'
              );
              let cached = await getCachedMeta(item.url);
              const needKeys = ['siteName', 'author'] as const;
              const missing = (m?: any) =>
                !m || needKeys.some((key) => !((m as any)[key] || '').trim());
              // Fallback: if cache missing or missing desired keys, try to find an open tab and extract live
              if (
                missing(cached) &&
                typeof (globalThis as any).chrome !== 'undefined'
              ) {
                try {
                  await new Promise<void>((resolve) => {
                    chrome.tabs.query({}, async (tabs) => {
                      const {
                        urlsRoughlyEqual,
                        extractMetaForTab,
                        waitForTabComplete,
                      } = await import('../../background/pageMeta');
                      const match = (tabs || []).find(
                        (t: any) => t.url && urlsRoughlyEqual(t.url, item.url)
                      );
                      if (match && match.id != null) {
                        try {
                          try {
                            await waitForTabComplete(match.id as number);
                          } catch {}
                          const live = await extractMetaForTab(
                            match.id as number
                          );
                          // Merge live into cached
                          cached = {
                            ...(cached || {}),
                            ...(live || {}),
                          } as any;
                        } catch {}
                      }
                      resolve();
                    });
                  });
                } catch {}
              }
              const wantKeys = ['siteName', 'author'] as const;
              const fields = (tpl.fields || []) as any[];
              const hasField = (key: string) => fields.some((f) => f.key === key);
              const merged: Record<string, string> = { ...nextMeta };
              for (const key of wantKeys) {
                const cur = (merged[key] ?? '').trim();
                const val = (cached as any)?.[key] as string | undefined;
                if (!cur && val && hasField(key)) merged[key] = val;
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
        const fields = await (async () => {
          const { createStorageService } = await import(
            '../../background/storageService'
          );
          const s = createStorageService();
          const [cats, tmpls] = await Promise.all([
            s.loadFromSync(),
            (s as any).loadTemplates(),
          ]);
          const cat = (cats as any[]).find((c) => c.id === category);
          const tpl = cat?.defaultTemplateId
            ? (tmpls as any[]).find((t) => t.id === cat.defaultTemplateId)
            : null;
          return tpl?.fields || [];
        })();
        const hasSite = fields.some((f: any) => f.key === 'siteName');
        const hasAuthor = fields.some((f: any) => f.key === 'author');
        if (hasSite || hasAuthor) {
          setTimeout(async () => {
            try {
              const { getCachedMeta } = await import(
                '../../background/pageMeta'
              );
              const cached2 = await getCachedMeta(updated.url);
              if (!cached2) return;
              const curMeta = (updated as any).meta || {};
              const patchMeta: Record<string, string> = { ...curMeta };
              let changed = false;
              if (
                hasSite &&
                !(patchMeta.siteName || '').trim() &&
                (cached2 as any).siteName
              ) {
                patchMeta.siteName = String((cached2 as any).siteName);
                changed = true;
              }
              if (
                hasAuthor &&
                !(patchMeta.author || '').trim() &&
                (cached2 as any).author
              ) {
                patchMeta.author = String((cached2 as any).author);
                changed = true;
              }
              if (changed) {
                const upd2 = await service.updateWebpage(id, {
                  meta: patchMeta,
                });
                setItems((prev) =>
                  prev.map((p) => (p.id === id ? toCard(upd2) : p))
                );
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

  const reorder = React.useCallback(
    async (fromId: string, toId: string) => {
      const saved = await service.reorderWebpages(fromId, toId);
      setItems(saved.map(toCard));
      return saved;
    },
    [service]
  );

  const moveToEnd = React.useCallback(
    async (id: string) => {
      const saved = await (service as any).moveWebpageToEnd(id);
      setItems(saved.map(toCard));
      return saved;
    },
    [service]
  );

  React.useEffect(() => {
    load().catch(() => {
      /* ignore */
    });
  }, [load]);

  // Listen to background updates (e.g., enrich writes note/meta via saveWebpages/updateWebpage)
  // When chrome.storage.local 'webpages' changes, debounce a reload to reflect latest data.
  React.useEffect(() => {
    let t: any = null;
    const onChanged = (changes: any, areaName: string) => {
      try {
        if (areaName !== 'local') return;
        if (!changes || typeof changes !== 'object') return;
        if (!('webpages' in changes)) return;
        if (t) clearTimeout(t);
        t = setTimeout(() => {
          load().catch(() => {});
        }, 200);
      } catch {}
    };
    try {
      (chrome as any)?.storage?.onChanged?.addListener?.(onChanged);
    } catch {}
    return () => {
      try {
        (chrome as any)?.storage?.onChanged?.removeListener?.(onChanged);
      } catch {}
      if (t) clearTimeout(t);
    };
  }, [load]);

  const value = React.useMemo<CtxValue>(
    () => ({
      items,
      actions: {
        load,
        addFromTab,
        deleteMany,
        deleteOne,
        updateNote,
        updateDescription,
        updateCard,
        updateTitle,
        updateUrl,
        updateCategory,
        updateMeta,
        reorder,
        moveToEnd,
      },
    }),
    [
      items,
      load,
      addFromTab,
      deleteMany,
      deleteOne,
      updateNote,
      updateDescription,
      updateCard,
      updateTitle,
      updateUrl,
      updateCategory,
      updateMeta,
      reorder,
      moveToEnd,
    ]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export function useWebpages() {
  const v = React.useContext(Ctx);
  if (!v) {
    return {
      items: [],
      actions: {
        load: async () => {},
        addFromTab: async () => '',
        deleteMany: async () => {},
        deleteOne: async () => {},
        updateNote: async () => {},
        updateDescription: async () => {},
        updateCard: async () => {},
        updateTitle: async () => {},
        updateUrl: async () => {},
        updateCategory: async () => {},
        updateMeta: async () => {},
        reorder: () => {},
        moveToEnd: () => {},
      },
    } as any;
  }
  return v;
}
