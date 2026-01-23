// Background Service Worker (Manifest V3)
import { createTabsManager } from './background/tabsManager';
import {
  createStorageService,
  type CategoryData,
  type OrganizationData,
  type SubcategoryData,
} from './background/storageService';
import { createWebpageService } from './background/webpageService';
import {
  extractMetaForTab,
  initPendingExtractionListeners,
  waitForTabComplete,
} from './background/pageMeta';
import { getAll, tx } from './background/idb/db';

type ClientPort = chrome.runtime.Port;
const clients = new Set<ClientPort>();

type SaveSource = 'page' | 'link' | 'selection';

type MenuData = {
  organizations: OrganizationData[];
  categoriesByOrg: Map<string, CategoryData[]>;
  subcategoriesByCategory: Map<string, SubcategoryData[]>;
};

const storage = createStorageService();
const webpageService = createWebpageService({ storage });

const MENU_PREFIX = 'linktrove-save';
const MENU_ROOT_PAGE = `${MENU_PREFIX}::page`;
const MENU_ROOT_LINK = `${MENU_PREFIX}::link`;
const MENU_ROOT_SELECTION = `${MENU_PREFIX}::selection`;
const MENU_REBUILD_THROTTLE_MS = 15000;
const MENU_OPEN_APP_SUFFIX = '::open';
const DEFAULT_ORG_ID = 'o_default';
const DEFAULT_CATEGORY_ID = 'default';
const DEFAULT_GROUP_ID = `g_default_${DEFAULT_CATEGORY_ID}`;

function getMenuTitle(key: string, fallback: string) {
  try {
    const msg = chrome.i18n?.getMessage?.(key);
    if (msg) return msg;
  } catch {}
  return fallback;
}

const sortByOrderName = (a: { order?: number; name?: string }, b: { order?: number; name?: string }) =>
  (a.order ?? 0) - (b.order ?? 0) || String(a.name || '').localeCompare(String(b.name || ''));

function buildOrgMenuId(source: SaveSource, orgId: string) {
  return `${MENU_PREFIX}::${source}::org::${orgId}`;
}

function buildCategoryMenuId(source: SaveSource, orgId: string, categoryId: string) {
  return `${MENU_PREFIX}::${source}::cat::${orgId}::${categoryId}`;
}

function buildGroupMenuId(
  source: SaveSource,
  orgId: string,
  categoryId: string,
  groupId: string
) {
  return `${MENU_PREFIX}::${source}::group::${orgId}::${categoryId}::${groupId}`;
}

function parseGroupMenuId(menuId: chrome.contextMenus.OnClickData['menuItemId']) {
  const id = String(menuId ?? '');
  const parts = id.split('::');
  if (parts.length !== 6) return null;
  if (parts[0] !== MENU_PREFIX || parts[2] !== 'group') return null;
  const source = parts[1] as SaveSource;
  if (source !== 'page' && source !== 'link' && source !== 'selection') return null;
  const orgId = parts[3];
  const categoryId = parts[4];
  const groupId = parts[5];
  if (!orgId || !categoryId || !groupId) return null;
  return { source, categoryId, groupId };
}

