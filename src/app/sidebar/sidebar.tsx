import React from 'react';
import { useCategories } from './categories';
import { useTemplates } from '../templates/TemplatesProvider';
import { useWebpages } from '../webpages/WebpagesProvider';

export const Sidebar: React.FC = () => {
  const {
    categories,
    selectedId,
    setCurrentCategory,
    actions: catActions,
  } = useCategories() as any;
  const { templates } = useTemplates();
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
      <div className="mb-4 text-lg font-semibold">Collections</div>
      <div className="text-[11px] uppercase text-[var(--muted)] mb-2">
        Spaces
      </div>
      <nav aria-label="Categories" className="space-y-1">
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
                    const id = e.dataTransfer.getData(
                      'application/x-linktrove-webpage'
                    );
                    if (id) {
                      actions.updateCategory(id, c.id);
                    } else {
                      const rawTab = e.dataTransfer.getData(
                        'application/x-linktrove-tab'
                      );
                      if (rawTab) {
                        const tab = JSON.parse(rawTab);
                        void actions
                          .addFromTab(tab)
                          .then((newId: any) =>
                            actions.updateCategory(String(newId), c.id)
                          )
                          .catch(() => {
                            /* ignore */
                          });
                      }
                    }
                  }
                } catch {}
                (e.currentTarget as HTMLElement).removeAttribute('data-drop');
              }}
            >
              <button
                type="button"
                className="flex-1 text-left"
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
      {/* Add new collection: centered below the list */}
      <div className="mt-2 flex justify-center">
        <button
          className="px-3 py-1.5 text-[16px] text-[var(--accent)] hover:bg-[var(--accent-hover)] rounded"
          onClick={() => { try { window.dispatchEvent(new CustomEvent('collections:add-new')); } catch {} }}
          aria-label="Add new collection"
          title="Add collection"
        >
          <span aria-hidden>+</span>
        </button>
      </div>
      {/* 底部工具：新增 + 管理彈窗 */}
      <SidebarBottomActions />
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
                        try {
                          if (!editing) return;
                          await catActions.deleteCategory(editing.id);
                          setEditing(null);
                          setConfirmDelete(false);
                        } catch {}
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

const SidebarBottomActions: React.FC = () => {
  const [manageOpen, setManageOpen] = React.useState(false);

  return (
    <div className="mt-auto pt-3 border-t border-slate-700">
      <div className="flex justify-start">
        <button
          className="px-3 py-2 rounded border border-slate-600 hover:bg-slate-800 inline-flex items-center gap-2"
          onClick={() => setManageOpen(true)}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4" aria-hidden>
            <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.65 1.65 0 0 0 15 19.4a1.65 1.65 0 0 0-1 .6 1.65 1.65 0 0 0-.33 1.82l.02.07a2 2 0 1 1-3.38 0l.02-.07A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82-.33l-.06.03a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-.6-1 1.65 1.65 0 0 0-1.82-.33l-.07.02a2 2 0 1 1 0-3.38l.07.02A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.6-1L3.94 7.9a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6c.35 0 .69-.12.98-.33A1.65 1.65 0 0 0 11 2.45l-.02-.07a2 2 0 1 1 3.38 0l-.02.07A1.65 1.65 0 0 0 15 4.6c.35 0 .69.12.98.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06c.21.29.33.63.33.98 0 .35.12.69.33.98l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06c-.29.21-.63.33-.98.33-.35 0-.69.12-.98.33Z" />
          </svg>
          <span>collection setting</span>
        </button>
      </div>

      {manageOpen && (
        <div
          className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-3"
          onClick={() => setManageOpen(false)}
        >
          <div
            className="rounded border border-slate-700 bg-[var(--panel)] w-[420px] max-w-[95vw] p-5"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Manage Collections"
          >
            <div className="text-lg font-semibold mb-3">集合管理</div>
            <div className="space-y-2">
              <button
                className="w-full text-left px-3 py-2 rounded border border-slate-600 hover:bg-slate-800"
                onClick={() => { setManageOpen(false); try { window.dispatchEvent(new CustomEvent('collections:import-html-new')); } catch {} }}
              >
                Import HTML (new)…
              </button>
              <button
                className="w-full text-left px-3 py-2 rounded border border-slate-600 hover:bg-slate-800"
                onClick={() => { setManageOpen(false); try { window.dispatchEvent(new CustomEvent('collections:import-toby-new')); } catch {} }}
              >
                Import Toby (new)…
              </button>
            </div>
            <div className="mt-3 flex items-center justify-end">
              <button className="px-3 py-1 rounded border border-slate-600 hover:bg-slate-800" onClick={() => setManageOpen(false)}>關閉</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
