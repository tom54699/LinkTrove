import { DEFAULT_GROUP_NAME, createEntityId } from '../../utils/defaults';

export type StoreName =
  | 'webpages'
  | 'categories'
  | 'templates'
  | 'meta'
  | 'subcategories'
  | 'organizations';

// Ensure subcategory defaults for pages missing subcategoryId.
async function ensureSubcategoriesMigrated(): Promise<void> {
  try {
    const done = await getMeta<boolean>('migratedSubcategoriesV1');
    if (done) return;
  } catch {}
  try {
    await tx(['categories', 'subcategories' as any, 'webpages', 'meta'], 'readwrite', async (t) => {
      const metaS = t.objectStore('meta');
      // recheck inside tx
      const curFlag: any = await new Promise((resolve, reject) => {
        const rq = metaS.get('migratedSubcategoriesV1');
        rq.onsuccess = () => resolve(rq.result?.value);
        rq.onerror = () => reject(rq.error);
      });
      if (curFlag) return;
      const catS = t.objectStore('categories');
      const subS = t.objectStore('subcategories' as any);
      const pageS = t.objectStore('webpages');
      const cats: any[] = await new Promise((res, rej) => { const rq = catS.getAll(); rq.onsuccess = () => res(rq.result || []); rq.onerror = () => rej(rq.error); });
      const subs: any[] = await new Promise((res, rej) => { try { const rq = subS.getAll(); rq.onsuccess = () => res(rq.result || []); rq.onerror = () => rej(rq.error); } catch { res([]); } });
      const pages: any[] = await new Promise((res, rej) => { const rq = pageS.getAll(); rq.onsuccess = () => res(rq.result || []); rq.onerror = () => rej(rq.error); });
      const hasAnySubByCat: Record<string, boolean> = {}; for (const s of subs) hasAnySubByCat[s.categoryId] = true;
      const need = new Set<string>(); for (const p of pages) if (p.category && !p.subcategoryId) need.add(p.category);
      const now = Date.now(); const defaults: Record<string, any> = {};
      for (const cid of need) {
        if (!hasAnySubByCat[cid] && cats.some((c) => c.id === cid)) {
          const id = createEntityId('g');
          const matchCat = cats.find((c) => c.id === cid);
          const sc = {
            id,
            categoryId: cid,
            name: DEFAULT_GROUP_NAME,
            order: 0,
            createdAt: now,
            updatedAt: now,
            isDefault: !!(matchCat as any)?.isDefault,
          } as any;
          subS.put(sc); defaults[cid] = sc;
        }
      }
      for (const p of pages) {
        if (!p.subcategoryId && p.category && defaults[p.category]) {
          p.subcategoryId = defaults[p.category].id; pageS.put(p);
        }
      }
      try { metaS.put({ key: 'migratedSubcategoriesV1', value: true }); } catch {}
    });
  } catch {}
}

export function openDb(): Promise<IDBDatabase> {
  // 不緩存連線，避免測試期間 deleteDatabase 被鎖住
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('linktrove', 3);
    req.onblocked = () => {
      try { /* if blocked during upgrade/delete, there might be another open connection; nothing to do here */ } catch {}
    };
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
      // If upgrading, ensure new indexes on subcategories exist
      if (db.objectStoreNames.contains('subcategories')) {
        const s = req.transaction?.objectStore('subcategories');
        try { if (s && !s.indexNames.contains('by_categoryId')) s.createIndex('by_categoryId', 'categoryId'); } catch {}
        try { if (s && !s.indexNames.contains('by_categoryId_order')) s.createIndex('by_categoryId_order', ['categoryId', 'order']); } catch {}
      }
      if (!db.objectStoreNames.contains('organizations')) {
        const s = db.createObjectStore('organizations', { keyPath: 'id' });
        try { s.createIndex('order', 'order'); } catch {}
      }
    };
    req.onsuccess = () => {
      const db = req.result;
      // 允許外部 deleteDatabase 時自動關閉，避免 blocked 導致測試 timeout
      try { db.onversionchange = () => { try { db.close(); } catch {} }; } catch {}
      resolve(db);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function tx<T>(
  stores: StoreName[] | StoreName,
  mode: IDBTransactionMode,
  fn: (t: IDBTransaction) => Promise<T> | T
): Promise<T> {
  const db = await openDb();
  const names = Array.isArray(stores) ? stores : [stores];
  const shouldNotify = mode === 'readwrite' && names.some((n) => n === 'webpages' || n === 'categories' || n === 'templates' || n === 'subcategories' || n === 'organizations');
  return new Promise<T>((resolve, reject) => {
    const tr = db.transaction(names, mode);
    const done = (v: T) => resolve(v);
    const fail = (e: any) => reject(e);
    Promise.resolve(fn(tr)).then(done, fail);
    tr.oncomplete = () => {
      if (shouldNotify) {
        try {
          window.dispatchEvent(new CustomEvent('idb:changed', { detail: { stores: names } }));
        } catch {}
      }
    };
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
  if (store === 'subcategories') {
    try { await ensureSubcategoriesMigrated(); } catch {}
  }
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
