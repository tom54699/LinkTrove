import { getAll, putAll, setMeta, tx } from '../idb/db';
import type { CategoryData, WebpageData } from '../storageService';

export interface TobyCard {
  title?: string;
  url?: string;
  customTitle?: string;
  customDescription?: string;
}

export interface TobyList {
  title?: string;
  cards?: TobyCard[];
}

export interface TobyExportV3 {
  version?: number;
  lists?: TobyList[];
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
  if (parsed.version !== 3 || !Array.isArray(parsed.lists)) {
    throw new Error('Unsupported Toby format');
  }
  const lists = parsed.lists.filter((l) => l && Array.isArray(l.cards));
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
        favicon: guessFavicon(url),
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
  opts?: { dedupSkip?: boolean }
): Promise<{ pagesCreated: number }> {
  let parsed: any;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error('Invalid JSON');
  }
  // Accept: { version:3, lists:[{cards:[]}, ...] } or { version:3, cards:[...] }
  let cards: TobyCard[] = [];
  if (Array.isArray(parsed?.lists)) {
    for (const l of parsed.lists) if (Array.isArray(l?.cards)) cards.push(...l.cards);
  } else if (Array.isArray(parsed?.cards)) {
    cards = parsed.cards;
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
  for (const card of cards) {
    const url = normalizeUrl(card.url);
    if (!url) continue;
    if (opts?.dedupSkip && knownUrls.has(url)) continue;
    const id = genId('w');
    webpagesToPut.push({
      id,
      title: normalizeTitle(card),
      url,
      favicon: guessFavicon(url),
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
  if (webpagesToPut.length) await putAll('webpages', webpagesToPut);
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
