import { putAll, setMeta, getAll } from '../idb/db';
import type { WebpageData } from '../storageService';

function nowIso() {
  return new Date().toISOString();
}

function genId() {
  return 'w_' + Math.random().toString(36).slice(2, 10);
}

export interface HtmlImportResult {
  pagesCreated: number;
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
      favicon: '',
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

