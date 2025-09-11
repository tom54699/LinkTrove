import { putAll, setMeta, getAll, tx } from '../idb/db';
import type { WebpageData } from '../storageService';

function nowIso() {
  return new Date().toISOString();
}

function genId() {
  return 'w_' + Math.random().toString(36).slice(2, 10);
}

export interface HtmlImportResult {
  pagesCreated: number;
  groupsCreated?: number;
}

// Very tolerant Netscape Bookmarks parser: collects anchors in document order.
// For each <A href>..</A>, try to read a following <DD> description.
export function parseNetscapeAnchors(html: string): Array<{ url: string; title: string; desc?: string }> {
  const out: Array<{ url: string; title: string; desc?: string }> = [];
  const src = html || '';
  const re = /<a\s+[^>]*href\s*=\s*"([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    const href = (m[1] || '').trim();
    const inner = (m[2] || '').replace(/<[^>]+>/g, '').trim();
    // find optional following <DD> text until next <DT> or </DL>
    let desc: string | undefined;
    const after = src.slice(m.index + m[0].length);
    const ddMatch = /<dd>([\s\S]*?)(?=<dt|<\/dl|<a\s)/i.exec(after);
    if (ddMatch) {
      desc = (ddMatch[1] || '').replace(/<[^>]+>/g, '').trim();
      if (!desc) desc = undefined;
    }
    out.push({ url: href, title: inner, desc });
  }
  return out;
}

export function parseNetscapeGroups(html: string): Map<string, Array<{ url: string; title: string; desc?: string }>> {
  const groups = new Map<string, Array<{ url: string; title: string; desc?: string }>>();
  try {
    const doc = new DOMParser().parseFromString(html || '', 'text/html');
    const firstDl = (doc.querySelector('dl') || doc.body) as HTMLElement;
    function norm(t?: string) { return (t || '').trim(); }
    function push(groupName: string, url: string, title: string, desc?: string) {
      if (!groups.has(groupName)) groups.set(groupName, []);
      (groups.get(groupName) as any[]).push({ url, title, desc });
    }
    function walkDL(dl: Element, currentGroup?: string) {
      const children = Array.from(dl.children);
      for (let i = 0; i < children.length; i++) {
        const el = children[i] as HTMLElement;
        if (el.tagName.toLowerCase() === 'dt') {
          const h3 = el.querySelector('h3');
          const a = el.querySelector('a[href]');
          if (h3) {
            const name = norm(h3.textContent) || 'Imported';
            // next sibling DL is this folder's content
            let sib = el.nextElementSibling as HTMLElement | null;
            if (sib && sib.tagName.toLowerCase() === 'dl') {
              walkDL(sib, name);
              // skip its inner handled by recursion
            }
          } else if (a) {
            const href = norm(a.getAttribute('href') || '');
            const title = norm((a.textContent || '').replace(/<[^>]+>/g, ''));
            let desc: string | undefined;
            const maybeDD = el.nextElementSibling as HTMLElement | null;
            if (maybeDD && maybeDD.tagName.toLowerCase() === 'dd') {
              const txt = norm(maybeDD.textContent || '');
              if (txt) desc = txt;
            }
            if (href) push(currentGroup || 'Imported', href, title, desc);
          }
        } else if (el.tagName.toLowerCase() === 'dl') {
          walkDL(el, currentGroup);
        }
      }
    }
    walkDL(firstDl, undefined);
    // If nothing captured (some variants nest differently), use anchor-wise fallback
    let total = 0;
    groups.forEach((arr) => (total += (arr?.length || 0)));
    if (total === 0) {
      const all = Array.from(doc.querySelectorAll('a[href]')) as HTMLAnchorElement[];
      const norm = (s?: string) => (s || '').trim();
      const getGroupFor = (a: Element): string => {
        // Prefer nearest preceding H3 under same DL list
        const dt = a.closest('dt');
        let cur: Element | null = dt || a.parentElement;
        while (cur) {
          // scan previous siblings to find H3
          let sib: Element | null = cur.previousElementSibling as Element | null;
          while (sib) {
            const h3 = sib.tagName.toLowerCase() === 'dt' ? (sib.querySelector('h3') as HTMLElement | null) : null;
            if (h3 && norm(h3.textContent)) return norm(h3.textContent) || 'Imported';
            sib = sib.previousElementSibling as Element | null;
          }
          // ascend to parent; stop at BODY/HTML
          cur = cur.parentElement;
          if (!cur || /^(html|body)$/i.test(cur.tagName)) break;
        }
        return 'Imported';
      };
      for (const a of all) {
        const href = norm(a.getAttribute('href') || '');
        if (!href) continue;
        const title = norm((a.textContent || '').replace(/<[^>]+>/g, ''));
        const dd = (a.closest('dt')?.nextElementSibling as HTMLElement | null);
        const descTxt = dd && dd.tagName.toLowerCase() === 'dd' ? norm(dd.textContent || '') : undefined;
        const gname = getGroupFor(a);
        if (!groups.has(gname)) groups.set(gname, []);
        (groups.get(gname) as any[]).push({ url: href, title, desc: descTxt });
      }
    }
  } catch {
    // Fallback: flat anchors
    const arr = parseNetscapeAnchors(html);
    groups.set('Imported', arr);
  }
  return groups;
}

