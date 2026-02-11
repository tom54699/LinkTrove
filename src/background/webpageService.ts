import { createStorageService, type StorageService, type WebpageData } from './storageService';
import { getAll, getMeta, setMeta } from './idb/db';
import { areOrdersEqual, normalizeGroupOrder } from '../utils/order-utils';
import { nowMs } from '../utils/time';

export interface TabLike {
  id?: number;
  title?: string;
  url?: string;
  favIconUrl?: string;
}

export interface WebpageService {
  addWebpageFromTab: (
    tab: TabLike,
    options?: {
      category?: string;
      subcategoryId?: string;
      beforeId?: string | '__END__';
    }
  ) => Promise<WebpageData>;
  updateWebpage: (
    id: string,
    updates: Partial<WebpageData>
  ) => Promise<WebpageData>;
  deleteWebpage: (id: string) => Promise<void>;
  deleteManyWebpages: (ids: string[]) => Promise<void>;
  loadWebpages: () => Promise<WebpageData[]>;
  reorderWebpages: (fromId: string, toId: string) => Promise<WebpageData[]>;
  moveWebpageToEnd: (id: string) => Promise<WebpageData[]>;
  moveCardToGroup: (
    cardId: string,
    targetCategoryId: string,
    targetGroupId: string,
    beforeId?: string
  ) => Promise<WebpageData[]>;
  moveManyCards: (
    cardIds: string[],
    targetCategoryId: string,
    targetGroupId: string
  ) => Promise<WebpageData[]>;
}

