import React from 'react';
import type { TabItemData } from '../tabs/types';
import {
  createWebpageService,
  type WebpageService,
} from '../../background/webpageService';
import type { WebpageCardData } from './WebpageCard';
import { useCategories } from '../sidebar/categories';

const logOrderSnapshot = (_tag: string, _list: WebpageCardData[]) => {};

interface CtxValue {
  items: WebpageCardData[];
  actions: {
    load: () => Promise<void>;
    addFromTab: (
      tab: TabItemData,
      options?: {
        categoryId?: string;
        subcategoryId?: string;
        beforeId?: string | '__END__';
        waitForMeta?: boolean;
      }
    ) => Promise<string>;
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
    moveCardToGroup: (
      cardId: string,
      targetCategoryId: string,
      targetGroupId: string,
      beforeId?: string
    ) => Promise<void>;
    moveMany: (
      cardIds: string[],
      targetCategoryId: string,
      targetGroupId: string
    ) => Promise<void>;
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
    createdAt: d.createdAt || d.updatedAt,
    updatedAt: d.updatedAt || d.createdAt,
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
  React.useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  // 操作鎖定：防止 drop 操作期間 onChanged 重複觸發 load
  const operationLockRef = React.useRef<number>(0);

  const load = React.useCallback(async () => {
    const list = await service.loadWebpages();
    const mapped = list.map(toCard);
    setItems(mapped);
    logOrderSnapshot('load', mapped);
  }, [service]);

  const addFromTab = React.useCallback(
    async (
      tab: TabItemData,
      options?: {
        categoryId?: string;
        subcategoryId?: string;
        beforeId?: string | '__END__';
        waitForMeta?: boolean;
      }
    ) => {
      // 設置操作鎖定，避免 onChanged 監聽器觸發重複 load
      operationLockRef.current = Date.now();

      // 如果有傳入 options，直接用 options 的值建立卡片（含 subcategoryId 和排序）
      let created: any;
      let target: string | undefined;

      if (options?.subcategoryId) {
        // 有指定 group，一步完成建立 + 設定 subcategoryId + 排序
        created = await service.addWebpageFromTab(tab as any, {
          category: options.categoryId,
          subcategoryId: options.subcategoryId,
          beforeId: options.beforeId,
        });
        target = options.categoryId;
      } else {
        // 原本的流程：先建立，再決定 category
        created = await service.addWebpageFromTab(tab as any);

        // Determine target category (moved outside try block for wider scope)
        target = selectedIdRef.current;
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
      }
      // 立即反映到本地 items
      if (options?.subcategoryId) {
        // 有指定 group 和排序位置，重新載入整個列表以反映正確排序
        await load();
      } else {
        // 沒有指定 group，直接 prepend 到最前面
        try {
          const newCard = toCard(created);
          setItems((prev) => {
            const next = [newCard, ...prev];
            logOrderSnapshot('addFromTab', next);
            return next;
          });
        } catch {}
      }
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

          // Use synchronous meta enrichment in test environment, non-blocking in production
          const enrichmentPromise = (async () => {
            try {
              // Wait for tab to complete loading before meta extraction
              // Note: extractMetaForTab will handle reload if needed (discarded/sleeping tabs)
              await waitForTabComplete(tid, 8000);
              // Brief delay to ensure meta tags are fully loaded
              await new Promise(resolve => setTimeout(resolve, 500));
            } catch (e) {
              console.warn(`[WebpagesProvider] Tab ${tid} preparation failed:`, e);
            }

            // extractMetaForTab will handle Edge sleeping tabs / Chrome discarded tabs
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
              } catch {}

              if (Object.keys(patch).length > 0) {
                const updated = await service.updateWebpage(created.id, patch);
                setItems((prev) =>
                  prev.map((p) => (p.id === created.id ? toCard(updated) : p))
                );
              }
            } catch {}
          })();

          // Wait for enrichment if explicitly requested (for close-tab-after-save feature)
          // or in test environment
          if (options?.waitForMeta || ((service as any).loadFromSync && (service as any).loadTemplates)) {
            await enrichmentPromise;
          } else {
            // Production environment: non-blocking
            void enrichmentPromise;
          }
        }
      } catch {}
      // Prepend if new（只在沒有指定 group 時，避免覆蓋正確排序）
      if (!options?.subcategoryId) {
        setItems((prev) => {
          if (prev.some((p) => p.id === created.id)) return prev;
          const card = toCard(created);
          return [card, ...prev];
        });
      }
      return created.id;
    },
    [service, load]
  );

  const deleteMany = React.useCallback(
    async (ids: string[]) => {
      // 設置操作鎖定，避免 onChanged 監聽器觸發重複 load
      operationLockRef.current = Date.now();

      // Optimistic update: 立即從 UI 移除
      setItems((prev) => {
        const next = prev.filter((p) => !ids.includes(p.id));
        logOrderSnapshot('deleteMany', next);
        return next;
      });

      // 使用批次刪除函數（1 次 load + 1 次 save）
      try {
        await service.deleteManyWebpages(ids);
        // 全部成功，延長鎖定時間防止 onChanged 觸發
        operationLockRef.current = Date.now();
      } catch (error) {
        console.error('Failed to delete cards:', error);
        // 失敗時重新載入以顯示實際狀態
        setTimeout(() => {
          operationLockRef.current = Date.now();
          load().catch(() => {});
        }, 1000);
        // Rethrow 讓上層知道失敗（顯示錯誤 toast）
        throw error;
      }
    },
    [service, load]
  );

  const deleteOne = React.useCallback(
    async (id: string) => {
      // 設置操作鎖定，避免 onChanged 監聽器觸發重複 load
      operationLockRef.current = Date.now();

      await service.deleteWebpage(id);
      setItems((prev) => {
        const next = prev.filter((p) => p.id != id);
        logOrderSnapshot('deleteOne', next);
        return next;
      });
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
      operationLockRef.current = Date.now(); // 設置操作鎖定
      const updates: any = { category };
      try {
        const { createStorageService } = await import(
          '../../background/storageService'
        );
        const s = createStorageService();
        const groups = await ((s as any).listSubcategories?.(category) || []);

        // Update subcategoryId to the first group in the target category
        if (groups && groups.length > 0) {
          const sortedGroups = [...groups].sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
          updates.subcategoryId = sortedGroups[0].id;
        }
      } catch {}
      const updated = await service.updateWebpage(id, updates);
      setItems((prev) => prev.map((p) => (p.id === id ? toCard(updated) : p)));
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
      operationLockRef.current = Date.now(); // 設置操作鎖定
      const saved = await service.reorderWebpages(fromId, toId);
      const mapped = saved.map(toCard);
      setItems(mapped);
      logOrderSnapshot('reorder', mapped);
      return saved;
    },
    [service]
  );

  const moveToEnd = React.useCallback(
    async (id: string) => {
      operationLockRef.current = Date.now(); // 設置操作鎖定
      const saved = await (service as any).moveWebpageToEnd(id);
      const mapped = saved.map(toCard);
      setItems(mapped);
      logOrderSnapshot('moveToEnd', mapped);
      return saved;
    },
    [service]
  );

  const moveCardToGroup = React.useCallback(
    async (
      cardId: string,
      targetCategoryId: string,
      targetGroupId: string,
      beforeId?: string
    ) => {
      operationLockRef.current = Date.now(); // 設置操作鎖定
      const saved = await service.moveCardToGroup(
        cardId,
        targetCategoryId,
        targetGroupId,
        beforeId
      );
      const mapped = saved.map(toCard);
      setItems(mapped);
      logOrderSnapshot('moveCardToGroup', mapped);
      return saved;
    },
    [service]
  );

  const moveMany = React.useCallback(
    async (
      cardIds: string[],
      targetCategoryId: string,
      targetGroupId: string
    ) => {
      operationLockRef.current = Date.now(); // 設置操作鎖定

      // 使用批次移動函數（1 次 load + 1 次 save）
      try {
        const saved = await service.moveManyCards(
          cardIds,
          targetCategoryId,
          targetGroupId
        );
        const mapped = saved.map(toCard);
        setItems(mapped);
        logOrderSnapshot('moveMany', mapped);
        // 延長鎖定時間防止 onChanged 觸發
        operationLockRef.current = Date.now();
      } catch (error) {
        console.error('Failed to batch move cards:', error);
        // 失敗時重新載入以顯示實際狀態
        setTimeout(() => {
          operationLockRef.current = Date.now();
          load().catch(() => {});
        }, 1000);
        // Rethrow 讓上層知道失敗（顯示錯誤 toast）
        throw error;
      }
    },
    [service, load]
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
        // 操作鎖定期間跳過，避免重複 load
        if (Date.now() - operationLockRef.current < 800) return;
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
        moveCardToGroup,
        moveMany,
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
      moveCardToGroup,
      moveMany,
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
        moveCardToGroup: async () => {},
      },
    } as any;
  }
  return v;
}
