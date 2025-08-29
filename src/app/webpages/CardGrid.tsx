import React from 'react';
import { WebpageCard, type WebpageCardData } from './WebpageCard';
import { TobyLikeCard } from './TobyLikeCard';
import type { TabItemData } from '../tabs/types';
import { useFeedback } from '../ui/feedback';

export interface CardGridProps {
  items?: WebpageCardData[];
  onDropTab?: (tab: TabItemData) => void;
  onDeleteMany?: (ids: string[]) => void;
  onDeleteOne?: (id: string) => void;
  onEditDescription?: (id: string, description: string) => void;
  onSave?: (id: string, patch: Partial<{ title: string; description: string; url: string; meta: Record<string,string> }>) => void;
  density?: 'compact' | 'cozy' | 'roomy';
  collapsed?: boolean;
  onReorder?: (fromId: string, toId: string) => void;
  onUpdateTitle?: (id: string, title: string) => void;
  onUpdateUrl?: (id: string, url: string) => void;
  onUpdateCategory?: (id: string, category: string) => void;
  onUpdateMeta?: (id: string, meta: Record<string, string>) => void;
}

export const CardGrid: React.FC<CardGridProps> = ({
  items = [],
  onDropTab,
  onDeleteMany,
  onDeleteOne,
  onEditDescription,
  onSave,
  density = 'cozy',
  collapsed = false,
  onReorder,
  onUpdateTitle,
  onUpdateUrl,
  onUpdateCategory,
  onUpdateMeta,
}) => {
  const [isOver, setIsOver] = React.useState(false);
  const { showToast } = useFeedback();
  const [selectMode, setSelectMode] = React.useState(false);
  const [selected, setSelected] = React.useState<Record<string, boolean>>({});

  const selectedCount = Object.values(selected).filter(Boolean).length;
  const toggleSelect = (id: string) =>
    setSelected((s) => ({ ...s, [id]: !s[id] }));
  const clearSelection = () => setSelected({});

  const [confirming, setConfirming] = React.useState(false);
  const [overId, setOverId] = React.useState<string | null>(null);
  const [dragDisabled, setDragDisabled] = React.useState(false);
  const [ghostTab, setGhostTab] = React.useState<TabItemData | null>(null);
  const [ghostTarget, setGhostTarget] = React.useState<string | null>(null); // item.id or '__END__'

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsOver(true);
  };
  const handleDragLeave = () => { setIsOver(false); setGhostTab(null); setGhostTarget(null); };
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsOver(false);
    try {
      const raw = e.dataTransfer.getData('application/x-linktrove-tab');
      if (raw) {
        const tab: TabItemData = JSON.parse(raw);
        if (items.length === 0) onDropTab?.(tab);
        // when list is not empty, require dropping on a card; just clear preview
        setGhostTab(null); setGhostTarget(null);
      }
    } catch (err) {
      showToast('Failed to add tab', 'error');
    }
  };

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <button
          type="button"
          className="text-sm px-2 py-1 rounded border border-slate-600 hover:bg-slate-800"
          onClick={() => setSelectMode((v) => !v)}
        >
          {selectMode ? 'Cancel' : 'Select'}
        </button>
        {selectMode && (
          <>
            <span className="text-sm opacity-80">{selectedCount} selected</span>
            <button
              type="button"
              className="text-sm px-2 py-1 rounded border border-red-600 text-red-300 hover:bg-red-950/30 disabled:opacity-50"
              onClick={() => {
                (document.activeElement as HTMLElement | null)?.blur?.();
                setConfirming(true);
              }}
              disabled={selectedCount === 0}
            >
              Delete Selected
            </button>
          </>
        )}
      </div>
      <div
        aria-label="Drop Zone"
        data-testid="drop-zone"
        onDragOver={handleDragOver}
        onDragEnter={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`min-h-[200px] rounded border p-4 transition-all ${
          isOver
            ? 'border-emerald-500 ring-2 ring-emerald-500 bg-emerald-950/20'
            : 'border-slate-700'
        }`}
      >
        {items.length === 0 ? (
          <div className="opacity-70">Drag tabs here to save</div>
        ) : (
          <div
            className={`toby-cards-flex ${density === 'compact' ? 'density-compact' : density === 'roomy' ? 'density-roomy' : ''} ${collapsed ? 'cards-collapsed' : ''}`}
          >
            {items.map((it, idx) => (
              <div
                key={it.id}
                className="toby-card-flex relative"
                data-testid={`card-wrapper-${it.id}`}
                draggable={!dragDisabled}
                onDragStart={(e) => {
                  e.dataTransfer.setData('application/x-linktrove-webpage', it.id);
                  e.dataTransfer.effectAllowed = 'move';
                  (e.currentTarget as HTMLElement).setAttribute('data-dragging', 'true');
                }}
                onDragEnd={(e) => { (e.currentTarget as HTMLElement).removeAttribute('data-dragging'); }}
                onDragEnter={(e) => {
                  e.preventDefault();
                  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                  const mid = rect.top + rect.height / 2;
                  const isLast = idx === items.length - 1;
                  const atEnd = isLast && e.clientY > mid;
                  const target = atEnd ? '__END__' : it.id;
                  if (overId !== target) setOverId(target);
                  const raw = e.dataTransfer.getData('application/x-linktrove-tab');
                  if (raw) {
                    try { const tab: TabItemData = JSON.parse(raw); setGhostTab(tab); setGhostTarget(target); } catch {}
                  }
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                  const mid = rect.top + rect.height / 2;
                  const isLast = idx === items.length - 1;
                  const atEnd = isLast && e.clientY > mid;
                  const target = atEnd ? '__END__' : it.id;
                  if (overId !== target) setOverId(target);
                  const raw = e.dataTransfer.getData('application/x-linktrove-tab');
                  if (raw) {
                    try { const tab: TabItemData = JSON.parse(raw); setGhostTab(tab); setGhostTarget(target); } catch {}
                  }
                }}
                onDragLeave={(e) => {
                  // Clear when leaving this card entirely
                  if (overId === it.id) setOverId(null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setOverId(null);
                  const rawTab = e.dataTransfer.getData('application/x-linktrove-tab');
                  if (rawTab) {
                    try {
                      const tab: TabItemData = JSON.parse(rawTab);
                      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                      const mid = rect.top + rect.height / 2;
                      const isLast = idx === items.length - 1;
                      const atEnd = isLast && e.clientY > mid;
                      const target = atEnd ? '__END__' : it.id;
                      (onDropTab as any)?.(tab, target);
                      setGhostTab(null); setGhostTarget(null);
                      return;
                    } catch {/* ignore */}
                  }
                  const fromId = e.dataTransfer.getData('application/x-linktrove-webpage');
                  if (fromId && fromId !== it.id) onReorder?.(fromId, it.id);
                }}
              >
                {overId === it.id && (
                  <div
                    aria-hidden
                    className="pointer-events-none absolute left-0 right-0 top-0 h-0.5 bg-emerald-500 shadow-[0_0_0_2px_rgba(16,185,129,0.4)]"
                  />
                )}
                {ghostTab && ghostTarget === it.id && (
                  <div className="toby-card-flex relative" data-testid="ghost-before">
                    <TobyLikeCard
                      title={ghostTab.title || ghostTab.url || 'New'}
                      description={''}
                      faviconText={(ghostTab.url || '').replace(/^https?:\/\//,'').replace(/^www\./,'').slice(0,2).toUpperCase() || 'WW'}
                      faviconUrl={(ghostTab as any)?.favIconUrl}
                      ghost
                    />
                  </div>
                )}
                <TobyLikeCard
                  title={it.title}
                  description={it.description}
                  faviconText={(it.url || '').replace(/^https?:\/\//,'').replace(/^www\./,'').slice(0,2).toUpperCase() || 'WW'}
                  faviconUrl={it.favicon}
                  url={it.url}
                  categoryId={(it as any).category}
                  meta={it.meta || {}}
                  selectMode={selectMode}
                  selected={!!selected[it.id]}
                  onToggleSelect={() => toggleSelect(it.id)}
                  onOpen={() => { try { window.open(it.url, '_blank'); } catch {} }}
                  onDelete={() => onDeleteOne?.(it.id)}
                  onUpdateTitle={(v)=>onUpdateTitle?.(it.id, v)}
                  onUpdateUrl={(v)=>onUpdateUrl?.(it.id, v)}
                  onUpdateDescription={(v)=>onEditDescription?.(it.id, v)}
                  onUpdateMeta={(m)=>onUpdateMeta?.(it.id, m)}
                  onMoveToCategory={(cid)=>onUpdateCategory?.(it.id, cid)}
                  onModalOpenChange={(open)=>setDragDisabled(open)}
                  onSave={(patch)=>{
                    if (onSave) onSave(it.id, patch);
                    else {
                      if (patch.title) onUpdateTitle?.(it.id, patch.title);
                      if (patch.url) onUpdateUrl?.(it.id, patch.url);
                      if (patch.description !== undefined) onEditDescription?.(it.id, patch.description);
                      if (patch.meta) onUpdateMeta?.(it.id, patch.meta);
                    }
                  }}
                />
              </div>
            ))}
            {ghostTab && ghostTarget === '__END__' && (
              <div className="toby-card-flex relative">
                <TobyLikeCard
                  title={ghostTab.title || ghostTab.url || 'New'}
                  description={''}
                  faviconText={(ghostTab.url || '').replace(/^https?:\/\//,'').replace(/^www\./,'').slice(0,2).toUpperCase() || 'WW'}
                  faviconUrl={(ghostTab as any).favIconUrl}
                  ghost
                />
              </div>
            )}
          </div>
        )}
      </div>
      {confirming && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setConfirming(false)}
        >
          <div
            className="rounded border border-slate-700 bg-[var(--bg)] p-4"
            role="dialog"
            aria-label="Confirm Delete Selected"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 font-medium">Confirm Delete Selected</div>
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
                  const ids = Object.entries(selected)
                    .filter(([, v]) => v)
                    .map(([k]) => k);
                  setConfirming(false);
                  clearSelection();
                  onDeleteMany?.(ids);
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