export function createWebpageService(deps?: {
  storage?: StorageService;
}): WebpageService {
  const storage = deps?.storage ?? createStorageService();
  // 避免短時間重覆新增同一 URL（僅在本實例生命週期內有效）
  const recentlyAdded = new Map<string, number>();

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

  async function resolveFallbackCategoryId(): Promise<string | undefined> {
    let persisted: string | undefined;
    try {
      persisted = (await getMeta<string>('settings.selectedCategoryId')) || undefined;
    } catch {}
    if (!persisted) {
      try {
        const got: any = await new Promise((resolve) => {
          try { chrome.storage?.local?.get?.({ selectedCategoryId: '' }, resolve); } catch { resolve({}); }
        });
        if (got && typeof got.selectedCategoryId === 'string') persisted = got.selectedCategoryId;
      } catch {}
    }
    if (!persisted) {
      try {
        const cats = (await getAll('categories').catch(() => [])) as any[];
        const active = (cats || []).filter((c: any) => !c.deleted);
        active.sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));
        persisted = active[0]?.id;
      } catch {}
    }
    return persisted;
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
    try {
      const noneKey = '__none__';
      const groups = new Map<string, WebpageData[]>();
      const groupOrder: string[] = [];
      for (const w of list as any[]) {
        const gid = (w as any).subcategoryId || noneKey;
        if (!groups.has(gid)) {
          groups.set(gid, []);
          groupOrder.push(gid);
        }
        groups.get(gid)!.push(w);
      }

      const orderedGroupIds = groupOrder.filter((gid) => gid !== noneKey);
      const baseOrders = await Promise.all(orderedGroupIds.map((g) => getGroupOrder(g)));
      const ordersMap = new Map<string, string[]>();
      for (let i = 0; i < orderedGroupIds.length; i++) {
        const gid = orderedGroupIds[i];
        const items = groups.get(gid) || [];
        const baseOrder = Array.isArray(baseOrders[i]) ? baseOrders[i] : [];
        const normalized = normalizeGroupOrder(items, baseOrder);
        ordersMap.set(gid, normalized);
        if (!areOrdersEqual(baseOrder, normalized)) {
          await setGroupOrder(gid, normalized);
        }
      }

      const merged: WebpageData[] = [];
      for (const gid of groupOrder) {
        const items = groups.get(gid) || [];
        if (gid === noneKey) {
          merged.push(...items);
          continue;
        }
        const order = ordersMap.get(gid) || [];
        const byId = new Map(items.map((it) => [it.id, it]));
        for (const id of order) {
          const it = byId.get(id);
          if (it) {
            merged.push(it);
          }
        }
      }

      return merged;
    } catch {
      return list;
    }
  }

  async function saveWebpages(all: WebpageData[]) {
    try { await storage.saveToLocal(all); } catch {}
    // 鏡射到 chrome.storage.local（可選），方便某些輔助功能或除錯
    try { chrome.storage?.local?.set?.({ webpages: all }); } catch {}
  }

  async function addWebpageFromTab(
    tab: TabLike,
    options?: {
      category?: string;
      subcategoryId?: string;
      beforeId?: string | '__END__';
    }
  ): Promise<WebpageData> {
    const url = normalizeUrl(tab.url);
    const title = cleanTitle(tab.title, url);
    const favicon = tab.favIconUrl ?? '';
    const now = nowMs();

    // 短時窗去重（1 秒內同 URL 忽略第二次新增）
    try {
      const nowMs = Date.now();
      const last = recentlyAdded.get(url) || 0;
      if (nowMs - last < 1000) {
        // 若在短時間內，再嘗試載入現有清單，直接回傳第一個同 URL 的項目
        const cur = await loadWebpages();
        const exist = cur.find((w) => w.url === url);
        if (exist) return exist;
      }
      recentlyAdded.set(url, nowMs);
    } catch {}

    const list = await loadWebpages();
    const fallbackCategoryId = options?.category || (await resolveFallbackCategoryId());
    const item: WebpageData = {
      id: genId(url),
      title,
      url,
      favicon,
      note: '',
      category: fallbackCategoryId || '',
      subcategoryId: options?.subcategoryId,
      createdAt: now,
      updatedAt: now,
    };
    const next = [item, ...list];
    await saveWebpages(next);

    // 如果有指定 subcategoryId，處理 group 內排序
    if (options?.subcategoryId) {
      const targetGroupId = options.subcategoryId;
      const beforeId = options.beforeId;
      const currentIds = next
        .filter((w: any) => w.subcategoryId === targetGroupId)
        .map((w: any) => w.id)
        .filter((id: string) => id !== item.id);
      const existing = await getGroupOrder(targetGroupId);
      const seen = new Set<string>();
      const base: string[] = [];
      for (const id of existing)
        if (currentIds.includes(id) && !seen.has(id)) {
          seen.add(id);
          base.push(id);
        }
      for (const id of currentIds)
        if (!seen.has(id)) {
          seen.add(id);
          base.push(id);
        }
      // 插入新卡片
      if (!beforeId || beforeId === '__END__') base.push(item.id);
      else {
        const idx = base.indexOf(beforeId);
        const insertAt = idx === -1 ? base.length : idx;
        base.splice(insertAt, 0, item.id);
      }
      await setGroupOrder(targetGroupId, base);
    }

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
      updatedAt: nowMs(),
    };
    const next = [...list];
    next[idx] = merged;
    await saveWebpages(next);
    return merged;
  }

  async function deleteWebpage(id: string) {
    const list = await storage.loadFromLocal();
    const victim = list.find((w) => w.id === id);
    if (!victim) return;

    // Soft delete: mark as deleted instead of removing
    const now = nowMs();
    const updated = {
      ...victim,
      deleted: true,
      deletedAt: now,
      updatedAt: now,
    };

    const next = list.map((w) => (w.id === id ? updated : w));
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

  /**
   * Batch delete multiple webpages (optimized version)
   * Reduces N load/save operations to 1 load/save operation
   */
  async function deleteManyWebpages(ids: string[]) {
    if (ids.length === 0) return;

    const list = await storage.loadFromLocal();
    const now = nowMs();

    // Mark all specified cards as deleted
    const next = list.map((w) =>
      ids.includes(w.id)
        ? { ...w, deleted: true, deletedAt: now, updatedAt: now }
        : w
    );

    await saveWebpages(next);

    // Remove from group orders (batch by group)
    try {
      const groupsToUpdate = new Map<string, string[]>();

      // Group deleted cards by their subcategoryId
      for (const id of ids) {
        const card = list.find((w) => w.id === id) as any;
        const gid = card?.subcategoryId as string | undefined;
        if (gid) {
          if (!groupsToUpdate.has(gid)) {
            groupsToUpdate.set(gid, []);
          }
          groupsToUpdate.get(gid)!.push(id);
        }
      }

      // Update each group's order once
      for (const [gid, deletedIds] of groupsToUpdate) {
        const order = await getGroupOrder(gid);
        const pruned = order.filter((x) => !deletedIds.includes(x));
        if (pruned.length !== order.length) {
          await setGroupOrder(gid, pruned);
        }
      }
    } catch (err) {
      console.error('Failed to update group orders after batch delete:', err);
    }
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

  /**
   * Batch move multiple cards to a target group (optimized version)
   * Reduces N load/save/order operations to 1 load/save + minimal order operations
   *
   * BEHAVIOR: Moved cards are ALWAYS appended to the END of the target group.
   * This is the intended behavior for batch move operations (e.g., "Move to Collection X").
   * If you need to preserve insertion position or insert at a specific index,
   * use the single-card moveCardToGroup() instead.
   */
  async function moveManyCards(
    cardIds: string[],
    targetCategoryId: string,
    targetGroupId: string
  ) {
    if (cardIds.length === 0) return await loadWebpages();

    const list = await storage.loadFromLocal();

    // Collect original group IDs for each card
    const originalGroups = new Map<string, string>();
    for (const cardId of cardIds) {
      const card = list.find((w) => w.id === cardId) as any;
      if (card?.subcategoryId) {
        originalGroups.set(cardId, card.subcategoryId);
      }
    }

    try {
      // Step 1: Batch update all cards' category and subcategoryId
      const updated = list.map((w: any) =>
        cardIds.includes(w.id)
          ? { ...w, category: targetCategoryId, subcategoryId: targetGroupId }
          : w
      );
      await saveWebpages(updated);

      // Step 2: Remove from source group orders (batch by group)
      const sourceGroupsToUpdate = new Set<string>();
      for (const [cardId, originalGroupId] of originalGroups) {
        if (originalGroupId && originalGroupId !== targetGroupId) {
          sourceGroupsToUpdate.add(originalGroupId);
        }
      }

      for (const groupId of sourceGroupsToUpdate) {
        const order = await getGroupOrder(groupId);
        const movedCardsInThisGroup = Array.from(originalGroups.entries())
          .filter(([_, gid]) => gid === groupId)
          .map(([cardId, _]) => cardId);
        const pruned = order.filter((x) => !movedCardsInThisGroup.includes(x));
        if (pruned.length !== order.length) {
          await setGroupOrder(groupId, pruned);
        }
      }

      // Step 3: Add to target group order (append at end to preserve input order)
      const targetOrder = await getGroupOrder(targetGroupId);
      const currentIdsInTarget = updated
        .filter((w: any) => w.subcategoryId === targetGroupId && !cardIds.includes(w.id))
        .map((w: any) => w.id);

      // Build new order: existing cards + moved cards (in input order)
      const seen = new Set<string>();
      const base: string[] = [];

      // Add existing cards in target group (excluding moved cards)
      for (const id of targetOrder) {
        if (currentIdsInTarget.includes(id) && !seen.has(id)) {
          seen.add(id);
          base.push(id);
        }
      }
      for (const id of currentIdsInTarget) {
        if (!seen.has(id)) {
          seen.add(id);
          base.push(id);
        }
      }

      // Append moved cards in input order
      for (const cardId of cardIds) {
        base.push(cardId);
      }

      await setGroupOrder(targetGroupId, base);
      return await loadWebpages();
    } catch (error) {
      console.error('Failed to batch move cards:', error);
      // On error, reload to show actual state
      return await loadWebpages();
    }
  }

  return {
    addWebpageFromTab,
    updateWebpage,
    deleteWebpage,
    deleteManyWebpages,
    loadWebpages,
    reorderWebpages,
    moveWebpageToEnd,
    moveCardToGroup,
    moveManyCards,
  };
}
