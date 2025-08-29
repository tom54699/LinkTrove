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
  errors?: Array<{ phase: 'categories' | 'bookmarks'; message: string; itemId?: string }>;
}

export type MigrationPhase = 'prepare' | 'migrating-categories' | 'migrating-bookmarks' | 'done';

export interface MigrationProgressEvent {
  phase: MigrationPhase;
  totalCategories: number;
  totalBookmarks: number;
  migratedCategories: number;
  migratedBookmarks: number;
}

export interface MigrateOptions {
  dryRun?: boolean;
  onProgress?: (evt: MigrationProgressEvent) => void;
}
