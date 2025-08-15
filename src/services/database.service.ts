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
    return await db.items.get(id);
  }

  async updateItem(id: string, updates: Partial<Omit<Item, 'id' | 'createdAt'>>): Promise<number> {
    const itemToUpdate = {
      ...updates,
      updatedAt: new Date(),
    };
    return await db.items.update(id, itemToUpdate);
  }

  async deleteItem(id: string): Promise<void> {
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
