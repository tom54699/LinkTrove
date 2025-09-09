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

  async function loadWebpages() {
    const list = await storage.loadFromLocal();
    try {
      const order: string[] | undefined = await getMeta('order.webpages');
      if (Array.isArray(order) && order.length) {
        const pos = new Map(order.map((id, i) => [id, i]));
        return [...list].sort((a, b) =>
          (pos.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (pos.get(b.id) ?? Number.MAX_SAFE_INTEGER)
        );
      }
    } catch {}
    return list;
  }

  async function saveWebpages(all: WebpageData[]) {
    await storage.saveToLocal(all);
    try { await setMeta('order.webpages', all.map((x) => x.id)); } catch {}
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
    const next = list.filter((w) => w.id !== id);
    await saveWebpages(next);
  }

  async function reorderWebpages(fromId: string, toId: string) {
    const list = await loadWebpages();
    const fromIdx = list.findIndex((w) => w.id === fromId);
    const toIdx = list.findIndex((w) => w.id === toId);
    if (fromIdx === -1 || toIdx === -1) return list;
    try { console.debug('[lt:dnd] reorderWebpages', { fromId, toId, fromIdx, toIdx, order: list.map(x=>x.id) }); } catch {}
    const next = [...list];
    const [moved] = next.splice(fromIdx, 1);
    // If removing an item from before the target, the target index shifts left by 1
    const insertAt = fromIdx < toIdx ? toIdx - 1 : toIdx;
    next.splice(Math.max(0, insertAt), 0, moved);
    await saveWebpages(next);
    try { console.debug('[lt:dnd] after reorder', { order: next.map(x=>x.id) }); } catch {}
    return next;
  }

  async function moveWebpageToEnd(id: string) {
    const list = await loadWebpages();
    const idx = list.findIndex((w) => w.id === id);
    if (idx === -1) return list;
    const next = [...list];
    const [moved] = next.splice(idx, 1);
    next.push(moved);
    await saveWebpages(next);
    return next;
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
