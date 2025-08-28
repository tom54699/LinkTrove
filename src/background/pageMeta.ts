// Lightweight page metadata extraction and caching via MV3 scripting API
// Extracts: title, description, siteName, author

export type PageMeta = Partial<{
  title: string;
  description: string;
  siteName: string;
  author: string;
  url: string;
  collectedAt: string;
  _sources: Partial<{ title: string; description: string; siteName: string; author: string }>;
}>; 

const CACHE_KEY = 'pageMetaCache';
const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function hasChrome() {
  return typeof (globalThis as any).chrome !== 'undefined' && !!(chrome as any).storage?.local;
}

function normalizeUrlKey(raw: string): string {
  try {
    const u = new URL(raw);
    const host = (u.hostname || '').toLowerCase().replace(/^www\./, '');
    let path = u.pathname || '/';
    if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);
    return `${u.protocol}//${host}${path}`;
  } catch {
    return raw;
  }
}

function altSlashVariant(key: string): string {
  try {
    const u = new URL(key);
    let path = u.pathname || '/';
    if (path.endsWith('/')) path = path.slice(0, -1);
    else path = path + '/';
    return `${u.protocol}//${u.hostname}${path}`;
  } catch {
    return key;
  }
}

export async function getCachedMeta(url: string): Promise<PageMeta | undefined> {
  if (!hasChrome()) return undefined;
  return new Promise((resolve) => {
    chrome.storage.local.get({ [CACHE_KEY]: {} }, (res: any) => {
      const map = res?.[CACHE_KEY] || {};
      const exact = map[url];
      const norm = map[normalizeUrlKey(url)];
      const alt = map[altSlashVariant(normalizeUrlKey(url))];
      const ent = exact || norm || alt;
      if (!ent) return resolve(undefined);
      try {
        const ts = new Date(ent.collectedAt || ent.ts || 0).getTime();
        if (Number.isFinite(ts) && Date.now() - ts < TTL_MS) return resolve(ent as PageMeta);
      } catch {}
      resolve(undefined);
    });
  });
}

export async function saveMetaCache(url: string, meta: PageMeta): Promise<void> {
  if (!hasChrome()) return;
  return new Promise((resolve) => {
    chrome.storage.local.get({ [CACHE_KEY]: {} }, (res: any) => {
      const map = res?.[CACHE_KEY] || {};
      const entry = { ...meta, url: meta.url || url, collectedAt: new Date().toISOString() };
      map[url] = entry;
      map[normalizeUrlKey(url)] = entry;
      map[altSlashVariant(normalizeUrlKey(url))] = entry;
      chrome.storage.local.set({ [CACHE_KEY]: map }, () => resolve());
    });
  });
}

