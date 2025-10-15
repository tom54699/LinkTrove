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
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    // Delay binding to next tick to avoid immediate closure from the triggering click
    const timer = setTimeout(() => {
      const onDoc = (e: MouseEvent) => {
        // Check if click is outside the menu
        if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
          onClose();
        }
      };
      document.addEventListener('mousedown', onDoc);
      return () => document.removeEventListener('mousedown', onDoc);
    }, 10);

    return () => {
      clearTimeout(timer);
    };
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      role="menu"
      className="fixed z-[9990] min-w-[160px] rounded border border-slate-700 bg-[var(--bg)] shadow-lg"
      style={{ left: x, top: y }}
      onClick={(e) => e.stopPropagation()}
    >
      {items.map((it) => (
        <button
          key={it.key}
          role="menuitem"
          className="block w-full text-left px-3 py-2 hover:bg-[var(--accent-hover)] hover:text-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/60"
          onClick={(e) => {
            e.stopPropagation();
            it.onSelect();
            onClose();
          }}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
};
