import React from 'react';
import { createPortal } from 'react-dom';
import '../../styles/toby-like.css';
import { useCategories } from '../sidebar/categories';
import { useTemplates } from '../templates/TemplatesProvider';
import { useI18n } from '../i18n';

export interface TobyLikeCardProps {
  title: string;
  description?: string;
  faviconUrl?: string;
  url?: string;
  categoryId?: string;
  meta?: Record<string, string>;
  createdAt?: string | number;
  updatedAt?: string | number;
  selected?: boolean;
  onToggleSelect?: () => void;
  onOpen?: () => void;
  onDelete?: () => void;
  onUpdateTitle?: (title: string) => void;
  onUpdateUrl?: (url: string) => void;
  onUpdateDescription?: (desc: string) => void;
  onUpdateMeta?: (m: Record<string, string>) => void;
  onModalOpenChange?: (open: boolean) => void;
  onSave?: (
    patch: Partial<{
      title: string;
      description: string;
      url: string;
      meta: Record<string, string>;
    }>
  ) => void;
  ghost?: boolean;
}

const SelectField: React.FC<{
  value: string;
  displayValue?: string;
  options: string[];
  placeholder?: string;
  onChange: (v: string) => void;
  error?: boolean;
}> = ({ value, displayValue, options, placeholder, onChange, error }) => {
  const [open, setOpen] = React.useState(false);
  const wrapRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc, true);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc, true);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const label = displayValue || value || placeholder || '';
  const isPlaceholder = !displayValue && !value;

  return (
    <div ref={wrapRef} className={`lt-select-wrap ${open ? 'is-open' : ''} ${error ? 'is-error' : ''}`}>
      <button
        type="button"
        className={`lt-select-btn ${isPlaceholder ? 'is-placeholder' : ''}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className="lt-select-text">{label || placeholder || ''}</span>
        <span className="lt-select-caret" aria-hidden="true" />
      </button>
      {open && (
        <div className="lt-select-menu" role="listbox">
          <button
            type="button"
            className={`lt-select-item ${!value ? 'is-active' : ''}`}
            onClick={() => {
              onChange('');
              setOpen(false);
            }}
          >
            {placeholder || 'Select...'}
          </button>
          {options.map((op) => (
            <button
              key={op}
              type="button"
              className={`lt-select-item ${value === op ? 'is-active' : ''}`}
              onClick={() => {
                onChange(op);
                setOpen(false);
              }}
            >
              {op}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export const TobyLikeCard: React.FC<TobyLikeCardProps> = ({
  title,
  description,
  faviconUrl,
  url,
  categoryId,
  meta,
  createdAt,
  updatedAt,
  selected,
  onToggleSelect,
  onOpen,
  onDelete,
  onUpdateTitle,
  onUpdateUrl,
  onUpdateDescription,
  onUpdateMeta,
  onModalOpenChange,
  onSave,
  ghost,
}) => {
  const { t, language } = useI18n();
  const [confirming, setConfirming] = React.useState(false);
  const [showModal, setShowModal] = React.useState(false);
  const [isFlipped, setIsFlipped] = React.useState(false);
  const [isFlipping, setIsFlipping] = React.useState(false);
  const [titleValue, setTitleValue] = React.useState(title);
  const [urlValue, setUrlValue] = React.useState('');
  const [descValue, setDescValue] = React.useState(description || '');
  const [metaValue, setMetaValue] = React.useState<Record<string, string>>({ ...(meta || {}) });

  const autoSaveTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const flipTimeoutRef = React.useRef<number | null>(null);
  const prevShowModalRef = React.useRef(false);
  const mouseDownInsideRef = React.useRef(false);

  function validateUrl(raw: string): { value?: string; error?: string } {
    const v = (raw || '').trim();
    if (!v) return { error: 'URL is required' };
    try {
      const u = new URL(v);
      if (!/^https?:$/.test(u.protocol)) return { error: 'Only http/https supported' };
      return { value: u.toString() };
    } catch { return { error: 'Invalid URL' }; }
  }

  const performAutoSave = React.useCallback(() => {
    if (!showModal) return;
    const patch: any = { title: titleValue.trim(), description: descValue };
    const norm = urlValue.trim() ? validateUrl(urlValue) : undefined;
    if (norm?.error) return;
    if (norm?.value) patch.url = norm.value;
    patch.meta = metaValue;
    if (onSave) onSave(patch);
    else {
      if (onUpdateTitle) onUpdateTitle(patch.title);
      if (patch.url && onUpdateUrl) onUpdateUrl(patch.url);
      if (onUpdateDescription) onUpdateDescription(patch.description);
      if (onUpdateMeta) onUpdateMeta(patch.meta);
    }
  }, [showModal, titleValue, descValue, urlValue, metaValue, onSave, onUpdateTitle, onUpdateUrl, onUpdateDescription, onUpdateMeta]);

  // 使用 ref 保存最新的 performAutoSave，避免 stale closure
  const performAutoSaveRef = React.useRef(performAutoSave);
  performAutoSaveRef.current = performAutoSave;

  const triggerAutoSave = React.useCallback(() => {
    if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
    autoSaveTimeoutRef.current = setTimeout(() => performAutoSaveRef.current(), 500);
  }, []);

  React.useEffect(() => {
    return () => { if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current); };
  }, []);
  React.useEffect(() => {
    return () => { if (flipTimeoutRef.current) window.clearTimeout(flipTimeoutRef.current); };
  }, []);

  React.useEffect(() => {
    // 只在 Modal 從關閉變開啟時初始化，避免 props 更新時覆蓋用戶輸入
    const justOpened = showModal && !prevShowModalRef.current;
    prevShowModalRef.current = showModal;

    if (justOpened) {
      setTitleValue(title);
      setDescValue(description || '');
      setUrlValue(url || '');
      setMetaValue({ ...(meta || {}) });
    }
  }, [showModal, title, description, url, meta]);

  const defaultIconUrl = React.useMemo(() => {
    try {
      return (chrome as any)?.runtime?.getURL?.('icons/default-favicon.png') || '/icons/default-favicon.png';
    } catch { return '/icons/default-favicon.png'; }
  }, []);

  const formatTimestamp = React.useCallback((value?: string | number): string => {
    if (value === undefined || value === null || value === '') return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return String(value);
    }
    const locale = (language || 'en').replace('_', '-');
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date);
  }, [language]);

  const handleCardClick = React.useCallback(() => {
    if (ghost) return;
    if (isFlipped) {
      setIsFlipped(false);
      return;
    }
    onOpen?.();
  }, [ghost, isFlipped, onOpen]);

  const triggerFlip = React.useCallback(() => {
    if (flipTimeoutRef.current) window.clearTimeout(flipTimeoutRef.current);
    setIsFlipping(true);
    setIsFlipped((prev) => !prev);
    flipTimeoutRef.current = window.setTimeout(() => {
      setIsFlipping(false);
    }, 720);
  }, []);

  return (
    <div className="tobylike">
      {/* Added 'group' class to the card wrapper to allow child elements to react to card hover */}
      <div className={`card group relative flex flex-col transition-all select-none box-border overflow-visible ${ghost ? 'opacity-50 pointer-events-none' : ''} ${isFlipped ? 'is-flipped' : ''} ${isFlipping ? 'is-flipping' : ''}`}
           style={{ height: '135px', minHeight: '135px' }}
           data-testid={ghost ? 'ghost-card' : undefined}
           onClick={handleCardClick}>

        <div className="card-inner">
          <div className="card-face card-front">
            <div className="card-content">
              {/* Top Section: Icon + Title */}
              <div className="block-a" style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div className="icon-container" style={{ background: 'var(--accent)/20', position: 'relative', width: '40px', height: '40px', borderRadius: '8px', flexShrink: 0, display: 'flex', alignItems: 'center', justifycenter: 'center' }}>
                  <img src={faviconUrl || defaultIconUrl} alt="" style={{ width: '32px', height: '32px', objectFit: 'contain' }} draggable={false} />

                  {/* Checkbox Overlay */}
                  {/* Changed logic: visible if selected OR parent card (.group) is hovered */}
                  <label className={`checkbox-overlay ${selected ? 'selected' : 'opacity-0 group-hover:opacity-100'}`}
                       style={{visibility: selected ? 'visible' : undefined}}
                       onClick={(e) => { e.stopPropagation(); onToggleSelect?.(); }}>
                    <input type="checkbox" className="sr-only" checked={!!selected} onChange={() => onToggleSelect?.()} />
                    <div className={`checkbox ${selected ? 'checked' : ''}`}>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20,6 9,17 4,12"></polyline>
                      </svg>
                    </div>
                  </label>
                </div>

                <div className="title-box" style={{ flex: 1, minWidth: 0 }}>
                  <h2 className="title" style={{ fontSize: '16px', fontWeight: 400, color: 'var(--text)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={title}>
                    {title}
                  </h2>
                </div>
              </div>

              <div className="sep" style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '8px 0' }} />

              {/* Bottom Section: Description */}
              <div className="block-b" style={{ width: '100%' }}>
                <p className="description" style={{ fontSize: '13px', color: 'var(--text)', opacity: 0.85, margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.4 }} title={description}>
                  {description || t('card_no_description')}
                </p>
              </div>
            </div>
          </div>
          <div className="card-face card-back" aria-hidden={!isFlipped}>
            <div className="card-back-content">
              <div className="card-back-row">
                <span className="card-back-label">{t('card_created_at_label')}</span>
                <span className="card-back-value">{formatTimestamp(createdAt)}</span>
              </div>
              <div className="card-back-row">
                <span className="card-back-label">{t('card_updated_at_label')}</span>
                <span className="card-back-value">{formatTimestamp(updatedAt)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Delete Bubble (Original Style) */}
        {!ghost && (
          <button className="delete-btn" title={t('menu_delete')} onClick={(e) => { e.stopPropagation(); setConfirming(true); }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"></path></svg>
          </button>
        )}

        {/* Action Sticker (Original Style) */}
        {!ghost && (
          <div className="actions" onClick={(e) => e.stopPropagation()}>
            <button className="action-btn" title={t('menu_edit')} onClick={() => { setShowModal(true); onModalOpenChange?.(true); }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 20h4l10.5 -10.5a2.828 2.828 0 1 0 -4 -4l-10.5 10.5v4"></path><path d="M13.5 6.5l4 4"></path></svg>
            </button>
            <button className="action-btn" title={t('card_time_toggle')} onClick={triggerFlip}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 8v5l3 3"></path><path d="M3.05 11a9 9 0 1 1 .5 4"></path><path d="M3 20v-5h5"></path></svg>
            </button>
          </div>
        )}
      </div>

      {/* Portals for Modals */}
      {confirming && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4" onClick={() => setConfirming(false)}>
          <div className="bg-[var(--panel)] border border-white/10 rounded-xl p-5 shadow-2xl max-w-xs w-full" onClick={(e) => e.stopPropagation()}>
            <h4 className="text-lg font-bold mb-2 text-[var(--text)]">{t('card_delete_title')}</h4>
            <p className="text-sm text-[var(--muted)] mb-6">{t('card_delete_desc')}</p>
            <div className="flex gap-2 justify-end">
              <button className="px-4 py-2 text-sm font-semibold rounded-lg border border-white/10 text-[var(--text)] hover:bg-white/5 transition-colors" onClick={() => setConfirming(false)}>{t('btn_cancel')}</button>
              <button className="px-4 py-2 text-sm font-semibold rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors" onClick={() => { setConfirming(false); onDelete?.(); }}>{t('menu_delete')}</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {showModal && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4"
          onMouseDown={() => { mouseDownInsideRef.current = false; }}
          onClick={() => {
            // 只有當 mousedown 也發生在 overlay 上時才關閉（避免選取文字時意外關閉）
            if (!mouseDownInsideRef.current) {
              setShowModal(false);
              onModalOpenChange?.(false);
            }
          }}
        >
          <div
            className="relative bg-[var(--panel)] border border-white/10 rounded-2xl w-[560px] max-w-full shadow-2xl flex flex-col overflow-hidden"
            onMouseDown={(e) => { e.stopPropagation(); mouseDownInsideRef.current = true; }}
            onClick={(e) => e.stopPropagation()}
          >
            <header className="px-6 py-4 border-b border-white/5 flex justify-between items-center">
              <h3 className="text-lg font-bold text-[var(--text)]">{t('card_edit_title')}</h3>
              <button className="text-[var(--muted)] hover:text-[var(--text)]" onClick={() => { setShowModal(false); onModalOpenChange?.(false); }}>✕</button>
            </header>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div><label className="block text-xs font-bold text-[var(--muted)] uppercase tracking-wider mb-1.5">{t('card_title_label')}</label><input className="w-full bg-[var(--bg)] border border-white/5 rounded-lg px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]" value={titleValue} onChange={(e) => { setTitleValue(e.target.value); triggerAutoSave(); }} /></div>
              <div><label className="block text-xs font-bold text-[var(--muted)] uppercase tracking-wider mb-1.5">{t('card_url_label')}</label><input className="w-full bg-[var(--bg)] border border-white/5 rounded-lg px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]" value={urlValue} onChange={(e) => { setUrlValue(e.target.value); triggerAutoSave(); }} /></div>
              <div><label className="block text-xs font-bold text-[var(--muted)] uppercase tracking-wider mb-1.5">{t('card_note_label')}</label><input className="w-full bg-[var(--bg)] border border-white/5 rounded-lg px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]" value={descValue} onChange={(e) => { setDescValue(e.target.value); triggerAutoSave(); }} /></div>
              <TemplateFields categoryId={categoryId || ''} meta={metaValue} onChange={(newMeta) => { setMetaValue(newMeta); triggerAutoSave(); }} />
            </div>
            <footer className="px-6 py-4 bg-white/5 border-t border-white/5 flex justify-end gap-2">
              <button className="px-4 py-2 text-sm font-bold text-[var(--muted)] hover:text-[var(--text)]" onClick={() => { setShowModal(false); onModalOpenChange?.(false); }}>{t('btn_cancel')}</button>
              <button className="px-6 py-2 text-sm font-bold bg-[var(--accent)] text-white rounded-lg hover:brightness-110" onClick={() => { const patch: any = { title: titleValue.trim(), description: descValue, url: urlValue.trim(), meta: metaValue }; if (onSave) onSave(patch); setShowModal(false); onModalOpenChange?.(false); }}>{t('btn_save_changes')}</button>
            </footer>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};

const TemplateFields: React.FC<{
  categoryId: string;
  meta: Record<string, string>;
  onChange: (m: Record<string, string>) => void;
}> = ({ categoryId, meta, onChange }) => {
  const { categories } = useCategories();
  const { templates } = useTemplates();
  const cat = categories.find((c: any) => c.id === categoryId);
  const tpl = templates.find((t: any) => t.id === (cat?.defaultTemplateId || ''));
  if (!tpl || !tpl.fields || tpl.fields.length === 0) return null;
  const hasRequiredError = tpl.fields.some(
    (f: any) => f.required && !(meta[f.key] ?? '').trim()
  );
  return (
    <div className="space-y-3 pt-2 border-t border-white/5">
      {tpl.fields.map((f: any) => {
        const rawVal = meta[f.key] ?? '';
        const normalizeSerialStatus = (value?: string) => {
          const v = (value || '').trim();
          if (!v) return '';
          const map: Record<string, string> = {
            連載: '連載中',
            連載中: '連載中',
            完結: '已完結',
            完本: '已完結',
            已完結: '已完結',
            已完本: '已完結',
            暫停: '太監',
            斷更: '太監',
            太監: '太監',
          };
          return map[v] || '';
        };
        const options = Array.isArray(f.options) ? f.options : [];
        const isSerialStatus = f.key === 'serialStatus';
        const normalizedSerial = isSerialStatus ? normalizeSerialStatus(String(rawVal)) : '';
        const pickSerialOption = () => {
          if (!normalizedSerial) return '';
          const aliasMap: Record<string, string[]> = {
            連載中: ['連載中', '連載'],
            已完結: ['已完結', '完結', '完本', '已完本'],
            太監: ['太監', '暫停', '斷更'],
          };
          const aliases = aliasMap[normalizedSerial] || [normalizedSerial];
          return aliases.find((opt) => options.includes(opt)) || '';
        };
        const serialValue = isSerialStatus ? pickSerialOption() : '';
        const val = isSerialStatus ? serialValue : String(rawVal);
        const displayValue = isSerialStatus
          ? serialValue || normalizedSerial || String(rawVal)
          : String(rawVal);
        const set = (v: string) => onChange({ ...meta, [f.key]: v });
        const isEmpty = !(String(rawVal) || '').trim();
        const baseCls = `w-full bg-[var(--bg)] border rounded-lg px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)] ${f.required && isEmpty ? 'border-red-600' : 'border-white/5'}`;
        return (
          <div key={f.key}>
            <label className="block text-xs font-bold text-[var(--muted)] uppercase tracking-wider mb-1.5">
              {f.label} {f.required && <span className="text-red-400">*</span>}
            </label>
            {f.type === 'select' ? (
              <SelectField
                value={val}
                displayValue={displayValue}
                options={options}
                placeholder={f.defaultValue || 'Select...'}
                onChange={set}
                error={!!(f.required && isEmpty)}
              />
            ) : f.type === 'number' ? (
              <input
                className={baseCls}
                type="number"
                value={val}
                placeholder={f.defaultValue || ''}
                onChange={(e) => set(e.target.value)}
              />
            ) : f.type === 'date' ? (
              (() => {
                const toDateInput = (s: string) => {
                  if (!s) return '';
                  const d = new Date(s);
                  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
                  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : '';
                };
                const dateVal = toDateInput(String(val || ''));
                return (
                  <input
                    className={baseCls}
                    type="date"
                    value={dateVal}
                    onChange={(e) => set(e.target.value)}
                  />
                );
              })()
            ) : f.type === 'url' ? (
              <input
                className={baseCls}
                type="url"
                value={val}
                placeholder={f.defaultValue || ''}
                onChange={(e) => set(e.target.value)}
              />
            ) : f.type === 'rating' ? (
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    aria-label={`Rate ${n}`}
                    className={`text-lg ${Number(val) >= n ? 'text-yellow-400' : 'text-slate-600'} hover:text-yellow-300`}
                    onClick={() => set(String(n))}
                  >
                    {Number(val) >= n ? '★' : '☆'}
                  </button>
                ))}
                <button
                  type="button"
                  className="ml-2 text-xs text-slate-400 hover:text-slate-200"
                  onClick={() => set('')}
                >
                  Clear
                </button>
              </div>
            ) : (
              <input
                className={baseCls}
                value={val}
                placeholder={f.defaultValue || ''}
                onChange={(e) => set(e.target.value)}
              />
            )}
          </div>
        );
      })}
      {hasRequiredError && (
        <div className="text-xs text-red-400">請填寫所有必填欄位</div>
      )}
    </div>
  );
};
