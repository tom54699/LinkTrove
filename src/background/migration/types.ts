import type { WebpageData, CategoryData } from '../storageService';

export interface LegacyStores {
  loadWebpages(): Promise<WebpageData[]>;
  loadCategories(): Promise<CategoryData[]>;
  clearWebpages?(): Promise<void>;
  clearCategories?(): Promise<void>;
}

export interface MigrationResult {
  bookmarks: number;
  categories: number;
  skipped?: number;
}

