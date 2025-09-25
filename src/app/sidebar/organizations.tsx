import React, { createContext, useContext, useMemo, useState } from 'react';
import { getAll, tx, setMeta } from '../../background/idb/db';

export interface Organization {
  id: string;
  name: string;
  color?: string;
  order: number;
}

interface OrgsState {
  organizations: Organization[];
  selectedOrgId: string;
  setCurrentOrganization: (id: string) => void;
  actions: {
    reload: () => Promise<void>;
    add: (name: string, color?: string) => Promise<Organization>;
    rename: (id: string, name: string) => Promise<void>;
    remove: (id: string, reassignToId?: string) => Promise<void>;
    reorder: (orderedIds: string[]) => Promise<void>;
  };
}

export const OrgsCtx = createContext<OrgsState | null>(null);

const DEFAULT_ORGS: Organization[] = [
  { id: 'o_default', name: 'Personal', order: 0 },
];

export const OrganizationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [organizations, setOrganizations] = useState<Organization[]>(DEFAULT_ORGS);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('o_default');

  React.useLayoutEffect(() => {
    (async () => {
      try {
        const list = (await getAll('organizations' as any).catch(() => [])) as any[];
        let orgs: Organization[] = Array.isArray(list) && list.length > 0 ? (list as any) : DEFAULT_ORGS;
        orgs = orgs.slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || String(a.name).localeCompare(String(b.name)));
        setOrganizations(orgs);
        // Restore selected org
        try {
          const got: any = await new Promise((resolve) => {
            try { chrome.storage?.local?.get?.({ selectedOrganizationId: '' }, resolve); } catch { resolve({}); }
          });
          const sel = got?.selectedOrganizationId || '';
          if (sel && orgs.some((o) => o.id === sel)) setSelectedOrgId(sel);
          else setSelectedOrgId(orgs[0]?.id || 'o_default');
        } catch {
          setSelectedOrgId(orgs[0]?.id || 'o_default');
        }
      } catch {}
    })();
  }, []);

  const actions = useMemo(() => ({
    async reload() {
      try {
        const list = (await getAll('organizations' as any).catch(() => [])) as any[];
        const orgs: Organization[] = Array.isArray(list) && list.length > 0 ? (list as any) : DEFAULT_ORGS;
        orgs.sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || String(a.name).localeCompare(String(b.name)));
        setOrganizations(orgs);
        if (!orgs.some((o) => o.id === selectedOrgId)) setSelectedOrgId(orgs[0]?.id || 'o_default');
      } catch {}
    },
    async add(name: string, color?: string) {
      const nowList = organizations.slice();
      const order = nowList.length ? (nowList[nowList.length - 1].order ?? nowList.length - 1) + 1 : 0;
      const next: Organization = { id: 'o_' + Math.random().toString(36).slice(2, 9), name: name.trim() || 'Org', color, order };
      setOrganizations([...nowList, next]);
      try {
        await tx('organizations' as any, 'readwrite', async (t) => t.objectStore('organizations' as any).put(next));
      } catch {}
      return next;
    },
    async rename(id: string, name: string) {
      setOrganizations((prev) => prev.map((o) => o.id === id ? { ...o, name: name.trim() || o.name } : o));
      try {
        await tx('organizations' as any, 'readwrite', async (t) => {
          const s = t.objectStore('organizations' as any);
          const cur = await new Promise<any>((resolve, reject) => { const req = s.get(id); req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); });
          if (!cur) return; cur.name = name; s.put(cur);
        });
      } catch {}
    },
    async remove(id: string, reassignToId?: string) {
      // Reassign categories in this org to target (or default)
      try {
        await tx(['categories', 'organizations' as any], 'readwrite', async (t) => {
          const cs = t.objectStore('categories');
          const os = t.objectStore('organizations' as any);
          const catList: any[] = await new Promise((resolve, reject) => { const req = cs.getAll(); req.onsuccess = () => resolve(req.result || []); req.onerror = () => reject(req.error); });
          const orgs: any[] = await new Promise((resolve, reject) => { const req = os.getAll(); req.onsuccess = () => resolve(req.result || []); req.onerror = () => reject(req.error); });
          const target = reassignToId && orgs.find((o: any) => o.id === reassignToId) ? reassignToId : (orgs.find((o: any) => o.id !== id)?.id || 'o_default');
          for (const c of catList) {
            if ((c as any).organizationId === id) { (c as any).organizationId = target; cs.put(c); }
          }
          os.delete(id);
        });
      } catch {}
      setOrganizations((prev) => prev.filter((o) => o.id !== id));
      if (selectedOrgId === id) setSelectedOrgId('o_default');
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
  }), [organizations, selectedOrgId]);

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
      organizations: DEFAULT_ORGS,
      selectedOrgId: 'o_default',
      setCurrentOrganization: () => {},
      actions: {
        reload: async () => {},
        add: async (name: string, color?: string) => ({ id: 'o_default', name: name || 'Personal', color, order: 0 }),
        rename: async () => {},
        remove: async () => {},
        reorder: async () => {},
      },
    } as any;
  }
  return v;
}
