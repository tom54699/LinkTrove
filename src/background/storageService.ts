export interface WebpageData {
  id: string;
  title: string;
  url: string;
  favicon: string;
  note: string;
  category: string;
  createdAt: string; // ISO string for storage
  updatedAt: string;
}

export interface CategoryData {
  id: string;
  name: string;
  color: string;
  order: number;
}

export interface StorageService {
  saveToLocal: (data: WebpageData[]) => Promise<void>;
  loadFromLocal: () => Promise<WebpageData[]>;
  saveToSync: (data: CategoryData[]) => Promise<void>;
  loadFromSync: () => Promise<CategoryData[]>;
  exportData: () => Promise<string>;
  importData: (jsonData: string) => Promise<void>;
}

export function createStorageService(): StorageService {
  const local = chrome.storage.local;
  const sync = chrome.storage.sync;

  function isWebpageData(x: any): x is WebpageData {
    return (
      x &&
      typeof x.id === 'string' &&
      typeof x.title === 'string' &&
      typeof x.url === 'string'
    );
  }
  function isCategoryData(x: any): x is CategoryData {
    return (
      x &&
      typeof x.id === 'string' &&
      typeof x.name === 'string' &&
      typeof x.order === 'number'
    );
  }

  const saveToLocal = (data: WebpageData[]) =>
    new Promise<void>((resolve, reject) => {
      if (!Array.isArray(data) || !data.every(isWebpageData))
        return reject(new Error('Invalid webpages'));
      local.set({ webpages: data }, () => resolve());
    });

  const loadFromLocal = () =>
    new Promise<WebpageData[]>((resolve) => {
      local.get({ webpages: [] }, ({ webpages }: any) => {
        resolve(Array.isArray(webpages) ? webpages : []);
      });
    });

  const saveToSync = (data: CategoryData[]) =>
    new Promise<void>((resolve, reject) => {
      if (!Array.isArray(data) || !data.every(isCategoryData))
        return reject(new Error('Invalid categories'));
      sync.set({ categories: data }, () => resolve());
    });

  const loadFromSync = () =>
    new Promise<CategoryData[]>((resolve) => {
      sync.get({ categories: [] }, ({ categories }: any) => {
        resolve(Array.isArray(categories) ? categories : []);
      });
    });

  const exportData = async () => {
    const [webpages, categories] = await Promise.all([
      loadFromLocal(),
      loadFromSync(),
    ]);
    return JSON.stringify({ webpages, categories });
  };

  const importData = async (jsonData: string) => {
    let parsed: any;
    try {
      parsed = JSON.parse(jsonData);
    } catch {
      throw new Error('Invalid JSON');
    }
    const pages = parsed?.webpages ?? [];
    const cats = parsed?.categories ?? [];
    if (!Array.isArray(pages) || !pages.every(isWebpageData))
      throw new Error('Invalid webpages payload');
    if (!Array.isArray(cats) || !cats.every(isCategoryData))
      throw new Error('Invalid categories payload');
    await Promise.all([saveToLocal(pages), saveToSync(cats)]);
  };

  return {
    saveToLocal,
    loadFromLocal,
    saveToSync,
    loadFromSync,
    exportData,
    importData,
  };
}
