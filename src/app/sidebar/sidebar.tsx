import React from 'react';
import { useCategories } from './categories';

export const Sidebar: React.FC = () => {
  const { categories, selectedId, setCurrentCategory } = useCategories();
  const items = React.useMemo(
    () => [{ id: 'all', name: 'All' }, ...categories],
    [categories]
  );

  return (
    <nav aria-label="Categories" className="space-y-1">
      <div className="text-xs uppercase opacity-70 mb-2">Categories</div>
      {items.map((c) => {
        const active = selectedId === c.id;
        return (
          <button
            key={c.id}
            type="button"
            className={`w-full text-left px-2 py-1 rounded border transition-colors ${
              active
                ? 'border-emerald-500 bg-emerald-950/30'
                : 'border-slate-700 hover:bg-slate-800'
            }`}
            data-active={active ? 'true' : undefined}
            onClick={() => setCurrentCategory(c.id)}
          >
            {'color' in c ? (
              <span
                className="inline-block w-2 h-2 mr-2 rounded"
                style={{ backgroundColor: (c as any).color }}
              />
            ) : (
              <span className="inline-block w-2 h-2 mr-2 rounded bg-slate-400" />
            )}
            {c.name}
          </button>
        );
      })}
    </nav>
  );
};
