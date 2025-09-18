import React from 'react';
import { useWebpages } from '../webpages/WebpagesProvider';
import { useCategories } from '../sidebar/categories';
import { createStorageService } from '../../background/storageService';

export const SearchBox: React.FC<{
  placeholder?: string;
  onNavigateTo?: (id: string, categoryId: string) => void;
  className?: string;
  hotkey?: boolean;
}> = ({ placeholder = 'Search…', onNavigateTo, className, hotkey = true }) => {
  const { items } = useWebpages();
  const { setCurrentCategory, categories } = useCategories() as any;
  const [q, setQ] = React.useState('');
  const [open, setOpen] = React.useState(false);
  const [activeIdx, setActiveIdx] = React.useState(0);
  const [showAll, setShowAll] = React.useState(false);
  const [groupNameMap, setGroupNameMap] = React.useState<Record<string, string>>({});
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  const results = React.useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return [] as any[];

    // Get current organization's category IDs for filtering
    const orgCategoryIds = new Set((categories || []).map((c: any) => c.id));

    const scored = items
      .filter((it) => !it.category || orgCategoryIds.has(it.category)) // Filter by current organization
      .map((it) => {
        const hay =
          `${it.title} ${it.url} ${(it as any).description || ''}`.toLowerCase();
        const match = hay.indexOf(term);
        if (match === -1) return null;
        return { it, score: match };
      })
      .filter(Boolean) as { it: any; score: number }[];
    scored.sort((a, b) => a.score - b.score);
    return scored.slice(0, 10).map((s) => s.it);
  }, [q, items, categories]);

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
    let tries = 0;
    const maxTries = 50; // up to ~5s for slower renders
    const findScrollParent = (node: HTMLElement | null): HTMLElement | null => {
      let el: HTMLElement | null = node?.parentElement || null;
      while (el) {
        const style = window.getComputedStyle(el);
        const oy = style.overflowY;
        const canScroll = (oy === 'auto' || oy === 'scroll') && el.scrollHeight > el.clientHeight;
        if (canScroll) return el;
        el = el.parentElement;
      }
      return null;
    };
    const stickyOffsetPx = (container: HTMLElement | null): number => {
      let off = 0;
      // Global header
      const gh = document.querySelector('header') as HTMLElement | null;
      if (gh) off += gh.getBoundingClientRect().height;
      // Content header inside container
      if (container) {
        const ch = container.querySelector('.toby-board-header') as HTMLElement | null;
        if (ch) off += ch.getBoundingClientRect().height;
      }
      return off;
    };
    const tick = () => {
      // On each attempt, ask GroupsView to expand all for this category.
      // This ensures the listener in the new category receives it once mounted.
      try {
        window.dispatchEvent(
          new CustomEvent('groups:collapse-all', {
            detail: { categoryId, collapsed: false },
          }) as any
        );
      } catch {}
      const el = document.getElementById(`card-${id}`);
      if (el) {
        // Scroll the nearest scrollable ancestor to center the card
        const container = findScrollParent(el as HTMLElement) || (document.querySelector('[aria-label="Content Area"]') as HTMLElement | null);
        const rect = (el as HTMLElement).getBoundingClientRect();
        if (container) {
          const crect = container.getBoundingClientRect();
          const current = container.scrollTop;
          const offset = rect.top - crect.top; // el position within container viewport
          const stickyOff = stickyOffsetPx(container);
          const targetTop = current + offset - Math.max(0, (crect.height / 2) - (rect.height / 2)) - stickyOff * 0.6;
          try { container.scrollTo({ top: targetTop, behavior: 'smooth' }); } catch { container.scrollTop = targetTop; }
        } else {
          // Fallback to window scrolling
          const stickyOff = stickyOffsetPx(null);
          const targetTop = window.scrollY + rect.top - stickyOff;
          try { window.scrollTo({ top: targetTop, behavior: 'smooth' }); } catch { window.scrollTo(0, targetTop); }
        }
        (el as HTMLElement).focus?.();
        (el as HTMLElement).classList.add('ring-2', 'ring-emerald-500', 'outline', 'outline-2', 'outline-emerald-500');
        setTimeout(() => {
          (el as HTMLElement).classList.remove('ring-2', 'ring-emerald-500', 'outline', 'outline-2', 'outline-emerald-500');
        }, HIGHLIGHT_MS);
        return;
      }
      if (tries++ < maxTries) setTimeout(tick, 100);
    };
    setTimeout(tick, 120);
  }

  async function prepareGroupNames(list: any[]) {
    try {
      const cats = Array.from(new Set(list.map((it: any) => it.category).filter(Boolean)));
      const svc = createStorageService();
      const map: Record<string, string> = {};
      for (const cid of cats) {
        try {
          const subs = await (svc as any).listSubcategories?.(cid);
          for (const s of subs || []) map[s.id] = s.name || 'group';
        } catch {}
      }
      setGroupNameMap(map);
    } catch {}
  }

  return (
    <>
    <div ref={rootRef} className={`relative ${className || ''}`}>
      <input
        ref={inputRef}
        aria-label="Search"
        className={`text-sm rounded bg-slate-900 border border-slate-700 px-2 py-1 outline-none focus:border-slate-500 ${className?.includes('w-') ? '' : 'w-64'} ${className || ''}`}
        placeholder={placeholder}
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
          setActiveIdx(0);
        }}
        onFocus={() => q && setOpen(true)}
        onKeyDown={(e) => {
          if (!open && (e.key === 'ArrowDown' || e.key === 'Enter'))
            setOpen(true);
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
        <div className="absolute z-[9999] mt-1 w-96 left-0 rounded border border-slate-700 bg-[var(--bg)] shadow-lg">
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
                  <span className="ml-auto text-[11px] px-1 py-0.5 rounded bg-slate-800 border border-slate-700 opacity-80">
                    {(() => {
                      const cid = String(it.category);
                      const c = (categories || []).find(
                        (x: any) => x.id === cid
                      );
                      return c?.name || cid;
                    })()}
                  </span>
                )}
              </div>
            </button>
          ))}
          <div className="px-3 py-2 border-t border-slate-700 text-xs opacity-80">
            <button className="hover:text-white" onClick={async ()=>{ setOpen(false); await prepareGroupNames(results); setShowAll(true); }}>顯示全部結果…</button>
          </div>
        </div>
      )}
      {open && q && results.length === 0 && (
        <div className="absolute z-[9999] mt-1 w-96 left-0 rounded border border-slate-700 bg-[var(--bg)] shadow-lg px-3 py-2 text-sm opacity-80">
          No results
        </div>
      )}
    </div>
    {showAll && (
      <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4" onClick={()=>setShowAll(false)}>
        <div className="rounded border border-slate-700 bg-[var(--bg)] w-[900px] max-w-[95vw] max-h-[85vh] overflow-auto" onClick={(e)=>e.stopPropagation()} role="dialog" aria-label="Search Results">
          <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
            <div className="text-sm opacity-80">{results.length} results</div>
            <button className="text-sm px-2 py-1 rounded border border-slate-600 hover:bg-slate-800" onClick={()=>setShowAll(false)}>關閉</button>
          </div>
          <div className="p-3">
            {(() => {
              // group by category then subcategory
              const byCat: Record<string, any[]> = {};
              for (const it of results) {
                const cid = String(it.category||'');
                (byCat[cid] ||= []).push(it);
              }
              const catEntries = Object.entries(byCat);
              return catEntries.map(([cid, arr]) => {
                const cat = (categories || []).find((c:any)=>c.id===cid);
                const catName = cat?.name || cid || 'Unknown';
                // group by subcategoryId
                const bySub: Record<string, any[]> = {};
                for (const it of arr) {
                  const gid = String(it.subcategoryId || '__none__');
                  (bySub[gid] ||= []).push(it);
                }
                const subEntries = Object.entries(bySub);
                return (
                  <div key={cid} className="mb-4">
                    <div className="text-sm font-medium mb-1">{catName}</div>
                    {subEntries.map(([gid, list]) => (
                      <div key={gid} className="mb-2">
                        <div className="text-xs opacity-80 mb-1">{groupNameMap[gid] || 'group'} <span className="opacity-60">({list.length})</span></div>
                        <div className="space-y-1">
                          {list.map((it:any)=>(
                            <button key={it.id} className="block w-full text-left px-3 py-2 text-sm rounded hover:bg-slate-800 border border-transparent hover:border-slate-700"
                              onClick={()=>{ setShowAll(false); navigateTo(it.id, it.category||'default'); }}>
                              <div className="flex items-center gap-2">
                                {it.favicon ? (<img src={it.favicon} alt="" className="w-3 h-3" />) : (<div className="w-3 h-3 bg-slate-600 rounded" />)}
                                <span className="truncate">{it.title}</span>
                                <span className="opacity-60 truncate">{it.url}</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              });
            })()}
          </div>
        </div>
      </div>
    )}
    </>
  );
};
