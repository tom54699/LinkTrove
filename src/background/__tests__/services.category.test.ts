import { describe, it, expect } from 'vitest';
import { DatabaseManager } from '../db/DatabaseManager';
import { CategoryService } from '../db/CategoryService';

describe('CategoryService (3.2)', () => {
  it('creates, updates, reorders, builds tree', async () => {
    const db = new DatabaseManager('memory');
    await db.init();
    const svc = new CategoryService(db);

    const root = await svc.create({ name: 'Root' });
    const c1 = await svc.create({ name: 'Child 1', parentId: root, sortOrder: 2 });
    const c2 = await svc.create({ name: 'Child 2', parentId: root, sortOrder: 1 });

    await svc.update(c1, { name: 'Child 1a' });
    await svc.reorder([{ id: c1, sortOrder: 5 }, { id: c2, sortOrder: 2 }]);
    const tree = await svc.getTree();
    expect(tree.length).toBeGreaterThan(0);
    const rootNode = tree.find(t => t.id === root)!;
    expect(rootNode.children[0].name).toBe('Child 2');

    await svc.remove(c2);
    const tree2 = await svc.getTree();
    const root2 = tree2.find(t => t.id === root)!;
    expect(root2.children.some(x => x.id === c2)).toBe(false);
  });
});

