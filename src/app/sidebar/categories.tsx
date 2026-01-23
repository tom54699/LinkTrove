import React, { createContext, useContext, useMemo, useState } from 'react';
import { createStorageService } from '../../background/storageService';
import { setMeta, tx, getMeta } from '../../background/idb/db';
import { useOrganizations, OrgsCtx } from './organizations';

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
    reload: () => Promise<void>;
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
  const selectedIdRef = React.useRef(selectedId);
  const { selectedOrgId } = useOrganizations();
  const orgCtx = React.useContext(OrgsCtx);
  const hasOrgProvider = !!orgCtx;
  const [ready, setReady] = useState<boolean>(!hasOrgProvider);
  const [refreshTick, setRefreshTick] = useState(0);

  const svc = React.useMemo(() => {
    // 一律建立 IDB-backed service（chrome.storage 僅作為輔助設定存取）
    return createStorageService();
  }, []);

  React.useEffect(() => {
    const onRestore = () => {
      setRefreshTick((tick) => tick + 1);
    };
    try {
      window.addEventListener('cloudsync:restored', onRestore as any);
    } catch {}
    return () => {
      try {
        window.removeEventListener('cloudsync:restored', onRestore as any);
      } catch {}
    };
  }, []);

  React.useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  React.useLayoutEffect(() => {
    (async () => {
      if (!svc) return; // safety
      // Load categories scoped by selected organization
      let list = await tx('categories', 'readonly', async (t) => {
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
      // Repair step: if none for this org, but DB has categories missing organizationId, attach to default org
      if (!Array.isArray(list) || list.length === 0) {
        try {
          await tx('categories', 'readwrite', async (t) => {
            const s = t.objectStore('categories');
            const all: any[] = await new Promise((resolve, reject) => {
              const rq = s.getAll();
              rq.onsuccess = () => resolve(rq.result || []);
              rq.onerror = () => reject(rq.error);
            });
            let changed = false;
            for (const c of all) {
              if (!(c as any).organizationId) { (c as any).organizationId = 'o_default'; s.put(c); changed = true; }
            }
            if (changed) {
              // re-query for current org
              try {
                const idx = s.index('by_organizationId_order');
                const range = IDBKeyRange.bound([selectedOrgId, -Infinity], [selectedOrgId, Infinity]);
                const rows: any[] = await new Promise((resolve, reject) => {
                  const req = idx.getAll(range);
                  req.onsuccess = () => resolve(req.result || []);
                  req.onerror = () => reject(req.error);
                });
                list = rows as any[];
              } catch {
                list = all.filter((c: any) => c.organizationId === selectedOrgId);
              }
            }
          });
        } catch {}
      }
      // Seed default collection only when the entire table is empty（避免覆蓋測試預置資料）
      if (!Array.isArray(list) || list.length === 0) {
        try {
          await tx('categories', 'readwrite', async (t) => {
            const s = t.objectStore('categories');
            const all: any[] = await new Promise((resolve, reject) => {
              const rq = s.getAll();
              rq.onsuccess = () => resolve(rq.result || []);
              rq.onerror = () => reject(rq.error);
            });
            if ((all || []).length === 0) {
              s.put({ id: 'default', name: 'Default', color: '#64748b', order: 0, organizationId: selectedOrgId });
            }
          });
        } catch {}
        // reload
        try {
          list = await tx('categories', 'readonly', async (t) => {
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
        } catch {}
      }
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
        try { chrome.runtime?.sendMessage?.({ kind: 'context-menus:refresh' }); } catch {}
      } catch {}
      // Restore selected category for this organization
      let want: string | undefined;
      try {
        // 優先讀取該 Organization 上次停留的 Collection (格式: selectedCategoryId:orgId)
        // 其次讀取全域 selectedCategoryId (backward compat)
        // 最後讀取 IDB meta
        let persisted: string | undefined;
        const key = `selectedCategoryId:${selectedOrgId}`;
        
        try {
          const got: any = await new Promise((resolve) => {
            try { chrome.storage?.local?.get?.([key, 'selectedCategoryId'], resolve); } catch { resolve({}); }
          });
          
          if (got && typeof got[key] === 'string') {
            persisted = got[key];
          } else if (got && typeof got.selectedCategoryId === 'string') {
            // Fallback for first migration or single-org users
            persisted = got.selectedCategoryId;
          }
        } catch {}

        if (!persisted) {
          try { persisted = (await getMeta<string>(`settings.${key}`)) || (await getMeta<string>('settings.selectedCategoryId')) || undefined; } catch {}
        }
        
        const listInOrg = ordered as any[];
        const has = (id?: string) => !!id && listInOrg.some((c) => c.id === id);
        
        // 預設使用第一個可用的分類或 default
        want = has(persisted)
          ? persisted!
          : has(selectedIdRef.current)
            ? selectedIdRef.current
            : listInOrg[0]?.id || 'default';
            
        setSelectedId(want);
        // Sync back to storage immediately to ensure consistency
        try { 
          chrome.storage?.local?.set?.({ 
            [key]: want,
            selectedCategoryId: want // Keep global for legacy compat
          }); 
        } catch {}
      } catch {}
      try { if (hasOrgProvider) setReady(true); } catch {}
    })();
  }, [svc, selectedOrgId, refreshTick, hasOrgProvider]);


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
          // Filter by current organization
          const filtered = merged.filter((c: any) => c.organizationId === selectedOrgId);
          filtered.sort(
            (a, b) =>
              (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name)
          );
          setCategories(filtered);
        } catch {}
      },
      async addCategory(name: string, color = '#64748b') {
        // 使用後端服務建立（帶 organizationId），避免遺失 org 資訊
        const created = await (svc as any).addCategory?.(name.trim() || 'Untitled', color, selectedOrgId);
        // 更新本地狀態並持久化
        const list = [...categories, { id: created.id, name: created.name, color: created.color, order: created.order, defaultTemplateId: created.defaultTemplateId } as any];
        list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || String(a.name).localeCompare(String(b.name)));
        setCategories(list);
        try { chrome.storage?.local?.set?.({ categories: list }); } catch {}
        // Auto-create default group
        try {
          const arr = (((await (svc as any).listSubcategories?.(created.id)) as any[]) || []);
          if (!Array.isArray(arr) || arr.length === 0) await (svc as any).createSubcategory?.(created.id, 'group');
          try { window.dispatchEvent(new CustomEvent('groups:changed')); } catch {}
          try { chrome.runtime?.sendMessage?.({ kind: 'context-menus:refresh' }); } catch {}
        } catch {}
        return created as any;
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
        // Minimum count protection: check if this is the last category in the organization
        const toDelete = categories.find((c) => c.id === id);
        if (toDelete) {
          const inSameOrg = categories.filter((c) => c.organizationId === toDelete.organizationId);
          if (inSameOrg.length <= 1) {
            throw new Error('Cannot delete last category in organization');
          }
        }

        const next = categories.filter((c) => c.id !== id);
        setCategories(next);
        try { chrome.storage?.local?.set?.({ categories: next }); } catch {}
        if (selectedId === id) {
          const fallback = next[0]?.id || '';
          setSelectedId(fallback);
          try { 
            const key = `selectedCategoryId:${toDelete?.organizationId || selectedOrgId}`;
            chrome.storage?.local?.set?.({ 
              [key]: fallback,
              selectedCategoryId: fallback 
            }); 
          } catch {}
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
        } catch (error) {
          console.error('Delete category error:', error);
          throw error;
        }
      },
      async setDefaultTemplate(id: string, templateId?: string) {
        // 局部更新該筆記錄，避免覆蓋掉 organizationId 等欄位
        setCategories((prev) => prev.map((c) => c.id === id ? { ...c, defaultTemplateId: templateId } : c));
        try {
          await tx('categories', 'readwrite', async (t) => {
            const s = t.objectStore('categories');
            const cur = await new Promise<any>((resolve, reject) => { const req = s.get(id); req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); });
            if (!cur) return; cur.defaultTemplateId = templateId; s.put(cur);
          });
        } catch {}
        try { chrome.storage?.local?.set?.({ categories }); } catch {}
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
      const key = `selectedCategoryId:${selectedOrgId}`;
      chrome.storage?.local?.set?.({ 
        [key]: id,
        selectedCategoryId: id 
      });
    } catch {}
    try {
      setMeta(`settings.selectedCategoryId:${selectedOrgId}`, id);
      setMeta('settings.selectedCategoryId', id);
    } catch {}
  };
  const value = useMemo(() => ({ categories, selectedId, setCurrentCategory, actions }), [categories, selectedId, actions]);
  if (!ready) return null;
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export function useCategories(): CategoriesState {
  const v = useContext(Ctx);
  // 提供安全 fallback 以便單元測試可直接渲染依賴的元件
  if (!v) {
    return {
      categories: DEFAULT_CATEGORIES,
      selectedId: 'default',
      setCurrentCategory: () => {},
      actions: {
        reload: async () => {},
        addCategory: async () => DEFAULT_CATEGORIES[0],
        renameCategory: async () => {},
        updateColor: async () => {},
        deleteCategory: async () => {},
        setDefaultTemplate: async () => {},
        reorderCategories: async () => {},
      },
    } as any;
  }
  return v;
}
