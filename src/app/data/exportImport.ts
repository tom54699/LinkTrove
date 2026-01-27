import type {
  WebpageData,
  CategoryData,
  TemplateData,
} from '../../background/storageService';
import { clearStore } from '../../background/idb/db';
import { putAll } from '../../background/idb/db';
import { setMeta } from '../../background/idb/db';
import { DEFAULT_GROUP_NAME, createEntityId } from '../../utils/defaults';

export interface StorageLike {
  saveToLocal: (data: WebpageData[]) => Promise<void>;
  loadFromLocal: () => Promise<WebpageData[]>;
  saveToSync: (data: CategoryData[]) => Promise<void>;
  loadFromSync: () => Promise<CategoryData[]>;
  loadTemplates: () => Promise<TemplateData[]>;
  saveTemplates: (data: TemplateData[]) => Promise<void>;
  exportData: () => Promise<string>;
  importData: (jsonData: string) => Promise<void>;
  normalizeOrderMeta?: () => Promise<void>;
}

export interface ExportImportService {
  exportJson: () => Promise<string>;
  importJsonMerge: (jsonData: string) => Promise<{
    addedPages: number;
    addedCategories: number;
    addedTemplates: number;
  }>;
}

function isWebpage(x: any): x is WebpageData {
  return (
    x &&
    typeof x.id === 'string' &&
    typeof x.url === 'string' &&
    typeof x.title === 'string'
  );
}
function isCategory(x: any): x is CategoryData {
  return x && typeof x.id === 'string' && typeof x.name === 'string';
}
function isTemplate(x: any): x is TemplateData {
  return (
    x &&
    typeof x.id === 'string' &&
    typeof x.name === 'string' &&
    Array.isArray((x as any).fields)
  );
}

