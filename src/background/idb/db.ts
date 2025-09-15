export type StoreName =
  | 'webpages'
  | 'categories'
  | 'templates'
  | 'meta'
  | 'subcategories'
  | 'organizations';

let dbPromise: Promise<IDBDatabase> | null = null;

export function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open('linktrove', 3);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('webpages')) {
        const s = db.createObjectStore('webpages', { keyPath: 'id' });
        s.createIndex('category', 'category');
        s.createIndex('url', 'url');
        s.createIndex('updatedAt', 'updatedAt');
        try {
          s.createIndex('category_subcategory', ['category', 'subcategoryId']);
        } catch {}
      }
      // If upgrading from v1, add missing index to existing store
      if (db.objectStoreNames.contains('webpages')) {
        const s = req.transaction?.objectStore('webpages');
        try {
          // Create composite index if not present
          if (s && !s.indexNames.contains('category_subcategory')) {
            s.createIndex('category_subcategory', ['category', 'subcategoryId']);
          }
        } catch {}
      }
      if (!db.objectStoreNames.contains('categories')) {
        const s = db.createObjectStore('categories', { keyPath: 'id' });
        s.createIndex('order', 'order');
        try { s.createIndex('by_organizationId', 'organizationId'); } catch {}
        try { s.createIndex('by_organizationId_order', ['organizationId', 'order']); } catch {}
      }
      // If upgrading, ensure new indexes on categories exist
      if (db.objectStoreNames.contains('categories')) {
        const s = req.transaction?.objectStore('categories');
        try { if (s && !s.indexNames.contains('by_organizationId')) s.createIndex('by_organizationId', 'organizationId'); } catch {}
        try {
          if (s && !s.indexNames.contains('by_organizationId_order')) s.createIndex('by_organizationId_order', ['organizationId', 'order']);
        } catch {}
      }
      if (!db.objectStoreNames.contains('templates')) {
        db.createObjectStore('templates', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta', { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains('subcategories')) {
        const s = db.createObjectStore('subcategories', { keyPath: 'id' });
        try { s.createIndex('by_categoryId', 'categoryId'); } catch {}
        try { s.createIndex('by_categoryId_order', ['categoryId', 'order']); } catch {}
      }
      if (!db.objectStoreNames.contains('organizations')) {
        const s = db.createObjectStore('organizations', { keyPath: 'id' });
        try { s.createIndex('order', 'order'); } catch {}
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

export async function tx<T>(
  stores: StoreName[] | StoreName,
  mode: IDBTransactionMode,
  fn: (t: IDBTransaction) => Promise<T> | T
): Promise<T> {
  const db = await openDb();
  const names = Array.isArray(stores) ? stores : [stores];
  return new Promise<T>((resolve, reject) => {
    const tr = db.transaction(names, mode);
    const done = (v: T) => resolve(v);
    const fail = (e: any) => reject(e);
    Promise.resolve(fn(tr)).then(done, fail);
    tr.oncomplete = () => {};
    tr.onerror = () => fail(tr.error);
    tr.onabort = () => fail(tr.error || new Error('tx aborted'));
  });
}

export async function putAll(store: StoreName, items: any[]): Promise<void> {
  await tx(store, 'readwrite', async (t) => {
    const s = t.objectStore(store);
    for (const it of items) s.put(it);
  });
}

export async function getAll(store: StoreName): Promise<any[]> {
  return tx(store, 'readonly', async (t) => {
    const s = t.objectStore(store);
    return await new Promise<any[]>((resolve, reject) => {
      const req = s.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  });
}

export async function clearStore(store: StoreName): Promise<void> {
  await tx(store, 'readwrite', async (t) => {
    t.objectStore(store).clear();
  });
}

export async function getMeta<T = any>(key: string): Promise<T | undefined> {
  return tx('meta', 'readonly', async (t) => {
    const s = t.objectStore('meta');
    return await new Promise<T | undefined>((resolve, reject) => {
      const req = s.get(key);
      req.onsuccess = () => resolve(req.result?.value);
      req.onerror = () => reject(req.error);
    });
  });
}

export async function setMeta(key: string, value: any): Promise<void> {
  await tx('meta', 'readwrite', async (t) => {
    const s = t.objectStore('meta');
    s.put({ key, value });
  });
}
