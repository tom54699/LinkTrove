import React from 'react';
import { useTemplates } from './TemplatesProvider';
import { useFeedback } from '../ui/feedback';
import { createStorageService } from '../../background/storageService';
import { useI18n } from '../i18n';

export const TemplatesManager: React.FC = () => {
  const { t } = useI18n();
  const { templates, actions } = useTemplates();
  const { showToast } = useFeedback();
  const [usageMap, setUsageMap] = React.useState<Record<string, number>>({});
  const [modal, setModal] = React.useState<null | { title: string; content: React.ReactNode }>(null);
  const [name, setName] = React.useState('');
  const [newField, setNewField] = React.useState<Record<string, any>>({});
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({});

  React.useEffect(() => {
    (async () => {
      try {
        const s = createStorageService();
        const cats = (await s.loadFromSync()) as any[];
        const count: Record<string, number> = {};
        for (const c of cats || []) {
          if (c.defaultTemplateId) count[c.defaultTemplateId] = (count[c.defaultTemplateId] || 0) + 1;
        }
        setUsageMap(count);
      } catch {}
    })();
  }, [templates]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div id="tab-templates" className="tab-content">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-[18px] font-bold mb-1 text-[var(--fg)]">{t('tpl_manager_title')}</h2>
            <p className="text-[13px] text-[var(--muted)] mb-0">{t('tpl_manager_desc')}</p>
          </div>
          <div className="text-[12px] text-[var(--muted)] px-3 py-1 bg-black/20 rounded-full border border-[var(--border)]">
            {t('tpl_count', [String(templates.length)])}
          </div>
        </div>

        {/* Add Template Section - Gradient Background per Mockup */}
        <div className="bg-gradient-to-r from-[#181c2266] to-[#282a3666] border border-[var(--border)] rounded-xl p-5 mb-6">
          <div className="flex gap-3 mb-4">
            <div 
              style={{ background: 'rgba(255, 80, 122, 0.1)' }}
              className="w-[36px] h-[36px] rounded-[8px] flex items-center justify-center text-[var(--accent)] shrink-0 text-lg font-bold"
            >
              <span>＋</span>
            </div>
            <div>
              <div className="font-semibold text-[14px] text-[var(--fg)]">{t('tpl_create_new')}</div>
              <div className="text-[12px] text-[var(--muted)]">{t('tpl_create_hint')}</div>
            </div>
          </div>
          <div className="flex gap-2.5 mb-4">
            <input type="text" className="flex-1 bg-[var(--input-bg)] border border-[var(--border)] text-[var(--fg)] px-3 py-2 rounded-lg text-[13px] outline-none focus:border-[var(--accent)] transition-all placeholder:text-[var(--muted)]/50" placeholder={t('tpl_name_placeholder')} value={name} onChange={(e) => setName(e.target.value)} />
            <button className="px-4 py-2 rounded-lg bg-[var(--accent)] text-white text-[13px] font-bold hover:brightness-110 active:scale-95 shadow-sm cursor-pointer transition-all" onClick={async () => {
              if (!name.trim()) return;
              if (templates.some(tpl => tpl.name === name.trim())) { setModal({ title: t('tpl_name_exists'), content: t('tpl_name_exists_desc') }); return; }
              await actions.add(name.trim()); setName(''); showToast(t('tpl_created'), 'success');
            }}>{t('btn_create')}</button>
          </div>
          <div className="border-t border-white/5 pt-3 flex gap-2.5 items-center">
            <span className="text-[12px] text-[var(--muted)] opacity-60">{t('tpl_presets')}</span>
            <button className="text-[12px] px-2.5 py-1 rounded border border-[var(--border)] text-[var(--muted)] bg-transparent hover:bg-white/5 hover:text-[var(--fg)] cursor-pointer transition-all" onClick={async () => {
              const res = await actions.add('書籍模板');
              if (res?.id) await actions.addFields(res.id, [
                { key: 'bookTitle', label: '書名', type: 'text' }, { key: 'author', label: '作者', type: 'text' },
                { key: 'serialStatus', label: '狀態', type: 'select', options: ['連載', '完結'] },
                { key: 'rating', label: '評分', type: 'rating' },
              ]);
              showToast(t('tpl_created'), 'success');
            }}>{t('tpl_preset_book')}</button>
            <button className="text-[12px] px-2.5 py-1 rounded border border-[var(--border)] text-[var(--muted)] bg-transparent hover:bg-white/5 hover:text-[var(--fg)] cursor-pointer transition-all" onClick={async () => {
              const res = await actions.add('工具模板');
              if (res?.id) await actions.addFields(res.id, [
                { key: 'platform', label: '平台', type: 'select', options: ['Web', 'PC'] },
                { key: 'rating', label: '評分', type: 'rating' },
              ]);
              showToast(t('tpl_created'), 'success');
            }}>{t('tpl_preset_tool')}</button>
          </div>
        </div>

        {/* Template List */}
        <div className="space-y-3">
          {templates.map((tpl) => {
            const isOpen = !!expanded[tpl.id];
            // Style: var(--surface) background for card, dark overlay for header/body
            return (
              <div key={tpl.id} className={`rounded-xl border transition-all overflow-hidden bg-[var(--surface)] ${isOpen ? 'border-[var(--muted)] shadow-xl' : 'border-[var(--border)] hover:border-[var(--muted)]/40'}`}>
                {/* Header: Dark overlay (bg-black/10) */}
                <div className={`p-3 pl-4 flex items-center justify-between cursor-pointer hover:bg-black/20 bg-black/10 ${isOpen ? 'border-b border-[var(--border)]' : ''}`} onClick={() => setExpanded(prev => ({ ...prev, [tpl.id]: !prev[tpl.id] }))}>
                  <div className="flex items-center gap-3">
                    <span className={`text-[var(--muted)] text-[10px] transition-transform ${isOpen ? 'rotate-0' : '-rotate-90'}`}>▼</span>
                    <span className="font-semibold text-[14px] text-[var(--fg)]">{tpl.name}</span>
                    <span className="text-[11px] px-1.5 py-0.5 rounded bg-black/20 text-[var(--muted)] border border-[var(--border)]">{t('tpl_field_count', [String((tpl.fields || []).length)])}</span>
                    {usageMap[tpl.id] > 0 && <span className="text-[11px] px-1.5 py-0.5 rounded bg-[var(--success-bg)] text-[var(--success-text)] border border-[var(--success-border)]">{t('tpl_usage_count', [String(usageMap[tpl.id])])}</span>}
                  </div>
                  <div onClick={e => e.stopPropagation()}>
                    {usageMap[tpl.id] > 0 ? <div className="p-1.5 opacity-30 cursor-not-allowed text-[var(--muted)]">🔒</div> : (
                      <button className="p-1.5 rounded text-[var(--muted)] hover:text-red-400 cursor-pointer transition-all" onClick={() => actions.remove(tpl.id)}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    )}
                  </div>
                </div>
                {isOpen && (
                  // Body: Dark overlay (bg-black/10)
                  <div className="p-4 space-y-4 animate-in fade-in slide-in-from-top-1 duration-200 bg-black/10">
                    <div className="grid grid-cols-[30px_2fr_2fr_1.5fr_60px_60px] gap-2.5 px-2 text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest">
                      <div></div><div>KEY</div><div>LABEL</div><div>TYPE</div><div className="text-center">REQ</div><div className="text-center">ACT</div>
                    </div>
                    <div className="space-y-2">
                      {(tpl.fields || []).map((f) => (
                        <div key={f.key} className="grid grid-cols-[30px_2fr_2fr_1.5fr_60px_60px] gap-2.5 items-center p-2 bg-black/20 border border-[var(--border)] rounded-md group hover:border-[var(--muted)]/30 transition-colors">
                          <div className="text-[var(--muted)] text-center opacity-50 cursor-grab">☰</div>
                          <div className="text-[13px] text-[var(--muted)] truncate px-2 italic bg-black/20 rounded py-1">{f.key}</div>
                          <input className="bg-black/20 border border-[var(--border)] rounded px-2 py-1 text-[13px] text-[var(--fg)] outline-none focus:border-[var(--accent)] transition-all" value={f.label} onChange={e => actions.updateField(tpl.id, f.key, { label: e.target.value })} />
                          <div className="text-[12px] opacity-70 px-1 text-[var(--muted)]">{f.type}</div>
                          <div className="text-center"><input type="checkbox" checked={!!f.required} onChange={e => actions.updateFieldRequired(tpl.id, f.key, e.target.checked)} className="accent-[var(--accent)]" /></div>
                          <div className="text-center"><button className="text-red-400 opacity-0 group-hover:opacity-100 cursor-pointer hover:text-red-300 transition-all" onClick={() => actions.removeField(tpl.id, f.key)}>×</button></div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 bg-[var(--bg)]/50 border border-[var(--border)] rounded-lg p-4">
                      <div className="text-[12px] font-bold text-[var(--fg)] mb-3 opacity-80">{t('tpl_add_field_section')}</div>
                      <div className="grid grid-cols-[2fr_2fr_1.5fr_auto] gap-2.5 items-end">
                        <div>
                          <div className="text-[10px] text-[var(--muted)] mb-1">KEY</div>
                          <input className="w-full bg-[var(--input-bg)] border border-[var(--border)] rounded px-2 py-1.5 text-[13px] text-[var(--fg)] outline-none focus:border-[var(--accent)]" placeholder="e.g. price" value={newField[tpl.id]?.key || ''} onChange={e => setNewField({ ...newField, [tpl.id]: { ...(newField[tpl.id] || {}), key: e.target.value } })} />
                        </div>
                        <div>
                          <div className="text-[10px] text-[var(--muted)] mb-1">LABEL</div>
                          <input className="w-full bg-[var(--input-bg)] border border-[var(--border)] rounded px-2 py-1.5 text-[13px] text-[var(--fg)] outline-none focus:border-[var(--accent)]" placeholder={t('tpl_field_display_name')} value={newField[tpl.id]?.label || ''} onChange={e => setNewField({ ...newField, [tpl.id]: { ...(newField[tpl.id] || {}), label: e.target.value } })} />
                        </div>
                        <div>
                          <div className="text-[10px] text-[var(--muted)] mb-1">TYPE</div>
                          <select className="w-full bg-[var(--input-bg)] border border-[var(--border)] rounded px-2 py-1.5 text-[13px] text-[var(--fg)] outline-none focus:border-[var(--accent)]" value={newField[tpl.id]?.type || 'text'} onChange={e => setNewField({ ...newField, [tpl.id]: { ...(newField[tpl.id] || {}), type: e.target.value } })}>
                            {['text', 'number', 'date', 'url', 'select', 'rating', 'tags'].map(opt => <option key={opt} value={opt} className="bg-[var(--panel)]">{opt}</option>)}
                          </select>
                        </div>
                        <button className="px-4 py-1.5 rounded bg-[var(--accent)] text-white text-[12px] font-bold cursor-pointer hover:brightness-110 active:scale-95 shadow-sm transition-all" onClick={async () => {
                          const nf = newField[tpl.id]; if (!nf?.key || !nf?.label) return;
                          await actions.addField(tpl.id, { ...nf, type: nf.type || 'text' });
                          setNewField({ ...newField, [tpl.id]: {} });
                          showToast(t('tpl_field_added'), 'success');
                        }}>{t('btn_add')}</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      {modal && (
        <div className="fixed inset-0 z-[9999] bg-black/70 flex items-center justify-center p-3 backdrop-blur-sm" onClick={() => setModal(null)}>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--panel)] w-[420px] max-w-[95vw] p-5 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="text-lg font-bold mb-3 text-[var(--fg)]">{modal.title}</div>
            <div className="text-[13px] mb-5 text-[var(--muted)] leading-relaxed">{modal.content}</div>
            <div className="flex justify-end"><button className="px-5 py-2 rounded-lg border border-[var(--border)] text-[var(--fg)] hover:bg-white/5 cursor-pointer transition-all text-[13px]" onClick={() => setModal(null)}>{t('btn_got_it')}</button></div>
          </div>
        </div>
      )}
    </div>
  );
};