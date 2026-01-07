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
  addTabToGroup?: (
    tab: TabLike,
    targetCategoryId: string,
    targetGroupId: string,
    beforeId?: string | '__END__'
  ) => Promise<WebpageData>;
  updateWebpage: (
    id: string,
    updates: Partial<WebpageData>
  ) => Promise<WebpageData>;
  deleteWebpage: (id: string) => Promise<void>;
  loadWebpages: () => Promise<WebpageData[]>;
  reorderWebpages: (fromId: string, toId: string) => Promise<WebpageData[]>;
  moveWebpageToEnd: (id: string) => Promise<WebpageData[]>;
  moveCardToGroup: (
    cardId: string,
    targetCategoryId: string,
    targetGroupId: string,
    beforeId?: string
  ) => Promise<WebpageData[]>;
}

export function createWebpageService(deps?: {
  storage?: StorageService;
}): WebpageService {
  const storage = deps?.storage ?? createStorageService();
  // 避免短時間重覆新增同一 URL（僅在本實例生命週期內有效）
  const recentlyAdded = new Map<string, number>();

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
    const victim = list.find((w) => w.id === id);
    if (!victim) return;

    // Soft delete: mark as deleted instead of removing
    const now = new Date().toISOString();
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

  async function addTabToGroup(
    tab: TabLike,
    targetCategoryId: string,
    targetGroupId: string,
    beforeId?: string | '__END__'
  ): Promise<WebpageData> {
    const url = normalizeUrl(tab.url);
    const title = cleanTitle(tab.title, url);
    const favicon = tab.favIconUrl ?? '';
    const now = nowIso();

    // 短時窗去重（1 秒內同 URL 忽略第二次新增）
    try {
      const nowMs = Date.now();
      const last = recentlyAdded.get(url) || 0;
      if (nowMs - last < 1000) {
        // 若在短時間內，再嘗試載入現有清單，直接回傳第一個同 URL 的項目
        const cur = await storage.loadFromLocal();
        const exist = cur.find((w) => w.url === url);
        if (exist) return exist;
      }
      recentlyAdded.set(url, nowMs);
    } catch {}

    // 取得目前清單與目標群組既有順序
    const list = await storage.loadFromLocal();

    // 準備 meta（依目標 collection 的 template 欄位推導）
    let meta: Record<string, string> | undefined = undefined;
    try {
      const [cats, tmpls] = await Promise.all([
        storage.loadFromSync(),
        storage.loadTemplates(),
      ]);
      const cat = (cats as any[]).find((c) => c.id === targetCategoryId);
      const tpl = cat?.defaultTemplateId
        ? (tmpls as any[]).find((t) => t.id === cat.defaultTemplateId)
        : null;
      if (tpl) {
        const { computeAutoMeta } = await import('../app/webpages/metaAutoFill');
        meta = computeAutoMeta(undefined, (tpl as any).fields || [], {
          title,
          url,
          favicon,
        } as any);
        // 不把 title/description 放進 meta（與現有行為一致）
        delete (meta as any).title;
        delete (meta as any).description;
        // 嘗試合併已快取的 siteName/author（若欄位存在而且目前為空）
        try {
          const fields = ((tpl as any).fields || []) as any[];
          const hasField = (k: string) => fields.some((f) => f.key === k);
          const want = ['siteName', 'author'] as const;
          if (want.some((k) => hasField(k))) {
            const { getCachedMeta } = await import('./pageMeta');
            const cached = await getCachedMeta(url);
            if (cached) {
              meta = { ...(meta || {}) };
              for (const k of want) {
                const cur = (meta as any)[k] as string | undefined;
                const val = (cached as any)[k] as string | undefined;
                if (hasField(k) && (!cur || !cur.trim()) && val) (meta as any)[k] = val;
              }
            }
          }
        } catch {}
      }
    } catch {}

    const item: WebpageData = {
      id: genId(url),
      title,
      url,
      favicon,
      note: '',
      category: targetCategoryId,
      subcategoryId: targetGroupId as any,
      meta,
      createdAt: now,
      updatedAt: now,
    } as any;

    // 寫入清單
    const next = [item, ...list];
    await saveWebpages(next);

    // 更新目標群組排序
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
    // 非阻塞 enrich：若有 tab.id，嘗試補齊 note 與常見欄位（僅在空值時）
    try {
      const tid = (tab as any)?.id;
      if (typeof tid === 'number') {
        void (async () => {
          try {
            const { waitForTabComplete, extractMetaForTab, queuePendingExtraction } = await import('./pageMeta');
            try { await waitForTabComplete(tid); } catch {}
            const live = await extractMetaForTab(tid);

            // If extraction failed (likely due to sleeping page), queue for later
            if (!live) {
              queuePendingExtraction(tid, item.url, item.id);
            }
            // 1) note（description）補齊（僅在目前為空時）
            try {
              const fresh = await storage.loadFromLocal();
              const cur = fresh.find((w) => w.id === item.id);
              if (cur && (!cur.note || !String(cur.note).trim())) {
                const desc = (live?.description || '').trim();
                if (desc) {
                  await updateWebpage(item.id, { note: desc } as any);
                }
              }
            } catch {}

            // 2) siteName/author 補齊（需模板含對應欄位，且當前為空）
            try {
              const [cats2, tmpls2] = await Promise.all([
                storage.loadFromSync(),
                storage.loadTemplates(),
              ]);
              const cat2 = (cats2 as any[]).find((c) => c.id === targetCategoryId);
              const tpl2 = cat2?.defaultTemplateId
                ? (tmpls2 as any[]).find((t) => t.id === cat2.defaultTemplateId)
                : null;
              const fields = (tpl2?.fields || []) as any[];
              const hasField = (k: string) => fields.some((f) => f.key === k);
              if (fields.length) {
                const fresh = await storage.loadFromLocal();
                const cur = fresh.find((w) => w.id === item.id) as any;
                const curMeta: Record<string, string> = { ...(cur?.meta || {}) };
                let changed = false;
                if (hasField('siteName')) {
                  const curVal = (curMeta.siteName || '').trim();
                  const val = (live?.siteName || '').trim();
                  if (!curVal && val) { curMeta.siteName = val; changed = true; }
                }
                if (hasField('author')) {
                  const curVal = (curMeta.author || '').trim();
                  const val = (live?.author || '').trim();
                  if (!curVal && val) { curMeta.author = val; changed = true; }
                }
                if (changed) {
                  await updateWebpage(item.id, { meta: curMeta } as any);
                }
              }
            } catch {}

            // 3) 書籍固定鍵名補齊（與模板無關；僅填空避免覆蓋）
            try {
              const fresh2 = await storage.loadFromLocal();
              const cur2 = fresh2.find((w) => w.id === item.id) as any;
              const curMeta2: Record<string, string> = { ...(cur2?.meta || {}) };
              let changed2 = false;
              const setIfEmpty = (key: string, val?: any) => {
                const v = (val ?? '').toString().trim();
                if (!v) return;
                if (!((curMeta2 as any)[key] || '').toString().trim()) {
                  (curMeta2 as any)[key] = v;
                  changed2 = true;
                }
              };
              setIfEmpty('bookTitle', (live as any)?.bookTitle);
              setIfEmpty('serialStatus', (live as any)?.serialStatus);
              setIfEmpty('genre', (live as any)?.genre);
              setIfEmpty('wordCount', (live as any)?.wordCount);
              setIfEmpty('latestChapter', (live as any)?.latestChapter);
              setIfEmpty('coverImage', (live as any)?.coverImage);
              setIfEmpty('bookUrl', (live as any)?.bookUrl);
              setIfEmpty('lastUpdate', (live as any)?.lastUpdate);
              if (changed2) {
                await updateWebpage(item.id, { meta: curMeta2 } as any);
              }
            } catch {}
          } catch {}
        })();
      }
    } catch {}

    return item;
  }

  return {
    addWebpageFromTab,
    addTabToGroup,
    updateWebpage,
    deleteWebpage,
    loadWebpages,
    reorderWebpages,
    moveWebpageToEnd,
    moveCardToGroup,
  };
}