// Execute in the page to extract common meta fields with specific precedence rules
function pageExtractor() {
  function get(name: string, attr: 'property' | 'name' = 'property') {
    return (
      document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null
    )?.content?.trim();
  }
  function first(...vals: Array<string | undefined | null>) {
    for (const v of vals) if (v && v.trim()) return v.trim();
    return undefined;
  }
  function textOf(sel: string): string | undefined {
    const el = document.querySelector(sel) as HTMLElement | null;
    const txt = el?.textContent?.trim();
    return txt || undefined;
  }
  function readJsonLdAuthor(): string | undefined {
    const scripts = Array.from(
      document.querySelectorAll('script[type="application/ld+json"]')
    ) as HTMLScriptElement[];
    for (const s of scripts) {
      try {
        const data = JSON.parse(s.textContent || 'null');
        const arr = Array.isArray(data) ? data : [data];
        for (const node of arr) {
          const a = (node && (node.author || node.creator)) as any;
          if (!a) continue;
          if (typeof a === 'string' && a.trim()) return a.trim();
          if (Array.isArray(a)) {
            for (const x of a) {
              const n = (x && (x.name || x.fullName)) as string | undefined;
              if (n && n.trim()) return n.trim();
            }
          } else if (typeof a === 'object') {
            const n = (a.name || a.fullName) as string | undefined;
            if (n && n.trim()) return n.trim();
          }
        }
      } catch {
        // ignore invalid JSON-LD
      }
    }
    return undefined;
  }
  // Title: og:title → og:novel:book_name → twitter:title → <title>
  let titleSrc = '';
  let title = get('og:title');
  if (title) titleSrc = 'meta[property=og:title]';
  if (!title) { const v = get('og:novel:book_name'); if (v) { title = v; titleSrc = 'meta[property=og:novel:book_name]'; } }
  if (!title) { const v = get('twitter:title'); if (v) { title = v; titleSrc = 'meta[name=twitter:title]'; } }
  if (!title) { if (document.title && document.title.trim()) { title = document.title.trim(); titleSrc = 'title'; } }
  // Description: meta[name="description"] → og:description → twitter:description
  let descSrc = '';
  let description = get('description', 'name'); if (description) descSrc = 'meta[name=description]';
  if (!description) { const v = get('og:description'); if (v) { description = v; descSrc = 'meta[property=og:description]'; } }
  if (!description) { const v = get('twitter:description'); if (v) { description = v; descSrc = 'meta[name=twitter:description]'; } }
  // Site name: og:site_name → derive from title suffix → hostname
  function deriveSiteNameFromTitle(t?: string): string | undefined {
    const s = (t || '').trim();
    if (!s) return undefined;
    const seps = [' - ', ' – ', ' — ', '｜', '|', '·', '•', '»', '：', ':'];
    for (const sep of seps) {
      if (s.includes(sep)) {
        const parts = s.split(sep).map((x) => x.trim()).filter(Boolean);
        if (parts.length >= 2) {
          const cand = parts[parts.length - 1];
          if (cand && cand.length <= 20) return cand;
          // sometimes site name is first
          if (parts[0] && parts[0].length <= 20) return parts[0];
        }
      }
    }
    return undefined;
  }
  let siteSrc = '';
  let siteName = get('og:site_name'); if (siteName) siteSrc = 'meta[property=og:site_name]';
  if (!siteName) { const v = deriveSiteNameFromTitle(title); if (v) { siteName = v; siteSrc = 'title-suffix'; } }
  if (!siteName) { siteName = location.hostname.replace(/^www\./, ''); siteSrc = 'hostname'; }
  // Author: meta[name=author] → meta[property=article:author] → meta[property=books:author] → meta[property=og:novel:author] → link[rel=author] → JSON-LD → microdata
  let authorSrc = '';
  let author = get('author', 'name'); if (author) authorSrc = 'meta[name=author]';
  if (!author) { const v = get('article:author'); if (v) { author = v; authorSrc = 'meta[property=article:author]'; } }
  if (!author) { const v = get('books:author'); if (v) { author = v; authorSrc = 'meta[property=books:author]'; } }
  if (!author) { const v = get('og:novel:author'); if (v) { author = v; authorSrc = 'meta[property=og:novel:author]'; } }
  if (!author) { const v = (document.querySelector('link[rel="author"]') as HTMLLinkElement | null)?.href; if (v) { author = v; authorSrc = 'link[rel=author]'; } }
  if (!author) { const v = readJsonLdAuthor(); if (v) { author = v; authorSrc = 'jsonld'; } }
  if (!author) { const v = textOf('[itemprop="author"]'); if (v) { author = v; authorSrc = 'itemprop[author]'; } }
  const meta = { title, description, siteName, author, url: location.href, _sources: { title: titleSrc, description: descSrc, siteName: siteSrc, author: authorSrc } };
  try { console.log('[LinkTrove] pageExtractor', meta); } catch {}
  return meta as any;
}

export async function extractMetaForTab(tabId: number): Promise<PageMeta | undefined> {
  try {
    if (!hasChrome() || !(chrome as any).scripting?.executeScript) return undefined;
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId },
      func: pageExtractor,
    } as any);
    const meta = (result || {}) as PageMeta;
    try { console.log('[LinkTrove] extractMetaForTab', { tabId, url: meta?.url, meta }); } catch {}
    if (meta && meta.url) await saveMetaCache(meta.url, meta);
    return meta;
  } catch {
    return undefined;
  }
}

export async function waitForTabComplete(tabId: number): Promise<void> {
  return new Promise((resolve) => {
    try {
      chrome.tabs.get(tabId, (t) => {
        if (!t || (t as any).status === 'complete') return resolve();
        const handler = (id: number, changeInfo: any) => {
          if (id === tabId && changeInfo?.status === 'complete') {
            try { chrome.tabs.onUpdated.removeListener(handler as any); } catch {}
            resolve();
          }
        };
        chrome.tabs.onUpdated.addListener(handler as any);
      });
    } catch {
      resolve();
    }
  });
}

export function urlsRoughlyEqual(a: string, b: string): boolean {
  try {
    return normalizeUrlKey(a) === normalizeUrlKey(b) || altSlashVariant(normalizeUrlKey(a)) === normalizeUrlKey(b) || normalizeUrlKey(a) === altSlashVariant(normalizeUrlKey(b));
  } catch {
    return a === b;
  }
}
