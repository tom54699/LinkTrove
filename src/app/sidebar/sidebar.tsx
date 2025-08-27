import React from 'react';
import { useCategories } from './categories';

export const Sidebar: React.FC = () => {
  const { categories, selectedId, setCurrentCategory } = useCategories();

  return (
    <div className="text-[13px]">
      <div className="mb-4 text-lg font-semibold">Collections</div>
      <div className="text-[11px] uppercase text-[var(--muted)] mb-2">Spaces</div>
      <nav aria-label="Categories" className="space-y-1">
        {categories.map((c) => {
        const active = selectedId === c.id;
        return (
          <button
            key={c.id}
            type="button"
            className={`w-full text-left px-2 py-1 rounded transition-colors ${active ? 'bg-[#1f254a]' : 'hover:bg-[#1f254a]'}
            `}
            data-active={active ? 'true' : undefined}
            onClick={() => setCurrentCategory(c.id)}
          >
            <span className="inline-block w-2 h-2 mr-2 rounded bg-slate-400" />
            {c.name}
          </button>
        );
      })}
    </nav>
    </div>
  );
};
