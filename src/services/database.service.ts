import { db } from './database';
import type { Item } from '../models/item.model';
import { v4 as uuidv4 } from 'uuid';

class DatabaseService {
  async createItem(item: Omit<Item, 'id' | 'createdAt' | 'updatedAt'>): Promise<Item> {
    const newItem: Item = {
      ...item,
      id: uuidv4(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await db.items.add(newItem);
    return newItem;
  }

  async getItem(id: string): Promise<Item | undefined> {
    const item = await db.items.get(id);
    // Return item only if it's not soft-deleted
    return item && !item.deletedAt ? item : undefined;
  }

  async getAllItems(): Promise<Item[]> {
    // The index on `deletedAt` allows for efficient querying of non-deleted items.
    return await db.items.where('deletedAt').equals(undefined as any).toArray();
  }

  async updateItem(id: string, updates: Partial<Omit<Item, 'id' | 'createdAt'>>): Promise<number> {
    const itemToUpdate = {
      ...updates,
      updatedAt: new Date(),
    };
    return await db.items.update(id, itemToUpdate);
  }

  async softDeleteItem(id: string): Promise<number> {
    return await db.items.update(id, { deletedAt: new Date() });
  }

  async recoverItem(id: string): Promise<number> {
    const item = await db.items.get(id);
    if (item && item.deletedAt) {
      delete item.deletedAt;
      await db.items.put(item);
      return 1; // Indicate success
    }
    return 0; // Indicate item not found or not deleted
  }

  async hardDeleteItem(id: string): Promise<void> {
    return await db.items.delete(id);
  }

  async batchCreateItems(items: Omit<Item, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<Item[]> {
    const newItems: Item[] = items.map(item => ({
      ...item,
      id: uuidv4(),
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    await db.transaction('rw', db.items, async () => {
      await db.items.bulkAdd(newItems);
    });

    return newItems;
  }
}

export const databaseService = new DatabaseService();
