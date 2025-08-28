export interface WebpageData {
  id: string;
  title: string;
  url: string;
  favicon: string;
  note: string;
  category: string;
  meta?: Record<string, string>;
  createdAt: string; // ISO string for storage
  updatedAt: string;
}

export interface CategoryData {
  id: string;
  name: string;
  color: string;
  order: number;
  defaultTemplateId?: string;
}

export interface TemplateField {
  key: string; // e.g. author
  label: string; // 顯示名稱
  type: 'text' | 'number' | 'date' | 'url' | 'select' | 'rating';
  required?: boolean;
  defaultValue?: string;
  options?: string[]; // for select
}

export interface TemplateData {
  id: string;
  name: string;
  fields: TemplateField[];
}

export interface StorageService {
  saveToLocal: (data: WebpageData[]) => Promise<void>;
  loadFromLocal: () => Promise<WebpageData[]>;
  saveToSync: (data: CategoryData[]) => Promise<void>;
  loadFromSync: () => Promise<CategoryData[]>;
  saveTemplates: (data: TemplateData[]) => Promise<void>;
  loadTemplates: () => Promise<TemplateData[]>;
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
  function isTemplateField(x: any): x is TemplateField {
    const okBase = x && typeof x.key === 'string' && typeof x.label === 'string';
    if (!okBase) return false;
    const t = x.type || 'text';
    const okType = ['text','number','date','url','select','rating'].includes(t);
    if (!okType) return false;
    if (t === 'select' && x.options && !Array.isArray(x.options)) return false;
    return true;
  }
  function isTemplateData(x: any): x is TemplateData {
    return x && typeof x.id === 'string' && typeof x.name === 'string' && Array.isArray(x.fields) && x.fields.every(isTemplateField);
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

  const saveTemplates = (data: TemplateData[]) =>
    new Promise<void>((resolve, reject) => {
      if (!Array.isArray(data) || !data.every(isTemplateData))
        return reject(new Error('Invalid templates'));
      sync.set({ templates: data }, () => resolve());
    });

  const loadTemplates = () =>
    new Promise<TemplateData[]>((resolve) => {
      sync.get({ templates: [] }, ({ templates }: any) => {
        resolve(Array.isArray(templates) ? templates : []);
      });
    });

  const exportData = async () => {
    const [webpages, categories, templates] = await Promise.all([
      loadFromLocal(),
      loadFromSync(),
      loadTemplates(),
    ]);
    return JSON.stringify({ webpages, categories, templates });
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
    const tmpls = parsed?.templates ?? [];
    if (!Array.isArray(pages) || !pages.every(isWebpageData))
      throw new Error('Invalid webpages payload');
    if (!Array.isArray(cats) || !cats.every(isCategoryData))
      throw new Error('Invalid categories payload');
    if (!Array.isArray(tmpls) || !tmpls.every(isTemplateData))
      throw new Error('Invalid templates payload');
    await Promise.all([saveToLocal(pages), saveToSync(cats), saveTemplates(tmpls)]);
  };

  return {
    saveToLocal,
    loadFromLocal,
    saveToSync,
    loadFromSync,
    saveTemplates,
    loadTemplates,
    exportData,
    importData,
  };
}
