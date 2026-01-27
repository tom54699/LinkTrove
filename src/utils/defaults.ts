export const DEFAULT_ORGANIZATION_NAME = 'My Space';
export const DEFAULT_CATEGORY_NAME = 'Bookmarks';
export const DEFAULT_GROUP_NAME = 'General';

export function createEntityId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

export function isDefaultName(name: string | undefined, expected: string): boolean {
  return String(name || '').trim() === expected;
}
