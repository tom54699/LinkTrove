import { describe, it, expect } from 'vitest';
import { validateItem, validateCategory } from './validation';

describe('Validation Utilities', () => {
  describe('validateItem', () => {
    it('should return valid for an item with a title', () => {
      const result = validateItem({ title: 'A valid title' });
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return invalid for an item without a title', () => {
      const result = validateItem({ description: 'No title' });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Title is required.');
    });

    it('should return invalid for an item with an empty title', () => {
      const result = validateItem({ title: '  ' });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Title is required.');
    });

    it('should return invalid for an item with an invalid URL', () => {
      const result = validateItem({ title: 'A valid title', url: 'not-a-url' });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid URL format.');
    });

    it('should return valid for an item with a valid URL', () => {
      const result = validateItem({ title: 'A valid title', url: 'https://example.com' });
      expect(result.isValid).toBe(true);
    });
  });

  describe('validateCategory', () => {
    it('should return valid for a category with a name', () => {
      const result = validateCategory({ name: 'Valid Category' });
      expect(result.isValid).toBe(true);
    });

    it('should return invalid for a category without a name', () => {
      const result = validateCategory({ description: 'No name' });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Category name is required.');
    });
  });
});
