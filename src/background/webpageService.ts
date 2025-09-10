import { createStorageService, type StorageService, type WebpageData } from './storageService';
import { getMeta, setMeta } from './idb/db';

export interface TabLike {
  id?: number;
  title?: string;
  url?: string;
  favIconUrl?: string;
}

export interface WebpageService {
  addWebpageFromTab: (tab: TabLike) => Promise<WebpageData>;
  updateWebpage: (
    id: string,
    updates: Partial<WebpageData>
  ) => Promise<WebpageData>;
  deleteWebpage: (id: string) => Promise<void>;
  loadWebpages: () => Promise<WebpageData[]>;
  reorderWebpages: (fromId: string, toId: string) => Promise<WebpageData[]>;
  moveWebpageToEnd: (id: string) => Promise<WebpageData[]>;
}

export function createWebpageService(deps?: {
  storage?: StorageService;
}): WebpageService {
  const storage = deps?.storage ?? createStorageService();

  function nowIso() {
    return new Date().toISOString();
  }

  function normalizeUrl(raw?: string): string {
    if (!raw) throw new Error('Missing URL');
    let url: URL;
    try {
      url = new URL(raw);
    } catch {
      throw new Error('Invalid URL');
    }
    if (!/^https?:$/.test(url.protocol))
      throw new Error('Unsupported URL protocol');
    return url.toString();
  }

  function cleanTitle(t?: string, fallback?: string) {
    const title = (t ?? '').trim();
    if (title) return title;
    if (fallback) {
      try {
        return new URL(fallback).hostname;
      } catch {
        /* ignore */
      }
    }
    return 'Untitled';
  }

  function genId(url: string) {
    return (
      'w_' +
      Math.random().toString(36).slice(2, 9) +
      '_' +
      Math.abs(hash(url)).toString(36)
    );
  }

  function hash(s: string) {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i);
    return h | 0;
  }

  async function getGroupOrder(gid: string): Promise<string[]> {
    try {
      const v = await getMeta<string[]>(`order.subcat.${gid}`);
      return Array.isArray(v) ? v : [];
    } catch {
      return [];
    }
  }

  async function setGroupOrder(gid: string, ids: string[]): Promise<void> {
    try {
      await setMeta(`order.subcat.${gid}`, ids);
    } catch {}
  }

  async function loadWebpages() {
    const list = await storage.loadFromLocal();
    // Sort within the same subcategory by its order list; otherwise keep storage order
    const index = new Map(list.map((w, i) => [w.id, i]));
    try {
      const groupIds = Array.from(
        new Set((list as any[]).map((w: any) => w.subcategoryId).filter(Boolean))
      ) as string[];
      const orders = await Promise.all(groupIds.map((g) => getGroupOrder(g)));
      const posMap = new Map<string, Map<string, number>>(
        groupIds.map((g, i) => [g, new Map(orders[i].map((id, j) => [id, j]))])
      );
      return [...list].sort((a: any, b: any) => {
        const ga = a.subcategoryId;
        const gb = b.subcategoryId;
        if (ga && gb && ga === gb) {
          const pm = posMap.get(ga);
          const ia = pm?.get(a.id) ?? Number.MAX_SAFE_INTEGER;
          const ib = pm?.get(b.id) ?? Number.MAX_SAFE_INTEGER;
          if (ia !== ib) return ia - ib;
        }
        return (index.get(a.id) ?? 0) - (index.get(b.id) ?? 0);
      });
    } catch {
      return list;
    }
  }

  async function saveWebpages(all: WebpageData[]) {
    await storage.saveToLocal(all);
  }

  async function addWebpageFromTab(tab: TabLike): Promise<WebpageData> {
    const url = normalizeUrl(tab.url);
    const title = cleanTitle(tab.title, url);
    const favicon = tab.favIconUrl ?? '';
    const now = nowIso();
    const list = await loadWebpages();
    const item: WebpageData = {
      id: genId(url),
      title,
      url,
      favicon,
      note: '',
      category: 'default',
      createdAt: now,
      updatedAt: now,
    };
    const next = [item, ...list];
    await saveWebpages(next);
    return item;
  }

  async function updateWebpage(
    id: string,
    updates: Partial<WebpageData>
  ): Promise<WebpageData> {
    const list = await loadWebpages();
    const idx = list.findIndex((w) => w.id === id);
    if (idx === -1) throw new Error('Not found');
    const prev = list[idx];
    // Normalize URL if provided
    let nextUrl = prev.url;
    if (updates.url !== undefined) {
      nextUrl = normalizeUrl(updates.url);
    }
    const merged: WebpageData = {
      ...prev,
      ...updates,
      url: nextUrl,
      title:
        updates.title !== undefined
          ? cleanTitle(updates.title, prev.url)
          : prev.title,
      updatedAt: nowIso(),
    };
    const next = [...list];
    next[idx] = merged;
    await saveWebpages(next);
    return merged;
  }

  async function deleteWebpage(id: string) {
    const list = await storage.loadFromLocal();
    const victim = list.find((w) => w.id === id) as any;
    const next = list.filter((w) => w.id !== id);
    await saveWebpages(next);
    // Remove from its group's order
    try {
      const gid = victim?.subcategoryId as string | undefined;
      if (gid) {
        const order = await getGroupOrder(gid);
        const pruned = order.filter((x) => x !== id);
        if (pruned.length !== order.length) await setGroupOrder(gid, pruned);
      }
    } catch {}
  }

  async function reorderWebpages(fromId: string, toId: string) {
    // Only require toId to exist; fromId might be moving across groups
    const list = await storage.loadFromLocal();
    const to = list.find((w) => w.id === toId) as any;
    if (!to) return await loadWebpages();
    const gid = to.subcategoryId as string | undefined;
    if (!gid) return await loadWebpages();
    // Build baseline from current storage order merged with existing
    const currentIds = (list as any[])
      .filter((w: any) => w.subcategoryId === gid)
      .map((w: any) => w.id);
    const existing = await getGroupOrder(gid);
    const seen = new Set<string>();
    const base: string[] = [];
    for (const id of existing) if (currentIds.includes(id) && !seen.has(id)) { seen.add(id); base.push(id); }
    for (const id of currentIds) if (!seen.has(id)) { seen.add(id); base.push(id); }
    const filtered = base.filter((x) => x !== fromId);
    const idx = filtered.indexOf(toId);
    const insertAt = idx === -1 ? filtered.length : idx;
    filtered.splice(insertAt, 0, fromId);
    await setGroupOrder(gid, filtered);
    return await loadWebpages();
  }

  async function moveWebpageToEnd(id: string) {
    const list = await storage.loadFromLocal();
    const it = list.find((w) => w.id === id) as any;
    if (!it) return await loadWebpages();
    const gid = it.subcategoryId as string | undefined;
    if (!gid) return await loadWebpages();
    const currentIds = (list as any[])
      .filter((w: any) => w.subcategoryId === gid)
      .map((w: any) => w.id);
    const existing = await getGroupOrder(gid);
    const seen = new Set<string>();
    const base: string[] = [];
    for (const x of existing) if (currentIds.includes(x) && !seen.has(x)) { seen.add(x); base.push(x); }
    for (const x of currentIds) if (!seen.has(x)) { seen.add(x); base.push(x); }
    const filtered = base.filter((x) => x !== id);
    filtered.push(id);
    await setGroupOrder(gid, filtered);
    return await loadWebpages();
  }

  return {
    addWebpageFromTab,
    updateWebpage,
    deleteWebpage,
    loadWebpages,
    reorderWebpages,
    moveWebpageToEnd,
  };
}
