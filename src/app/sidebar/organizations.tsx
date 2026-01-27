import React, { createContext, useContext, useMemo, useState } from 'react';
import { getAll, tx, setMeta } from '../../background/idb/db';
import { createStorageService } from '../../background/storageService';
import {
  DEFAULT_GROUP_NAME,
  DEFAULT_ORGANIZATION_NAME,
  createEntityId,
} from '../../utils/defaults';

export interface Organization {
  id: string;
  name: string;
  color?: string;
  order: number;
  isDefault?: boolean;
  updatedAt?: string;
}

interface OrgsState {
  organizations: Organization[];
  selectedOrgId: string;
  setCurrentOrganization: (id: string) => void;
  actions: {
    reload: () => Promise<void>;
    add: (name: string, color?: string) => Promise<Organization>;
    rename: (id: string, name: string) => Promise<void>;
    updateColor: (id: string, color?: string) => Promise<void>;
    remove: (id: string, reassignToId?: string) => Promise<void>;
    reorder: (orderedIds: string[]) => Promise<void>;
  };
}

export const OrgsCtx = createContext<OrgsState | null>(null);

const FALLBACK_ORG_ID = createEntityId('o');
const FALLBACK_ORGS: Organization[] = [
  { id: FALLBACK_ORG_ID, name: DEFAULT_ORGANIZATION_NAME, order: 0, isDefault: true },
];

