import type {
  WebpageData,
  CategoryData,
  TemplateData,
} from '../../background/storageService';

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

    const [currentPages, currentCats, currentTpls] = await Promise.all([
      storage.loadFromLocal(),
      storage.loadFromSync(),
      storage.loadTemplates(),
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

    const tplById = new Map<string, TemplateData>(
      currentTpls.map((t) => [t.id, t])
    );
    const toAddTpls: TemplateData[] = [];
    for (const t of incomingTpls) {
      if (!tplById.has(t.id)) toAddTpls.push(t);
    }
    const mergedTpls = [...currentTpls, ...toAddTpls];

    await Promise.all([
      storage.saveToLocal(mergedPages),
      storage.saveToSync(mergedCats),
      storage.saveTemplates(mergedTpls),
    ]);

    return { addedPages: toAddPages.length, addedCategories: toAddCats.length, addedTemplates: toAddTpls.length };
  }

  return { exportJson, importJsonMerge };
}
