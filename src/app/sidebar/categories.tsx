import React, { createContext, useContext, useMemo, useState } from 'react';
import { createStorageService } from '../../background/storageService';
import { setMeta, tx } from '../../background/idb/db';
import { useOrganizations } from './organizations';

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

export const CategoriesProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [selectedId, setSelectedId] = useState<string>('default');
  const { selectedOrgId } = useOrganizations();

  const svc = React.useMemo(() => {
    const hasChrome =
      typeof (globalThis as any).chrome !== 'undefined' &&
      !!(globalThis as any).chrome?.storage?.sync;
    return hasChrome ? createStorageService() : null;
  }, []);

  React.useEffect(() => {
    (async () => {
      if (!svc) return; // tests fallback keeps default
      // Load categories scoped by selected organization
      const list = await tx('categories', 'readonly', async (t) => {
        const s = t.objectStore('categories');
        try {
          const idx = s.index('by_organizationId_order');
          const range = IDBKeyRange.bound([selectedOrgId, -Infinity], [selectedOrgId, Infinity]);
          const rows: any[] = await new Promise((resolve, reject) => {
            const req = idx.getAll(range);
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = () => reject(req.error);
          });
          return rows as any[];
        } catch {
          const rows: any[] = await new Promise((resolve, reject) => {
            const req = s.getAll();
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = () => reject(req.error);
          });
          return rows.filter((c: any) => c.organizationId === selectedOrgId);
        }
      });
      const ordered = (list as any[]).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || String(a.name || '').localeCompare(String(b.name || '')));
      setCategories(ordered as any);
      try { chrome.storage?.local?.set?.({ categories: ordered }); } catch {}
      // Ensure each category in this org has at least one default group
      try {
        for (const c of ordered as any) {
          const arr = (((await (svc as any).listSubcategories?.(c.id)) as any[]) || []);
          if (!Array.isArray(arr) || arr.length === 0) await (svc as any).createSubcategory?.(c.id, 'group');
        }
        try { window.dispatchEvent(new CustomEvent('groups:changed')); } catch {}
      } catch {}
      // Keep selectedId within current org
      try {
        if (selectedId && (ordered as any[]).some((c) => c.id === selectedId)) {
          // keep
        } else if ((ordered as any[]).length > 0) {
          setSelectedId((ordered as any[])[0].id);
          chrome.storage?.local?.set?.({ selectedCategoryId: (ordered as any[])[0].id });
        } else {
          setSelectedId('');
          chrome.storage?.local?.set?.({ selectedCategoryId: '' });
        }
      } catch {}
    })();
  }, [svc, selectedOrgId]);

  function genId() {
    return 'c_' + Math.random().toString(36).slice(2, 9);
  }

  const actions = React.useMemo(
    () => ({
      async reload() {
        try {
          const syncCats = await svc.loadFromSync();
          let localCats: Category[] = [];
          try {
            const got: any = await new Promise((resolve) => {
              try {
                chrome.storage?.local?.get?.({ categories: [] }, resolve);
              } catch {
                resolve({});
              }
            });
            localCats = Array.isArray(got?.categories)
              ? (got.categories as any)
              : [];
          } catch {}
          const byId = new Map<string, Category>();
          const merged: Category[] = [];
          for (const c of syncCats as any as Category[]) {
            if (!byId.has(c.id)) {
              byId.set(c.id, c);
              merged.push(c);
            }
          }
          for (const c of localCats as any as Category[]) {
            if (!byId.has(c.id)) {
              byId.set(c.id, c);
              merged.push(c);
            }
          }
          merged.sort(
            (a, b) =>
              (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name)
          );
          setCategories(merged);
        } catch {}
      },
      async addCategory(name: string, color = '#64748b') {
        const maxOrder = categories.reduce(
          (m, c) => Math.max(m, c.order ?? 0),
          -1
        );
        const next: Category = {
          id: genId(),
          name: name.trim() || 'Untitled',
          color,
          order: maxOrder + 1,
        };
        const list = [...categories, next];
        setCategories(list);
        try {
          await svc?.saveToSync(list as any);
        } catch {}
        try {
          chrome.storage?.local?.set?.({ categories: list });
        } catch {}
        // Auto-create default group for the new collection
        try {
          const { createStorageService } = await import('../../background/storageService');
          const s = createStorageService();
          const existing = (((await (s as any).listSubcategories?.(next.id)) as any[]) || []);
          if (existing.length === 0) {
            await (s as any).createSubcategory?.(next.id, 'group');
            try { window.dispatchEvent(new CustomEvent('groups:changed')); } catch {}
          }
        } catch {}
        return next;
      },
      async renameCategory(id: string, name: string) {
        const list = categories.map((c) => (c.id === id ? { ...c, name: name.trim() || c.name } : c));
        setCategories(list);
        try {
          await tx('categories', 'readwrite', async (t) => {
            const s = t.objectStore('categories');
            const cur = await new Promise<any>((resolve, reject) => { const req = s.get(id); req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); });
            if (!cur) return; cur.name = name.trim() || cur.name; s.put(cur);
          });
        } catch {}
        try { chrome.storage?.local?.set?.({ categories: list }); } catch {}
      },
      async updateColor(id: string, color: string) {
        const list = categories.map((c) => (c.id === id ? { ...c, color: color || c.color } : c));
        setCategories(list);
        try {
          await tx('categories', 'readwrite', async (t) => {
            const s = t.objectStore('categories');
            const cur = await new Promise<any>((resolve, reject) => { const req = s.get(id); req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); });
            if (!cur) return; cur.color = color || cur.color; s.put(cur);
          });
        } catch {}
        try { chrome.storage?.local?.set?.({ categories: list }); } catch {}
      },
      async deleteCategory(id: string) {
        const next = categories.filter((c) => c.id !== id);
        setCategories(next);
        try { chrome.storage?.local?.set?.({ categories: next }); } catch {}
        if (selectedId === id) {
          const fallback = next[0]?.id || '';
          setSelectedId(fallback);
          try { chrome.storage?.local?.set?.({ selectedCategoryId: fallback }); } catch {}
        }
        // Also delete webpages under this category
        try {
          const pages = await svc?.loadFromLocal();
          const filtered = (pages || []).filter(
            (p: any) => String(p.category || '') !== String(id)
          );
          await svc?.saveToLocal(filtered as any);
        } catch {}
        // Also delete all groups under this category
        try {
          await (svc as any)?.deleteSubcategoriesByCategory?.(id);
        } catch {}
        // Delete category row from IDB
        try {
          await tx('categories', 'readwrite', async (t) => {
            t.objectStore('categories').delete(id);
          });
        } catch {}
      },
      async setDefaultTemplate(id: string, templateId?: string) {
        // Use functional update to avoid stale closure overriding a freshly added category
        let nextList: Category[] = categories;
        setCategories((prev) => {
          const list = prev.map((c) =>
            c.id === id ? { ...c, defaultTemplateId: templateId } : c
          );
          nextList = list;
          return list;
        });
        try {
          await svc?.saveToSync(nextList as any);
        } catch {}
        try {
          chrome.storage?.local?.set?.({ categories: nextList });
        } catch {}
      },
      async reorderCategories(orderIds: string[]) {
        // Only reorder within current organization scope
        const byId = new Map(categories.map((c) => [c.id, c]));
        const newList: Category[] = [];
        let i = 0;
        for (const id of orderIds) {
          const c = byId.get(id); if (!c) continue;
          newList.push({ ...c, order: i++ });
          byId.delete(id);
        }
        for (const c of byId.values()) newList.push({ ...c, order: i++ });
        setCategories(newList);
        try { await (svc as any).reorderCategories?.(orderIds, selectedOrgId); } catch {}
        try { chrome.storage?.local?.set?.({ categories: newList }); } catch {}
      },
    }),
    [categories, svc, selectedId, selectedOrgId]
  );

  const setCurrentCategory = (id: string) => {
    setSelectedId(id);
    try {
      chrome.storage?.local?.set?.({ selectedCategoryId: id });
    } catch {}
    try {
      setMeta('settings.selectedCategoryId', id);
    } catch {}
  };
  const value = useMemo(() => ({ categories, selectedId, setCurrentCategory, actions }), [categories, selectedId, actions]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export function useCategories(): CategoriesState {
  const v = useContext(Ctx);
  if (!v) throw new Error('CategoriesProvider missing');
  return v;
}
