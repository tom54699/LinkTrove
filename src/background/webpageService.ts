import { createStorageService, type StorageService, type WebpageData } from './storageService';

export interface TabLike {
  id?: number;
  title?: string;
  url?: string;
  favIconUrl?: string;
}

export interface WebpageService {
  addWebpageFromTab: (tab: TabLike) => Promise<WebpageData>;
  updateWebpage: (id: string, updates: Partial<WebpageData>) => Promise<WebpageData>;
  deleteWebpage: (id: string) => Promise<void>;
  loadWebpages: () => Promise<WebpageData[]>;
}

export function createWebpageService(deps?: { storage?: StorageService }): WebpageService {
  const storage = deps?.storage ?? createStorageService();

  function nowIso() {
    return new Date().toISOString();
  }

  function normalizeUrl(raw?: string): string {
    if (!raw) throw new Error('Missing URL');
    let url: URL;
    try { url = new URL(raw); } catch { throw new Error('Invalid URL'); }
    if (!/^https?:$/.test(url.protocol)) throw new Error('Unsupported URL protocol');
    return url.toString();
  }

  function cleanTitle(t?: string, fallback?: string) {
    const title = (t ?? '').trim();
    if (title) return title;
    if (fallback) {
      try { return new URL(fallback).hostname; } catch { /* ignore */ }
    }
    return 'Untitled';
  }

  function genId(url: string) {
    return 'w_' + Math.random().toString(36).slice(2, 9) + '_' + Math.abs(hash(url)).toString(36);
  }

  function hash(s: string) {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i);
    return h | 0;
  }

  async function loadWebpages() {
    return storage.loadFromLocal();
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
    const existing = list.find((w) => w.url === url);
    if (existing) return existing;
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

  async function updateWebpage(id: string, updates: Partial<WebpageData>): Promise<WebpageData> {
    const list = await loadWebpages();
    const idx = list.findIndex((w) => w.id === id);
    if (idx === -1) throw new Error('Not found');
    const prev = list[idx];
    const merged: WebpageData = {
      ...prev,
      ...updates,
      title: updates.title !== undefined ? cleanTitle(updates.title, prev.url) : prev.title,
      updatedAt: nowIso(),
    };
    const next = [...list];
    next[idx] = merged;
    await saveWebpages(next);
    return merged;
  }

  async function deleteWebpage(id: string) {
    const list = await loadWebpages();
    const next = list.filter((w) => w.id !== id);
    await saveWebpages(next);
  }

  return { addWebpageFromTab, updateWebpage, deleteWebpage, loadWebpages };
}

