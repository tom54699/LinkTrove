// Lightweight page metadata extraction and caching via MV3 scripting API
// Extracts: title, description, siteName, author

export type PageMeta = Partial<{
  title: string;
  description: string;
  siteName: string;
  author: string;
  url: string;
  collectedAt: string;
  // Book-specific canonical fields (optional when present)
  bookTitle: string;
  serialStatus: string; // 連載中 / 已完結 / 太監
  genre: string;
  wordCount: string; // store as string; numeric parsing由服務層負責
  latestChapter: string;
  coverImage: string;
  bookUrl: string;
  lastUpdate: string; // ISO 或原字串
}>; 

const CACHE_KEY = 'pageMetaCache';
const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function hasChrome() {
  return (
    typeof (globalThis as any).chrome !== 'undefined' &&
    !!(chrome as any).storage?.local
  );
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

export async function getCachedMeta(
  url: string
): Promise<PageMeta | undefined> {
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
        if (Number.isFinite(ts) && Date.now() - ts < TTL_MS)
          return resolve(ent as PageMeta);
      } catch {}
      resolve(undefined);
    });
  });
}

export async function saveMetaCache(
  url: string,
  meta: PageMeta
): Promise<void> {
  if (!hasChrome()) return;
  return new Promise((resolve) => {
    chrome.storage.local.get({ [CACHE_KEY]: {} }, (res: any) => {
      const map = res?.[CACHE_KEY] || {};
      const entry = {
        ...meta,
        url: meta.url || url,
        collectedAt: new Date().toISOString(),
      };
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
      document.querySelector(
        `meta[${attr}="${name}"]`
      ) as HTMLMetaElement | null
    )?.content?.trim();
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
  let _titleSrc = '';
  let title = get('og:title');
  if (title) _titleSrc = 'meta[property=og:title]';
  if (!title) {
    const v = get('og:novel:book_name');
    if (v) {
      title = v;
      _titleSrc = 'meta[property=og:novel:book_name]';
    }
  }
  if (!title) {
    const v = get('twitter:title');
    if (v) {
      title = v;
      _titleSrc = 'meta[name=twitter:title]';
    }
  }
  if (!title) {
    if (document.title && document.title.trim()) {
      title = document.title.trim();
      _titleSrc = 'title';
    }
  }
  // Description: meta[name="description"] → og:description → twitter:description
  let _descSrc = '';
  let description = get('description', 'name');
  if (description) _descSrc = 'meta[name=description]';
  if (!description) {
    const v = get('og:description');
    if (v) {
      description = v;
      _descSrc = 'meta[property=og:description]';
    }
  }
  if (!description) {
    const v = get('twitter:description');
    if (v) {
      description = v;
      _descSrc = 'meta[name=twitter:description]';
    }
  }
  // Site name: og:site_name → derive from title suffix → hostname
  function deriveSiteNameFromTitle(t?: string): string | undefined {
    const s = (t || '').trim();
    if (!s) return undefined;
    const seps = [' - ', ' – ', ' — ', '｜', '|', '·', '•', '»', '：', ':'];
    for (const sep of seps) {
      if (s.includes(sep)) {
        const parts = s
          .split(sep)
          .map((x) => x.trim())
          .filter(Boolean);
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
  let _siteSrc = '';
  let siteName = get('og:site_name');
  if (siteName) _siteSrc = 'meta[property=og:site_name]';
  if (!siteName) {
    const v = deriveSiteNameFromTitle(title);
    if (v) {
      siteName = v;
      _siteSrc = 'title-suffix';
    }
  }
  if (!siteName) {
    siteName = location.hostname.replace(/^www\./, '');
    _siteSrc = 'hostname';
  }

  // Author: meta[name=author] → meta[property=article:author] → meta[property=books:author] → meta[property=og:novel:author] → link[rel=author] → JSON-LD → microdata
  let _authorSrc = '';
  let author = get('author', 'name');
  if (author) _authorSrc = 'meta[name=author]';
  if (!author) {
    const v = get('article:author');
    if (v) {
      author = v;
      _authorSrc = 'meta[property=article:author]';
    }
  }
  if (!author) {
    const v = get('books:author');
    if (v) {
      author = v;
      _authorSrc = 'meta[property=books:author]';
    }
  }
  if (!author) {
    const v = get('og:novel:author');
    if (v) {
      author = v;
      _authorSrc = 'meta[property=og:novel:author]';
    }
  }
  if (!author) {
    const v = (
      document.querySelector('link[rel="author"]') as HTMLLinkElement | null
    )?.href;
    if (v) {
      author = v;
      _authorSrc = 'link[rel=author]';
    }
  }
  if (!author) {
    const v = readJsonLdAuthor();
    if (v) {
      author = v;
      _authorSrc = 'jsonld';
    }
  }
  if (!author) {
    const v = textOf('[itemprop="author"]');
    if (v) {
      author = v;
      _authorSrc = 'itemprop[author]';
    }
  }
  // Ensure siteName is not empty string
  const finalSiteName = siteName && siteName.trim() ? siteName.trim() : undefined;

  const meta = { title, description, siteName: finalSiteName, author, url: location.href };

  // Book/Novel specific extractions
  const novelBookName = get('og:novel:book_name');
  const novelAuthor = get('og:novel:author');
  const novelCategory = get('og:novel:category');
  const novelStatus = get('og:novel:status');
  const novelWordCount = get('og:novel:word_count');
  const novelLatestChapter = get('og:novel:latest_chapter_name');
  const novelUpdateTime = get('og:novel:update_time');
  const coverImage = get('og:image');
  const bookUrl = get('og:url');

  function normalizeStatus(s?: string): string | undefined {
    const v = (s || '').trim().toLowerCase();
    if (!v) return undefined;
    if (['連載', '連載中', 'serialize', 'serializing', 'ongoing'].some((k) => v.includes(k))) return '連載中';
    if (['完結', '完本', '已完結', '已完本', 'completed', 'finished', '完'].some((k) => v.includes(k))) return '已完結';
    if (['太監', '斷更', '停更', '棄坑', 'dropped'].some((k) => v.includes(k))) return '太監';
    return undefined;
  }

  function normalizeWordCount(s?: string): string | undefined {
    const v = (s || '').trim();
    if (!v) return undefined;
    // 支援帶逗號、中文單位「萬」
    let numStr = v.replace(/[,，]/g, '');
    const wan = /([0-9]+(?:\.[0-9]+)?)\s*萬/.exec(numStr);
    if (wan) {
      const n = parseFloat(wan[1]);
      if (!isNaN(n)) return String(Math.round(n * 10000));
    }
    const digits = numStr.match(/\d+/);
    return digits ? digits[0] : undefined;
  }

  function normalizeDate(s?: string): string | undefined {
    const v = (s || '').trim();
    if (!v) return undefined;
    const ts = Date.parse(v);
    if (!isNaN(ts)) return new Date(ts).toISOString();
    return v; // keep original
  }

  const bookTitle = (novelBookName || title || undefined);
  const author2 = (novelAuthor || author || undefined);
  const serialStatus = normalizeStatus(novelStatus);
  const genre = novelCategory || undefined;
  const wordCount = normalizeWordCount(novelWordCount);
  const latestChapter = novelLatestChapter || undefined;
  const lastUpdate = normalizeDate(novelUpdateTime);

  const extra: any = {
    bookTitle,
    author: author2,
    serialStatus,
    genre,
    wordCount,
    latestChapter,
    coverImage: coverImage || undefined,
    bookUrl: bookUrl || undefined,
    lastUpdate,
  };
  return { ...meta, ...extra } as any;
}

export async function extractMetaForTab(
  tabId: number,
  retries = 2
): Promise<PageMeta | undefined> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      if (!hasChrome() || !(chrome as any).scripting?.executeScript) {
        return undefined;
      }

      // Check tab status before attempting extraction
      const tabInfo = await new Promise<chrome.tabs.Tab | undefined>((resolve) => {
        chrome.tabs.get(tabId, (tab) => {
          if (chrome.runtime.lastError) {
            resolve(undefined);
          } else {
            resolve(tab);
          }
        });
      });

      if (!tabInfo) {
        continue;
      }

      // Skip problematic tab states
      if ((tabInfo as any).discarded) {
        console.log(`[pageMeta] Tab ${tabId} is discarded/sleeping, attempting to reactivate...`);
        // Try to reactivate the tab
        try {
          await new Promise<void>((resolve) => {
            chrome.tabs.update(tabId, { active: true }, () => {
              resolve();
            });
          });
          // Wait a bit for reactivation
          await new Promise(resolve => setTimeout(resolve, 500));
          console.log(`[pageMeta] Tab ${tabId} reactivated successfully`);
        } catch (e) {
          console.warn(`[pageMeta] Failed to reactivate tab ${tabId}:`, e);
          // Continue anyway, extraction might still work
        }
      }

      // Skip chrome:// and extension:// URLs
      if (tabInfo.url && (tabInfo.url.startsWith('chrome://') || tabInfo.url.startsWith('chrome-extension://'))) {
        return undefined;
      }

      // Execute script with detailed error handling
      const [{ result }] = await chrome.scripting.executeScript({
        target: { tabId },
        func: pageExtractor,
      } as any);

      const meta = (result || {}) as PageMeta;
      if (meta && meta.url) {
        await saveMetaCache(meta.url, meta);
      }
      return meta;
    } catch (error: any) {
      const errorMsg = error?.message || String(error);

      // Log error for debugging
      console.warn(`[pageMeta] Attempt ${attempt + 1}/${retries} failed for tab ${tabId}:`, errorMsg);

      // Don't retry for certain permanent errors
      if (errorMsg.includes('Cannot access') ||
          errorMsg.includes('Insufficient permissions') ||
          errorMsg.includes('Extension context invalidated') ||
          errorMsg.includes('No tab with id')) {
        console.log(`[pageMeta] Permanent error, skipping retries for tab ${tabId}`);
        break;
      }

      // Wait before retry (exponential backoff)
      if (attempt < retries - 1) {
        const delayMs = Math.min(1000 * Math.pow(2, attempt), 3000);
        console.log(`[pageMeta] Retrying in ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  return undefined;
}

export async function waitForTabComplete(
  tabId: number,
  timeoutMs = 10000
): Promise<void> {
  return new Promise((resolve) => {
    let resolved = false;
    const safeResolve = () => {
      if (!resolved) {
        resolved = true;
        resolve();
      }
    };

    // Set timeout to avoid infinite waiting
    const timeoutId = setTimeout(() => {
      safeResolve();
    }, timeoutMs);

    try {
      chrome.tabs.get(tabId, (tab) => {
        if (chrome.runtime.lastError) {
          clearTimeout(timeoutId);
          safeResolve();
          return;
        }

        if (!tab) {
          clearTimeout(timeoutId);
          safeResolve();
          return;
        }

        // Check if already complete or in a final state
        const status = (tab as any).status;
        if (status === 'complete' || !status) {
          clearTimeout(timeoutId);
          safeResolve();
          return;
        }

        // Wait for completion with additional DOM ready check
        const handler = (id: number, changeInfo: any, updatedTab: chrome.tabs.Tab) => {
          if (id !== tabId) return;

          const newStatus = changeInfo?.status;
          if (newStatus === 'complete') {
            // Wait a bit more for DOM and meta tags to be fully loaded
            setTimeout(() => {
              try {
                chrome.tabs.onUpdated.removeListener(handler as any);
              } catch {}
              clearTimeout(timeoutId);
              safeResolve();
            }, 1000); // Additional 1s wait for DOM/meta ready
          }
        };

        chrome.tabs.onUpdated.addListener(handler as any);

        // Clean up listener on timeout
        setTimeout(() => {
          try {
            chrome.tabs.onUpdated.removeListener(handler as any);
          } catch {}
        }, timeoutMs);
      });
    } catch (error) {
      clearTimeout(timeoutId);
      safeResolve();
    }
  });
}

export function urlsRoughlyEqual(a: string, b: string): boolean {
  try {
    return (
      normalizeUrlKey(a) === normalizeUrlKey(b) ||
      altSlashVariant(normalizeUrlKey(a)) === normalizeUrlKey(b) ||
      normalizeUrlKey(a) === altSlashVariant(normalizeUrlKey(b))
    );
  } catch {
    return a === b;
  }
}
