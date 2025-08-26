import React, { useState, useRef, useEffect } from 'react';
import { ContextMenu } from '../ui/ContextMenu';

export interface WebpageCardData {
  id: string;
  title: string;
  url: string;
  description?: string;
  note?: string;
  favicon?: string;
}

export const WebpageCard: React.FC<{
  data: WebpageCardData;
  onOpen?: (url: string) => void;
  onEdit?: (id: string, note: string) => void;
  onDelete?: (id: string) => void;
}> = ({ data, onOpen, onEdit, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [noteValue, setNoteValue] = useState<string>(data.note ?? '');
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [confirming, setConfirming] = useState(false);

  const handleClick = () => {
    if (isEditing) return;
    if (onOpen) onOpen(data.url);
    else window.open?.(data.url, '_blank');
  };

  useEffect(() => {
    if (isEditing) textareaRef.current?.focus();
  }, [isEditing]);

  return (
    <div
      data-testid="webpage-card"
      className="group cursor-pointer rounded border border-slate-700 p-3 hover:bg-slate-800 transition-colors"
      data-editing={isEditing ? 'true' : undefined}
      onClick={handleClick}
      onContextMenu={(e) => {
        e.preventDefault();
        setMenuPos({ x: e.clientX, y: e.clientY });
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') handleClick();
      }}
    >
      <div className="flex items-start gap-2">
        {data.favicon ? (
          <img src={data.favicon} alt="" className="w-5 h-5 mt-1" />
        ) : (
          <div className="w-5 h-5 mt-1 bg-slate-600 rounded" />
        )}
        <div className="min-w-0">
          <div className="font-medium truncate" title={data.title}>
            {data.title}
          </div>
          {data.description && (
            <div
              className="text-sm opacity-80 truncate"
              title={data.description}
            >
              {data.description}
            </div>
          )}
        </div>
      </div>
      {isEditing ? (
        <textarea
          ref={textareaRef}
          role="textbox"
          className="mt-2 w-full rounded bg-slate-900 border border-slate-700 p-2 text-sm outline-none focus:border-slate-500"
          value={noteValue}
          onChange={(e) => setNoteValue(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          onBlur={() => {
            setIsEditing(false);
            if (onEdit) onEdit(data.id, noteValue);
          }}
        />
      ) : (
        data.note && (
          <div
            className="mt-2 text-sm opacity-90"
            onClick={(e) => {
              e.stopPropagation();
              setIsEditing(true);
            }}
          >
            {data.note}
          </div>
        )
      )}

      {menuPos && (
        <ContextMenu
          x={menuPos.x}
          y={menuPos.y}
          onClose={() => setMenuPos(null)}
          items={[
            {
              key: 'delete',
              label: 'Delete',
              onSelect: () => {
                setMenuPos(null);
                setConfirming(true);
              },
            },
          ]}
        />
      )}

      {confirming && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
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
