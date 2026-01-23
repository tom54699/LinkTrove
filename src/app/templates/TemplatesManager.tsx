import React from 'react';
import { useTemplates } from './TemplatesProvider';
import { createStorageService } from '../../background/storageService';
import { useFeedback } from '../ui/feedback';
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
  const [optionsOpen, setOptionsOpen] = React.useState<Record<string, boolean>>({});
  const BOOK_FIXED_KEYS = new Set([
    'bookTitle',
    'author',
    'serialStatus',
    'genre',
    'wordCount',
    'rating',
    'siteName',
    'lastUpdate',
  ]);
  const typeLabel = React.useCallback(
    (value: string) => {
      const map: Record<string, string> = {
        text: t('tpl_type_text'),
        number: t('tpl_type_number'),
        date: t('tpl_type_date'),
        url: t('tpl_type_url'),
        select: t('tpl_type_select'),
        rating: t('tpl_type_rating'),
        tags: t('tpl_type_tags'),
      };
      return map[value] || value;
    },
    [t]
  );

  const mapErrorMessage = React.useCallback(
    (err: any) => {
      const msg = String(err?.message || '');
      const table: Record<string, string> = {
        '欄位鍵只能包含英文字母、數字或底線': t('tpl_error_invalid_key'),
        'Field key already exists': t('tpl_error_duplicate_field'),
        'Template name already exists': t('tpl_error_template_exists'),
        'Template is in use by collections': t('tpl_error_template_in_use'),
      };
      return table[msg] || t('toast_add_failed');
    },
    [t]
  );

  React.useEffect(() => {
    return () => {
    };
  }, []);

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

  const InlineSelect: React.FC<{
    value: string;
    options: Array<{ value: string; label: string }>;
    onChange: (v: string) => void;
    disabled?: boolean;
    placeholder?: string;
    title?: string;
  }> = ({ value, options, onChange, disabled, placeholder, title }) => {
    const [open, setOpen] = React.useState(false);
    const [openUp, setOpenUp] = React.useState(false);
    const wrapRef = React.useRef<HTMLDivElement | null>(null);
    const menuRef = React.useRef<HTMLDivElement | null>(null);
    const didAutoScroll = React.useRef(false);
    const getScrollParent = (node: HTMLElement | null) => {
      let el = node?.parentElement || null;
      while (el && el !== document.body) {
        const style = window.getComputedStyle(el);
        if (/(auto|scroll)/.test(style.overflowY)) return el;
        el = el.parentElement;
      }
      return (document.scrollingElement || document.documentElement) as HTMLElement;
    };

    React.useEffect(() => {
      if (!open) return;
      const onDoc = (e: MouseEvent) => {
        if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
          setOpen(false);
        }
      };
      document.addEventListener('mousedown', onDoc, true);
      return () => document.removeEventListener('mousedown', onDoc, true);
    }, [open]);
    React.useEffect(() => {
      if (!open) {
        didAutoScroll.current = false;
        return;
      }
      const raf = window.requestAnimationFrame(() => {
        const wrap = wrapRef.current;
        const menu = menuRef.current;
        if (!wrap || !menu) return;
        const rect = wrap.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        const menuHeight = menu.offsetHeight;
        setOpenUp(spaceBelow < menuHeight && spaceAbove > spaceBelow);
        if (!didAutoScroll.current) {
          const parent = getScrollParent(wrap);
          const parentRect =
            parent === document.documentElement
              ? { top: 0, bottom: window.innerHeight }
              : parent.getBoundingClientRect();
          const menuRect = menu.getBoundingClientRect();
          if (menuRect.bottom > parentRect.bottom) {
            parent.scrollTop += menuRect.bottom - parentRect.bottom + 8;
          } else if (menuRect.top < parentRect.top) {
            parent.scrollTop -= parentRect.top - menuRect.top + 8;
          }
          didAutoScroll.current = true;
        }
      });
      return () => window.cancelAnimationFrame(raf);
    }, [open, options.length]);

    const current = options.find((o) => o.value === value);

    return (
      <div ref={wrapRef} className="relative">
        <button
          type="button"
          className="w-full h-[34px] bg-[var(--input-bg)] border border-[var(--border)] rounded px-2 py-1 text-[13px] text-[var(--fg)] outline-none focus:border-[var(--accent)] disabled:opacity-60 flex items-center justify-between"
          onClick={() => !disabled && setOpen((prev) => !prev)}
          disabled={disabled}
          title={title}
          aria-label={current?.label || placeholder || ''}
        >
          <span className={current ? '' : 'text-[var(--muted)]'}>
            {current?.label || placeholder || ''}
          </span>
          <span className="ml-2 text-[12px] text-[var(--muted)]" aria-hidden="true">▾</span>
        </button>
        {open && !disabled && (
          <div
            ref={menuRef}
            className={`absolute z-30 w-full rounded border border-[var(--border)] bg-[var(--panel)] shadow-lg p-1 max-h-52 overflow-auto ${openUp ? 'bottom-full mb-1' : 'mt-1'}`}
          >
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`w-full text-left px-2 py-1 text-[12px] rounded ${opt.value === value ? 'bg-white/10 text-[var(--fg)]' : 'text-[var(--muted)] hover:text-[var(--fg)] hover:bg-white/5'}`}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

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
              try {
                await actions.add(name.trim());
                setName('');
                showToast(t('tpl_created'), 'success');
              } catch (err: any) {
                showToast(mapErrorMessage(err), 'error');
              }
            }}>{t('btn_create')}</button>
          </div>
          <div className="border-t border-white/5 pt-3 flex gap-2.5 items-center">
            <span className="text-[12px] text-[var(--muted)] opacity-60">{t('tpl_presets')}</span>
            <button className="text-[12px] px-2.5 py-1 rounded border border-[var(--border)] text-[var(--muted)] bg-transparent hover:bg-white/5 hover:text-[var(--fg)] cursor-pointer transition-all" onClick={async () => {
              try {
                const res = await actions.add('書籍模板');
                if (res?.id) await actions.addFields(res.id, [
                  { key: 'bookTitle', label: '書名', type: 'text' },
                  { key: 'author', label: '作者', type: 'text' },
                  { key: 'serialStatus', label: '連載狀態', type: 'select', options: ['連載中', '已完結', '太監'] },
                  { key: 'genre', label: '類型', type: 'text' },
                  { key: 'wordCount', label: '字數', type: 'number' },
                  { key: 'rating', label: '評分', type: 'rating' },
                  { key: 'siteName', label: '站名', type: 'text' },
                  { key: 'lastUpdate', label: '最後更新時間', type: 'date' },
                ]);
                showToast(t('tpl_created'), 'success');
              } catch (err: any) {
                showToast(mapErrorMessage(err), 'error');
              }
            }}>{t('tpl_preset_book')}</button>
          </div>
        </div>

        {/* Template List */}
        <div className="space-y-3">
          {templates.map((tpl) => {
            const isOpen = !!expanded[tpl.id];
            const fields = tpl.fields || [];
            const fieldKeys = new Set(fields.map((f) => f.key));
            const isBookTemplate =
              tpl.name === '書籍模板' ||
              Array.from(BOOK_FIXED_KEYS).every((k) => fieldKeys.has(k));
            // Style: var(--surface) background for card, dark overlay for header/body
            return (
              <div key={tpl.id} className={`rounded-xl border transition-all bg-[var(--surface)] ${isOpen ? 'border-[var(--muted)] shadow-xl overflow-visible' : 'border-[var(--border)] hover:border-[var(--muted)]/40 overflow-hidden'}`}>
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
                    {fields.length > 0 && (
                      <div className="grid grid-cols-[30px_2fr_2fr_1.5fr_60px_60px] gap-2.5 px-2 text-[11px] font-bold text-[var(--muted)] uppercase tracking-widest items-center">
                        <div></div>
                        <div className="px-2">{t('tpl_header_key')}</div>
                        <div className="px-2">{t('tpl_header_label')}</div>
                        <div className="px-2">{t('tpl_header_type')}</div>
                        <div className="text-center">{t('tpl_header_required')}</div>
                        <div className="text-center">{t('tpl_header_actions')}</div>
                      </div>
                    )}
                    <div className="space-y-2">
                      {fields.map((f) => {
                        const isBookField = isBookTemplate && BOOK_FIXED_KEYS.has(f.key);
                        const optionsKey = `${tpl.id}:${f.key}`;
                        const isOptionsOpen = !!optionsOpen[optionsKey];
                        const toggleOptions = () =>
                          setOptionsOpen((prev) => ({ ...prev, [optionsKey]: !prev[optionsKey] }));
                        return (
                        <div key={f.key} className="space-y-2">
                          <div className="grid grid-cols-[30px_2fr_2fr_1.5fr_60px_60px] gap-2.5 items-center p-2 bg-black/20 border border-[var(--border)] rounded-md group hover:border-[var(--muted)]/30 transition-colors">
                            <div className="text-[var(--muted)] text-center opacity-50 cursor-grab">☰</div>
                            <div className="text-[13px] text-[var(--muted)] truncate px-2 italic bg-black/20 rounded py-1">{f.key}</div>
                            <input className="w-full bg-black/20 border border-[var(--border)] rounded px-2 py-1 text-[13px] text-[var(--fg)] outline-none focus:border-[var(--accent)] transition-all disabled:opacity-60" value={f.label} onChange={e => actions.updateField(tpl.id, f.key, { label: e.target.value })} disabled={isBookField} title={isBookField ? t('tpl_book_locked_edit') : undefined} />
                            {f.type === 'select' ? (
                              <button
                                type="button"
                                className="inline-flex items-center gap-1 text-[12px] opacity-80 px-2 text-[var(--muted)] hover:text-[var(--fg)] text-left"
                                onClick={toggleOptions}
                                title={isOptionsOpen ? t('tpl_options_toggle_hide') : t('tpl_options_toggle_show')}
                                aria-label={typeLabel(f.type)}
                              >
                                <span>{typeLabel(f.type)}</span>
                                <span className={`text-[14px] leading-none opacity-60 transition-transform ${isOptionsOpen ? 'rotate-180' : ''}`}>▾</span>
                              </button>
                            ) : (
                              <div className="text-[12px] opacity-80 px-2 text-[var(--muted)]">{typeLabel(f.type)}</div>
                            )}
                            <div className="text-center"><input type="checkbox" checked={!!f.required} onChange={e => actions.updateFieldRequired(tpl.id, f.key, e.target.checked)} className="accent-[var(--accent)]" disabled={isBookField} title={isBookField ? t('tpl_book_locked_edit') : undefined} /></div>
                            <div className="text-center">
                              <div className="flex items-center justify-center gap-2">
                                <button className="text-red-400 opacity-0 group-hover:opacity-100 cursor-pointer hover:text-red-300 transition-all disabled:opacity-30" onClick={() => actions.removeField(tpl.id, f.key)} disabled={isBookField} title={isBookField ? t('tpl_book_locked_delete') : undefined}>×</button>
                              </div>
                            </div>
                          </div>
                          {f.type === 'select' && (
                            <div className="grid grid-cols-[30px_1fr] gap-2.5 items-center">
                              <div></div>
                              <div>
                                {isOptionsOpen && (
                                  <div className="mt-2 rounded-lg bg-[var(--input-bg)]/70 border border-[var(--border)] p-3">
                                    <div className="text-[10px] text-[var(--muted)] mb-2">{t('tpl_options_help')}</div>
                                    <input
                                      className="w-full bg-[var(--bg)] border border-[var(--border)] rounded px-2 py-1 text-[12px] text-[var(--fg)] outline-none focus:border-[var(--accent)] transition-all"
                                      placeholder={t('tpl_options_placeholder')}
                                      defaultValue={((f as any).options || []).join(', ')}
                                      disabled={isBookField}
                                      title={isBookField ? t('tpl_book_locked_options') : undefined}
                                      onBlur={(e) => {
                                        if (isBookField) return;
                                        const list = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                                        actions.updateFieldOptions(tpl.id, f.key, list);
                                      }}
                                    />
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                          );
                      })}
                    </div>
                    {!isBookTemplate && (
                      <div className="mt-4 bg-[var(--bg)]/50 border border-[var(--border)] rounded-lg p-4 min-h-[260px] relative">
                        <div className="text-[12px] font-bold text-[var(--fg)] mb-3 opacity-80">{t('tpl_add_field_section')}</div>
                        <div className="grid grid-cols-[2fr_2fr_1.5fr_1fr_1.2fr] gap-2.5 items-end">
                          <div>
                            <div className="text-[10px] text-[var(--muted)] mb-1">{t('tpl_header_key')}</div>
                            <input
                              className="w-full bg-[var(--input-bg)] border border-[var(--border)] rounded px-2 py-1 text-[13px] text-[var(--fg)] outline-none focus:border-[var(--accent)] disabled:opacity-60 h-[34px]"
                              placeholder="e.g. price"
                              value={newField[tpl.id]?.key || ''}
                              onChange={e => setNewField({ ...newField, [tpl.id]: { ...(newField[tpl.id] || {}), key: e.target.value } })}
                              disabled={isBookTemplate}
                              title={isBookTemplate ? t('tpl_book_locked_add') : undefined}
                            />
                          </div>
                          <div>
                            <div className="text-[10px] text-[var(--muted)] mb-1">{t('tpl_header_label')}</div>
                            <input
                              className="w-full bg-[var(--input-bg)] border border-[var(--border)] rounded px-2 py-1 text-[13px] text-[var(--fg)] outline-none focus:border-[var(--accent)] disabled:opacity-60 h-[34px]"
                              placeholder={t('tpl_field_display_name')}
                              value={newField[tpl.id]?.label || ''}
                              onChange={e => setNewField({ ...newField, [tpl.id]: { ...(newField[tpl.id] || {}), label: e.target.value } })}
                              disabled={isBookTemplate}
                              title={isBookTemplate ? t('tpl_book_locked_add') : undefined}
                            />
                          </div>
                          <div>
                            <div className="text-[10px] text-[var(--muted)] mb-1">{t('tpl_header_type')}</div>
                            <InlineSelect
                              value={newField[tpl.id]?.type || 'text'}
                              options={[
                                { value: 'text', label: typeLabel('text') },
                                { value: 'number', label: typeLabel('number') },
                                { value: 'date', label: typeLabel('date') },
                                { value: 'url', label: typeLabel('url') },
                                { value: 'select', label: typeLabel('select') },
                                { value: 'rating', label: typeLabel('rating') },
                                { value: 'tags', label: typeLabel('tags') },
                              ]}
                              onChange={(val) =>
                                setNewField({
                                  ...newField,
                                  [tpl.id]: { ...(newField[tpl.id] || {}), type: val },
                                })
                              }
                              disabled={isBookTemplate}
                              placeholder={t('tpl_type_placeholder')}
                              title={isBookTemplate ? t('tpl_book_locked_add') : undefined}
                            />
                          </div>
                          <div className="flex flex-col items-center justify-end">
                            <div className="text-[10px] text-[var(--muted)] mb-1">{t('tpl_header_required')}</div>
                            <div className="flex items-center justify-center h-[34px]">
                              <input
                                type="checkbox"
                                className="w-4 h-4 accent-[var(--accent)]"
                                checked={!!newField[tpl.id]?.required}
                                onChange={(e) =>
                                  setNewField({
                                    ...newField,
                                    [tpl.id]: { ...(newField[tpl.id] || {}), required: e.target.checked },
                                  })
                                }
                                disabled={isBookTemplate}
                                title={isBookTemplate ? t('tpl_book_locked_add') : undefined}
                              />
                            </div>
                          </div>
                          <div className="flex flex-col">
                            <div className="text-[10px] text-[var(--muted)] mb-1">&nbsp;</div>
                            <button
                              className="h-[34px] px-4 py-1 rounded bg-[var(--accent)] text-white text-[12px] font-medium cursor-pointer hover:brightness-110 active:scale-95 shadow-sm transition-all flex items-center justify-center gap-2"
                              onClick={async () => {
                                if (isBookTemplate) return;
                                const nf = newField[tpl.id] || {};
                                if (!nf?.key || !nf?.label) {
                                  showToast(t('tpl_error_required_fields'), 'error');
                                  return;
                                }
                                const payload: any = {
                                  key: nf.key,
                                  label: nf.label,
                                  type: nf.type || 'text',
                                };
                                if (nf.type === 'select') {
                                  const raw = (nf as any).options || '';
                                  const list = raw.split(',').map((s: string) => s.trim()).filter(Boolean);
                                  if (list.length > 0) payload.options = list;
                                }
                                if (nf.required) payload.required = true;
                                try {
                                  await actions.addField(tpl.id, payload);
                                  setNewField({ ...newField, [tpl.id]: { key: '', label: '', type: 'text', options: '', required: false } });
                                  showToast(t('tpl_field_added'), 'success');
                                } catch (err: any) {
                                  showToast(mapErrorMessage(err), 'error');
                                }
                              }}
                              disabled={isBookTemplate}
                              title={isBookTemplate ? t('tpl_book_locked_add') : undefined}
                            >
                              {t('btn_add')}
                            </button>
                          </div>
                        </div>
                        <div className="mt-4 min-h-[56px]">
                          {newField[tpl.id]?.type === 'select' && (
                            <>
                              <div className="text-[10px] text-[var(--muted)] mb-1 uppercase tracking-wider">{t('tpl_options_help')}</div>
                              <input
                                className="w-full bg-[var(--input-bg)] border border-[var(--border)] rounded px-2 py-1 text-[13px] text-[var(--fg)] outline-none focus:border-[var(--accent)] h-[34px]"
                                placeholder={t('tpl_options_placeholder')}
                                value={newField[tpl.id]?.options || ''}
                                onChange={e => setNewField({ ...newField, [tpl.id]: { ...(newField[tpl.id] || {}), options: e.target.value } })}
                                disabled={isBookTemplate}
                                title={isBookTemplate ? t('tpl_book_locked_add') : undefined}
                              />
                            </>
                          )}
                        </div>
                      </div>
                    )}
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