export function createExportImportService(deps: {
  storage: StorageLike;
}): ExportImportService {
  const { storage } = deps;

  async function exportJson() {
    return storage.exportData();
  }

  async function importJsonMerge(jsonData: string) {
    let parsed: any;
    try {
      parsed = JSON.parse(jsonData);
    } catch {
      throw new Error('Invalid JSON');
    }
    const incomingPages = Array.isArray(parsed?.webpages)
      ? parsed.webpages
      : [];
    const incomingCatsRaw = Array.isArray(parsed?.categories)
      ? parsed.categories
      : [];
    const incomingTpls = Array.isArray(parsed?.templates)
      ? parsed.templates
      : [];
    const incomingSubcatsRaw = Array.isArray(parsed?.subcategories)
      ? parsed.subcategories
      : [];
    const incomingOrders =
      parsed?.orders && parsed.orders.subcategories && typeof parsed.orders.subcategories === 'object'
        ? parsed.orders.subcategories
        : {};
    if (!incomingPages.every(isWebpage))
      throw new Error('Invalid webpages payload');
    if (!incomingCatsRaw.every(isCategory))
      throw new Error('Invalid categories payload');
    if (!incomingTpls.every(isTemplate))
      throw new Error('Invalid templates payload');

    // Compute delta for reporting before overwrite
    const prevPages = await storage.loadFromLocal().catch(() => [] as any[]);
    const prevCats = await storage.loadFromSync().catch(() => [] as any[]);
    const existingPageIds = new Set<string>((prevPages as any[]).map((p: any) => String(p.id)));
    const existingPageUrls = new Set<string>((prevPages as any[]).map((p: any) => String(p.url)));
    const existingCatIds = new Set<string>((prevCats as any[]).map((c: any) => String(c.id)));
    const addedPages = (incomingPages as any[]).filter((p: any) => !existingPageIds.has(String(p.id)) && !existingPageUrls.has(String(p.url))).length;
    const addedCategories = (incomingCatsRaw as any[]).filter((c: any) => !existingCatIds.has(String(c.id))).length;

    // Overwrite strategy: clear stores then write incoming（IDB 不可用時忽略錯誤）
    try {
      await Promise.all([
        clearStore('webpages'),
        clearStore('categories'),
        clearStore('templates'),
        clearStore('subcategories' as any).catch(() => {}),
      ]);
    } catch {}

    // Prepare subcategories and ensure every page has a valid subcategoryId
    const byCat: Record<string, any[]> = {};
    const subcatsToWrite: any[] = [];
    const incomingCats = (incomingCatsRaw as any[]).map((c) => ({ ...c, isDefault: !!(c as any).isDefault }));
    const incomingSubcats = (incomingSubcatsRaw as any[]).map((s) => ({ ...s, isDefault: !!(s as any).isDefault }));
    const categoryIndex: Record<string, any> = {};
    for (const c of incomingCats as any[]) categoryIndex[c.id] = c;

    if (Array.isArray(incomingSubcats)) {
      for (const s of incomingSubcats) {
        if (s && typeof s.id === 'string' && typeof s.categoryId === 'string') {
          (byCat[s.categoryId] ||= []).push(s);
          subcatsToWrite.push(s);
        }
      }
    }
    const defaults: Record<string, any> = {};
    function ensureDefault(catId: string): any {
      if (!defaults[catId]) {
        const sc = {
          id: createEntityId('g'),
          categoryId: catId,
          name: DEFAULT_GROUP_NAME,
          order: (byCat[catId]?.length ?? 0),
          createdAt: Date.now(),
          updatedAt: Date.now(),
          isDefault: !!categoryIndex[catId]?.isDefault,
        };
        defaults[catId] = sc;
        (byCat[catId] ||= []).push(sc);
        subcatsToWrite.push(sc);
      }
      return defaults[catId];
    }
    // Guarantee at least one group per category
    for (const c of incomingCats) {
      if (!byCat[c.id] || byCat[c.id].length === 0) ensureDefault(c.id);
    }
    // Normalize webpages' subcategoryId
    const subcatIndex: Record<string, any> = {};
    for (const s of subcatsToWrite) subcatIndex[s.id] = s;
    for (const p of incomingPages as any[]) {
      const valid = p.subcategoryId && subcatIndex[p.subcategoryId];
      if (!valid || subcatIndex[p.subcategoryId].categoryId !== p.category) {
        const def = ensureDefault(p.category);
        p.subcategoryId = def.id;
      }
    }
    // Write subcategories first so webpages reference exist
    try {
      if (subcatsToWrite.length)
        await putAll('subcategories' as any, subcatsToWrite);
    } catch {}
    // Restore per-group orders when present
    try {
      for (const s of subcatsToWrite) {
        const gid = s?.id;
        if (!gid) continue;
        const ids = Array.isArray((incomingOrders as any)[gid])
          ? ((incomingOrders as any)[gid] as string[])
          : [];
        try { await setMeta(`order.subcat.${gid}`, ids); } catch {}
      }
    } catch {}
    await Promise.all([
      storage.saveToLocal(incomingPages),
      storage.saveToSync(incomingCats),
      // templates 可選：若儲存層未提供 saveTemplates，則略過
      (typeof (storage as any).saveTemplates === 'function'
        ? (storage as any).saveTemplates(incomingTpls)
        : Promise.resolve()),
    ]);
    // Mirror to chrome.storage for resilience
    try {
      chrome.storage?.local?.set?.({ categories: incomingCats });
    } catch {}
    try {
      chrome.storage?.local?.set?.({ templates: incomingTpls });
    } catch {}

    // Apply settings if present in import
    const settings = parsed?.settings || {};
    try {
      // Accept new and legacy theme values
      if (settings.theme) {
        let t = settings.theme as string;
        if (t === 'dark' || t === 'light') t = 'dracula';
        if (t === 'dracula' || t === 'gruvbox') {
          chrome.storage?.local?.set?.({ theme: t });
          try {
            await setMeta('settings.theme', t);
          } catch {}
        }
      }
      if (
        typeof settings.selectedCategoryId === 'string' &&
        settings.selectedCategoryId
      ) {
        chrome.storage?.local?.set?.({
          selectedCategoryId: settings.selectedCategoryId,
        });
        try {
          await setMeta(
            'settings.selectedCategoryId',
            settings.selectedCategoryId
          );
        } catch {}
      }
    } catch {}
    try {
      if (typeof (storage as any).normalizeOrderMeta === 'function') {
        await (storage as any).normalizeOrderMeta();
      }
    } catch {}

    return {
      addedPages,
      addedCategories,
      addedTemplates: incomingTpls.length,
    };
  }

  return { exportJson, importJsonMerge };
}
