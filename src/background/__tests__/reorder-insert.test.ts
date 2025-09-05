import { describe, it, expect } from 'vitest';
import { createWebpageService } from '../webpageService';

function makeSvc(initial: any[]) {
  const store: any[] = [...initial];
  const svc = createWebpageService({
    storage: {
      saveToLocal: async (d: any[]) => {
        store.splice(0, store.length, ...d);
      },
      loadFromLocal: async () => [...store],
      saveToSync: async () => {},
      loadFromSync: async () => [],
      saveTemplates: async () => {},
      loadTemplates: async () => [],
      exportData: async () => '[]',
      importData: async () => {},
    } as any,
  });
  return { svc, store };
}

describe('reorderWebpages insert before target', () => {
  it('inserts at target index and shifts target forward', async () => {
    const initial = [
      {
        id: 'n',
        title: 'New',
        url: 'https://n',
        favicon: '',
        note: '',
        category: 'default',
        createdAt: '',
        updatedAt: '',
      },
      {
        id: 'a',
        title: 'A',
        url: 'https://a',
        favicon: '',
        note: '',
        category: 'default',
        createdAt: '',
        updatedAt: '',
      },
    ];
    const { svc } = makeSvc(initial);
    const after = await (svc as any).reorderWebpages('n', 'a');
    expect(after.map((x: any) => x.id)).toEqual(['n', 'a']);
    // move from 0 to index of b (1) should still place before b after adjustment
    const after2 = await (svc as any).reorderWebpages('n', 'a');
    expect(after2.map((x: any) => x.id)).toEqual(['n', 'a']);
  });
});
