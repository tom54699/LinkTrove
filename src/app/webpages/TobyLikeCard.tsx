import React from 'react';
import { createPortal } from 'react-dom';
import '../../styles/toby-like.css';
import { ContextMenu } from '../ui/ContextMenu';
import { useCategories } from '../sidebar/categories';
import { useTemplates } from '../templates/TemplatesProvider';

export interface TobyLikeCardProps {
  title: string;
  description?: string;
  faviconUrl?: string;
  url?: string;
  categoryId?: string;
  meta?: Record<string, string>;
  selected?: boolean;
  onToggleSelect?: () => void;
  onOpen?: () => void;
  onDelete?: () => void;
  onUpdateTitle?: (title: string) => void;
  onUpdateUrl?: (url: string) => void;
  onUpdateDescription?: (desc: string) => void;
  onUpdateMeta?: (m: Record<string, string>) => void;
  onMoveToCategory?: (categoryId: string) => void;
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

export const TobyLikeCard: React.FC<TobyLikeCardProps> = ({
  title,
  description,
  faviconUrl,
  url,
  categoryId,
  meta,
  selected,
  onToggleSelect,
  onOpen,
  onDelete,
  onUpdateTitle,
  onUpdateUrl,
  onUpdateDescription,
  onUpdateMeta,
  onMoveToCategory,
  onModalOpenChange,
  onSave,
  ghost,
}) => {
  const [confirming, setConfirming] = React.useState(false);
  const [showModal, setShowModal] = React.useState(false);
  const [titleValue, setTitleValue] = React.useState(title);
  const [urlValue, setUrlValue] = React.useState('');
  const [descValue, setDescValue] = React.useState(description || '');
  const [moveMenuPos, setMoveMenuPos] = React.useState<{ x: number; y: number; } | null>(null);
  const { categories } = useCategories();
  const [metaValue, setMetaValue] = React.useState<Record<string, string>>({ ...(meta || {}) });

  const autoSaveTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
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

  return (
    <div className="tobylike">
      {/* Added 'group' class to the card wrapper to allow child elements to react to card hover */}
      <div className={`card group relative flex flex-col transition-all select-none box-border overflow-visible ${ghost ? 'opacity-50 pointer-events-none' : ''}`}
           style={{ height: '140px', minHeight: '140px', background: 'var(--card)' }}
           onClick={onOpen}>
        
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
              {description || "No description provided."}
            </p>
          </div>
        </div>

        {/* Delete Bubble (Original Style) */}
        {!ghost && (
          <button className="delete-btn" title="刪除" onClick={(e) => { e.stopPropagation(); setConfirming(true); }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"></path></svg>
          </button>
        )}

        {/* Action Sticker (Original Style) */}
        {!ghost && (
          <div className="actions" onClick={(e) => e.stopPropagation()}>
            <button className="action-btn" title="編輯" onClick={() => { setShowModal(true); onModalOpenChange?.(true); }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 20h4l10.5 -10.5a2.828 2.828 0 1 0 -4 -4l-10.5 10.5v4"></path><path d="M13.5 6.5l4 4"></path></svg>
            </button>
            <button className="action-btn" title="移動" onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); setMoveMenuPos({ x: r.left, y: r.bottom + 8 }); }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 15l6 -6"></path><path d="M11 6l.463 -.536a5 5 0 0 1 7.071 7.072l-.534 .464"></path><path d="M13 18l-.397 .534a5.068 5.068 0 0 1 -7.127 0a4.972 4.972 0 0 1 0 -7.071l.524 -.463"></path></svg>
            </button>
          </div>
        )}
      </div>

      {/* Portals for Modals */}
      {confirming && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4" onClick={() => setConfirming(false)}>
          <div className="bg-[var(--panel)] border border-white/10 rounded-xl p-5 shadow-2xl max-w-xs w-full" onClick={(e) => e.stopPropagation()}>
            <h4 className="text-lg font-bold mb-2 text-[var(--text)]">Delete Card?</h4>
            <p className="text-sm text-[var(--muted)] mb-6">Are you sure you want to remove this webpage?</p>
            <div className="flex gap-2 justify-end">
              <button className="px-4 py-2 text-sm font-semibold rounded-lg border border-white/10 text-[var(--text)] hover:bg-white/5 transition-colors" onClick={() => setConfirming(false)}>Cancel</button>
              <button className="px-4 py-2 text-sm font-semibold rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors" onClick={() => { setConfirming(false); onDelete?.(); }}>Delete</button>
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
              <h3 className="text-lg font-bold text-[var(--text)]">Edit Webpage</h3>
              <button className="text-[var(--muted)] hover:text-[var(--text)]" onClick={() => { setShowModal(false); onModalOpenChange?.(false); }}>✕</button>
            </header>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div><label className="block text-xs font-bold text-[var(--muted)] uppercase tracking-wider mb-1.5">Title</label><input className="w-full bg-[var(--bg)] border border-white/5 rounded-lg px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]" value={titleValue} onChange={(e) => { setTitleValue(e.target.value); triggerAutoSave(); }} /></div>
              <div><label className="block text-xs font-bold text-[var(--muted)] uppercase tracking-wider mb-1.5">URL</label><input className="w-full bg-[var(--bg)] border border-white/5 rounded-lg px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]" value={urlValue} onChange={(e) => { setUrlValue(e.target.value); triggerAutoSave(); }} /></div>
              <div><label className="block text-xs font-bold text-[var(--muted)] uppercase tracking-wider mb-1.5">Note</label><input className="w-full bg-[var(--bg)] border border-white/5 rounded-lg px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]" value={descValue} onChange={(e) => { setDescValue(e.target.value); triggerAutoSave(); }} /></div>
              <TemplateFields categoryId={categoryId || 'default'} meta={metaValue} onChange={(newMeta) => { setMetaValue(newMeta); triggerAutoSave(); }} />
            </div>
            <footer className="px-6 py-4 bg-white/5 border-t border-white/5 flex justify-end gap-2">
              <button className="px-4 py-2 text-sm font-bold text-[var(--muted)] hover:text-[var(--text)]" onClick={() => { setShowModal(false); onModalOpenChange?.(false); }}>Cancel</button>
              <button className="px-6 py-2 text-sm font-bold bg-[var(--accent)] text-black rounded-lg hover:brightness-110" onClick={() => { const patch: any = { title: titleValue.trim(), description: descValue, url: urlValue.trim(), meta: metaValue }; if (onSave) onSave(patch); setShowModal(false); onModalOpenChange?.(false); }}>Save Changes</button>
            </footer>
          </div>
        </div>,
        document.body
      )}

      {moveMenuPos && (
        <ContextMenu
          x={moveMenuPos.x}
          y={moveMenuPos.y}
          onClose={() => setMoveMenuPos(null)}
          items={categories.map((c) => ({
            key: c.id,
            label: c.name,
            onSelect: () => {
              onMoveToCategory?.(c.id);
              setMoveMenuPos(null);
            },
          }))}
        />
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
  return (
    <div className="space-y-3 pt-2 border-t border-white/5">
      {tpl.fields.map((f: any) => {
        const val = meta[f.key] ?? '';
        const set = (v: string) => onChange({ ...meta, [f.key]: v });
        return (
          <div key={f.key}>
            <label className="block text-xs font-bold text-[var(--muted)] uppercase tracking-wider mb-1.5">{f.label}</label>
            <input className="w-full bg-[var(--bg)] border border-white/5 rounded-lg px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]"
                   value={val} placeholder={f.defaultValue} onChange={(e) => set(e.target.value)} />
          </div>
        );
      })}
    </div>
  );
};
