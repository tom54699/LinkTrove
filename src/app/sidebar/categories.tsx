import React, { createContext, useContext, useMemo, useState } from 'react';
import { createStorageService } from '../../background/storageService';

export interface Category {
  id: string;
  name: string;
  color: string;
  order: number;
}

interface CategoriesState {
  categories: Category[];
  selectedId: string; // category id
  setCurrentCategory: (id: string) => void;
  actions: {
    addCategory: (name: string, color?: string) => Promise<Category>;
    renameCategory: (id: string, name: string) => Promise<void>;
    deleteCategory: (id: string) => Promise<void>;
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
      const cats = await svc.loadFromSync();
      if (cats.length === 0) {
        await svc.saveToSync(DEFAULT_CATEGORIES);
        setCategories(DEFAULT_CATEGORIES);
      } else {
        setCategories(cats as any);
      }
    })();
  }, [svc]);

  function genId() {
    return 'c_' + Math.random().toString(36).slice(2, 9);
  }

  const actions = React.useMemo(
    () => ({
      async addCategory(name: string, color = '#64748b') {
        const next: Category = { id: genId(), name: name.trim() || 'Untitled', color, order: categories.length };
        const list = [...categories, next];
        setCategories(list);
        try { await svc?.saveToSync(list as any); } catch {}
        return next;
      },
      async renameCategory(id: string, name: string) {
        const list = categories.map((c) => (c.id === id ? { ...c, name: name.trim() || c.name } : c));
        setCategories(list);
        try { await svc?.saveToSync(list as any); } catch {}
      },
      async deleteCategory(id: string) {
        const list = categories.filter((c) => c.id !== id);
        const next = list.length ? list : DEFAULT_CATEGORIES;
        setCategories(next);
        try { await svc?.saveToSync(next as any); } catch {}
        if (selectedId === id) setSelectedId(next[0].id);
      },
    }),
    [categories, svc, selectedId]
  );

  const value = useMemo(
    () => ({ categories, selectedId, setCurrentCategory: setSelectedId, actions }),
    [categories, selectedId, actions]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export function useCategories(): CategoriesState {
  const v = useContext(Ctx);
  if (!v) throw new Error('CategoriesProvider missing');
  return v;
}
