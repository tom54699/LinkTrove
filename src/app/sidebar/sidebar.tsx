import React from 'react';
import { useCategories } from './categories';
import { useOrganizations } from './organizations';
import { useTemplates } from '../templates/TemplatesProvider';
import { useWebpages } from '../webpages/WebpagesProvider';
import { SearchBox } from '../ui/SearchBox';
import { useFeedback } from '../ui/feedback';
import { useI18n } from '../i18n';
import { CustomSelect } from '../ui/CustomSelect';

export const Sidebar: React.FC = () => {
  const { t } = useI18n();
  const {
    categories,
    selectedId,
    setCurrentCategory,
    actions: catActions,
  } = useCategories() as any;
  const { organizations, selectedOrgId } = useOrganizations();
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
  useWebpages();

  return (
    <div className="text-[13px] h-full flex flex-col">
      {/* Current Organization Name */}
      <div className="mb-4 text-lg font-semibold">
        {organizations.find(o => o.id === selectedOrgId)?.name || 'Organization'}
      </div>

      {/* Search */}
      <div className="mb-6 relative overflow-visible">
        <SearchBox
          placeholder={t('search_placeholder')}
          className="w-full"
        />
      </div>
      {/* COLLECTIONS section header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="text-[11px] uppercase text-[var(--muted)] font-semibold tracking-wider">
          {t('sidebar_collections')}
        </div>
        <div className="flex items-center gap-1">
          <button
            className="text-red-400 hover:text-red-300 text-lg font-semibold"
            title={t('sidebar_add_collection')}
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
                title={t('category_edit_title')}
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
          className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-md flex items-center justify-center p-3"
          onClick={() => {
            setEditing(null);
            setConfirmDelete(false);
          }}
        >
          <div
            className="rounded-xl border border-[var(--border)] bg-[var(--panel)] w-[520px] max-w-[95vw] shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label={t('category_edit_title')}
          >
            <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between">
              <div>
                <div className="text-lg font-bold">{t('category_edit_title')}</div>
                <div className="text-[11px] text-[var(--muted)] uppercase tracking-widest mt-1 opacity-70 font-bold">
                  {t('category_edit_desc')}
                </div>
              </div>
              <button
                className="text-[var(--muted)] hover:text-[var(--text)] transition-colors"
                onClick={() => { setEditing(null); setConfirmDelete(false); }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            
            <div className="px-6 py-6 space-y-6">
              <div className="flex flex-col gap-5">
                <div>
                  <label className="block text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider mb-2">{t('category_name_label')}</label>
                  <input
                    className="w-full rounded-lg bg-[var(--input-bg)] border border-[var(--border)] px-4 py-2.5 text-sm focus:outline-none focus:border-[var(--accent)] transition-all"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                </div>
                
                <div>
                  <label className="block text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider mb-2">{t('category_color_label')}</label>
                  <div className="relative">
                    <div 
                      className="inline-flex items-center gap-2 bg-[var(--input-bg)] border border-[var(--border)] px-2.5 py-1.5 rounded-full hover:border-[var(--accent)] transition-all cursor-pointer group"
                      onClick={(e) => (e.currentTarget.nextSibling as HTMLInputElement).click()}
                    >
                      <div className="w-3.5 h-3.5 rounded-full shadow-sm" style={{ backgroundColor: editColor }} />
                      <span className="text-[11px] font-mono text-[var(--muted)] group-hover:text-[var(--text)] transition-colors">{editColor}</span>
                    </div>
                    <input
                      type="color"
                      className="absolute opacity-0 pointer-events-none"
                      value={editColor}
                      onChange={(e) => setEditColor(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider mb-2">{t('category_template_label')}</label>
                  <CustomSelect
                    value={editTpl}
                    options={[
                      { value: '', label: t('category_template_none') },
                      ...templates.map((tpl: any) => ({ value: tpl.id, label: tpl.name }))
                    ]}
                    onChange={(val) => setEditTpl(val)}
                  />
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-[var(--bg)]/30 border-t border-white/5 flex items-center justify-between gap-3">
              <div>
                {!confirmDelete ? (
                  <button
                    className="text-xs font-bold px-3 py-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all"
                    onClick={() => setConfirmDelete(true)}
                  >
                    {t('category_delete_btn')}
                  </button>
                ) : (
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="text-red-400 font-medium">Confirm?</span>
                    <button
                      className="px-2 py-1 rounded-md border border-[var(--border)] text-[var(--muted)] hover:bg-[var(--surface)] transition-all"
                      onClick={() => setConfirmDelete(false)}
                    >
                      {t('btn_cancel')}
                    </button>
                    <button
                      className="px-2 py-1 rounded-md bg-red-600 text-white font-bold hover:brightness-110 transition-all"
                      onClick={async () => {
                        if (!editing) return;
                        const inSameOrg = categories.filter((c: any) => c.organizationId === editing.organizationId && !c.deleted);
                        if (inSameOrg.length <= 1) {
                          showToast(t('category_min_one'), 'error');
                          return;
                        }
                        try {
                          await catActions.deleteCategory(editing.id);
                          setEditing(null);
                          setConfirmDelete(false);
                          showToast(t('toast_category_deleted'), 'success');
                        } catch (error) {
                          console.error('Delete category error:', error);
                          showToast(t('toast_delete_failed'), 'error');
                        }
                      }}
                    >
                      {t('menu_delete')}
                    </button>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button
                  className="px-5 py-2 text-sm font-bold rounded-lg border border-[var(--border)] text-[var(--muted)] hover:bg-[var(--surface)] transition-all cursor-pointer"
                  onClick={() => {
                    setEditing(null);
                    setConfirmDelete(false);
                  }}
                >
                  {t('btn_cancel')}
                </button>
                <button
                  className="px-5 py-2 text-sm font-bold rounded-lg bg-[var(--accent)] text-white hover:brightness-110 transition-all cursor-pointer shadow-lg shadow-[var(--accent)]/10"
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
                  {t('btn_save')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
