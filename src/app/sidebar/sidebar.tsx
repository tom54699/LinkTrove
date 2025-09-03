import React from 'react';
import { useCategories } from './categories';
import { useTemplates } from '../templates/TemplatesProvider';
import { useWebpages } from '../webpages/WebpagesProvider';

export const Sidebar: React.FC = () => {
  const { categories, selectedId, setCurrentCategory, actions: catActions } = useCategories() as any;
  const { templates } = useTemplates();
  const [editing, setEditing] = React.useState<any | null>(null);
  const [editName, setEditName] = React.useState('');
  const [editColor, setEditColor] = React.useState('#64748b');
  const [editTpl, setEditTpl] = React.useState<string>('');

  function openEditor(cat: any) {
    setEditing(cat);
    setEditName(cat.name || '');
    setEditColor(cat.color || '#64748b');
    setEditTpl(cat.defaultTemplateId || '');
  }
  const { actions } = useWebpages();

  return (
    <div className="text-[13px]">
      <div className="mb-4 text-lg font-semibold">Collections</div>
      <div className="text-[11px] uppercase text-[var(--muted)] mb-2">Spaces</div>
      <nav aria-label="Categories" className="space-y-1">
        {categories.map((c, idx) => {
        const active = selectedId === c.id;
        return (
          <div
            key={c.id}
            className={`w-full px-2 py-1 rounded transition-colors flex items-center gap-2 ${active ? 'bg-[#1f254a]' : 'hover:bg-[#1f254a]'}
            `}
            data-active={active ? 'true' : undefined}
            draggable
            onDragStart={(e) => {
              try { e.dataTransfer.setData('application/x-linktrove-category', c.id); e.dataTransfer.effectAllowed = 'move'; } catch {}
            }}
            onDragOver={(e) => { e.preventDefault(); }}
            onDragEnter={(e) => { (e.currentTarget as HTMLElement).setAttribute('data-drop','true'); }}
            onDragLeave={(e) => { (e.currentTarget as HTMLElement).removeAttribute('data-drop'); }}
            onDrop={(e) => {
              e.preventDefault();
              try {
                const catId = e.dataTransfer.getData('application/x-linktrove-category');
                if (catId) {
                  const ids = categories.map(x => x.id).filter(Boolean);
                  const fromIdx = ids.indexOf(catId);
                  const toIdx = ids.indexOf(c.id);
                  if (fromIdx !== -1 && toIdx !== -1 && fromIdx !== toIdx) {
                    const arr = [...ids];
                    const [m] = arr.splice(fromIdx, 1);
                    arr.splice(toIdx, 0, m);
                    void catActions.reorderCategories(arr);
                  }
                } else {
                  const id = e.dataTransfer.getData('application/x-linktrove-webpage');
                  if (id) {
                    actions.updateCategory(id, c.id);
                  } else {
                    const rawTab = e.dataTransfer.getData('application/x-linktrove-tab');
                    if (rawTab) {
                      const tab = JSON.parse(rawTab);
                      void actions
                        .addFromTab(tab)
                        .then((newId: any) => actions.updateCategory(String(newId), c.id))
                        .catch(() => {/* ignore */});
                    }
                  }
                }
              } catch {}
              (e.currentTarget as HTMLElement).removeAttribute('data-drop');
            }}
          >
            <button type="button" className="flex-1 text-left" onClick={() => setCurrentCategory(c.id)}>
              <span
                className="inline-block w-2 h-2 mr-2 rounded align-middle"
                style={{ backgroundColor: (c as any).color || '#94a3b8' }}
                aria-hidden
              />
              {c.name}
            </button>
            <button
              type="button"
              className="text-xs px-1 py-0.5 rounded border border-slate-600 hover:bg-slate-800"
              title="Edit category"
              onClick={(e) => { e.stopPropagation(); openEditor(c); }}
            >⚙︎</button>
          </div>
        );
      })}
    </nav>
    {editing && (
      <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center" onClick={()=>setEditing(null)}>
        <div className="rounded border border-slate-700 bg-[var(--panel)] p-4 w-[420px] max-w-[90vw]" onClick={(e)=>e.stopPropagation()} role="dialog" aria-label="Edit Category">
          <div className="text-lg font-medium mb-3">Edit Category</div>
          <div className="space-y-3">
            <div>
              <label className="block text-sm mb-1">Name</label>
              <input className="w-full rounded bg-slate-900 border border-slate-700 p-2 text-sm" value={editName} onChange={(e)=>setEditName(e.target.value)} />
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="block text-sm mb-1">Color</label>
                <input type="color" className="rounded border border-slate-700 bg-slate-900 p-1" value={editColor} onChange={(e)=>setEditColor(e.target.value)} />
              </div>
              <div className="flex-1">
                <label className="block text-sm mb-1">Default Template</label>
                <select className="w-full rounded bg-slate-900 border border-slate-700 p-2 text-sm" value={editTpl} onChange={(e)=>setEditTpl(e.target.value)}>
                  <option value="">None</option>
                  {templates.map((t:any)=> (<option key={t.id} value={t.id}>{t.name}</option>))}
                </select>
              </div>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-end gap-2">
            <button className="px-3 py-1 rounded border border-slate-600 hover:bg-slate-800" onClick={()=>setEditing(null)}>Cancel</button>
            <button className="px-3 py-1 rounded border border-emerald-600 text-emerald-300 hover:bg-emerald-950/30" onClick={async()=>{
              try {
                const id = editing.id as string;
                if (editName.trim() && editName.trim() !== editing.name) await catActions.renameCategory(id, editName.trim());
                if ((editColor||'') !== (editing.color||'')) await catActions.updateColor?.(id, editColor||'#64748b');
                if ((editTpl||'') !== (editing.defaultTemplateId||'')) await catActions.setDefaultTemplate(id, editTpl || undefined);
                setEditing(null);
              } catch { /* ignore */ }
            }}>Save</button>
            <button className="px-3 py-1 rounded border border-red-600 text-red-300 hover:bg-red-950/30" onClick={async()=>{
              try {
                if (!editing) return;
                const ok = confirm('Delete this category?');
                if (!ok) return;
                await catActions.deleteCategory(editing.id);
                setEditing(null);
              } catch { /* ignore */ }
            }}>Delete</button>
          </div>
        </div>
      </div>
    )}
    </div>
  );
};
