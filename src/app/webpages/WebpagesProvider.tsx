import React from 'react';
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
    updateNote: (id: string, note: string) => Promise<void>;
    updateTitle: (id: string, title: string) => Promise<void>;
    updateUrl: (id: string, url: string) => Promise<void>;
    updateCategory: (id: string, category: string) => Promise<void>;
    reorder: (fromId: string, toId: string) => void;
  };
}

const Ctx = React.createContext<CtxValue | null>(null);

function toCard(d: any): WebpageCardData {
  return {
    id: d.id,
    title: d.title,
    url: d.url,
    favicon: d.favicon,
    note: d.note,
    category: d.category,
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
      const updated = await service.updateWebpage(id, { category });
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

  React.useEffect(() => {
    load().catch(() => {
      /* ignore */
    });
  }, [load]);

  const value = React.useMemo<CtxValue>(
    () => ({
      items,
      actions: { load, addFromTab, deleteMany, deleteOne, updateNote, updateTitle, updateUrl, updateCategory, reorder },
    }),
    [items, load, addFromTab, deleteMany, deleteOne, updateNote, updateTitle, updateUrl, updateCategory, reorder]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export function useWebpages() {
  const v = React.useContext(Ctx);
  if (!v) throw new Error('WebpagesProvider missing');
  return v;
}
