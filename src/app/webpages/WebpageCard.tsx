import React from 'react';

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
}> = ({ data, onOpen }) => {
  const handleClick = () => {
    if (onOpen) onOpen(data.url);
    else window.open?.(data.url, '_blank');
  };

  return (
    <div
      data-testid="webpage-card"
      className="group cursor-pointer rounded border border-slate-700 p-3 hover:bg-slate-800 transition-colors"
      onClick={handleClick}
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
          <div className="font-medium truncate" title={data.title}>{data.title}</div>
          {data.description && (
            <div className="text-sm opacity-80 truncate" title={data.description}>{data.description}</div>
          )}
        </div>
      </div>
      {data.note && (
        <div className="mt-2 text-sm opacity-90">{data.note}</div>
      )}
    </div>
  );
};

