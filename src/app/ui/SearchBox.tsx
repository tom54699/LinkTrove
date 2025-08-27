import React from 'react';
import { useWebpages } from '../webpages/WebpagesProvider';
import { useCategories } from '../sidebar/categories';

export const SearchBox: React.FC<{
  placeholder?: string;
  onNavigateTo?: (id: string, categoryId: string) => void;
  className?: string;
  hotkey?: boolean;
}> = ({ placeholder = 'Search…', onNavigateTo, className, hotkey = true }) => {
  const { items } = useWebpages();
  const { setCurrentCategory } = useCategories();
  const [q, setQ] = React.useState('');
  const [open, setOpen] = React.useState(false);
  const [activeIdx, setActiveIdx] = React.useState(0);
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  const results = React.useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return [] as any[];
    const scored = items
      .map((it) => {
        const hay = `${it.title} ${it.url} ${it.note || ''}`.toLowerCase();
        const match = hay.indexOf(term);
        if (match === -1) return null;
        return { it, score: match };
      })
      .filter(Boolean) as { it: any; score: number }[];
    scored.sort((a, b) => a.score - b.score);
    return scored.slice(0, 10).map((s) => s.it);
  }, [q, items]);

  React.useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  React.useEffect(() => {
    if (!hotkey) return;
    const onKey = (e: KeyboardEvent) => {
      const key = (e.key || '').toLowerCase();
      const tgt = e.target as HTMLElement | null;
      const tag = (tgt?.tagName || '').toLowerCase();
      const isTyping =
        tag === 'input' ||
        tag === 'textarea' ||
        (tgt as any)?.isContentEditable;
      if (isTyping) return;
      if ((e.ctrlKey || e.metaKey) && key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(!!q);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [hotkey, q]);

  function navigateTo(id: string, categoryId: string) {
    // Clear search UI
    setQ('');
    setOpen(false);
    setActiveIdx(0);
    if (onNavigateTo) return onNavigateTo(id, categoryId);
    // default behavior: switch category, then scroll to card
    setCurrentCategory(categoryId);
    const HIGHLIGHT_MS = 3000;
    setTimeout(() => {
      const el = document.getElementById(`card-${id}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        (el as HTMLElement).focus?.();
        el.classList.add('ring-2', 'ring-emerald-500');
        setTimeout(() => {
          el.classList.remove('ring-2', 'ring-emerald-500');
        }, HIGHLIGHT_MS);
      }
    }, 60);
  }

  return (
    <div ref={rootRef} className={`relative ${className || ''}`}>
      <input
        ref={inputRef}
        aria-label="Search"
        className="text-sm w-64 rounded bg-slate-900 border border-slate-700 px-2 py-1 outline-none focus:border-slate-500"
        placeholder={placeholder}
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
          setActiveIdx(0);
        }}
        onFocus={() => q && setOpen(true)}
        onKeyDown={(e) => {
          if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) setOpen(true);
          if (!results.length) return;
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIdx((i) => Math.min(i + 1, results.length - 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIdx((i) => Math.max(i - 1, 0));
          } else if (e.key === 'Enter') {
            const pick = results[activeIdx] || results[0];
            if (pick) {
              navigateTo(pick.id, pick.category || 'default');
              setOpen(false);
            }
          } else if (e.key === 'Escape') {
            setOpen(false);
          }
        }}
      />
      {open && results.length > 0 && (
        <div className="absolute z-[80] mt-1 w-[28rem] max-w-[80vw] rounded border border-slate-700 bg-[var(--bg)] shadow-lg">
          {results.map((it, idx) => (
            <button
              key={it.id}
              className={`block w-full text-left px-3 py-2 text-sm hover:bg-slate-800 ${idx === activeIdx ? 'bg-slate-800' : ''}`}
              onMouseEnter={() => setActiveIdx(idx)}
              onClick={() => {
                navigateTo(it.id, it.category || 'default');
                setOpen(false);
              }}
            >
              <div className="flex items-center gap-2">
                {it.favicon ? (
                  <img src={it.favicon} alt="" className="w-3 h-3" />
                ) : (
                  <div className="w-3 h-3 bg-slate-600 rounded" />
                )}
                <span className="truncate">{it.title}</span>
                <span className="opacity-60 truncate">{it.url}</span>
                {it.category && (
                  <span className="ml-auto text-[11px] px-1 py-0.5 rounded bg-slate-800 border border-slate-700 opacity-80">{it.category}</span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
      {open && q && results.length === 0 && (
        <div className="absolute z-[80] mt-1 w-64 rounded border border-slate-700 bg-[var(--bg)] shadow-lg px-3 py-2 text-sm opacity-80">
          No results
        </div>
      )}
    </div>
  );
};
