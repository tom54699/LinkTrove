import { describe, it, expect, vi, beforeEach } from 'vitest';
import { databaseService } from './database.service';
import { db } from './database';

// Mock the db instance
vi.mock('./database', () => {
  const mockDb = {
    items: {
      add: vi.fn(),
      get: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      bulkAdd: vi.fn(),
    },
    transaction: vi.fn((mode, tables, txScope) => txScope()),
  };
  return { db: mockDb };
});

describe('DatabaseService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createItem', () => {
    it('should create an item with a new id and timestamps', async () => {
      const partialItem = { title: 'New Book', categoryPath: [], tags: [], customFields: {}, isPrivate: false };
      const result = await databaseService.createItem(partialItem);

      expect(result.title).toBe('New Book');
      expect(result.id).toBeDefined();
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
      expect(db.items.add).toHaveBeenCalledWith(result);
    });
  });

  describe('getItem', () => {
    it('should retrieve an item by id', async () => {
      const mockItem = { id: '123', title: 'Test Book', createdAt: new Date(), updatedAt: new Date(), categoryPath: [], tags: [], customFields: {}, isPrivate: false };
      (db.items.get as vi.Mock).mockResolvedValue(mockItem);

      const result = await databaseService.getItem('123');
      expect(db.items.get).toHaveBeenCalledWith('123');
      expect(result).toEqual(mockItem);
    });
  });

  describe('updateItem', () => {
    it('should update an item with new data and timestamp', async () => {
      const updates = { title: 'Updated Title' };
      await databaseService.updateItem('123', updates);

      const expectedUpdate = {
        title: 'Updated Title',
        updatedAt: expect.any(Date),
      };
      expect(db.items.update).toHaveBeenCalledWith('123', expectedUpdate);
    });
  });

  describe('deleteItem', () => {
    it('should delete an item by id', async () => {
      await databaseService.deleteItem('123');
      expect(db.items.delete).toHaveBeenCalledWith('123');
    });
  });

  describe('batchCreateItems', () => {
    it('should create multiple items in a transaction', async () => {
      const partialItems = [{ title: 'Book 1' }, { title: 'Book 2' }];
      const result = await databaseService.batchCreateItems(partialItems as any);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBeDefined();
      expect(result[1].id).toBeDefined();
      expect(db.transaction).toHaveBeenCalled();
      expect(db.items.bulkAdd).toHaveBeenCalledWith(result);
    });
  });
});
