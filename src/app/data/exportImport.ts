import type {
  WebpageData,
  CategoryData,
} from '../../background/storageService';

export interface StorageLike {
  saveToLocal: (data: WebpageData[]) => Promise<void>;
  loadFromLocal: () => Promise<WebpageData[]>;
  saveToSync: (data: CategoryData[]) => Promise<void>;
  loadFromSync: () => Promise<CategoryData[]>;
  exportData: () => Promise<string>;
  importData: (jsonData: string) => Promise<void>;
}

export interface ExportImportService {
  exportJson: () => Promise<string>;
  importJsonMerge: (
    jsonData: string
  ) => Promise<{ addedPages: number; addedCategories: number }>;
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
    if (!incomingPages.every(isWebpage))
      throw new Error('Invalid webpages payload');
    if (!incomingCats.every(isCategory))
      throw new Error('Invalid categories payload');

    const [currentPages, currentCats] = await Promise.all([
      storage.loadFromLocal(),
      storage.loadFromSync(),
    ]);

    const pageByUrl = new Map<string, WebpageData>(
      currentPages.map((p) => [p.url, p])
    );
    const toAddPages: WebpageData[] = [];
    for (const p of incomingPages) {
      if (!pageByUrl.has(p.url)) toAddPages.push(p);
    }
    const mergedPages = [...currentPages, ...toAddPages];

    const catById = new Map<string, CategoryData>(
      currentCats.map((c) => [c.id, c])
    );
    const toAddCats: CategoryData[] = [];
    for (const c of incomingCats) {
      if (!catById.has(c.id)) toAddCats.push(c);
    }
    const mergedCats = [...currentCats, ...toAddCats];

    await Promise.all([
      storage.saveToLocal(mergedPages),
      storage.saveToSync(mergedCats),
    ]);

    return { addedPages: toAddPages.length, addedCategories: toAddCats.length };
  }

  return { exportJson, importJsonMerge };
}
