import { getAll, putAll, setMeta, tx } from '../idb/db';
import type { CategoryData, WebpageData } from '../storageService';

export interface TobyCard {
  title?: string;
  url?: string;
  customTitle?: string;
  customDescription?: string;
  favIconUrl?: string;
}

export interface TobyList {
  title?: string;
  cards?: TobyCard[];
}

export interface TobyExportV3 {
  version?: number;
  lists?: TobyList[];
  groups?: Array<{ name?: string; lists?: TobyList[] }>; // v4+ shape
}

export interface TobyImportResult {
  categoriesCreated: number;
  groupsCreated: number;
  pagesCreated: number;
}

function nowIso() {
  return new Date().toISOString();
}

function genId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeTitle(card: TobyCard): string {
  const t = (card.customTitle || card.title || '').trim();
  if (t) return t;
  try {
    return new URL(card.url || '').hostname || 'Untitled';
  } catch {
    return 'Untitled';
  }
}

function normalizeUrl(raw?: string): string | null {
  if (!raw) return null;
  try {
    const u = new URL(raw);
    if (!/^https?:$/.test(u.protocol)) return null;
    return u.toString();
  } catch {
    return null;
  }
}

function guessFavicon(u: string): string {
  try {
    const url = new URL(u);
    // Prefer a highly reliable CDN-based favicon service to avoid broken icons
    const host = url.hostname;
    // DuckDuckGo service returns ICO/PNG reliably without CORS issues for <img>
    return `https://icons.duckduckgo.com/ip3/${host}.ico`;
  } catch {
    return '';
  }
}

/**
 * Import Toby v3 JSON. Non-destructive: merges into existing data.
 * - Each Toby list becomes a category (if same name exists, reuse it)
 * - Each list gets one group named after the list
 * - Cards become webpages under that group, preserving order via meta key order.subcat.<gid>
 */
export async function importTobyV3(json: string): Promise<TobyImportResult> {
  let parsed: TobyExportV3;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error('Invalid JSON');
  }
  // Support v3 (lists at root) and v4+ (groups -> lists)
  let lists: TobyList[] = [];
  if (Array.isArray(parsed?.lists)) {
    lists = parsed.lists.filter((l: any) => l && Array.isArray(l.cards));
  } else if (Array.isArray(parsed?.groups)) {
    for (const g of parsed.groups) {
      if (g && Array.isArray((g as any).lists)) {
        for (const l of (g as any).lists) if (l && Array.isArray(l.cards)) lists.push(l);
      }
    }
  } else {
    throw new Error('Unsupported Toby format');
  }
  if (lists.length === 0) return { categoriesCreated: 0, groupsCreated: 0, pagesCreated: 0 };

  const existingCats = (await getAll('categories')) as CategoryData[];
  const byName = new Map<string, CategoryData>(
    existingCats.map((c) => [String(c.name || '').toLowerCase(), c])
  );

  let catsCreated = 0;
  let groupsCreated = 0;
  let pagesCreated = 0;
  const now = Date.now();

  // Buffer writes per store
  const catsToPut: CategoryData[] = [];
  const subcatsToPut: any[] = [];
  const webpagesToPut: WebpageData[] = [];
  const groupOrders: Array<{ gid: string; ids: string[] }> = [];

  // Helper to ensure a category exists (by name, case-insensitive)
  function ensureCategory(name: string): CategoryData {
    const key = String(name || 'Imported').trim() || 'Imported';
    const lower = key.toLowerCase();
    const found = byName.get(lower);
    if (found) return found;
    const id = 'c_' + Math.random().toString(36).slice(2, 9);
    const cat: CategoryData = {
      id,
      name: key,
      color: '#64748b',
      order: existingCats.length + catsToPut.length,
    };
    catsToPut.push(cat);
    byName.set(lower, cat);
    catsCreated++;
    return cat;
  }

  for (const list of lists) {
    const cat = ensureCategory(list.title || 'Imported');
    const gid = 'g_' + Math.random().toString(36).slice(2, 9);
    const group = {
      id: gid,
      categoryId: cat.id,
      name: list.title || 'group',
      order: 0, // appended visually by UI via list order
      createdAt: now,
      updatedAt: now,
    };
    subcatsToPut.push(group);
    groupsCreated++;

    const idsInOrder: string[] = [];
    for (const card of list.cards || []) {
      const url = normalizeUrl(card.url);
      if (!url) continue; // skip invalid
      const id = genId('w');
      const wp: WebpageData = {
        id,
        title: normalizeTitle(card),
        url,
        favicon: (card.favIconUrl || '').trim() || guessFavicon(url),
        note: (card.customDescription || '').trim(),
        category: cat.id,
        subcategoryId: gid,
        meta: undefined,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };
      webpagesToPut.push(wp);
      idsInOrder.push(id);
      pagesCreated++;
    }
    groupOrders.push({ gid, ids: idsInOrder });
  }

  // Write in a single transaction per store to minimize overhead
  if (catsToPut.length) await putAll('categories', catsToPut);
  if (subcatsToPut.length)
    await tx('subcategories' as any, 'readwrite', async (t) => {
      const s = t.objectStore('subcategories' as any);
      for (const it of subcatsToPut) s.put(it);
    });
  if (webpagesToPut.length) await putAll('webpages', webpagesToPut);

  // Set per-group orders
  for (const { gid, ids } of groupOrders) {
    try {
      await setMeta(`order.subcat.${gid}`, ids);
    } catch {}
  }

  return { categoriesCreated: catsCreated, groupsCreated, pagesCreated };
}

