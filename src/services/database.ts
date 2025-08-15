import Dexie, { Table } from 'dexie';

import type { Item } from '../models/item.model';
import type { Category } from '../models/category.model';
import type { CustomField } from '../models/custom-field.model';
import type { Tag } from '../models/tag.model';
import type { History } from '../models/history.model';
import type { SearchIndex } from '../models/search-index.model';
import type { ShareCollection } from '../models/share-collection.model';


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
    // Add version 2 for the soft-delete feature
    this.version(2).stores({
      items: '++id, title, &url, *categoryPath, *tags, createdAt, updatedAt, deletedAt',
    });
  }
}

export const db = new AppDatabase();
