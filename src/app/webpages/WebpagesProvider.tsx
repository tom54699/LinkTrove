import React from 'react';
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
    addFromTab: (
      tab: TabItemData,
      options?: {
        categoryId?: string;
        subcategoryId?: string;
        beforeId?: string | '__END__';
      }
    ) => Promise<string>;
    deleteMany: (ids: string[]) => Promise<void>;
    deleteOne: (id: string) => Promise<void>;
    updateNote: (id: string, note: string) => Promise<void>;
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
    return createWebpageService();
  }, [svc]);
  const [items, setItems] = React.useState<WebpageCardData[]>([]);

  const { selectedId } = useCategories();
  const selectedIdRef = React.useRef(selectedId);
  React.useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  // 操作鎖定：增加鎖定時長，並確保所有修改操作都上鎖
  const operationLockRef = React.useRef<number>(0);
  const setLock = () => { operationLockRef.current = Date.now(); };

  const load = React.useCallback(async (ignoreLock = false) => {
    // 如果有鎖定且不是強制載入，則跳過
    if (!ignoreLock && Date.now() - operationLockRef.current < 1500) return;
    const list = await service.loadWebpages();
    setItems(list.map(toCard));
  }, [service]);

  const addFromTab = React.useCallback(
    async (
      tab: TabItemData,
      options?: {
        categoryId?: string;
        subcategoryId?: string;
        beforeId?: string | '__END__';
      }
    ) => {
      setLock();
      let created: any;
      if (options?.subcategoryId) {
        created = await service.addWebpageFromTab(tab as any, {
          category: options.categoryId,
          subcategoryId: options.subcategoryId,
          beforeId: options.beforeId,
        });
        await load(true);
      } else {
        created = await service.addWebpageFromTab(tab as any);
        let target = selectedIdRef.current;
        if (target && target !== 'all') {
          created = await service.updateWebpage(created.id, { category: target } as any);
        }
        setItems((prev) => [toCard(created), ...prev]);
      }
      return created.id;
    },
    [service, load]
  );

  const deleteMany = React.useCallback(
    async (ids: string[]) => {
      setLock();
      for (const id of ids) await service.deleteWebpage(id);
      await load(true);
    },
    [service, load]
  );

  const deleteOne = React.useCallback(
    async (id: string) => {
      setLock();
      // 先樂觀更新 UI
      setItems((prev) => prev.filter((p) => p.id !== id));
      // 執行後端刪除
      await service.deleteWebpage(id);
      // 強制同步最新狀態，忽略鎖定
      await load(true);
    },
    [service, load]
  );

  const updateCard = React.useCallback(
    async (id: string, patch: any) => {
      setLock();
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

  const reorder = React.useCallback(
    async (fromId: string, toId: string) => {
      setLock();
      const saved = await service.reorderWebpages(fromId, toId);
      setItems(saved.map(toCard));
    },
    [service]
  );

  const moveCardToGroup = React.useCallback(
    async (cardId: string, targetCategoryId: string, targetGroupId: string, beforeId?: string) => {
      setLock();
      const saved = await service.moveCardToGroup(cardId, targetCategoryId, targetGroupId, beforeId);
      setItems(saved.map(toCard));
    },
    [service]
  );

  const updateCategory = React.useCallback(async (id: string, category: string) => {
    setLock();
    const updated = await service.updateWebpage(id, { category } as any);
    setItems((prev) => prev.map((p) => (p.id === id ? toCard(updated) : p)));
  }, [service]);

  React.useEffect(() => { load(true); }, [load]);

  React.useEffect(() => {
    let t: any = null;
    const onChanged = (changes: any, areaName: string) => {
      if (areaName !== 'local' || !changes?.webpages) return;
      // 檢查鎖定：如果正在操作，嚴禁背景刷新干擾
      if (Date.now() - operationLockRef.current < 1500) return;
      
      if (t) clearTimeout(t);
      t = setTimeout(() => { load(); }, 300);
    };
    try { chrome.storage.onChanged.addListener(onChanged); } catch {}
    return () => { try { chrome.storage.onChanged.removeListener(onChanged); } catch {} };
  }, [load]);

  const value = React.useMemo<CtxValue>(() => ({
    items,
    actions: {
      load: () => load(true),
      addFromTab,
      deleteMany,
      deleteOne,
      updateNote: (id, note) => updateCard(id, { description: note }),
      updateDescription: (id, desc) => updateCard(id, { description: desc }),
      updateCard,
      updateTitle: (id, title) => updateCard(id, { title }),
      updateUrl: (id, url) => updateCard(id, { url }),
      updateCategory,
      updateMeta: (id, meta) => updateCard(id, { meta }),
      reorder,
      moveToEnd: (id) => service.moveWebpageToEnd(id).then(res => setItems(res.map(toCard))),
      moveCardToGroup,
    }
  }), [items, load, addFromTab, deleteMany, deleteOne, updateCard, updateCategory, reorder, moveCardToGroup, service]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export function useWebpages() {
  const v = React.useContext(Ctx);
  if (!v) return { items: [], actions: {} } as any;
  return v;
}
