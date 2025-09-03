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

import { createIdbStorageService } from './idb/storage';

export function createStorageService(): StorageService {
  // Delegate to IndexedDB-backed implementation (ESM import)
  return createIdbStorageService();
}
