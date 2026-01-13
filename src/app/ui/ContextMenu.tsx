import React, { useLayoutEffect, useState, useRef } from 'react';

export interface MenuItem {
  key: string;
  label: string;
  icon?: React.ReactNode;
  onSelect: () => void;
  className?: string;
}

export const ContextMenu: React.FC<{
  x: number;
  y: number;
  items: MenuItem[];
  onClose: () => void;
  align?: 'left' | 'right'; // 新增對齊選項
}> = ({ x, y, items, onClose, align = 'left' }) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<React.CSSProperties>({
    left: x,
    top: y,
    opacity: 0,
  });

  useLayoutEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      let newX = x;
      let newY = y;

      // 如果設定為右對齊，則將 left 向左推一個選單寬度
      if (align === 'right') {
        newX = x - rect.width;
      }

      // 邊界檢查：防止超出右側
      if (newX + rect.width > vw) {
        newX = vw - rect.width - 8;
      }
      
      // 邊界檢查：防止超出左側
      if (newX < 8) {
        newX = 8;
      }

      // 邊界檢查：防止超出底部
      if (y + rect.height > vh) {
        newY = y - rect.height - 8; // 往上彈，並留一點 gap
      }

      setStyle({
        left: newX,
        top: newY,
        opacity: 1,
      });
    }
  }, [x, y, align]);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      const onDoc = (e: MouseEvent) => {
        if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
          onClose();
        }
      };
      document.addEventListener('mousedown', onDoc);
      return () => document.removeEventListener('mousedown', onDoc);
    }, 10);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      role="menu"
      className="fixed z-[9999] min-w-[200px] rounded-xl border border-slate-700 bg-[var(--panel)] shadow-2xl overflow-hidden py-1.5 transition-opacity duration-75"
      style={style}
      onClick={(e) => e.stopPropagation()}
    >
      {items.map((it) => (
        <button
          key={it.key}
          role="menuitem"
          className={`w-full text-left px-4 py-2.5 text-[13px] flex items-center gap-3 transition-all hover:bg-slate-700/50 ${it.className || 'text-[var(--text)] hover:text-[var(--accent)]'}`}
          onClick={(e) => {
            e.stopPropagation();
            it.onSelect();
            onClose();
          }}
        >
          {it.icon && <span className="w-4 h-4 flex-shrink-0 opacity-80">{it.icon}</span>}
          <span className="font-medium">{it.label}</span>
        </button>
      ))}
    </div>
  );
};
