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
      setDragTab({ id: tab.id, title: tab.title, url: tab.url, favIconUrl: tab.favIconUrl });
    } catch (err) {
      // ignore in non-supporting environments
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
      className={`flex items-center gap-2 px-2 py-1 rounded hover:bg-slate-800 ${dragging ? 'ring-2 ring-blue-500' : ''}`}
      draggable
      data-dragging={dragging || undefined}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      {...rest}
    >
      {tab.favIconUrl ? (
        <img src={tab.favIconUrl} alt="" className="w-4 h-4" />
      ) : (
        <div className="w-4 h-4 bg-slate-600 rounded" />
      )}
      <span className="truncate" title={tab.title || tab.url}>
        {tab.title || tab.url || 'Untitled'}
      </span>
    </div>
  );
};