/** Import a Toby v3 JSON (single list/group) into an existing group within a category. */
export async function importTobyV3IntoGroup(
  groupId: string,
  categoryId: string,
  json: string,
  opts?: {
    dedupSkip?: boolean;
    batchSize?: number;
    signal?: AbortSignal;
    onProgress?: (p: { total: number; processed: number }) => void;
  }
): Promise<{ pagesCreated: number }> {
  let parsed: any;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error('Invalid JSON');
  }
  // Accept: v3 { lists:[{cards:[]}, ...] } | v3 { cards:[] } | v4+ { groups:[{lists:[{cards:[]}]}] }
  let cards: TobyCard[] = [];
  if (Array.isArray(parsed?.lists)) {
    for (const l of parsed.lists) if (Array.isArray(l?.cards)) cards.push(...l.cards);
  } else if (Array.isArray(parsed?.cards)) {
    cards = parsed.cards;
  } else if (Array.isArray(parsed?.groups)) {
    for (const g of parsed.groups) {
      const ls = (g as any)?.lists;
      if (Array.isArray(ls)) for (const l of ls) if (Array.isArray(l?.cards)) cards.push(...l.cards);
    }
  } else {
    throw new Error('Unsupported Toby format');
  }
  // Validate group exists and matches category
  const subcats = await getAll('subcategories' as any).catch(() => []) as any[];
  const target = subcats.find((s) => s.id === groupId);
  if (!target || target.categoryId !== categoryId) throw new Error('Invalid target group');
  // For dedup within this category (skip existing URLs)
  const allPages = (await getAll('webpages').catch(() => [])) as any[];
  const knownUrls = new Set<string>(
    (allPages || []).filter((p) => p.category === categoryId).map((p) => String(p.url || ''))
  );
  const webpagesToPut: WebpageData[] = [];
  const newIds: string[] = [];
  const total = cards.length;
  let processed = 0;
  for (const card of cards) {
    const url = normalizeUrl(card.url);
    if (!url) continue;
    if (opts?.dedupSkip && knownUrls.has(url)) continue;
    const id = genId('w');
    webpagesToPut.push({
      id,
      title: normalizeTitle(card),
      url,
      favicon: (card.favIconUrl || '').trim() || guessFavicon(url),
      note: (card.customDescription || '').trim(),
      category: categoryId,
      subcategoryId: groupId,
      meta: undefined,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    });
    newIds.push(id);
    knownUrls.add(url);
  }
  if (webpagesToPut.length) {
    const bs = Math.max(1, opts?.batchSize ?? 300);
    for (let i = 0; i < webpagesToPut.length; i += bs) {
      if (opts?.signal?.aborted) throw new Error('Aborted');
      const chunk = webpagesToPut.slice(i, i + bs);
      await putAll('webpages', chunk as any);
      processed += chunk.length;
      opts?.onProgress?.({ total, processed });
    }
  }
  // Append to group order
  try {
    const key = `order.subcat.${groupId}`;
    let base: string[] = [];
    try {
      const v = await (await import('../idb/db')).getMeta<string[]>(key);
      base = Array.isArray(v) ? v : [];
    } catch {}
    await setMeta(key, [...base, ...newIds]);
  } catch {}
  return { pagesCreated: webpagesToPut.length };
}

