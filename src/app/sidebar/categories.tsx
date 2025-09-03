import React, { createContext, useContext, useMemo, useState } from 'react';
import { createStorageService } from '../../background/storageService';
import { setMeta } from '../../background/idb/db';

export interface Category {
  id: string;
  name: string;
  color: string;
  order: number;
  defaultTemplateId?: string;
}

interface CategoriesState {
  categories: Category[];
  selectedId: string; // category id
  setCurrentCategory: (id: string) => void;
  actions: {
    addCategory: (name: string, color?: string) => Promise<Category>;
    renameCategory: (id: string, name: string) => Promise<void>;
    updateColor: (id: string, color: string) => Promise<void>;
    deleteCategory: (id: string) => Promise<void>;
    setDefaultTemplate: (id: string, templateId?: string) => Promise<void>;
    reorderCategories: (orderIds: string[]) => Promise<void>;
  };
}

const Ctx = createContext<CategoriesState | null>(null);

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'default', name: 'Default', color: '#64748b', order: 0 },
];

export const CategoriesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [selectedId, setSelectedId] = useState<string>('default');

  const svc = React.useMemo(() => {
    const hasChrome = typeof (globalThis as any).chrome !== 'undefined' && !!(globalThis as any).chrome?.storage?.sync;
    return hasChrome ? createStorageService() : null;
  }, []);

  React.useEffect(() => {
    (async () => {
      if (!svc) return; // tests fallback keeps default
      // Load both sync and local, then合併（以 sync 先、local 補缺）
      const syncCats = await svc.loadFromSync();
      let localCats: Category[] = [];
      try {
        const got: any = await new Promise((resolve) => {
          try { chrome.storage?.local?.get?.({ categories: [] }, resolve); } catch { resolve({}); }
        });
        localCats = Array.isArray(got?.categories) ? (got.categories as any) : [];
      } catch {}
      let merged: Category[] = [];
      if (syncCats.length === 0 && localCats.length === 0) {
        merged = DEFAULT_CATEGORIES;
      } else {
        const byId = new Set<string>();
        for (const c of syncCats as any as Category[]) { if (!byId.has(c.id)) { merged.push(c); byId.add(c.id); } }
        for (const c of localCats as any as Category[]) { if (!byId.has(c.id)) { merged.push(c); byId.add(c.id); } }
        if (merged.length === 0) merged = DEFAULT_CATEGORIES;
      }
      // sort by order for stable left-panel order
      merged.sort((a,b)=> (a.order??0) - (b.order??0) || a.name.localeCompare(b.name));
      setCategories(merged);
      // Persist back to both storages to保持一致
      try { await svc.saveToSync(merged as any); } catch {}
      try { chrome.storage?.local?.set?.({ categories: merged }); } catch {}
      // Restore last selected category if it exists
      try {
        const gotSel: any = await new Promise((resolve) => {
          try { chrome.storage?.local?.get?.({ selectedCategoryId: '' }, resolve); } catch { resolve({}); }
        });
        const sel = gotSel?.selectedCategoryId || '';
        if (sel && merged.some((c)=>c.id === sel)) setSelectedId(sel);
        else if (merged.length > 0) setSelectedId(merged[0].id);
      } catch {
        if (merged.length > 0) setSelectedId(merged[0].id);
      }
    })();
  }, [svc]);

  function genId() {
    return 'c_' + Math.random().toString(36).slice(2, 9);
  }

  const actions = React.useMemo(
    () => ({
      async reload() {
        try {
          const syncCats = await svc.loadFromSync();
          let localCats: Category[] = [];
          try { const got: any = await new Promise((resolve)=>{ try { chrome.storage?.local?.get?.({ categories: [] }, resolve); } catch { resolve({}); } }); localCats = Array.isArray(got?.categories) ? (got.categories as any) : []; } catch {}
          const byId = new Map<string, Category>();
          const merged: Category[] = [];
          for (const c of syncCats as any as Category[]) { if (!byId.has(c.id)) { byId.set(c.id,c); merged.push(c); } }
          for (const c of localCats as any as Category[]) { if (!byId.has(c.id)) { byId.set(c.id,c); merged.push(c); } }
          merged.sort((a,b)=> (a.order??0) - (b.order??0) || a.name.localeCompare(b.name));
          setCategories(merged);
        } catch {}
      },
      async addCategory(name: string, color = '#64748b') {
        const maxOrder = categories.reduce((m, c) => Math.max(m, c.order ?? 0), -1);
        const next: Category = { id: genId(), name: name.trim() || 'Untitled', color, order: maxOrder + 1 };
        const list = [...categories, next];
        setCategories(list);
        try { await svc?.saveToSync(list as any); } catch {}
        try { chrome.storage?.local?.set?.({ categories: list }); } catch {}
        return next;
      },
      async renameCategory(id: string, name: string) {
        const list = categories.map((c) => (c.id === id ? { ...c, name: name.trim() || c.name } : c));
        setCategories(list);
        try { await svc?.saveToSync(list as any); } catch {}
        try { chrome.storage?.local?.set?.({ categories: list }); } catch {}
      },
      async updateColor(id: string, color: string) {
        const list = categories.map((c) => (c.id === id ? { ...c, color: color || c.color } : c));
        setCategories(list);
        try { await svc?.saveToSync(list as any); } catch {}
        try { chrome.storage?.local?.set?.({ categories: list }); } catch {}
      },
      async deleteCategory(id: string) {
        const list = categories.filter((c) => c.id !== id);
        const next = list.length ? list : DEFAULT_CATEGORIES;
        setCategories(next);
        try { await svc?.saveToSync(next as any); } catch {}
        try { chrome.storage?.local?.set?.({ categories: next }); } catch {}
        if (selectedId === id) { setSelectedId(next[0].id); try { chrome.storage?.local?.set?.({ selectedCategoryId: next[0].id }); } catch {} }
        // Also delete webpages under this category
        try {
          const pages = await svc?.loadFromLocal();
          const filtered = (pages || []).filter((p: any) => String(p.category || '') !== String(id));
          await svc?.saveToLocal(filtered as any);
        } catch {}
      },
      async setDefaultTemplate(id: string, templateId?: string) {
        // Use functional update to avoid stale closure overriding a freshly added category
        let nextList: Category[] = categories;
        setCategories((prev) => {
          const list = prev.map((c) => c.id === id ? { ...c, defaultTemplateId: templateId } : c);
          nextList = list;
          return list;
        });
        try { await svc?.saveToSync(nextList as any); } catch {}
        try { chrome.storage?.local?.set?.({ categories: nextList }); } catch {}
      },
      async reorderCategories(orderIds: string[]) {
        // Build new ordered list based on provided id order
        const byId = new Map(categories.map(c => [c.id, c]));
        const newList: Category[] = [];
        let i = 0;
        for (const id of orderIds) {
          const c = byId.get(id);
          if (!c) continue;
          newList.push({ ...c, order: i++ });
          byId.delete(id);
        }
        // Append any categories not present in orderIds (safety)
        for (const c of byId.values()) newList.push({ ...c, order: i++ });
        setCategories(newList);
        try { await svc?.saveToSync(newList as any); } catch {}
        try { chrome.storage?.local?.set?.({ categories: newList }); } catch {}
      },
    }),
    [categories, svc, selectedId]
  );

  const setCurrentCategory = (id: string) => { setSelectedId(id); try { chrome.storage?.local?.set?.({ selectedCategoryId: id }); } catch {}; try { setMeta('settings.selectedCategoryId', id); } catch {} };
  const value = useMemo(
    () => ({ categories, selectedId, setCurrentCategory, actions }),
    [categories, selectedId, actions]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export function useCategories(): CategoriesState {
  const v = useContext(Ctx);
  if (!v) throw new Error('CategoriesProvider missing');
  return v;
}
