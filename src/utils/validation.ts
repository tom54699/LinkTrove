import type { Item } from '../models/item.model';
import type { Category } from '../models/category.model';

export const validateItem = (item: Partial<Item>): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!item.title || item.title.trim() === '') {
    errors.push('Title is required.');
  }

  // Basic URL validation if url is present
  if (item.url) {
    try {
      new URL(item.url);
    } catch (_) {
      errors.push('Invalid URL format.');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

export const validateCategory = (category: Partial<Category>): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!category.name || category.name.trim() === '') {
    errors.push('Category name is required.');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};
