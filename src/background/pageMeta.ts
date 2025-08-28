// Lightweight page metadata extraction and caching via MV3 scripting API
// Extracts: title, description, siteName, author

export type PageMeta = Partial<{
  title: string;
  description: string;
  siteName: string;
  author: string;
  url: string;
  collectedAt: string;
}>;

const CACHE_KEY = 'pageMetaCache';
const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function hasChrome() {
  return typeof (globalThis as any).chrome !== 'undefined' && !!(chrome as any).storage?.local;
}

export async function getCachedMeta(url: string): Promise<PageMeta | undefined> {
  if (!hasChrome()) return undefined;
  return new Promise((resolve) => {
    chrome.storage.local.get({ [CACHE_KEY]: {} }, (res: any) => {
      const map = res?.[CACHE_KEY] || {};
      const ent = map[url];
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
      map[url] = { ...meta, url, collectedAt: new Date().toISOString() };
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
  // Title: og:title → twitter:title → <title>
  const title = first(get('og:title'), get('twitter:title'), document.title);
  // Description: meta[name="description"] → og:description → twitter:description
  const description = first(
    get('description', 'name'),
    get('og:description'),
    get('twitter:description')
  );
  // Site name: og:site_name
  const siteName = first(get('og:site_name'));
  // Author: meta[name=author] → meta[property=article:author] → JSON-LD author.name
  const author = first(get('author', 'name'), get('article:author'), readJsonLdAuthor());
  return { title, description, siteName, author, url: location.href };
}

export async function extractMetaForTab(tabId: number): Promise<PageMeta | undefined> {
  try {
    if (!hasChrome() || !(chrome as any).scripting?.executeScript) return undefined;
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId },
      func: pageExtractor,
    } as any);
    const meta = (result || {}) as PageMeta;
    if (meta && meta.url) await saveMetaCache(meta.url, meta);
    return meta;
  } catch {
    return undefined;
  }
}