export async function importTobyAsNewCategory(
  json: string,
  opts?: {
    name?: string;
    color?: string;
    mode?: 'multi' | 'flat';
    flatGroupName?: string;
    batchSize?: number;
    signal?: AbortSignal;
    onProgress?: (p: { total: number; processed: number; group?: string }) => void;
  }
): Promise<{ categoryId: string; categoryName: string; pagesCreated: number; groupsCreated: number }> {
  let parsed: any;
  try { parsed = JSON.parse(json); } catch { throw new Error('Invalid JSON'); }
  // Collect lists (v3: lists at root; v4+: groups[].lists)
  const lists: TobyList[] = [] as TobyList[];
  if (Array.isArray(parsed?.lists)) {
    for (const l of parsed.lists) if (l && Array.isArray(l.cards)) lists.push(l);
  }
  if (Array.isArray(parsed?.groups)) {
    for (const g of parsed.groups) {
      const ls = (g as any)?.lists;
      if (Array.isArray(ls)) for (const l of ls) if (l && Array.isArray(l.cards)) lists.push(l);
    }
  }
  if (lists.length === 0) return { categoryId: '', categoryName: opts?.name || 'Imported', pagesCreated: 0, groupsCreated: 0 };
  // Determine category name
  const base = (opts?.name || (Array.isArray(parsed?.groups) && parsed.groups[0]?.name) || 'Imported').trim() || 'Imported';
  const color = opts?.color || '#64748b';
  const cats = await getAll('categories');
  const lower = new Set((cats as any[]).map((c: any) => String(c.name || '').toLowerCase()));
  let name = base; let i = 2;
  while (lower.has(name.toLowerCase())) name = `${base} ${i++}`;
  const catId = 'c_' + Math.random().toString(36).slice(2, 9);
  const order = (cats as any[]).length;
  await tx('categories', 'readwrite', async (t) => {
    t.objectStore('categories').put({ id: catId, name, color, order });
  });
  // Build pages
  let pagesCreated = 0;
  let groupsCreated = 0;
  const bs = Math.max(1, opts?.batchSize ?? 300);
  const total = lists.reduce((sum, l) => sum + ((l.cards || []).length), 0);
  let processed = 0;
  if (opts?.mode === 'flat') {
    const flatName = (opts.flatGroupName || 'Imported').trim() || 'Imported';
    const now = Date.now();
    const gid = 'g_' + Math.random().toString(36).slice(2, 9);
    await tx('subcategories' as any, 'readwrite', async (t) => {
      t.objectStore('subcategories' as any).put({ id: gid, categoryId: catId, name: flatName, order: 0, createdAt: now, updatedAt: now });
    });
    groupsCreated = 1;
    const pages: WebpageData[] = [];
    const idsInOrder: string[] = [];
    for (const l of lists) {
      for (const card of (l.cards || [])) {
        const url = normalizeUrl(card.url || '');
        if (!url) continue;
        const id = genId(url);
        pages.push({ id, title: normalizeTitle(card), url, favicon: (card.favIconUrl || '').trim() || '', note: (card.customDescription || '').trim(), category: catId, subcategoryId: gid, meta: undefined, createdAt: nowIso(), updatedAt: nowIso() });
        idsInOrder.push(id);
      }
    }
    for (let i2 = 0; i2 < pages.length; i2 += bs) {
      if (opts?.signal?.aborted) throw new Error('Aborted');
      const chunk = pages.slice(i2, i2 + bs);
      await putAll('webpages', chunk as any);
      pagesCreated += chunk.length;
      processed += chunk.length;
      opts?.onProgress?.({ total, processed, group: flatName });
    }
    try { await setMeta(`order.subcat.${gid}`, idsInOrder); } catch {}
  } else {
    // Multi-group: each list becomes a group by its title
    const existingGroups = await getAll('subcategories' as any).catch(() => []) as any[];
    const lowerToGroup = new Map<string, any>(existingGroups.filter((g: any) => g.categoryId === catId).map((g: any) => [String(g.name || '').toLowerCase(), g]));
    const ensureGroup = async (groupName: string) => {
      const key = String(groupName || 'Imported').toLowerCase();
      if (lowerToGroup.has(key)) return lowerToGroup.get(key);
      const now = Date.now();
      const sc = { id: 'g_' + Math.random().toString(36).slice(2, 9), categoryId: catId, name: groupName || 'Imported', order: lowerToGroup.size, createdAt: now, updatedAt: now };
      await tx('subcategories' as any, 'readwrite', async (t) => { t.objectStore('subcategories' as any).put(sc); });
      lowerToGroup.set(key, sc);
      groupsCreated++;
      return sc;
    };
    for (const l of lists) {
      const g = await ensureGroup(l.title || 'group');
      const idsInOrder: string[] = [];
      const pages: WebpageData[] = [];
      for (const card of (l.cards || [])) {
        const url = normalizeUrl(card.url || ''); if (!url) continue;
        const id = genId(url);
        pages.push({ id, title: normalizeTitle(card), url, favicon: (card.favIconUrl || '').trim() || '', note: (card.customDescription || '').trim(), category: catId, subcategoryId: g.id, meta: undefined, createdAt: nowIso(), updatedAt: nowIso() });
        idsInOrder.push(id);
      }
      for (let i2 = 0; i2 < pages.length; i2 += bs) {
        if (opts?.signal?.aborted) throw new Error('Aborted');
        const chunk = pages.slice(i2, i2 + bs);
        await putAll('webpages', chunk as any);
        pagesCreated += chunk.length;
        processed += chunk.length;
        opts?.onProgress?.({ total, processed, group: g.name });
      }
      try {
        const key = `order.subcat.${g.id}`;
        let base: string[] = [];
        try { const meta = await (await import('../idb/db')).getMeta<string[]>(key); base = Array.isArray(meta) ? meta : []; } catch {}
        await setMeta(key, [...base, ...idsInOrder]);
      } catch {}
    }
  }
  return { categoryId: catId, categoryName: name, pagesCreated, groupsCreated };
}
