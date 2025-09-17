import React from 'react';
import '../../styles/toby-like.css';
import { ContextMenu } from '../ui/ContextMenu';
import { useCategories } from '../sidebar/categories';
import { useTemplates } from '../templates/TemplatesProvider';

export interface TobyLikeCardProps {
  title: string;
  description?: string;
  faviconText?: string; // fallback initials
  faviconUrl?: string;
  url?: string;
  categoryId?: string;
  meta?: Record<string, string>;
  selectMode?: boolean;
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
  faviconText: _faviconText = 'WW',
  faviconUrl,
  url,
  categoryId,
  meta,
  selectMode,
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
  const [moveMenuPos, setMoveMenuPos] = React.useState<{
    x: number;
    y: number;
  } | null>(null);
  const { categories } = useCategories();
  const [metaValue, setMetaValue] = React.useState<Record<string, string>>({
    ...(meta || {}),
  });

  function validateUrl(raw: string): { value?: string; error?: string } {
    const v = (raw || '').trim();
    if (!v) return { error: 'URL is required' };
    try {
      const u = new URL(v);
      if (!/^https?:$/.test(u.protocol))
        return { error: 'Only http/https supported' };
      return { value: u.toString() };
    } catch {
      return { error: 'Invalid URL' };
    }
  }

  // When opening edit modal, sync fields and try to hydrate siteName/author from cached meta
  React.useEffect(() => {
    if (showModal) {
      setTitleValue(title);
      setDescValue(description || '');
      setUrlValue(url || '');
      (async () => {
        try {
          if (!url) return;
          const mod = await import('../../background/pageMeta');
          const cached = await mod.getCachedMeta(url);
          if (cached) {
            const next = { ...metaValue };
            if (
              !((next as any).siteName || '').trim() &&
              (cached as any).siteName
            )
              next.siteName = String((cached as any).siteName);
            if (!((next as any).author || '').trim() && (cached as any).author)
              next.author = String((cached as any).author);
            setMetaValue(next);
          }
        } catch {}
      })();
    }
  }, [showModal]);

