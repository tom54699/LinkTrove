import { DatabaseManager, type CategoryRow } from './DatabaseManager';

export interface CategoryData {
  name: string;
  color?: string;
  icon?: string;
  parentId?: number | null;
  sortOrder?: number;
}

export class CategoryService {
  constructor(private db: DatabaseManager) {}

  async create(data: CategoryData): Promise<number> {
    const name = (data.name || '').trim();
    if (!name) throw new Error('Category name required');
    return this.db.insertCategory({
      name,
      color: data.color,
      icon: data.icon,
      parent_id: data.parentId ?? null,
      sort_order: data.sortOrder ?? 0,
    });
  }

  async list(): Promise<CategoryRow[]> {
    return this.db.listCategories();
  }

  async update(id: number, patch: Partial<CategoryData>): Promise<void> {
    // We don't have direct category update in DB manager; emulate by export/import minimal
    const cats = await this.db.listCategories();
    const found = cats.find(c => c.id === id);
    if (!found) return;
    const next: CategoryRow = {
      ...found,
      name: patch.name !== undefined ? (patch.name || found.name) : found.name,
      color: patch.color !== undefined ? patch.color : found.color,
      icon: patch.icon !== undefined ? patch.icon : found.icon,
      parent_id: patch.parentId !== undefined ? patch.parentId! : found.parent_id,
      sort_order: patch.sortOrder !== undefined ? (patch.sortOrder as any) : found.sort_order,
    } as any;
    const snap = await this.db.exportSnapshot();
    const all = snap.categories.map(c => c.id === id ? next : c);
    await this.db.importSnapshot({ ...snap, categories: all });
  }

  async remove(id: number): Promise<void> {
    const snap = await this.db.exportSnapshot();
    const cats = snap.categories.filter(c => c.id !== id);
    // Optionally: reassign orphan bookmarks to null
    const bms = snap.bookmarks.map(b => (b.category_id === id ? { ...b, category_id: null } : b));
    await this.db.importSnapshot({ ...snap, categories: cats, bookmarks: bms });
  }

  async reorder(order: Array<{ id: number; sortOrder: number }>): Promise<void> {
    const snap = await this.db.exportSnapshot();
    const map = new Map(order.map(o => [o.id, o.sortOrder]));
    const cats = snap.categories.map(c => ({ ...c, sort_order: map.has(c.id) ? map.get(c.id)! : c.sort_order }));
    await this.db.importSnapshot({ ...snap, categories: cats });
  }

  async getTree(): Promise<Array<CategoryRow & { children: CategoryRow[] }>> {
    const cats = await this.db.listCategories();
    const byParent = new Map<number | null, CategoryRow[]>();
    for (const c of cats) {
      const pid = (c.parent_id ?? null) as any;
      if (!byParent.has(pid)) byParent.set(pid, []);
      byParent.get(pid)!.push(c);
    }
    function build(pid: number | null): any[] {
      const arr = (byParent.get(pid) || []).sort((a,b)=> (a.sort_order??0)-(b.sort_order??0));
      return arr.map(c => ({ ...c, children: build(c.id) }));
    }
    return build(null);
  }

  async stats(): Promise<Array<{ id: number; name: string; direct: number; withChildren: number }>> {
    const snap = await this.db.exportSnapshot();
    const childrenMap = new Map<number | null, number[]>();
    for (const c of snap.categories) {
      const pid = (c.parent_id ?? null) as any;
      if (!childrenMap.has(pid)) childrenMap.set(pid, []);
      childrenMap.get(pid)!.push(c.id);
    }
    const directCount = new Map<number, number>();
    for (const b of snap.bookmarks) {
      const cid = (b.category_id ?? null) as any;
      if (cid === null) continue; // skip uncategorized in per-category stats
      directCount.set(cid, (directCount.get(cid) || 0) + 1);
    }
    function sumWithChildren(id: number): number {
      let sum = directCount.get(id) || 0;
      const kids = childrenMap.get(id) || [];
      for (const k of kids) sum += sumWithChildren(k);
      return sum;
    }
    return snap.categories.map(c => ({
      id: c.id,
      name: c.name,
      direct: directCount.get(c.id) || 0,
      withChildren: sumWithChildren(c.id),
    }));
  }
}
