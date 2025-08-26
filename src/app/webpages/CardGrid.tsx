import React from 'react';
import { WebpageCard, type WebpageCardData } from './WebpageCard';
import type { TabItemData } from '../tabs/types';

export interface CardGridProps {
  items?: WebpageCardData[];
  onDropTab?: (tab: TabItemData) => void;
  onDeleteMany?: (ids: string[]) => void;
}

export const CardGrid: React.FC<CardGridProps> = ({
  items = [],
  onDropTab,
  onDeleteMany,
}) => {
  const [isOver, setIsOver] = React.useState(false);
  const [selectMode, setSelectMode] = React.useState(false);
  const [selected, setSelected] = React.useState<Record<string, boolean>>({});

  const selectedCount = Object.values(selected).filter(Boolean).length;
  const toggleSelect = (id: string) =>
    setSelected((s) => ({ ...s, [id]: !s[id] }));
  const clearSelection = () => setSelected({});

  const [confirming, setConfirming] = React.useState(false);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsOver(true);
  };
  const handleDragLeave = () => setIsOver(false);
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsOver(false);
    try {
      const raw = e.dataTransfer.getData('application/x-linktrove-tab');
      if (raw) {
        const tab: TabItemData = JSON.parse(raw);
        onDropTab?.(tab);
      }
    } catch (err) {
      // ignore malformed payloads
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {items.map((it) => (
              <div key={it.id} className="relative">
                {selectMode && (
                  <input
                    type="checkbox"
                    role="checkbox"
                    aria-label={`Select ${it.title}`}
                    className="absolute top-2 left-2 w-4 h-4 accent-emerald-500"
                    checked={!!selected[it.id]}
                    onChange={() => toggleSelect(it.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                )}
                <WebpageCard data={it} />
              </div>
            ))}
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
