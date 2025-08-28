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

// Execute in the page to extract common meta fields
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
  const title = first(get('og:title'), get('twitter:title'), document.title);
  const description = first(
    get('og:description'),
    get('twitter:description'),
    get('description', 'name')
  );
  const siteName = first(get('og:site_name'));
  const author = first(get('article:author'), get('author', 'name'));
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

