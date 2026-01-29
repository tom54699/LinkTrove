import React from 'react';
import { setDragTab } from '../dnd/dragContext';
import type { TabItemData } from './types';

export const TabItem: React.FC<
  { tab: TabItemData } & React.HTMLAttributes<HTMLDivElement>
> = ({ tab, ...rest }) => {
  const [dragging, setDragging] = React.useState(false);
  const onDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    setDragging(true);
    try {
      e.dataTransfer.setData(
        'application/x-linktrove-tab',
        JSON.stringify(tab)
      );
      e.dataTransfer.effectAllowed = 'move';
      setDragTab({
        id: tab.id,
        title: tab.title,
        url: tab.url,
        favIconUrl: tab.favIconUrl,
      });
    } catch {
      // ignore
    }
    rest.onDragStart?.(e);
  };
  const onDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    setDragging(false);
    setDragTab(null);
    rest.onDragEnd?.(e);
  };
  return (
    <div
      className={`flex items-center gap-3 px-3 py-2.5 rounded transition-all duration-150 cursor-grab active:cursor-grabbing hover:translate-x-[2px] group/item ${dragging ? 'opacity-50 ring-1 ring-blue-500' : ''} ${rest.className || ''}`}
      style={{
        backgroundColor: '#44475a',
        border: '1px solid rgba(255,255,255,0.05)',
        ...rest.style
      }}
      draggable
      data-dragging={dragging || undefined}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = '#505467';
        e.currentTarget.style.borderColor = '#6272a4';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = '#44475a';
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)';
      }}
      {...rest}
    >
      {tab.favIconUrl ? (
        <img src={tab.favIconUrl} alt="" className="w-4 h-4 rounded-sm object-contain shrink-0" draggable={false} />
      ) : (
        <div className="w-4 h-4 rounded-sm bg-slate-600 shrink-0 flex items-center justify-center text-[10px] font-bold text-white/50">
           {(tab.title || 'U')[0].toUpperCase()}
        </div>
      )}
      
      <span className="truncate text-xs text-[#f8f8f2] font-medium leading-tight select-none" title={tab.title || tab.url}>
        {tab.title || tab.url || 'Untitled'}
      </span>
    </div>
  );
};