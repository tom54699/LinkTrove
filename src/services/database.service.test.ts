import { describe, it, expect, vi, beforeEach } from 'vitest';
import { databaseService } from './database.service';
import { db } from './database';
import { Item } from '../models/item.model';

// Mock the db instance
vi.mock('./database', () => {
  const mockDb = {
    items: {
      add: vi.fn(),
      get: vi.fn(),
      put: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      bulkAdd: vi.fn(),
      where: vi.fn(),
      equals: vi.fn(),
      toArray: vi.fn(),
    },
    transaction: vi.fn((mode, tables, txScope) => txScope()),
  };
  // Chain mock for where().equals().toArray()
  mockDb.items.where.mockReturnValue(mockDb.items as any);
  mockDb.items.equals.mockReturnValue(mockDb.items as any);

  return { db: mockDb };
});

const mockItem: Item = { id: '123', title: 'Test Book', createdAt: new Date(), updatedAt: new Date(), categoryPath: [], tags: [], customFields: {}, isPrivate: false };
const deletedMockItem: Item = { ...mockItem, deletedAt: new Date() };

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
    it('should retrieve a non-deleted item by id', async () => {
      (db.items.get as vi.Mock).mockResolvedValue(mockItem);
      const result = await databaseService.getItem('123');
      expect(db.items.get).toHaveBeenCalledWith('123');
      expect(result).toEqual(mockItem);
    });

    it('should return undefined for a soft-deleted item', async () => {
      (db.items.get as vi.Mock).mockResolvedValue(deletedMockItem);
      const result = await databaseService.getItem('123');
      expect(db.items.get).toHaveBeenCalledWith('123');
      expect(result).toBeUndefined();
    });
  });

  describe('getAllItems', () => {
    it('should retrieve all non-deleted items', async () => {
        (db.items.toArray as vi.Mock).mockResolvedValue([mockItem]);
        const result = await databaseService.getAllItems();
        expect(db.items.where).toHaveBeenCalledWith('deletedAt');
        expect(db.items.equals).toHaveBeenCalledWith(undefined);
        expect(result).toEqual([mockItem]);
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

  describe('softDeleteItem', () => {
    it('should soft delete an item by setting deletedAt', async () => {
      await databaseService.softDeleteItem('123');
      expect(db.items.update).toHaveBeenCalledWith('123', { deletedAt: expect.any(Date) });
    });
  });

  describe('recoverItem', () => {
    it('should recover a soft-deleted item', async () => {
        (db.items.get as vi.Mock).mockResolvedValue(deletedMockItem);
        await databaseService.recoverItem('123');

        const expectedItem = { ...deletedMockItem };
        delete expectedItem.deletedAt;
        expect(db.items.put).toHaveBeenCalledWith(expectedItem);
    });
  });

  describe('batchCreateItems', () => {
    it('should create multiple items in a transaction', async () => {
      const partialItems = [
        { title: 'Book 1', categoryPath: [], tags: [], customFields: {}, isPrivate: false },
        { title: 'Book 2', categoryPath: [], tags: [], customFields: {}, isPrivate: false },
      ];
      const result = await databaseService.batchCreateItems(partialItems);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBeDefined();
      expect(result[1].id).toBeDefined();
      expect(db.transaction).toHaveBeenCalled();
      expect(db.items.bulkAdd).toHaveBeenCalledWith(result);
    });
  });
});
