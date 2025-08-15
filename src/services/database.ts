import Dexie, { Table } from 'dexie';

// --- Data Model Interfaces from requirements.md ---

export interface Item {
  id: string;              // UUID
  title: string;           // Required
  url?: string;            // Unique constraint
  coverUrl?: string;
  description?: string;
  categoryPath: string[];  // Multi-level category path
  tags: string[];          // Tag array
  customFields: Record<string, any>; // Custom field values
  createdAt: Date;
  updatedAt: Date;
  isPrivate: boolean;      // Item privacy
}

export interface CustomField {
  id: string;
  name: string;
  type: 'text' | 'number' | 'url' | 'date' | 'select' | 'boolean' | 'textarea' | 'rating';
  isPrivate: boolean;
  isRequired: boolean;
  options?: string[];
  defaultValue?: any;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}

export interface Category {
  id: string;
  name: string;
  parentId?: string;
  description?: string;
  icon?: string;
  color?: string;
  order: number;
}

// --- Placeholder interfaces for other tables ---

export interface Tag {
  id: string;
  name: string;
  color?: string;
  usageCount: number;
}

export interface History {
  id: string;
  timestamp: Date;
  type: string; // e.g., 'create', 'update', 'delete'
  affectedItemIds: string[];
}

export interface SearchIndex {
  id: string;
  itemId: string;
  content: string;
}

export interface ShareCollection {
  id: string;
  title: string;
  createdAt: Date;
  // Note: Full share collection details are omitted for this initial schema
}


// --- Dexie Database Class ---

export class AppDatabase extends Dexie {
  items!: Table<Item, string>;
  categories!: Table<Category, string>;
  customFields!: Table<CustomField, string>;
  tags!: Table<Tag, string>;
  history!: Table<History, string>;
  searchIndex!: Table<SearchIndex, string>;
  shareCollections!: Table<ShareCollection, string>;

  constructor() {
    super('NovelComicCollectorDB');
    this.version(1).stores({
      items: '++id, title, &url, *categoryPath, *tags, createdAt, updatedAt',
      categories: '++id, name, parentId, order',
      customFields: '++id, name, type, isPrivate',
      tags: '++id, name, color, usageCount',
      history: '++id, timestamp, type, *affectedItemIds',
      searchIndex: '++id, itemId',
      shareCollections: '++id, title, createdAt',
    });
  }
}

export const db = new AppDatabase();