async function enrichFromTabMeta(
  created: { id: string; note?: string; meta?: Record<string, string>; title?: string },
  tabId: number
) {
  try {
    try {
      const tabInfo = await new Promise<chrome.tabs.Tab | undefined>((resolve) => {
        chrome.tabs.get(tabId, (tab) => resolve(tab));
      });

      if (!tabInfo?.discarded) {
        await waitForTabComplete(tabId, 8000);
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    } catch {}

    const meta = await extractMetaForTab(tabId);
    if (!meta) return;

    const patch: Record<string, any> = {};
    if (meta.title && meta.title.trim()) patch.title = meta.title.trim();

    if (
      (!created.note || !created.note.trim()) &&
      meta.description &&
      meta.description.trim()
    ) {
      patch.note = meta.description.trim();
    }

    try {
      const curMeta: Record<string, string> = { ...(created?.meta || {}) };
      let metaChanged = false;

      const setIfEmpty = (key: string, val?: any) => {
        const v = (val ?? '').toString().trim();
        if (!v) return;
        const currentVal = ((curMeta as any)[key] || '').toString().trim();
        if (!currentVal) {
          (curMeta as any)[key] = v;
          metaChanged = true;
        }
      };

      setIfEmpty('siteName', meta?.siteName);
      setIfEmpty('author', meta?.author);
      setIfEmpty('bookTitle', (meta as any)?.bookTitle);
      setIfEmpty('serialStatus', (meta as any)?.serialStatus);
      setIfEmpty('genre', (meta as any)?.genre);
      setIfEmpty('wordCount', (meta as any)?.wordCount);
      setIfEmpty('latestChapter', (meta as any)?.latestChapter);
      setIfEmpty('coverImage', (meta as any)?.coverImage);
      setIfEmpty('bookUrl', (meta as any)?.bookUrl);
      setIfEmpty('lastUpdate', (meta as any)?.lastUpdate);

      if (metaChanged) {
        patch.meta = curMeta;
      }
    } catch {}

    if (Object.keys(patch).length > 0) {
      await webpageService.updateWebpage(created.id, patch);
    }
  } catch {}
}

async function loadMenuData(): Promise<MenuData> {
  const orgsPromise = storage.listOrganizations
    ? storage.listOrganizations().catch(() => [])
    : Promise.resolve([]);
  const catsPromise = storage.loadFromSync
    ? storage.loadFromSync().catch(() => [])
    : Promise.resolve([]);
  const subcatsPromise = getAll('subcategories').catch(() => []);

  const [orgs, cats, subcatsRaw] = await Promise.all([orgsPromise, catsPromise, subcatsPromise]);

  const organizations = Array.isArray(orgs) ? orgs.filter((o) => !o.deleted) : [];
  const categories = Array.isArray(cats) ? cats.filter((c) => !c.deleted) : [];

  const orgMap = new Map<string, OrganizationData>();
  for (const org of organizations) orgMap.set(org.id, org);

  for (const cat of categories) {
    const orgId = cat.organizationId || 'o_default';
    if (!orgMap.has(orgId)) {
      orgMap.set(orgId, {
        id: orgId,
        name: orgId === 'o_default' ? 'Personal' : orgId,
        order: 999999,
      });
    }
  }

  const mergedOrganizations = Array.from(orgMap.values());
  mergedOrganizations.sort(sortByOrderName);

  const categoriesByOrg = new Map<string, CategoryData[]>();
  for (const category of categories) {
    const orgId = category.organizationId || 'o_default';
    if (!categoriesByOrg.has(orgId)) categoriesByOrg.set(orgId, []);
    categoriesByOrg.get(orgId)!.push(category);
  }

  for (const list of categoriesByOrg.values()) list.sort(sortByOrderName);

  const subcategoriesByCategory = new Map<string, SubcategoryData[]>();
  const subcats = Array.isArray(subcatsRaw) ? subcatsRaw : [];
  for (const sc of subcats) {
    if (!sc || sc.deleted) continue;
    const categoryId = sc.categoryId as string | undefined;
    if (!categoryId) continue;
    if (!subcategoriesByCategory.has(categoryId)) {
      subcategoriesByCategory.set(categoryId, []);
    }
    subcategoriesByCategory.get(categoryId)!.push(sc as SubcategoryData);
  }
  for (const list of subcategoriesByCategory.values()) list.sort(sortByOrderName);

  return {
    organizations: mergedOrganizations,
    categoriesByOrg,
    subcategoriesByCategory,
  };
}

async function ensureBaselineData(): Promise<void> {
  try {
    await tx(
      ['organizations' as any, 'categories', 'subcategories' as any],
      'readwrite',
      async (t) => {
        const os = t.objectStore('organizations' as any);
        const cs = t.objectStore('categories');
        const ss = t.objectStore('subcategories' as any);

        const [orgs, cats, subs] = await Promise.all([
          new Promise<any[]>((resolve, reject) => {
            const req = os.getAll();
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = () => reject(req.error);
          }),
          new Promise<any[]>((resolve, reject) => {
            const req = cs.getAll();
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = () => reject(req.error);
          }),
          new Promise<any[]>((resolve, reject) => {
            const req = ss.getAll();
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = () => reject(req.error);
          }),
        ]);

        const activeOrgs = (orgs || []).filter((o: any) => !o?.deleted);
        if (activeOrgs.length === 0) {
          os.put({
            id: DEFAULT_ORG_ID,
            name: 'Personal',
            color: '#64748b',
            order: 0,
          });
        }

        const activeCats = (cats || []).filter((c: any) => !c?.deleted);
        const hasDefaultCategory = activeCats.some(
          (c: any) => c.id === DEFAULT_CATEGORY_ID
        );
        if (activeCats.length === 0 && !hasDefaultCategory) {
          cs.put({
            id: DEFAULT_CATEGORY_ID,
            name: 'Default',
            color: '#64748b',
            order: 0,
            organizationId: DEFAULT_ORG_ID,
          });
        }

        const activeSubs = (subs || []).filter((s: any) => !s?.deleted);
        const hasDefaultGroup = activeSubs.some(
          (s: any) => s.categoryId === DEFAULT_CATEGORY_ID
        );
        if (
          (activeCats.length === 0 || hasDefaultCategory) &&
          !hasDefaultGroup
        ) {
          const now = Date.now();
          ss.put({
            id: DEFAULT_GROUP_ID,
            categoryId: DEFAULT_CATEGORY_ID,
            name: 'group',
            order: 0,
            createdAt: now,
            updatedAt: now,
          });
        }
      }
    );
  } catch {}
}

function removeAllMenus() {
  return new Promise<void>((resolve) => {
    try {
      chrome.contextMenus?.removeAll?.(() => resolve());
    } catch {
      resolve();
    }
  });
}

function createMenuTree(
  data: MenuData,
  source: SaveSource,
  rootId: string,
  titleKey: string,
  fallbackTitle: string,
  contexts: chrome.contextMenus.ContextType[]
) {
  const orgLabel = `🏢 ${getMenuTitle('context_label_org', 'Organization')}`;
  const collectionLabel = `🗂️ ${getMenuTitle('context_label_collection', 'Collection')}`;
  const groupLabel = `📌 ${getMenuTitle('context_label_group', 'Group')}`;

  chrome.contextMenus?.create?.({
    id: rootId,
    title: getMenuTitle(titleKey, fallbackTitle),
    contexts,
  });

  if (!data.organizations.length) {
    chrome.contextMenus?.create?.({
      id: `${rootId}${MENU_OPEN_APP_SUFFIX}`,
      parentId: rootId,
      title: getMenuTitle('context_save_open_app', 'Open LinkTrove'),
      contexts,
    });
    chrome.contextMenus?.create?.({
      id: `${rootId}::no-orgs`,
      parentId: rootId,
      title: getMenuTitle('context_save_no_organizations', 'No organizations yet'),
      contexts,
      enabled: false,
    });
    return;
  }

  chrome.contextMenus?.create?.({
    id: `${rootId}::label-org`,
    parentId: rootId,
    title: orgLabel,
    contexts,
    enabled: false,
  });
  chrome.contextMenus?.create?.({
    id: `${rootId}::sep-org`,
    parentId: rootId,
    type: 'separator',
    contexts,
  });

  for (const org of data.organizations) {
    const categories = data.categoriesByOrg.get(org.id) || [];
    const orgMenuId = buildOrgMenuId(source, org.id);
    chrome.contextMenus?.create?.({
      id: orgMenuId,
      parentId: rootId,
      title: org.name || org.id,
      contexts,
    });

    if (!categories.length) {
      chrome.contextMenus?.create?.({
        id: `${orgMenuId}::empty`,
        parentId: orgMenuId,
        title: getMenuTitle('context_save_no_groups', 'No groups'),
        contexts,
        enabled: false,
      });
      continue;
    }

    chrome.contextMenus?.create?.({
      id: `${orgMenuId}::label-cat`,
      parentId: orgMenuId,
      title: collectionLabel,
      contexts,
      enabled: false,
    });
    chrome.contextMenus?.create?.({
      id: `${orgMenuId}::sep-cat`,
      parentId: orgMenuId,
      type: 'separator',
      contexts,
    });

    for (const category of categories) {
      const groups = data.subcategoriesByCategory.get(category.id) || [];

      const categoryMenuId = buildCategoryMenuId(source, org.id, category.id);
      chrome.contextMenus?.create?.({
        id: categoryMenuId,
        parentId: orgMenuId,
        title: category.name || category.id,
        contexts,
      });

      chrome.contextMenus?.create?.({
        id: `${categoryMenuId}::label-group`,
        parentId: categoryMenuId,
        title: groupLabel,
        contexts,
        enabled: false,
      });
      chrome.contextMenus?.create?.({
        id: `${categoryMenuId}::sep-group`,
        parentId: categoryMenuId,
        type: 'separator',
        contexts,
      });

      if (!groups.length) {
        chrome.contextMenus?.create?.({
          id: `${categoryMenuId}::empty`,
          parentId: categoryMenuId,
          title: getMenuTitle('context_save_no_groups', 'No groups'),
          contexts,
          enabled: false,
        });
        continue;
      }

      for (const group of groups) {
        const groupMenuId = buildGroupMenuId(source, org.id, category.id, group.id);
        chrome.contextMenus?.create?.({
          id: groupMenuId,
          parentId: categoryMenuId,
          title: group.name || group.id,
          contexts,
        });
      }
    }
  }
}

let rebuildPromise: Promise<void> | null = null;
let lastRebuildAt = 0;
let rebuildQueued = false;

async function rebuildContextMenus() {
  if (!chrome.contextMenus?.create) return;
  if (rebuildPromise) return rebuildPromise;

  rebuildPromise = (async () => {
    await ensureBaselineData();
    const data = await loadMenuData();
    await removeAllMenus();

    createMenuTree(
      data,
      'page',
      MENU_ROOT_PAGE,
      'context_save_page',
      'Save page to LinkTrove',
      ['all']
    );
    createMenuTree(
      data,
      'link',
      MENU_ROOT_LINK,
      'context_save_link',
      'Save link to LinkTrove',
      ['link']
    );
    createMenuTree(
      data,
      'selection',
      MENU_ROOT_SELECTION,
      'context_save_selection',
      'Save selection to LinkTrove',
      ['selection']
    );

    chrome.contextMenus?.refresh?.();
    lastRebuildAt = Date.now();
  })()
    .catch((err) => {
      console.warn('Failed to rebuild context menus', err);
    })
    .finally(() => {
      rebuildPromise = null;
    });

  return rebuildPromise;
}

function queueRebuildContextMenus(force = false) {
  if (rebuildQueued) return;
  if (!force && Date.now() - lastRebuildAt < MENU_REBUILD_THROTTLE_MS) return;
  rebuildQueued = true;
  setTimeout(() => {
    rebuildQueued = false;
    void rebuildContextMenus();
  }, 0);
}

function tabToPayload(t: any) {
  return {
    id: t.id,
    title: t.title,
    url: t.url,
    favIconUrl: t.favIconUrl,
    index: t.index,
    windowId: t.windowId,
  };
}

let started = false;
const tabsManager = createTabsManager({
  onChange: (evt) => {
    // Broadcast tab events to connected UI ports
    clients.forEach((p) => {
      try {
        p.postMessage({ kind: 'tab-event', evt });
      } catch (err) {
        console.error('postMessage failed', err);
      }
    });
  },
});

async function boot() {
  try {
    if (!started) {
      await tabsManager.start();
      started = true;

      // Initialize pending meta extraction listeners
      try {
        initPendingExtractionListeners();
      } catch (err) {
        console.warn('Failed to initialize pending extraction listeners:', err);
      }
    }
  } catch (err) {
    console.error('Failed to start tabs manager', err);
  }
}

chrome.runtime.onInstalled.addListener(() => {
  boot();
  void rebuildContextMenus();
});

// Some Chromium variants may not support onStartup in SW context; guard
chrome.runtime.onStartup?.addListener?.(() => {
  boot();
  void rebuildContextMenus();
});

// Handle UI connections for Open Tabs syncing
chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== 'openTabs') return;
  // Ensure listeners are active when a UI connects (SW may have cold-started)
  boot();
  void rebuildContextMenus();
  clients.add(port);

  // Handshake: Wait for UI to signal readiness before sending initial snapshot
  // This prevents race conditions where init message is sent before UI listeners are attached
  port.onMessage.addListener((msg) => {
    if (msg?.kind === 'ready') {
      chrome.windows.getLastFocused?.({ populate: false }, (w) => {
        const activeWindowId = w?.id;
        chrome.windows.getAll?.({ populate: false }, (wins) => {
          const windowIds = (wins || [])
            .map((x) => x.id)
            .filter((x) => typeof x === 'number');
          chrome.tabs.query({}, (tabs) => {
            try {
              const payload = {
                kind: 'init',
                activeWindowId,
                windowIds,
                tabs: tabs.map(tabToPayload),
              };
              port.postMessage(payload);
            } catch (err) {
              console.error('failed to send init tabs', err);
            }
          });
        });
      });
    }
  });

  port.onDisconnect.addListener(() => {
    clients.delete(port);
  });
});