export const OrganizationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const storage = React.useMemo(() => createStorageService(), []);
  const ensureDefaultOrg = React.useCallback(async (): Promise<Organization | null> => {
    let ensured: Organization | null = null;
    try {
      await tx('organizations' as any, 'readwrite', async (t) => {
        const s = t.objectStore('organizations' as any);
        const existing: any[] = await new Promise((resolve, reject) => {
          const req = s.getAll();
          req.onsuccess = () => resolve(req.result || []);
          req.onerror = () => reject(req.error);
        });
        if (!existing.length) {
          ensured = {
            id: createEntityId('o'),
            name: DEFAULT_ORGANIZATION_NAME,
            color: '#64748b',
            order: 0,
            isDefault: true,
          };
          s.put(ensured as any);
        } else {
          ensured = existing.find((o: any) => o.isDefault) || existing[0];
        }
      });
    } catch {}
    return ensured;
  }, []);

  React.useLayoutEffect(() => {
    (async () => {
      try {
        const list = (await storage.listOrganizations?.().catch(() => [])) as any[];
        let orgs: Organization[] = Array.isArray(list) && list.length > 0 ? (list as any) : [];
        if (!orgs.length) {
          const ensured = await ensureDefaultOrg();
          if (ensured) orgs = [ensured];
        }
        orgs = orgs.slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || String(a.name).localeCompare(String(b.name)));
        setOrganizations(orgs);
        // Restore selected org
        try {
          const got: any = await new Promise((resolve) => {
            try { chrome.storage?.local?.get?.({ selectedOrganizationId: '' }, resolve); } catch { resolve({}); }
          });
          const sel = got?.selectedOrganizationId || '';
          if (sel && orgs.some((o) => o.id === sel)) setSelectedOrgId(sel);
          else setSelectedOrgId(orgs[0]?.id || '');
        } catch {
          setSelectedOrgId(orgs[0]?.id || '');
        }
      } catch {}
    })();
  }, [storage, ensureDefaultOrg]);

  const actions = useMemo(() => ({
    async reload() {
      try {
        const list = (await storage.listOrganizations?.().catch(() => [])) as any[];
        let orgs: Organization[] = Array.isArray(list) && list.length > 0 ? (list as any) : [];
        if (!orgs.length) {
          const ensured = await ensureDefaultOrg();
          if (ensured) orgs = [ensured];
        }
        orgs.sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || String(a.name).localeCompare(String(b.name)));
        setOrganizations(orgs);
        if (!orgs.some((o) => o.id === selectedOrgId)) setSelectedOrgId(orgs[0]?.id || '');
      } catch {}
    },
    async add(name: string, color?: string) {
      // Use storageService to create organization with default collection
      const result = await storage.createOrganization?.(name, color);

      if (result) {
        const org = result.organization;
        setOrganizations((prev) => [...prev, org]);

        // Auto-create default group for the default collection
        if (result.defaultCollection) {
          const catId = result.defaultCollection.id;
          try {
            await storage.createSubcategory?.(catId, DEFAULT_GROUP_NAME);
          } catch {}
        }

        return org;
      }

      // Fallback to old behavior if storageService fails (but not for limit errors)
      const nowList = organizations.slice();
      const order = nowList.length ? (nowList[nowList.length - 1].order ?? nowList.length - 1) + 1 : 0;
      const next: Organization = { id: createEntityId('o'), name: name.trim() || 'Org', color, order, isDefault: false };
      setOrganizations([...nowList, next]);
      try {
        await tx('organizations' as any, 'readwrite', async (t) => t.objectStore('organizations' as any).put(next));
      } catch {}
      return next;
    },
    async rename(id: string, name: string) {
      setOrganizations((prev) => prev.map((o) => {
        if (o.id !== id) return o;
        const nextName = name.trim() || o.name;
        const nextIsDefault = o.isDefault && String(nextName) === String(o.name);
        return { ...o, name: nextName, isDefault: nextIsDefault, updatedAt: new Date().toISOString() };
      }));
      try {
        await tx('organizations' as any, 'readwrite', async (t) => {
          const s = t.objectStore('organizations' as any);
          const cur = await new Promise<any>((resolve, reject) => { const req = s.get(id); req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); });
          if (!cur) return;
          const nextName = name;
          if (String(cur.name || '') !== String(nextName || '') && cur.isDefault) cur.isDefault = false;
          cur.name = nextName;
          cur.updatedAt = new Date().toISOString();
          s.put(cur);
        });
      } catch {}
    },
    async updateColor(id: string, color?: string) {
      setOrganizations((prev) => prev.map((o) => o.id === id ? { ...o, color, updatedAt: new Date().toISOString() } : o));
      try {
        await tx('organizations' as any, 'readwrite', async (t) => {
          const s = t.objectStore('organizations' as any);
          const cur = await new Promise<any>((resolve, reject) => { const req = s.get(id); req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); });
          if (!cur) return;
          cur.color = color;
          cur.updatedAt = new Date().toISOString();
          s.put(cur);
        });
      } catch {}
    },
    async remove(id: string) {
      // Minimum count protection
      if (organizations.length <= 1) {
        throw new Error('Cannot delete last organization');
      }

      // Cascade delete: delete all categories (which will delete all groups and webpages)
      try {
        await tx(['categories', 'subcategories' as any, 'webpages', 'organizations' as any], 'readwrite', async (t) => {
          const cs = t.objectStore('categories');
          const ss = t.objectStore('subcategories' as any);
          const ws = t.objectStore('webpages');
          const os = t.objectStore('organizations' as any);

          // Get all categories in this org
          const catList: any[] = await new Promise((resolve, reject) => {
            const req = cs.getAll();
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = () => reject(req.error);
          });
          const catsInOrg = catList.filter((c: any) => c.organizationId === id);

          // For each category, cascade delete groups and webpages
          for (const cat of catsInOrg) {
            // Get all groups in this category
            const subList: any[] = await new Promise((resolve, reject) => {
              const req = ss.getAll();
              req.onsuccess = () => resolve(req.result || []);
              req.onerror = () => reject(req.error);
            });
            const subsInCat = subList.filter((s: any) => s.categoryId === cat.id);

            // For each group, delete all webpages
            for (const sub of subsInCat) {
              const webList: any[] = await new Promise((resolve, reject) => {
                const req = ws.getAll();
                req.onsuccess = () => resolve(req.result || []);
                req.onerror = () => reject(req.error);
              });
              const websInSub = webList.filter((w: any) => w.subcategoryId === sub.id);
              for (const web of websInSub) {
                ws.delete(web.id);
              }
              ss.delete(sub.id);
            }

            cs.delete(cat.id);
          }

          // Finally delete organization
          os.delete(id);
        });
      } catch (error) {
        console.error('Delete organization error:', error);
        throw error;
      }

      setOrganizations((prev) => prev.filter((o) => o.id !== id));

      // Auto-switch to another organization if current one is deleted
      if (selectedOrgId === id) {
        const remaining = organizations.filter(o => o.id !== id);
        const nextOrgId = remaining[0]?.id || '';
        setSelectedOrgId(nextOrgId);
      }
    },
    async reorder(orderedIds: string[]) {
      const byId = new Map(organizations.map((o) => [o.id, o]));
      const newList: Organization[] = [];
      let i = 0;
      for (const id of orderedIds) { const o = byId.get(id); if (!o) continue; newList.push({ ...o, order: i++ }); byId.delete(id); }
      for (const o of byId.values()) newList.push({ ...o, order: i++ });
      setOrganizations(newList);
      try { await tx('organizations' as any, 'readwrite', async (t) => { const s = t.objectStore('organizations' as any); for (const o of newList) s.put(o as any); }); } catch {}
    },
  }), [organizations, selectedOrgId, storage]);

  React.useEffect(() => {
    const onRestore = () => {
      void actions.reload();
    };
    try {
      window.addEventListener('cloudsync:restored', onRestore as any);
    } catch {}
    return () => {
      try {
        window.removeEventListener('cloudsync:restored', onRestore as any);
      } catch {}
    };
  }, [actions]);

  const setCurrentOrganization = (id: string) => {
    // 立即更新 context，避免任何載入流程覆寫
    setSelectedOrgId(id);
    try { chrome.storage?.local?.set?.({ selectedOrganizationId: id }); } catch {}
    try { setMeta('settings.selectedOrganizationId', id); } catch {}
  };

  const value = useMemo(() => ({ organizations, selectedOrgId, setCurrentOrganization, actions }), [organizations, selectedOrgId, actions]);
  return <OrgsCtx.Provider value={value}>{children}</OrgsCtx.Provider>;
};

export function useOrganizations(): OrgsState {
  const v = useContext(OrgsCtx);
  // 測試/未包 Provider 時提供安全 fallback
  if (!v) {
    return {
      organizations: FALLBACK_ORGS,
      selectedOrgId: FALLBACK_ORG_ID,
      setCurrentOrganization: () => {},
      actions: {
        reload: async () => {},
        add: async (name: string, color?: string) => ({ id: createEntityId('o'), name: name || DEFAULT_ORGANIZATION_NAME, color, order: 0 }),
        rename: async () => {},
        updateColor: async () => {},
        remove: async () => {},
        reorder: async () => {},
      },
    } as any;
  }
  return v;
}