function cleanTitle(t: string, fallbackUrl: string): string {
  const s = (t || '').trim();
  if (s) return s;
  try {
    const u = new URL(fallbackUrl);
    return u.hostname;
  } catch {
    return 'Untitled';
  }
}

function guessFavicon(u: string): string {
  try {
    const url = new URL(u);
    const host = url.hostname;
    return `https://icons.duckduckgo.com/ip3/${host}.ico`;
  } catch {
    return '';
  }
}

export async function importNetscapeHtmlIntoGroup(
  groupId: string,
  categoryId: string,
  html: string
): Promise<HtmlImportResult> {
  const anchors = parseNetscapeAnchors(html);
  if (!anchors.length) return { pagesCreated: 0 };
  const now = nowIso();
  const pages: WebpageData[] = [];
  const idsInOrder: string[] = [];
  for (const a of anchors) {
    let url: string;
    try {
      url = new URL(a.url).toString();
    } catch {
      continue;
    }
    const id = genId();
    pages.push({
      id,
      title: cleanTitle(a.title, url),
      url,
      favicon: guessFavicon(url),
      note: a.desc || '',
      category: categoryId,
      subcategoryId: groupId,
      meta: undefined,
      createdAt: now,
      updatedAt: now,
    });
    idsInOrder.push(id);
  }
  if (pages.length) await putAll('webpages', pages as any);
  // Append order at end of group
  try {
    const key = `order.subcat.${groupId}`;
    let base: string[] = [];
    try {
      const meta = await (await import('../idb/db')).getMeta<string[]>(key);
      base = Array.isArray(meta) ? meta : [];
    } catch {}
    await setMeta(key, [...base, ...idsInOrder]);
  } catch {}
  return { pagesCreated: pages.length };
}

export async function importNetscapeHtmlIntoCategory(
  categoryId: string,
  html: string,
  opts?: {
    dedupSkip?: boolean;
    batchSize?: number;
    signal?: AbortSignal;
    onProgress?: (p: { total: number; processed: number; group?: string }) => void;
  }
): Promise<{ pagesCreated: number; groupsCreated: number }> {
  const groups = parseNetscapeGroups(html);
  // compute total items
  let total = 0;
  groups.forEach((arr) => (total += (arr?.length || 0)));
  const onProg = opts?.onProgress;
  let processed = 0;
  // Load existing groups in this category
  const existing = (await getAll('subcategories' as any).catch(() => [])) as any[];
  const byCat = existing.filter((x) => x.categoryId === categoryId);
  const lowerToGroup = new Map<string, any>(byCat.map((g) => [String(g.name || '').toLowerCase(), g]));
  // For dedup within this category
  const allPages = (await getAll('webpages').catch(() => [])) as any[];
  const knownUrls = new Set<string>(
    (allPages || []).filter((p) => p.category === categoryId).map((p) => String(p.url || ''))
  );
  const toCreate: any[] = [];
  const ensureGroup = (name: string) => {
    const key = String(name || 'Imported').toLowerCase();
    const got = lowerToGroup.get(key);
    if (got) return got;
    const now = Date.now();
    const sc = {
      id: 'g_' + Math.random().toString(36).slice(2, 9),
      categoryId,
      name,
      order: byCat.length + toCreate.length,
      createdAt: now,
      updatedAt: now,
    };
    lowerToGroup.set(key, sc);
    toCreate.push(sc);
    return sc;
  };
  if (toCreate.length) { /* no-op before we iterate */ }

  let pagesCreated = 0;
  for (const [name, items] of groups.entries()) {
    if (!items || items.length === 0) continue;
    const g = ensureGroup(name);
    // Write group if new
    if (toCreate.length) {
      await tx(['subcategories' as any], 'readwrite', async (t) => {
        const s = t.objectStore('subcategories' as any);
        for (const sc of toCreate) s.put(sc);
      });
      toCreate.length = 0; // ensure only once
    }
    const now = nowIso();
    const pages: WebpageData[] = [];
    const idsInOrder: string[] = [];
    for (const a of items) {
      let url: string;
      try {
        url = new URL(a.url).toString();
      } catch { continue; }
      if (opts?.dedupSkip && knownUrls.has(url)) continue;
      const id = genId();
      pages.push({
        id,
        title: cleanTitle(a.title, url),
        url,
        favicon: guessFavicon(url),
        note: a.desc || '',
        category: categoryId,
        subcategoryId: g.id,
        meta: undefined,
        createdAt: now,
        updatedAt: now,
      });
      knownUrls.add(url);
      idsInOrder.push(id);
    }
    if (pages.length) {
      // batched writes
      const bs = Math.max(1, opts?.batchSize ?? 300);
      for (let i = 0; i < pages.length; i += bs) {
        if (opts?.signal?.aborted) throw new Error('Aborted');
        const chunk = pages.slice(i, i + bs);
        await putAll('webpages', chunk as any);
        processed += chunk.length;
        pagesCreated += chunk.length;
        onProg?.({ total, processed, group: g.name });
      }
      // Append order
      try {
        const key = `order.subcat.${g.id}`;
        let base: string[] = [];
        try {
          const meta = await (await import('../idb/db')).getMeta<string[]>(key);
          base = Array.isArray(meta) ? meta : [];
        } catch {}
        await setMeta(key, [...base, ...idsInOrder]);
      } catch {}
    }
  }
  return { pagesCreated, groupsCreated: lowerToGroup.size - byCat.length };
}

