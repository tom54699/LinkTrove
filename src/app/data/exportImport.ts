import type {
  WebpageData,
  CategoryData,
  TemplateData,
} from '../../background/storageService';
import { clearStore } from '../../background/idb/db';
import { setMeta } from '../../background/idb/db';

export interface StorageLike {
  saveToLocal: (data: WebpageData[]) => Promise<void>;
  loadFromLocal: () => Promise<WebpageData[]>;
  saveToSync: (data: CategoryData[]) => Promise<void>;
  loadFromSync: () => Promise<CategoryData[]>;
  loadTemplates: () => Promise<TemplateData[]>;
  saveTemplates: (data: TemplateData[]) => Promise<void>;
  exportData: () => Promise<string>;
  importData: (jsonData: string) => Promise<void>;
}

export interface ExportImportService {
  exportJson: () => Promise<string>;
  importJsonMerge: (
    jsonData: string
  ) => Promise<{ addedPages: number; addedCategories: number; addedTemplates: number }>;
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
  return x && typeof x.id === 'string' && typeof x.name === 'string' && Array.isArray((x as any).fields);
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
    const incomingCats = Array.isArray(parsed?.categories)
      ? parsed.categories
      : [];
    const incomingTpls = Array.isArray(parsed?.templates) ? parsed.templates : [];
    if (!incomingPages.every(isWebpage))
      throw new Error('Invalid webpages payload');
    if (!incomingCats.every(isCategory))
      throw new Error('Invalid categories payload');
    if (!incomingTpls.every(isTemplate))
      throw new Error('Invalid templates payload');

    // Overwrite strategy: clear stores then write incoming
    await Promise.all([
      clearStore('webpages'),
      clearStore('categories'),
      clearStore('templates'),
    ]);
    await Promise.all([
      storage.saveToLocal(incomingPages),
      storage.saveToSync(incomingCats),
      storage.saveTemplates(incomingTpls),
    ]);
    // Mirror to chrome.storage for resilience
    try { chrome.storage?.local?.set?.({ categories: incomingCats }); } catch {}
    try { chrome.storage?.local?.set?.({ templates: incomingTpls }); } catch {}

    // Apply settings if present in import
    const settings = parsed?.settings || {};
    try {
      // Accept new and legacy theme values
      if (settings.theme) {
        let t = settings.theme as string;
        if (t === 'dark' || t === 'light') t = 'dracula';
        if (t === 'dracula' || t === 'gruvbox') {
          chrome.storage?.local?.set?.({ theme: t });
          try { await setMeta('settings.theme', t); } catch {}
        }
      }
      if (typeof settings.selectedCategoryId === 'string' && settings.selectedCategoryId) {
        chrome.storage?.local?.set?.({ selectedCategoryId: settings.selectedCategoryId });
        try { await setMeta('settings.selectedCategoryId', settings.selectedCategoryId); } catch {}
      }
    } catch {}

    return { addedPages: incomingPages.length, addedCategories: incomingCats.length, addedTemplates: incomingTpls.length };
  }

  return { exportJson, importJsonMerge };
}
