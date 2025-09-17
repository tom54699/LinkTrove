import { describe, it, expect, beforeEach } from 'vitest';
import { setDragWebpage, getDragWebpage, setDragTab, getDragTab } from '../dragContext';

describe('dragContext', () => {
  beforeEach(() => {
    // Reset drag context before each test
    setDragWebpage(null);
    setDragTab(null);
  });

  describe('DragWebpage', () => {
    it('should store and retrieve webpage drag data with description', () => {
      const testWebpage = {
        id: 'test-id',
        title: 'Test Title',
        url: 'https://example.com',
        favicon: 'https://example.com/favicon.ico',
        description: 'Test description content'
      };

      setDragWebpage(testWebpage);
      const retrieved = getDragWebpage();

      expect(retrieved).toEqual(testWebpage);
      expect(retrieved?.description).toBe('Test description content');
    });

    it('should handle webpage drag data without description', () => {
      const testWebpage = {
        id: 'test-id',
        title: 'Test Title',
        url: 'https://example.com',
        favicon: 'https://example.com/favicon.ico'
      };

      setDragWebpage(testWebpage);
      const retrieved = getDragWebpage();

      expect(retrieved).toEqual(testWebpage);
      expect(retrieved?.description).toBeUndefined();
    });

    it('should return null when no webpage is being dragged', () => {
      expect(getDragWebpage()).toBeNull();
    });

    it('should clear webpage drag data when set to null', () => {
      const testWebpage = {
        id: 'test-id',
        title: 'Test Title',
        url: 'https://example.com',
        favicon: 'https://example.com/favicon.ico',
        description: 'Test description'
      };

      setDragWebpage(testWebpage);
      expect(getDragWebpage()).toEqual(testWebpage);

      setDragWebpage(null);
      expect(getDragWebpage()).toBeNull();
    });
  });

  describe('DragTab', () => {
    it('should store and retrieve tab drag data', () => {
      const testTab = {
        id: 123,
        title: 'Test Tab',
        url: 'https://example.com',
        favIconUrl: 'https://example.com/favicon.ico'
      };

      setDragTab(testTab);
      const retrieved = getDragTab();

      expect(retrieved).toEqual(testTab);
    });

    it('should return null when no tab is being dragged', () => {
      expect(getDragTab()).toBeNull();
    });

    it('should clear tab drag data when set to null', () => {
      const testTab = {
        id: 123,
        title: 'Test Tab',
        url: 'https://example.com',
        favIconUrl: 'https://example.com/favicon.ico'
      };

      setDragTab(testTab);
      expect(getDragTab()).toEqual(testTab);

      setDragTab(null);
      expect(getDragTab()).toBeNull();
    });
  });
});