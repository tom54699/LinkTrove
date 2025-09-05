import React, { useState, useRef, useEffect } from 'react';
import { ContextMenu } from '../ui/ContextMenu';
import { useCategories } from '../sidebar/categories';
import { useTemplates } from '../templates/TemplatesProvider';

export interface WebpageCardData {
  id: string;
  title: string;
  url: string;
  description?: string;
  favicon?: string;
  category?: string;
  subcategoryId?: string;
  meta?: Record<string, string>;
}

export const WebpageCard: React.FC<{
  data: WebpageCardData;
  onOpen?: (url: string) => void;
  onEditDescription?: (id: string, description: string) => void;
  onDelete?: (id: string) => void;
  onUpdateTitle?: (id: string, title: string) => void;
  onUpdateUrl?: (id: string, url: string) => void;
  onUpdateCategory?: (id: string, category: string) => void;
  onUpdateMeta?: (id: string, meta: Record<string, string>) => void;
  selectMode?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
}> = ({
  data,
  onOpen,
  onEditDescription,
  onDelete,
  onUpdateTitle,
  onUpdateUrl,
  onUpdateCategory,
  onUpdateMeta,
  selectMode,
  selected,
  onToggleSelect,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [descValue, setDescValue] = useState<string>(data.description ?? '');
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [titleValue, setTitleValue] = useState<string>(data.title);
  const [urlValue, setUrlValue] = useState<string>(data.url);
  const [urlError, setUrlError] = useState<string>('');
  const categoryValue = data.category || 'default';
  const [metaValue, setMetaValue] = useState<Record<string, string>>({
    ...(data.meta || {}),
  });
  const [moveMenuPos, setMoveMenuPos] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const handleClick = () => {
    if (isEditing) return;
    if (onOpen) onOpen(data.url);
    else window.open?.(data.url, '_blank');
  };

  useEffect(() => {
    if (isEditing) textareaRef.current?.focus();
  }, [isEditing]);

  // Keep modal fields in sync with latest data when opening
  useEffect(() => {
    if (showModal) {
      setTitleValue(data.title);
      setUrlValue(data.url);
      setDescValue(data.description ?? '');
      setMetaValue({ ...(data.meta || {}) });
    }
  }, [showModal, data.title, data.url, data.description, data.meta]);

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

  return (
    <div
      id={`card-${data.id}`}
      data-testid="webpage-card"
      className="toby-card group relative cursor-pointer rounded-xl border border-slate-700 p-6 bg-[var(--card)] transition-colors shadow-md hover:shadow-lg min-h-[140px]"
      style={{ backgroundColor: 'var(--card)' }}
      data-editing={isEditing ? 'true' : undefined}
      data-select={selectMode ? 'true' : undefined}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') handleClick();
      }}
    >
      <div className="flex items-start gap-2 pr-2">
        <div className="toby-icon-box relative mt-1 w-10 h-10 rounded bg-slate-600 overflow-hidden flex items-center justify-center">
          {data.favicon ? (
            <img src={data.favicon} alt="" className="w-10 h-10 object-cover" />
          ) : (
            <div className="w-full h-full bg-slate-600" />
          )}
          {
            // Checkbox overlay shows on hover for visual parity,
            // but only toggles selection when selectMode is true
            true && (
              <label
                className="toby-checkbox-overlay absolute inset-0 rounded flex items-center justify-center cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  if (selectMode) onToggleSelect?.();
                }}
              >
                <input
                  type="checkbox"
                  role="checkbox"
                  aria-label={`Select ${data.title}`}
                  className="sr-only"
                  checked={!!selected}
                  onChange={() => {
                    if (selectMode) onToggleSelect?.();
                  }}
                />
                <span
                  className={`w-5 h-5 rounded border-2 ${selected ? 'bg-[#2166E7] border-[#2166E7]' : 'border-[#C5C5D3]'} flex items-center justify-center transition-colors`}
                >
                  {selected && (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="white"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="w-3 h-3"
                    >
                      <polyline points="20,6 9,17 4,12"></polyline>
                    </svg>
                  )}
                </span>
              </label>
            )
          }
        </div>
        <div className="min-w-0">
          <div className="toby-title" title={data.title}>
            {data.title}
          </div>
          {/* Static description removed; use editable description below */}
        </div>
      </div>
      {isEditing ? (
        <textarea
          ref={textareaRef}
          role="textbox"
          className="mt-3 w-full min-h-[72px] rounded bg-slate-900 border border-slate-700 p-2 text-sm outline-none focus:border-slate-500"
          value={descValue}
          onChange={(e) => setDescValue(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          onBlur={() => {
            setIsEditing(false);
            if (onEditDescription) onEditDescription(data.id, descValue);
          }}
        />
      ) : (
        <div
          className={`toby-description mt-2 text-base ${data.description ? 'opacity-90' : 'opacity-60 italic'}`}
          onClick={(e) => {
            e.stopPropagation();
            // Clicking description enters inline edit mode
            setDescValue(data.description ?? '');
            setIsEditing(true);
          }}
        >
          {data.description || 'Add description…'}
        </div>
      )}

      {/* Top-right: Delete only */}
      <div
        className="toby-actions toby-delete-wrap absolute right-2 top-2 flex gap-2"
        role="group"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <button
          aria-label="Remove"
          title="Delete"
          onClick={() => setConfirming(true)}
          className="toby-icon delete"
          onMouseDown={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <img
            src="/icons/toby/OrgGroupModal5.svg"
            alt=""
            width={12}
            height={12}
          />
        </button>
      </div>

      {/* Bottom actions: Edit / Move (overlay at bottom-right) */}
      <div
        className="toby-actions-bottom absolute right-2 bottom-2 flex gap-2"
        role="group"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <button
          aria-label="Edit"
          title="Edit description"
          onClick={() => setShowModal(true)}
          className="toby-icon"
        >
          <img
            src="/icons/toby/OrgGroupModal6.svg"
            alt=""
            width={12}
            height={12}
          />
        </button>
        <button
          aria-label="Move"
          title="Move to collection"
          onClick={(e) => {
            const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
            setMoveMenuPos({ x: r.left, y: r.bottom + 4 });
          }}
          className="toby-icon"
        >
          <img
            src="/icons/toby/ListSectionSort1.svg"
            alt=""
            width={12}
            height={12}
          />
        </button>
      </div>

      {showModal && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60"
          onClick={() => setShowModal(false)}
        >
          <div
            className="rounded border border-slate-700 bg-[var(--panel)] p-5 w-[520px] max-w-[90vw]"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Edit Card"
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setShowModal(false);
              } else if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                const normalized = validateUrl(urlValue);
                if (normalized.error) {
                  setUrlError(normalized.error);
                  return;
                }
                if (normalized.value && normalized.value !== data.url) {
                  onUpdateUrl?.(data.id, normalized.value);
                }
                onUpdateTitle?.(data.id, titleValue.trim());
                onEditDescription?.(data.id, descValue);
                setShowModal(false);
              }
            }}
          >
            <div className="flex items-center gap-3 mb-4">
              {data.favicon ? (
                <img src={data.favicon} alt="" className="w-6 h-6" />
              ) : (
                <div className="w-6 h-6 bg-slate-600 rounded" />
              )}
              <div className="text-sm opacity-80 truncate">{data.url}</div>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm mb-1">Title</label>
                <input
                  className="w-full rounded bg-slate-900 border border-slate-700 p-2 text-sm"
                  value={titleValue}
                  onChange={(e) => setTitleValue(e.target.value)}
                />
              </div>
              {/* Category selection removed; use Move action or drag to sidebar to change category */}
              <TemplateFields
                categoryId={categoryValue}
                meta={metaValue}
                onChange={setMetaValue}
              />
              <div>
                <label className="block text-sm mb-1">URL</label>
                <input
                  className={`w-full rounded bg-slate-900 border p-2 text-sm ${urlError ? 'border-red-600' : 'border-slate-700'}`}
                  value={urlValue}
                  onChange={(e) => {
                    setUrlValue(e.target.value);
                    if (urlError) setUrlError('');
                  }}
                  onBlur={() => {
                    const normalized = validateUrl(urlValue);
                    if (normalized.error) setUrlError(normalized.error);
                    else if (normalized.value) setUrlValue(normalized.value);
                  }}
                  placeholder="https://example.com"
                />
                {urlError && (
                  <div className="mt-1 text-xs text-red-400">{urlError}</div>
                )}
              </div>
              <div>
                <label className="block text-sm mb-1">Description</label>
                <input
                  className="w-full rounded bg-slate-900 border border-slate-700 p-2 text-sm"
                  value={descValue}
                  onChange={(e) => setDescValue(e.target.value)}
                />
              </div>
            </div>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                className="px-3 py-1 rounded border border-red-600 text-red-300 hover:bg-red-950/30"
                onClick={() => setConfirming(true)}
              >
                Delete
              </button>
              <button
                className="px-3 py-1 rounded border border-slate-600 hover:bg-slate-800"
                onClick={() => setShowModal(false)}
              >
                Cancel
              </button>
              <button
                className="px-3 py-1 rounded border border-emerald-600 text-emerald-300 hover:bg-emerald-950/30 disabled:opacity-50"
                disabled={!!urlError}
                onClick={() => {
                  const normalized = validateUrl(urlValue);
                  if (normalized.error) {
                    setUrlError(normalized.error);
                    return;
                  }
                  if (normalized.value && normalized.value !== data.url) {
                    onUpdateUrl?.(data.id, normalized.value);
                  }
                  // Category change is handled via Move action or dragging to sidebar
                  onUpdateTitle?.(data.id, titleValue.trim());
                  onEditDescription?.(data.id, descValue);
                  onUpdateMeta?.(data.id, metaValue);
                  setShowModal(false);
                }}
              >
                Done
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
          items={useCategories().categories.map((c) => ({
            key: c.id,
            label: c.name,
            onSelect: () => {
              setMoveMenuPos(null);
              if (c.id !== (data as any).category)
                onUpdateCategory?.(data.id, c.id);
            },
          }))}
        />
      )}

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
                  onDelete?.(data.id);
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
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
  const cat = categories.find((c) => c.id === categoryId);
  const tpl = templates.find((t) => t.id === (cat?.defaultTemplateId || ''));
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

import { useCategories } from '../sidebar/categories';
const CategorySelect: React.FC<{
  value: string;
  onChange: (v: string) => void;
}> = ({ value, onChange }) => {
  const { categories } = useCategories();
  return (
    <select
      className="w-full rounded bg-slate-900 border border-slate-700 p-2 text-sm"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {categories.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </select>
  );
};
