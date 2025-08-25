import React from 'react';
import type { TabItemData } from './types';

export const TabItem: React.FC<{ tab: TabItemData } & React.HTMLAttributes<HTMLDivElement>> = ({ tab, ...rest }) => {
  return (
    <div className="flex items-center gap-2 px-2 py-1 rounded hover:bg-slate-800" draggable {...rest}>
      {tab.favIconUrl ? (
        <img src={tab.favIconUrl} alt="" className="w-4 h-4" />
      ) : (
        <div className="w-4 h-4 bg-slate-600 rounded" />
      )}
      <span className="truncate" title={tab.title || tab.url}>{tab.title || tab.url || 'Untitled'}</span>
    </div>
  );
};

