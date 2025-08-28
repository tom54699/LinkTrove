import React from 'react';
import '../../styles/toby-like.css';
import { ContextMenu } from '../ui/ContextMenu';
import { useCategories } from '../sidebar/categories';

export interface TobyLikeCardProps {
  title: string;
  description?: string;
  faviconText?: string; // e.g., site initials
  url?: string;
  selectMode?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
  onOpen?: () => void;
  onDelete?: () => void;
  onUpdateTitle?: (title: string) => void;
  onUpdateUrl?: (url: string) => void;
  onUpdateDescription?: (desc: string) => void;
  onMoveToCategory?: (categoryId: string) => void;
}

export const TobyLikeCard: React.FC<TobyLikeCardProps> = ({
  title,
  description,
  faviconText = 'WW',
  selectMode,
  selected,
  onToggleSelect,
  onOpen,
  onDelete,
  onUpdateTitle,
  onUpdateUrl,
  onUpdateDescription,
  onMoveToCategory,
}) => {
  const [confirming, setConfirming] = React.useState(false);
  const [showModal, setShowModal] = React.useState(false);
  const [titleValue, setTitleValue] = React.useState(title);
  const [urlValue, setUrlValue] = React.useState('');
  const [descValue, setDescValue] = React.useState(description || '');
  const [moveMenuPos, setMoveMenuPos] = React.useState<{ x: number; y: number } | null>(null);
  const { categories } = useCategories();

  function validateUrl(raw: string): { value?: string; error?: string } {
    const v = (raw || '').trim();
    if (!v) return { error: 'URL is required' };
    try {
      const u = new URL(v);
      if (!/^https?:$/.test(u.protocol)) return { error: 'Only http/https supported' };
      return { value: u.toString() };
    } catch {
      return { error: 'Invalid URL' };
    }
  }

  return (
    <div className="tobylike">
      <div className="card" data-select={selectMode ? 'true' : undefined} role="button" tabIndex={0} onClick={onOpen}>
        <div className="card-content">
          <div className="icon-container">
            {faviconText}
            <div className="checkbox-overlay" onClick={(e)=>{ e.stopPropagation(); onToggleSelect?.(); }}>
              <div className={`checkbox ${selected ? 'checked' : ''}`}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20,6 9,17 4,12"></polyline>
                </svg>
              </div>
            </div>
          </div>
          <div className="content">
            <h2 className="title" title={title}>{title}</h2>
            <p className="description" title={description}>{description || ''}</p>
          </div>
        </div>

        <button className="delete-btn" title="刪除" onClick={(e)=>{ e.stopPropagation(); setConfirming(true); }}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
            <path d="M18 6 L6 18"></path>
            <path d="M6 6 L18 18"></path>
          </svg>
        </button>

        <div className="actions" onClick={(e)=>e.stopPropagation()}>
          <button className="action-btn" title="編輯" onClick={()=>{ setTitleValue(title); setDescValue(description||''); setShowModal(true); }}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 20h4l10.5 -10.5a2.828 2.828 0 1 0 -4 -4l-10.5 10.5v4"></path>
              <path d="M13.5 6.5l4 4"></path>
            </svg>
          </button>
          <button className="action-btn" title="移動" onClick={(e)=>{ const r=(e.currentTarget as HTMLElement).getBoundingClientRect(); setMoveMenuPos({ x: r.left, y: r.bottom + 8 }); }}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 15l6 -6"></path>
              <path d="M11 6l.463 -.536a5 5 0 0 1 7.071 7.072l-.534 .464"></path>
              <path d="M13 18l-.397 .534a5.068 5.068 0 0 1 -7.127 0a4.972 4.972 0 0 1 0 -7.071l.524 -.463"></path>
            </svg>
          </button>
        </div>
      </div>

      {confirming && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60" onClick={()=>setConfirming(false)}>
          <div className="rounded border border-slate-700 bg-[var(--bg)] p-4" role="dialog" aria-label="Confirm Delete" onClick={(e)=>e.stopPropagation()}>
            <div className="mb-3 font-medium">Confirm Delete</div>
            <div className="flex gap-2 justify-end">
              <button className="px-3 py-1 rounded border border-slate-600 hover:bg-slate-800" onClick={()=>setConfirming(false)}>Cancel</button>
              <button className="px-3 py-1 rounded border border-red-600 text-red-300 hover:bg-red-950/30" onClick={()=>{ setConfirming(false); onDelete?.(); }}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60" onClick={()=>setShowModal(false)}>
          <div className="rounded border border-slate-700 bg-[var(--panel)] p-5 w-[520px] max-w-[90vw]" onClick={(e)=>e.stopPropagation()} role="dialog" aria-label="Edit Card">
            <div className="space-y-3">
              <div>
                <label className="block text-sm mb-1">Title</label>
                <input className="w-full rounded bg-slate-900 border border-slate-700 p-2 text-sm" value={titleValue} onChange={(e)=>setTitleValue(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm mb-1">URL</label>
                <input className="w-full rounded bg-slate-900 border border-slate-700 p-2 text-sm" value={urlValue} onChange={(e)=>setUrlValue(e.target.value)} placeholder="https://example.com" />
              </div>
              <div>
                <label className="block text-sm mb-1">Description</label>
                <input className="w-full rounded bg-slate-900 border border-slate-700 p-2 text-sm" value={descValue} onChange={(e)=>setDescValue(e.target.value)} />
              </div>
            </div>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button className="px-3 py-1 rounded border border-slate-600 hover:bg-slate-800" onClick={()=>setShowModal(false)}>Cancel</button>
              <button className="px-3 py-1 rounded border border-emerald-600 text-emerald-300 hover:bg-emerald-950/30" onClick={()=>{
                if (onUpdateTitle) onUpdateTitle(titleValue.trim());
                if (urlValue.trim()) {
                  const norm = validateUrl(urlValue);
                  if (!norm.error && onUpdateUrl) onUpdateUrl(norm.value!);
                }
                if (onUpdateDescription) onUpdateDescription(descValue);
                setShowModal(false);
              }}>Save</button>
            </div>
          </div>
        </div>
      )}

      {moveMenuPos && (
        <ContextMenu
          x={moveMenuPos.x}
          y={moveMenuPos.y}
          onClose={()=>setMoveMenuPos(null)}
          items={categories.map((c)=>({ key: c.id, label: c.name, onSelect: ()=>{ onMoveToCategory?.(c.id); setMoveMenuPos(null); } }))}
        />
      )}
    </div>
  );
};
