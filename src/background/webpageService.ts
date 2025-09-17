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
    // 以 IDB 為準（實際環境資料來源），測試環境也有 fake-indexeddb 支援
    let list: WebpageData[] = await storage.loadFromLocal();
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

      // Build group order mapping for inter-group sorting
      const groupOrderMap = new Map<string, number>();
      groupIds.forEach((gid, idx) => groupOrderMap.set(gid, idx));

      const sorted = [...list].sort((a: any, b: any) => {
        const ga = a.subcategoryId;
        const gb = b.subcategoryId;

        if (ga && gb && ga === gb) {
          // Same group: use intra-group ordering
          const pm = posMap.get(ga);
          const ia = pm?.get(a.id) ?? Number.MAX_SAFE_INTEGER;
          const ib = pm?.get(b.id) ?? Number.MAX_SAFE_INTEGER;
          if (ia !== ib) {
            return ia - ib;
          }
        } else if (ga && gb) {
          // Different groups: use group order
          const groupOrderA = groupOrderMap.get(ga) ?? Number.MAX_SAFE_INTEGER;
          const groupOrderB = groupOrderMap.get(gb) ?? Number.MAX_SAFE_INTEGER;
          if (groupOrderA !== groupOrderB) {
            return groupOrderA - groupOrderB;
          }
        }

        // Fallback to original storage order
        const fallbackA = index.get(a.id) ?? 0;
        const fallbackB = index.get(b.id) ?? 0;
        return fallbackA - fallbackB;
      });

      return sorted;
    } catch {
      return list;
    }
  }

  async function saveWebpages(all: WebpageData[]) {
    try { await storage.saveToLocal(all); } catch {}
    // 鏡射到 chrome.storage.local（可選），方便某些輔助功能或除錯
    try { chrome.storage?.local?.set?.({ webpages: all }); } catch {}
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
    const from = list.find((w) => w.id === fromId) as any;
    const to = list.find((w) => w.id === toId) as any;
    if (!to) return await loadWebpages();

    const targetGid = to.subcategoryId as string | undefined;
    if (!targetGid) return await loadWebpages();

    // Check if this is a cross-group move
    const sourceGid = from?.subcategoryId as string | undefined;
    const isCrossGroupMove = sourceGid && sourceGid !== targetGid;

    // If cross-group move, first update the card's group and remove from source group order
    if (isCrossGroupMove) {
      // Update card's subcategoryId
      const updated = list.map((w: any) =>
        w.id === fromId ? { ...w, subcategoryId: targetGid } : w
      );
      await saveWebpages(updated);

      // Remove from source group order
      const sourceOrder = await getGroupOrder(sourceGid!);
      const pruned = sourceOrder.filter((x) => x !== fromId);
      if (pruned.length !== sourceOrder.length) {
        await setGroupOrder(sourceGid!, pruned);
      }

      // Reload list with updated subcategoryId
      const freshList = await storage.loadFromLocal();
      const currentIds = freshList
        .filter((w: any) => w.subcategoryId === targetGid && w.id !== fromId)
        .map((w: any) => w.id);

      // Build target group order and insert fromId
      const existing = await getGroupOrder(targetGid);
      const seen = new Set<string>();
      const base: string[] = [];
      for (const id of existing) if (currentIds.includes(id) && !seen.has(id)) { seen.add(id); base.push(id); }
      for (const id of currentIds) if (!seen.has(id)) { seen.add(id); base.push(id); }

      const filtered = base.filter((x) => x !== fromId);
      const idx = filtered.indexOf(toId);
      const insertAt = idx === -1 ? filtered.length : idx;
      filtered.splice(insertAt, 0, fromId);
      await setGroupOrder(targetGid, filtered);
    } else {
      // Same-group reorder (existing logic)
      const currentIds = (list as any[])
        .filter((w: any) => w.subcategoryId === targetGid)
        .map((w: any) => w.id);
      const existing = await getGroupOrder(targetGid);
      const seen = new Set<string>();
      const base: string[] = [];
      for (const id of existing) if (currentIds.includes(id) && !seen.has(id)) { seen.add(id); base.push(id); }
      for (const id of currentIds) if (!seen.has(id)) { seen.add(id); base.push(id); }
      const filtered = base.filter((x) => x !== fromId);
      const idx = filtered.indexOf(toId);
      const insertAt = idx === -1 ? filtered.length : idx;
      filtered.splice(insertAt, 0, fromId);
      await setGroupOrder(targetGid, filtered);
    }

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

  async function moveCardToGroup(
    cardId: string,
    targetCategoryId: string,
    targetGroupId: string,
    beforeId?: string
  ) {
    const list = await storage.loadFromLocal();
    const card = list.find((w) => w.id === cardId) as any;
    if (!card) return await loadWebpages();

    const originalCategory = card.category;
    const originalGroupId = card.subcategoryId;

    // Atomic update: category + subcategory + reordering
    try {
      // Update card's category and subcategoryId
      const updated = list.map((w: any) =>
        w.id === cardId
          ? { ...w, category: targetCategoryId, subcategoryId: targetGroupId }
          : w
      );
      await saveWebpages(updated);

      // Remove from original group order if moving between groups
      if (originalGroupId && originalGroupId !== targetGroupId) {
        const sourceOrder = await getGroupOrder(originalGroupId);
        const pruned = sourceOrder.filter((x) => x !== cardId);
        if (pruned.length !== sourceOrder.length) {
          await setGroupOrder(originalGroupId, pruned);
        }
      }

      // Add to target group order
      const targetOrder = await getGroupOrder(targetGroupId);
      const currentIds = updated
        .filter((w: any) => w.subcategoryId === targetGroupId && w.id !== cardId)
        .map((w: any) => w.id);

      // Build new order
      const seen = new Set<string>();
      const base: string[] = [];
      for (const id of targetOrder) if (currentIds.includes(id) && !seen.has(id)) { seen.add(id); base.push(id); }
      for (const id of currentIds) if (!seen.has(id)) { seen.add(id); base.push(id); }

      // Insert at target position
      if (!beforeId || beforeId === '__END__') {
        base.push(cardId);
      } else {
        const idx = base.indexOf(beforeId);
        const insertAt = idx === -1 ? base.length : idx;
        base.splice(insertAt, 0, cardId);
      }

      await setGroupOrder(targetGroupId, base);
      return await loadWebpages();
    } catch (error) {
      // Rollback on error - restore original state
      try {
        const rollback = list.map((w: any) =>
          w.id === cardId
            ? { ...w, category: originalCategory, subcategoryId: originalGroupId }
            : w
        );
        await saveWebpages(rollback);
      } catch {}
      throw error;
    }
  }

  return {
    addWebpageFromTab,
    updateWebpage,
    deleteWebpage,
    loadWebpages,
    reorderWebpages,
    moveWebpageToEnd,
    moveCardToGroup,
  };
}
