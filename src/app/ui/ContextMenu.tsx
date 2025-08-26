import React from 'react';

export interface MenuItem {
  key: string;
  label: string;
  onSelect: () => void;
}

export const ContextMenu: React.FC<{
  x: number;
  y: number;
  items: MenuItem[];
  onClose: () => void;
}> = ({ x, y, items, onClose }) => {
  React.useEffect(() => {
    const onDoc = () => onClose();
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, [onClose]);

  return (
    <div
      role="menu"
      className="absolute z-50 min-w-[160px] rounded border border-slate-700 bg-[var(--bg)] shadow-lg"
      style={{ left: x, top: y }}
      onClick={(e) => e.stopPropagation()}
    >
      {items.map((it) => (
        <button
          key={it.key}
          role="menuitem"
          className="block w-full text-left px-3 py-2 hover:bg-slate-800"
          onClick={() => {
            it.onSelect();
          }}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
};