chrome.contextMenus?.onShown?.addListener?.(() => {
  queueRebuildContextMenus();
});

chrome.contextMenus?.onClicked?.addListener?.(async (info, tab) => {
  const menuIdRaw = String(info.menuItemId ?? '');
  if (menuIdRaw.startsWith(MENU_PREFIX) && menuIdRaw.endsWith(MENU_OPEN_APP_SUFFIX)) {
    try {
      chrome.tabs.create({ url: chrome.runtime.getURL('newtab.html') });
    } catch {}
    return;
  }
  const parsed = parseGroupMenuId(info.menuItemId);
  if (!parsed) return;

  const pageUrl = (tab?.url || info.pageUrl || '') as string;
  const linkUrl = (info as any).linkUrl as string | undefined;
  const linkText = (info as any).linkText as string | undefined;

  let url = pageUrl;
  let title = tab?.title || '';

  if (parsed.source === 'link') {
    url = linkUrl || pageUrl;
    title = linkText || title || url;
  } else {
    url = pageUrl;
    title = title || url;
  }

  if (!url) return;

  try {
    const created = await webpageService.addWebpageFromTab(
      {
        title,
        url,
        favIconUrl: tab?.favIconUrl || '',
      },
      {
        category: parsed.categoryId,
        subcategoryId: parsed.groupId,
        beforeId: '__END__',
      }
    );

    const tabId = tab?.id;
    if (typeof tabId === 'number') {
      await enrichFromTabMeta(created, tabId);
    }
  } catch (err) {
    console.error('context menu save failed', err);
  }
});

chrome.runtime.onMessage?.addListener?.((msg) => {
  if (msg?.kind === 'context-menus:refresh') {
    queueRebuildContextMenus(true);
  }
});

// Ensure menus exist whenever the service worker starts.
void rebuildContextMenus();

// Broadcast window focus changes so UI can switch visible window
chrome.windows?.onFocusChanged?.addListener?.((windowId) => {
  clients.forEach((p) => {
    try {
      p.postMessage({ kind: 'window-focus', windowId });
    } catch {}
  });
});

// Broadcast window create/remove so UI can render groups immediately
chrome.windows?.onCreated?.addListener?.((win) => {
  clients.forEach((p) => {
    try {
      p.postMessage({
        kind: 'window-event',
        evt: { type: 'created', windowId: win?.id },
      });
    } catch {}
  });
});
chrome.windows?.onRemoved?.addListener?.((windowId) => {
  clients.forEach((p) => {
    try {
      p.postMessage({
        kind: 'window-event',
        evt: { type: 'removed', windowId },
      });
    } catch {}
  });
});
