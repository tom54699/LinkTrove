export interface WebpageData {
  id: string;
  title: string;
  url: string;
  favicon: string;
  note: string;
  category: string;
  // Subcategory (group) id; optional in types for gradual migration
  subcategoryId?: string;
  meta?: Record<string, string>;
  // Template support
  templateId?: string;
  templateData?: Record<string, any>;
  // For backward compatibility, use note field as description
  description?: string;
  createdAt: string; // ISO string for storage
  updatedAt: string;
  // Tombstone for soft delete (sync support)
  deleted?: boolean;
  deletedAt?: string; // ISO string
}

export interface CategoryData {
  id: string;
  name: string;
  color: string;
  order: number;
  defaultTemplateId?: string;
  // Organization scoping (optional during migration)
  organizationId?: string;
  // Default marker (system-generated)
  isDefault?: boolean;
  updatedAt?: string;
  // Tombstone for soft delete (sync support)
  deleted?: boolean;
  deletedAt?: string;
}

export interface SubcategoryData {
  id: string;
  categoryId: string;
  name: string;
  order: number;
  createdAt: number;
  updatedAt: number;
  // Default marker (system-generated)
  isDefault?: boolean;
  // Tombstone for soft delete (sync support)
  deleted?: boolean;
  deletedAt?: number;
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
  updatedAt?: string;
  // Tombstone for soft delete (sync support)
  deleted?: boolean;
  deletedAt?: string;
}

export interface OrganizationData {
  id: string;
  name: string;
  color?: string;
  order: number;
  // Default marker (system-generated)
  isDefault?: boolean;
  updatedAt?: string;
  // Tombstone for soft delete (sync support)
  deleted?: boolean;
  deletedAt?: string;
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
  // Subcategories (groups)
  listSubcategories?: (categoryId: string) => Promise<SubcategoryData[]>;
  createSubcategory?: (
    categoryId: string,
    name: string,
    options?: { isDefault?: boolean; skipDefaultReset?: boolean }
  ) => Promise<SubcategoryData>;
  renameSubcategory?: (id: string, name: string) => Promise<void>;
  deleteSubcategory?: (id: string, reassignTo: string) => Promise<void>;
  // Delete a subcategory and all webpages under it (atomic within IDB tx)
  deleteSubcategoryAndPages?: (id: string) => Promise<void>;
  reorderSubcategories?: (categoryId: string, orderedIds: string[]) => Promise<void>;
  updateCardSubcategory?: (cardId: string, subcategoryId: string) => Promise<void>;
  deleteSubcategoriesByCategory?: (categoryId: string) => Promise<void>;

  // Maintenance/cleanup functions
  cleanupOrphanedOrderMeta?: () => Promise<{ cleanedCount: number; totalOrderKeys: number }>;
  normalizeOrderMeta?: () => Promise<void>;

  // Organizations CRUD / order
  listOrganizations?: () => Promise<OrganizationData[]>;
  createOrganization?: (
    name: string,
    color?: string,
    options?: { createDefaultCollection?: boolean }
  ) => Promise<{ organization: OrganizationData; defaultCollection: CategoryData | null }>;
  renameOrganization?: (id: string, name: string) => Promise<void>;
  deleteOrganization?: (
    id: string,
    options?: { reassignTo?: string }
  ) => Promise<void>;
  reorderOrganizations?: (orderedIds: string[]) => Promise<void>;

  // Categories helpers scoped by organization
  addCategory?: (
    name: string,
    color?: string,
    organizationId?: string
  ) => Promise<CategoryData>;
  reorderCategories?: (
    categoryIds: string[],
    organizationId: string
  ) => Promise<void>;
  updateCategoryOrganization?: (
    categoryId: string,
    toOrganizationId: string
  ) => Promise<void>;
}

import { createIdbStorageService } from './idb/storage';

export function createStorageService(): StorageService {
  // Delegate to IndexedDB-backed implementation (ESM import)
  return createIdbStorageService();
}