export async function importNetscapeHtmlAsNewCategory(
  html: string,
  opts?: {
    name?: string;
    color?: string;
    dedupSkip?: boolean;
    mode?: 'multi' | 'flat';
    flatGroupName?: string;
    batchSize?: number;
    signal?: AbortSignal;
    onProgress?: (p: { total: number; processed: number; group?: string }) => void;
  }
): Promise<{ categoryId: string; categoryName: string; pagesCreated: number; groupsCreated: number }> {
  // Determine base name
  const groups = parseNetscapeGroups(html);
  let total = 0; groups.forEach((arr) => (total += (arr?.length || 0)));
  const onProg = opts?.onProgress;
  let processed = 0;
  const firstGroup = Array.from(groups.keys())[0] || 'Imported';
  const base = (opts?.name || firstGroup || 'Imported').trim() || 'Imported';
  const color = opts?.color || '#64748b';
  // Create unique category name
  const cats = await getAll('categories');
  const lower = new Set((cats as any[]).map((c: any) => String(c.name || '').toLowerCase()));
  let name = base;
  let i = 2;
  while (lower.has(name.toLowerCase())) name = `${base} ${i++}`;
  const id = 'c_' + Math.random().toString(36).slice(2, 9);
  const order = (cats as any[]).length;
  await tx('categories', 'readwrite', async (t) => {
    t.objectStore('categories').put({ id, name, color, order });
  });
  if (opts?.mode === 'flat') {
    // Create single group and flatten all anchors
    const flatName = (opts.flatGroupName || 'Imported').trim() || 'Imported';
    const now = Date.now();
    const g = { id: 'g_' + Math.random().toString(36).slice(2, 9), categoryId: id, name: flatName, order: 0, createdAt: now, updatedAt: now };
    await tx(['subcategories' as any], 'readwrite', async (t) => {
      t.objectStore('subcategories' as any).put(g);
    });
    // Build a flat sequence
    const seq: Array<{ url: string; title: string; desc?: string }> = [];
    for (const arr of groups.values()) for (const it of arr) seq.push(it);
    // Dedup within this new category if needed
    const known = new Set<string>();
    const ids: string[] = [];
    const pages: WebpageData[] = [];
    for (const a of seq) {
      let url: string;
      try { url = new URL(a.url).toString(); } catch { continue; }
      if (opts?.dedupSkip && known.has(url)) continue;
      const idw = genId();
      pages.push({ id: idw, title: cleanTitle(a.title, url), url, favicon: guessFavicon(url), note: a.desc || '', category: id, subcategoryId: g.id, meta: undefined, createdAt: nowIso(), updatedAt: nowIso() });
      ids.push(idw);
      known.add(url);
    }
    if (pages.length) {
      const bs = Math.max(1, opts?.batchSize ?? 300);
      for (let i = 0; i < pages.length; i += bs) {
        if (opts?.signal?.aborted) throw new Error('Aborted');
        const chunk = pages.slice(i, i + bs);
        await putAll('webpages', chunk as any);
        processed += chunk.length;
        onProg?.({ total, processed, group: g.name });
      }
    }
    try { await setMeta(`order.subcat.${g.id}`, ids); } catch {}
    return { categoryId: id, categoryName: name, pagesCreated: pages.length, groupsCreated: 1 };
  } else {
    const res = await importNetscapeHtmlIntoCategory(id, html, { dedupSkip: opts?.dedupSkip, batchSize: opts?.batchSize, signal: opts?.signal, onProgress: opts?.onProgress });
    return { categoryId: id, categoryName: name, pagesCreated: res.pagesCreated, groupsCreated: res.groupsCreated };
  }
}