  return (
    <div className="tobylike">
      <div
        className="card"
        data-select={selectMode ? 'true' : undefined}
        onClick={onOpen}
        style={{
          background: 'var(--card)',
          ...(ghost ? { opacity: 0.5, pointerEvents: 'none' } : {}),
        }}
        data-testid={ghost ? 'ghost-card' : undefined}
      >
        <div className="card-content">
          <div className="block-a" style={{ width: '100%' }}>
            <div
              className="icon-container"
              style={{ background: faviconUrl ? 'transparent' : undefined }}
            >
              {(() => {
                const defaultIconUrl = (() => {
                  try {
                    return (
                      (chrome as any)?.runtime?.getURL?.(
                        'icons/default-favicon.png'
                      ) || '/icons/default-favicon.png'
                    );
                  } catch {
                    return '/icons/default-favicon.png';
                  }
                })();
                const src = faviconUrl || defaultIconUrl;
                return (
                  <img
                    src={src}
                    alt=""
                    style={{ width: 32, height: 32, objectFit: 'cover' }}
                    draggable={false}
                  />
                );
              })()}
              <label
                className="checkbox-overlay"
                onClick={(e) => {
                  e.stopPropagation();
                  const others = (() => {
                    try {
                      return document.querySelectorAll('input[aria-label="Select"]').length > 1;
                    } catch { return false; }
                  })();
                  if (selectMode || others) onToggleSelect?.();
                }}
              >
                <input
                  type="checkbox"
                  aria-label={'Select'}
                  className="sr-only"
                  checked={!!selected}
                  onClick={() => {
                    const others = (() => {
                      try {
                        return document.querySelectorAll('input[aria-label="Select"]').length > 1;
                      } catch { return false; }
                    })();
                    if (selectMode || others) onToggleSelect?.();
                  }}
                  onChange={() => {
                    const others = (() => {
                      try {
                        return document.querySelectorAll('input[aria-label="Select"]').length > 1;
                      } catch { return false; }
                    })();
                    if (selectMode || others) onToggleSelect?.();
                  }}
                />
                <div className={`checkbox ${selected ? 'checked' : ''}`}>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20,6 9,17 4,12"></polyline>
                  </svg>
                </div>
              </label>
            </div>
            <div className="title-box">
              <h2 className="title" title={title}>
                {title}
              </h2>
            </div>
          </div>
          <div className="sep" />
          <div className="block-b" style={{ width: '100%' }}>
            <p className="description" title={description}>
              {description || ''}
            </p>
          </div>
        </div>

        <button
          className="delete-btn"
          style={{ opacity: 1, visibility: 'visible' }}
          title="刪除"
          onClick={(e) => {
            e.stopPropagation();
            setConfirming(true);
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ width: 14, height: 14 }}
          >
            <path d="M18 6 L6 18"></path>
            <path d="M6 6 L18 18"></path>
          </svg>
        </button>

        <div className="actions" onClick={(e) => e.stopPropagation()} style={{ opacity: 1, visibility: 'visible' }}>
          <button
            className="action-btn"
            title="編輯"
            aria-label="編輯"
            onClick={() => {
              setTitleValue(title);
              setDescValue(description || '');
              setShowModal(true);
              onModalOpenChange?.(true);
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 20h4l10.5 -10.5a2.828 2.828 0 1 0 -4 -4l-10.5 10.5v4"></path>
              <path d="M13.5 6.5l4 4"></path>
            </svg>
          </button>
          <button
            className="action-btn"
            title="移動"
            aria-label="移動"
            onClick={(e) => {
              const r = (
                e.currentTarget as HTMLElement
              ).getBoundingClientRect();
              setMoveMenuPos({ x: r.left, y: r.bottom + 8 });
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 15l6 -6"></path>
              <path d="M11 6l.463 -.536a5 5 0 0 1 7.071 7.072l-.534 .464"></path>
              <path d="M13 18l-.397 .534a5.068 5.068 0 0 1 -7.127 0a4.972 4.972 0 0 1 0 -7.071l.524 -.463"></path>
            </svg>
          </button>
        </div>
      </div>

      {confirming && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60"
          onClick={() => setConfirming(false)}
        >
          <div
            className="rounded border border-slate-700 bg-[var(--bg)] p-4"
            role="dialog"
            aria-label="Confirm Delete"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 font-medium">Confirm Delete</div>
            <div className="flex gap-2 justify-end">
              <button
                className="px-3 py-1 rounded border border-slate-600 hover:bg-slate-800"
                onClick={() => setConfirming(false)}
              >
                Cancel
              </button>
              <button
                className="px-3 py-1 rounded border border-red-600 text-red-300 hover:bg-red-950/30"
                onClick={() => {
                  setConfirming(false);
                  onDelete?.();
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60">
          <div
            className="relative rounded border border-slate-700 bg-[var(--panel)] p-5 w-[560px] max-w-[95vw]"
            role="dialog"
            aria-label="Edit Card"
          >
            <button
              aria-label="Close"
              title="Close"
              className="absolute right-2 top-2 text-slate-300 hover:text-white"
              onClick={() => {
                setShowModal(false);
                onModalOpenChange?.(false);
              }}
            >
              ✕
            </button>
            <div className="space-y-3">
              <div>
                <label className="block text-sm mb-1" htmlFor="edit-title">Title</label>
                <input
                  id="edit-title"
                  className="w-full rounded bg-slate-900 border border-slate-700 p-2 text-sm"
                  value={titleValue}
                  onChange={(e) => setTitleValue(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm mb-1" htmlFor="edit-desc">Description</label>
                <input
                  id="edit-desc"
                  className="w-full rounded bg-slate-900 border border-slate-700 p-2 text-sm"
                  value={descValue}
                  onChange={(e) => setDescValue(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm mb-1" htmlFor="edit-url">URL</label>
                <input
                  id="edit-url"
                  className="w-full rounded bg-slate-900 border border-slate-700 p-2 text-sm"
                  value={urlValue}
                  onChange={(e) => setUrlValue(e.target.value)}
                  placeholder="https://example.com"
                />
              </div>
              <TemplateFields
                categoryId={categoryId || 'default'}
                meta={metaValue}
                onChange={setMetaValue}
              />
            </div>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                className="px-3 py-1 rounded border border-slate-600 hover:bg-slate-800"
                onClick={() => {
                  setShowModal(false);
                  onModalOpenChange?.(false);
                }}
              >
                Cancel
              </button>
              <button
                className="px-3 py-1 rounded border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent-hover)]"
                onClick={() => {
                  const patch: any = {
                    title: titleValue.trim(),
                    description: descValue,
                  };
                  const norm = urlValue.trim()
                    ? validateUrl(urlValue)
                    : undefined;
                  if (!norm || !norm.error) patch.url = norm?.value ?? urlValue;
                  patch.meta = metaValue;
                  if (onSave) {
                    onSave(patch);
                  } else {
                    if (onUpdateTitle) onUpdateTitle(patch.title);
                    if (patch.url && onUpdateUrl) onUpdateUrl(patch.url);
                    if (onUpdateDescription)
                      onUpdateDescription(patch.description);
                    if (onUpdateMeta) onUpdateMeta(patch.meta);
                  }
                  setShowModal(false);
                  onModalOpenChange?.(false);
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
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

// Local copy of TemplateFields (mirrors WebpageCard version)
const TemplateFields: React.FC<{
  categoryId: string;
  meta: Record<string, string>;
  onChange: (m: Record<string, string>) => void;
}> = ({ categoryId, meta, onChange }) => {
  const { categories } = useCategories();
  const { templates } = useTemplates();
  const cat = categories.find((c: any) => c.id === categoryId);
  const tpl = templates.find(
    (t: any) => t.id === (cat?.defaultTemplateId || '')
  );
  if (!tpl || !tpl.fields || tpl.fields.length === 0) return null;
  const hasRequiredError = tpl.fields.some(
    (f: any) => f.required && !(meta[f.key] ?? '').trim()
  );
  return (
    <div className="space-y-2">
      {tpl.fields.map((f: any) => {
        const val = meta[f.key] ?? '';
        const set = (v: string) => onChange({ ...meta, [f.key]: v });
        const baseCls = `w-full rounded bg-slate-900 border p-2 text-sm ${f.required && !val ? 'border-red-600' : 'border-slate-700'}`;
        return (
          <div key={f.key}>
            <label className="block text-sm mb-1">
              {f.label} {f.required && <span className="text-red-400">*</span>}
            </label>
            {f.type === 'select' ? (
              <select
                className={baseCls}
                value={val}
                onChange={(e) => set(e.target.value)}
              >
                <option value="">{f.defaultValue || 'Select...'}</option>
                {(f.options || []).map((op: string) => (
                  <option key={op} value={op}>
                    {op}
                  </option>
                ))}
              </select>
            ) : f.type === 'number' ? (
              <input
                className={baseCls}
                type="number"
                value={val}
                placeholder={f.defaultValue || ''}
                onChange={(e) => set(e.target.value)}
              />
            ) : f.type === 'date' ? (
              <input
                className={baseCls}
                type="date"
                value={val}
                onChange={(e) => set(e.target.value)}
              />
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
