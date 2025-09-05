import type {
  WebpageData,
  CategoryData,
  TemplateData,
  StorageService,
} from '../storageService';
import { getAll, putAll, setMeta, getMeta, clearStore, tx } from './db';

async function migrateOnce(): Promise<void> {
  try {
    const migrated = await getMeta<boolean>('migratedToIdb');
    if (migrated) return;
  } catch {}
  try {
    const localAny: any = await new Promise((resolve) => {
      try {
        chrome.storage?.local?.get?.({ webpages: [] }, resolve);
      } catch {
        resolve({});
      }
    });
    const syncAny: any = await new Promise((resolve) => {
      try {
        chrome.storage?.sync?.get?.({ categories: [], templates: [] }, resolve);
      } catch {
        resolve({});
      }
    });
    const webpages: WebpageData[] = Array.isArray(localAny?.webpages)
      ? localAny.webpages
      : [];
    const categories: CategoryData[] = Array.isArray(syncAny?.categories)
      ? syncAny.categories
      : [];
    const templates: TemplateData[] = Array.isArray(syncAny?.templates)
      ? syncAny.templates
      : [];
    if (webpages.length + categories.length + templates.length > 0) {
      if (webpages.length) await putAll('webpages', webpages);
      if (categories.length) await putAll('categories', categories);
      if (templates.length) await putAll('templates', templates);
    }
  } catch {
    // ignore
  }
  try {
    await setMeta('migratedToIdb', true);
  } catch {}
}

export function createIdbStorageService(): StorageService {
  // ensure migration runs once per session
  void migrateOnce();
  void migrateSubcategoriesOnce();

  async function migrateSubcategoriesOnce(): Promise<void> {
    try {
      const done = await getMeta<boolean>('migratedSubcategoriesV1');
      if (done) return;
    } catch {}
    try {
      const [categories, subcats, pages] = await Promise.all([
        getAll('categories'),
        getAll('subcategories' as any).catch(() => []),
        getAll('webpages'),
      ]);
      const now = Date.now();
      const byCatHasAny: Record<string, boolean> = {};
      for (const sc of subcats as any[]) byCatHasAny[sc.categoryId] = true;
      const defaults: Record<string, any> = {};
      const toCreate: any[] = [];
      for (const c of categories as any[]) {
        if (!byCatHasAny[c.id]) {
          const id = 'g_' + Math.random().toString(36).slice(2, 9);
          const sc = {
            id,
            categoryId: c.id,
            name: 'group',
            order: 0,
            createdAt: now,
            updatedAt: now,
          };
          defaults[c.id] = sc;
          toCreate.push(sc);
        }
      }
      if (toCreate.length) await putAll('subcategories' as any, toCreate);
      // Assign missing subcategoryId on webpages
      const toUpdate: any[] = [];
      for (const p of pages as any[]) {
        if (!(p as any).subcategoryId) {
          const def = defaults[p.category];
          if (def) {
            (p as any).subcategoryId = def.id;
            toUpdate.push(p);
          }
        }
      }
      if (toUpdate.length) await putAll('webpages', toUpdate);
    } catch {
      // ignore
    }
    try { await setMeta('migratedSubcategoriesV1', true); } catch {}
  }

  async function exportData(): Promise<string> {
    const [webpages, categories, templates] = await Promise.all([
      getAll('webpages'),
      getAll('categories'),
      getAll('templates'),
    ]);
    // Include minimal settings (theme, selectedCategoryId)
    let theme: any = undefined;
    let selectedCategoryId: any = undefined;
    try {
      const got: any = await new Promise((resolve) => {
        try {
          chrome.storage?.local?.get?.(
            { theme: undefined, selectedCategoryId: undefined },
            resolve
          );
        } catch {
          resolve({});
        }
      });
      theme = got?.theme;
      selectedCategoryId = got?.selectedCategoryId;
    } catch {}
    if (theme === undefined) {
      try {
        theme = await getMeta('settings.theme');
      } catch {
        theme = undefined;
      }
    }
    if (selectedCategoryId === undefined) {
      try {
        selectedCategoryId = await getMeta('settings.selectedCategoryId');
      } catch {
        selectedCategoryId = undefined;
      }
    }
    const settings: any = {};
    if (theme !== undefined) settings.theme = theme;
    if (selectedCategoryId !== undefined)
      settings.selectedCategoryId = selectedCategoryId;
    return JSON.stringify({ webpages, categories, templates, settings });
  }

  async function importData(jsonData: string): Promise<void> {
    let parsed: any;
    try {
      parsed = JSON.parse(jsonData);
    } catch {
      throw new Error('Invalid JSON');
    }
    const pages: WebpageData[] = Array.isArray(parsed?.webpages)
      ? parsed.webpages
      : [];
    const cats: CategoryData[] = Array.isArray(parsed?.categories)
      ? parsed.categories
      : [];
    const tmpls: TemplateData[] = Array.isArray(parsed?.templates)
      ? parsed.templates
      : [];
    // Basic validation (keep same checks)
    if (!Array.isArray(pages)) throw new Error('Invalid webpages payload');
    if (!Array.isArray(cats)) throw new Error('Invalid categories payload');
    if (!Array.isArray(tmpls)) throw new Error('Invalid templates payload');
    // Bulk put
    if (pages.length) await putAll('webpages', pages);
    if (cats.length) await putAll('categories', cats);
    if (tmpls.length) await putAll('templates', tmpls);
  }

  return {
    // naming preserved for compatibility; replace full set to persist deletions
    saveToLocal: async (data: WebpageData[]) => {
      await clearStore('webpages');
      await putAll('webpages', data || []);
    },
    loadFromLocal: async () => (await getAll('webpages')) as WebpageData[],
    // Replace categories set to ensure deletions persist
    saveToSync: async (data: CategoryData[]) => {
      await clearStore('categories');
      await putAll('categories', data || []);
    },
    loadFromSync: async () => (await getAll('categories')) as CategoryData[],
    // Replace templates set to ensure deletions persist
    saveTemplates: async (data: TemplateData[]) => {
      await clearStore('templates');
      await putAll('templates', data || []);
    },
    loadTemplates: async () => (await getAll('templates')) as TemplateData[],
    exportData,
    importData,
  };
}
