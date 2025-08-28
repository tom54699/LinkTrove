import React from 'react';
import { useCategories } from './categories';
import { useWebpages } from '../webpages/WebpagesProvider';

export const Sidebar: React.FC = () => {
  const { categories, selectedId, setCurrentCategory } = useCategories();
  const { actions } = useWebpages();

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
            onDragOver={(e) => { e.preventDefault(); }}
            onDragEnter={(e) => { (e.currentTarget as HTMLElement).setAttribute('data-drop','true'); }}
            onDragLeave={(e) => { (e.currentTarget as HTMLElement).removeAttribute('data-drop'); }}
            onDrop={(e) => {
              e.preventDefault();
              try {
                const id = e.dataTransfer.getData('application/x-linktrove-webpage');
                if (id) actions.updateCategory(id, c.id);
              } catch {}
              (e.currentTarget as HTMLElement).removeAttribute('data-drop');
            }}
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
