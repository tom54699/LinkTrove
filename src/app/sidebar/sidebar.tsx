import React from 'react';
import { useCategories } from './categories';
import { useOrganizations } from './organizations';
import { useTemplates } from '../templates/TemplatesProvider';
import { useWebpages } from '../webpages/WebpagesProvider';
import { SearchBox } from '../ui/SearchBox';
import { useFeedback } from '../ui/feedback';

export const Sidebar: React.FC = () => {
  const {
    categories,
    selectedId,
    setCurrentCategory,
    actions: catActions,
  } = useCategories() as any;
  const { organizations, selectedOrgId, setCurrentOrganization } = useOrganizations();
  const { templates } = useTemplates();
  const { showToast } = useFeedback();
  const [editing, setEditing] = React.useState<any | null>(null);
  const [editName, setEditName] = React.useState('');
  const [editColor, setEditColor] = React.useState('#64748b');
  const [editTpl, setEditTpl] = React.useState<string>('');
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  function openEditor(cat: any) {
    setEditing(cat);
    setEditName(cat.name || '');
    setEditColor(cat.color || '#64748b');
    setEditTpl(cat.defaultTemplateId || '');
  }
  const { actions } = useWebpages();

  return (
    <div className="text-[13px] h-full flex flex-col">
      {/* Current Organization Name */}
      <div className="mb-4 text-lg font-semibold">
        {organizations.find(o => o.id === selectedOrgId)?.name || 'Organization'}
      </div>

      {/* Search */}
      <div className="mb-6 relative overflow-visible">
        <SearchBox
          placeholder="Search..."
          className="w-full"
        />
      </div>
      {/* COLLECTIONS section header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="text-[11px] uppercase text-[var(--muted)] font-semibold tracking-wider">
          COLLECTIONS
        </div>
        <div className="flex items-center gap-1">
          <button
            className="text-red-400 hover:text-red-300 text-lg font-semibold"
            title="Add new collection"
            onClick={() => { try { window.dispatchEvent(new CustomEvent('collections:add-new')); } catch {} }}
          >
            +
          </button>
        </div>
      </div>

      {/* Collections list */}
      <div className="flex-1 overflow-hidden">
        <nav aria-label="Categories" className="space-y-1 h-full overflow-y-auto pr-1">
          {categories.map((c, _idx) => {
          const active = selectedId === c.id;
          return (
            <div
              key={c.id}
              className={`w-full px-2 py-1 rounded border border-slate-700 transition-colors flex items-center gap-2 ${active ? 'bg-[var(--card)]' : 'hover:bg-slate-800/40'}
            `}
              data-active={active ? 'true' : undefined}
              draggable
              onDragStart={(e) => {
                try {
                  e.dataTransfer.setData(
                    'application/x-linktrove-category',
                    c.id
                  );
                  e.dataTransfer.effectAllowed = 'move';
                } catch {}
              }}
              onDragOver={(e) => {
                e.preventDefault();
              }}
              onDragEnter={(e) => {
                (e.currentTarget as HTMLElement).setAttribute(
                  'data-drop',
                  'true'
                );
              }}
              onDragLeave={(e) => {
                (e.currentTarget as HTMLElement).removeAttribute('data-drop');
              }}
              onDrop={(e) => {
                e.preventDefault();
                try {
                  const catId = e.dataTransfer.getData(
                    'application/x-linktrove-category'
                  );
                  if (catId) {
                    const ids = categories.map((x) => x.id).filter(Boolean);
                    const fromIdx = ids.indexOf(catId);
                    const toIdx = ids.indexOf(c.id);
                    if (fromIdx !== -1 && toIdx !== -1 && fromIdx !== toIdx) {
                      const arr = [...ids];
                      const [m] = arr.splice(fromIdx, 1);
                      arr.splice(toIdx, 0, m);
                      void catActions.reorderCategories(arr);
                    }
                  } else {
                    // 停用：不再支援將卡片/分頁拖到 Sidebar 的 Collection 以移動/新增
                    // 僅保留類別拖曳重新排序
                  }
                } catch {}
                (e.currentTarget as HTMLElement).removeAttribute('data-drop');
              }}
            >
              <button
                type="button"
                className="flex-1 text-left"
                data-active={active ? 'true' : undefined}
                onClick={() => setCurrentCategory(c.id)}
              >
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
                onClick={(e) => {
                  e.stopPropagation();
                  openEditor(c);
                }}
              >
                ⚙︎
              </button>
            </div>
          );
        })}
        </nav>
      </div>
      {editing && (
        <div
          className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-3"
          onClick={() => {
            setEditing(null);
            setConfirmDelete(false);
          }}
        >
          <div
            className="rounded border border-slate-700 bg-[var(--panel)] w-[560px] max-w-[95vw]"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Edit Category"
          >
            <div className="px-5 py-4 border-b border-slate-700">
              <div className="text-lg font-semibold">Edit Category</div>
              <div className="text-xs opacity-70">
                Update name, color, and default template
              </div>
            </div>
            <div className="px-5 py-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-1">Name</label>
                <input
                  className="w-full rounded bg-slate-900 border border-slate-700 p-2 text-sm"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Color</label>
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block w-3 h-3 rounded"
                    style={{ backgroundColor: editColor }}
                  />
                  <input
                    type="color"
                    className="rounded border border-slate-700 bg-slate-900 p-1"
                    value={editColor}
                    onChange={(e) => setEditColor(e.target.value)}
                  />
                  <input
                    className="flex-1 rounded bg-slate-900 border border-slate-700 p-2 text-sm"
                    value={editColor}
                    onChange={(e) => setEditColor(e.target.value)}
                  />
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm mb-1">Default Template</label>
                <select
                  className="w-full rounded bg-slate-900 border border-slate-700 p-2 text-sm"
                  value={editTpl}
                  onChange={(e) => setEditTpl(e.target.value)}
                >
                  <option value="">None</option>
                  {templates.map((t: any) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="px-5 py-3 border-t border-slate-700 flex items-center justify-between gap-3">
              <div>
                {!confirmDelete ? (
                  <button
                    className="text-xs px-2 py-1 rounded border border-red-600 text-red-300 hover:bg-red-950/30"
                    onClick={() => setConfirmDelete(true)}
                  >
                    Delete category…
                  </button>
                ) : (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-red-300">Confirm deletion?</span>
                    <button
                      className="px-2 py-1 rounded border border-slate-600 hover:bg-slate-800"
                      onClick={() => setConfirmDelete(false)}
                    >
                      Cancel
                    </button>
                    <button
                      className="px-2 py-1 rounded border border-red-600 text-red-300 hover:bg-red-950/30"
                      onClick={async () => {
                        if (!editing) return;

                        // UI Layer Check: minimum count protection
                        const inSameOrg = categories.filter((c: any) => c.organizationId === editing.organizationId);
                        if (inSameOrg.length <= 1) {
                          showToast('刪除失敗：至少需要保留一個 Collection', 'error');
                          return;
                        }

                        try {
                          await catActions.deleteCategory(editing.id);
                          setEditing(null);
                          setConfirmDelete(false);
                          showToast('已刪除 Collection 及其所有資料', 'success');
                        } catch (error) {
                          console.error('Delete category error:', error);
                          showToast('刪除失敗', 'error');
                        }
                      }}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="px-3 py-1 rounded border border-slate-600 hover:bg-slate-800"
                  onClick={() => {
                    setEditing(null);
                    setConfirmDelete(false);
                  }}
                >
                  Cancel
                </button>
                <button
                  className="px-3 py-1 rounded border border-emerald-600 text-emerald-300 hover:bg-emerald-950/30"
                  onClick={async () => {
                    try {
                      const id = editing.id as string;
                      if (editName.trim() && editName.trim() !== editing.name)
                        await catActions.renameCategory(id, editName.trim());
                      if ((editColor || '') !== (editing.color || ''))
                        await catActions.updateColor?.(
                          id,
                          editColor || '#64748b'
                        );
                      if ((editTpl || '') !== (editing.defaultTemplateId || ''))
                        await catActions.setDefaultTemplate(
                          id,
                          editTpl || undefined
                        );
                      setEditing(null);
                      setConfirmDelete(false);
                    } catch {
                      /* ignore */
                    }
                  }}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};