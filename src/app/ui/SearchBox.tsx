import React from 'react';
import { useWebpages } from '../webpages/WebpagesProvider';
import { useCategories } from '../sidebar/categories';
import { useOrganizations } from '../sidebar/organizations';
import { createStorageService } from '../../background/storageService';

interface HistoryItem {
  term: string;
  time: number;
}

export const SearchBox: React.FC<{
  placeholder?: string;
  onNavigateTo?: (id: string, categoryId: string) => void;
  className?: string;
  hotkey?: boolean;
}> = ({ placeholder = 'Search…', onNavigateTo, className }) => {
  const { items } = useWebpages();
  const { setCurrentCategory, categories } = useCategories() as any;
  const { organizations, selectedOrgId } = useOrganizations();
  
  const [q, setQ] = React.useState('');
  const [open, setOpen] = React.useState(false);
  const [activeIdx, setActiveIdx] = React.useState(0);
  const [groupNameMap, setGroupNameMap] = React.useState<Record<string, string>>({});
  const [history, setHistory] = React.useState<HistoryItem[]>([]);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  // Get current organization color for accent-only elements
  const currentOrg = React.useMemo(() => 
    organizations.find(o => o.id === selectedOrgId), 
    [organizations, selectedOrgId]
  );
  const orgColor = currentOrg?.color || 'var(--accent)';

  // Load history from storage
  React.useEffect(() => {
    chrome.storage?.local?.get(['searchHistory'], (result) => {
      const raw = result.searchHistory || [];
      const parsed: HistoryItem[] = raw.map((item: any) => {
        if (typeof item === 'string') return { term: item, time: Date.now() };
        return item;
      });
      setHistory(parsed);
    });
  }, []);

  const saveToHistory = (term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    const now = Date.now();
    const newHistory = [
      { term: trimmed, time: now },
      ...history.filter(h => h.term !== trimmed)
    ].slice(0, 10);
    setHistory(newHistory);
    chrome.storage?.local?.set({ searchHistory: newHistory });
  };

  const results = React.useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return [] as any[];

    const orgCategoryIds = new Set((categories || []).map((c: any) => c.id));

    const scored = items
      .filter((it) => (!it.category || orgCategoryIds.has(it.category)) && it.subcategoryId)
      .map((it) => {
        const hay =
          `${it.title} ${it.url} ${(it as any).description || ''}`.toLowerCase();
        const match = hay.indexOf(term);
        if (match === -1) return null;
        return { it, score: match };
      })
      .filter(Boolean) as { it: any; score: number }[];
    scored.sort((a, b) => a.score - b.score);
    return scored.slice(0, 20).map((s) => s.it);
  }, [q, items, categories]);

  function navigateTo(id: string, categoryId: string, searchTerm?: string) {
    if (searchTerm) saveToHistory(searchTerm);
    else if (q) saveToHistory(q);
    
    setQ('');
    setOpen(false);
    setActiveIdx(0);
    if (onNavigateTo) return onNavigateTo(id, categoryId);
    
    setCurrentCategory(categoryId);
    const HIGHLIGHT_MS = 3000;
    let tries = 0;
    const maxTries = 50;
    
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
      const gh = document.querySelector('header') as HTMLElement | null;
      if (gh) off += gh.getBoundingClientRect().height;
      if (container) {
        const ch = container.querySelector('.toby-board-header') as HTMLElement | null;
        if (ch) off += ch.getBoundingClientRect().height;
      }
      return off;
    };

    const tick = () => {
      try {
        window.dispatchEvent(
          new CustomEvent('groups:collapse-all', {
            detail: { categoryId, collapsed: false },
          }) as any
        );
      } catch {}
      const el = document.getElementById(`card-${id}`);
      if (el) {
        const container = findScrollParent(el as HTMLElement) || (document.querySelector('[aria-label="Content Area"]') as HTMLElement | null);
        const rect = (el as HTMLElement).getBoundingClientRect();
        if (container) {
          const crect = container.getBoundingClientRect();
          const current = container.scrollTop;
          const offset = rect.top - crect.top;
          const stickyOff = stickyOffsetPx(container);
          const targetTop = current + offset - Math.max(0, (crect.height / 2) - (rect.height / 2)) - stickyOff * 0.6;
          try { container.scrollTo({ top: targetTop, behavior: 'smooth' }); } catch { container.scrollTop = targetTop; }
        } else {
          const stickyOff = stickyOffsetPx(null);
          const targetTop = window.scrollY + rect.top - stickyOff;
          try { window.scrollTo({ top: targetTop, behavior: 'smooth' }); } catch { window.scrollTo(0, targetTop); }
        }
        (el as HTMLElement).focus?.();
        
        // --- 修正：徹底使用組織顏色，移除所有 emerald 綠色類別 ---
        const htmlEl = el as HTMLElement;
        htmlEl.style.outline = `2px solid ${orgColor}`;
        htmlEl.style.boxShadow = `0 0 0 4px ${orgColor}44`; 
        htmlEl.style.borderRadius = '8px';
        htmlEl.style.transition = 'all 0.3s ease';

        setTimeout(() => {
          htmlEl.style.outline = '';
          htmlEl.style.boxShadow = '';
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
      const map: Record<string, string> = { '__none__': 'group' }; // Default name for items without subcategoryId
      for (const cid of cats) {
        try {
          const subs = await (svc as any).listSubcategories?.(cid);
          for (const s of subs || []) map[s.id] = s.name || 'group';
        } catch {}
      }
      setGroupNameMap(map);
    } catch {}
  }

  React.useEffect(() => {
    if (open && results.length > 0) {
      prepareGroupNames(results);
    }
  }, [open, results]);

  // Global Keyboard Shortcuts
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const key = (e.key || '').toLowerCase();
      const tgt = e.target as HTMLElement | null;
      const tag = (tgt?.tagName || '').toLowerCase();
      const isTyping = tag === 'input' || tag === 'textarea' || (tgt as any)?.isContentEditable;
      
      if ((e.metaKey || e.ctrlKey) && key === 'f') {
        e.preventDefault();
        setOpen(true);
        return;
      }

      if (isTyping) return;

      if ((e.metaKey || e.ctrlKey) && key === 'k') {
        e.preventDefault();
        setOpen(true);
      } else if (key === '/') {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Clear input on close
  React.useEffect(() => {
    if (!open) {
      setQ('');
      setActiveIdx(0);
    }
  }, [open]);

  const groupedResults = React.useMemo(() => {
    const byCat: Record<string, any[]> = {};
    for (const it of results) {
      const cid = String(it.category || 'default');
      (byCat[cid] ||= []).push(it);
    }
    return Object.entries(byCat).map(([cid, arr]) => {
      const cat = (categories || []).find((c: any) => c.id === cid);
      const catName = cat?.name || cid;
      const bySub: Record<string, any[]> = {};
      for (const it of arr) {
        const gid = String(it.subcategoryId || '__none__');
        (bySub[gid] ||= []).push(it);
      }
      return { cid, catName, subGroups: Object.entries(bySub) };
    });
  }, [results, categories]);

  return (
    <>
      {/* Search Trigger: Subtle Pill Design */}
      <button
        onClick={() => setOpen(true)}
        className={`group flex items-center gap-2 px-3 py-2 text-sm rounded-full bg-[var(--card)] border border-[var(--card)] hover:bg-[var(--panel)] hover:border-[var(--accent)] transition-all duration-200 shadow-sm ${className || ''}`}
        aria-label="Open Search"
      >
        <span className="text-[var(--muted)] group-hover:text-white transition-colors">🔍</span>
        <span className="pr-2 flex-1 text-left text-white transition-colors truncate">
          {placeholder}
        </span>
      </button>

      {/* Search Modal */}
      {open && (
        <div 
          className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-start justify-center p-4 pt-[15vh]"
          onClick={() => setOpen(false)}
        >
          <div 
            className="w-full max-w-3xl bg-[var(--panel)] rounded-lg border border-[var(--card)] shadow-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header / Input */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--card)]">
              <span className="text-[var(--muted)] text-lg">🔍</span>
              <input
                ref={(el) => {
                  inputRef.current = el;
                  el?.focus();
                }}
                className="flex-1 bg-transparent border-none outline-none text-[var(--fg)] text-base placeholder:text-[var(--muted)]"
                style={{ caretColor: orgColor }}
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setActiveIdx(0);
                }}
                onKeyDown={(e) => {
                  if (e.nativeEvent.isComposing) return;
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setActiveIdx((i) => Math.min(i + 1, results.length - 1));
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setActiveIdx((i) => Math.max(i - 1, 0));
                  } else if (e.key === 'Enter') {
                    const pick = results[activeIdx] || results[0];
                    if (pick) navigateTo(pick.id, pick.category || 'default');
                  } else if (e.key === 'Escape') {
                    setOpen(false);
                  }
                }}
              />
              <button 
                onClick={() => setOpen(false)}
                className="text-[10px] px-1.5 py-0.5 rounded border border-[var(--card)] text-[var(--muted)] hover:text-[var(--fg)] hover:bg-[var(--card)] transition-colors font-bold"
              >
                ESC
              </button>
            </div>

            {/* Modal Content */}
            <div className="max-h-[60vh] overflow-y-auto p-2">
              {q.trim() === '' ? (
                <div className="py-2">
                  {history.length > 0 ? (
                    <div>
                      <div className="px-3 py-1 text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider opacity-60">
                        最近搜尋
                      </div>
                      <div className="mt-1">
                        {history.map((h, i) => (
                          <button
                            key={i}
                            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left hover:bg-[var(--card)] transition-colors text-[15px] text-[var(--fg)] group"
                            onClick={() => setQ(h.term)}
                          >
                            <span className="opacity-40">⏱️</span>
                            <span className="flex-1">{h.term}</span>
                            <span className="text-[11px] text-[var(--muted)] opacity-50 mr-2">
                              {(() => {
                                const diff = Date.now() - h.time;
                                const mins = Math.floor(diff / 60000);
                                if (mins < 1) return 'Just now';
                                if (mins < 60) return `${mins}m ago`;
                                const hours = Math.floor(mins / 60);
                                if (hours < 24) return `${hours}h ago`;
                                return `${Math.floor(hours / 24)}d ago`;
                              })()}
                            </span>
                            <span className="text-[12px] font-bold opacity-0 group-hover:opacity-100 transition-opacity text-[var(--accent)]">
                              ↵ 搜尋
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="py-8 text-center">
                      <p className="text-[var(--muted)] text-sm">輸入字句開始搜尋...</p>
                    </div>
                  )}
                </div>
              ) : results.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-[var(--muted)] text-sm">找不到相關結果 "{q}"</p>
                </div>
              ) : (
                <div className="space-y-4 pb-2">
                  {groupedResults.map(({ cid, catName, subGroups }) => (
                    <div key={cid}>
                      <div className="px-2 py-1 text-[13px] font-bold text-[var(--muted)] uppercase tracking-wider opacity-80 mb-1">
                        {catName}
                      </div>
                      <div className="space-y-3 mt-1">
                        {subGroups.map(([gid, list]) => (
                          <div key={gid} className="space-y-1">
                            {/* --- 修正：即使是 __none__ 也顯示預設標題，不再隱藏 --- */}
                            <div className="px-3 text-[12px] text-[var(--muted)] font-medium opacity-70">
                              {groupNameMap[gid] || 'group'}
                            </div>
                            <div className="space-y-0.5">
                              {list.map((it) => {
                                const idx = results.indexOf(it);
                                const isActive = idx === activeIdx;
                                return (
                                  <button
                                    key={it.id}
                                    onMouseMove={() => {
                                      if (activeIdx !== idx) setActiveIdx(idx);
                                    }}
                                    onClick={() => navigateTo(it.id, it.category || 'default')}
                                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors group/item border-l-2 ${
                                      isActive ? 'bg-[var(--card)] border-[var(--accent)]' : 'border-transparent'
                                    }`}
                                  >
                                    <div className="w-4 h-4 flex-shrink-0 flex items-center justify-center">
                                      {it.favicon ? (
                                        <img src={it.favicon} alt="" className="w-4 h-4 object-contain" />
                                      ) : (
                                        <div className="w-3 h-3 bg-[var(--muted)] opacity-20 rounded-sm" />
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="text-[15px] font-medium truncate text-[var(--fg)]">
                                        {it.title}
                                      </div>
                                      <div className="text-[11px] text-[var(--muted)] truncate opacity-80 mt-0.5">
                                        {it.url}
                                      </div>
                                    </div>
                                    <div className={`text-[12px] font-bold transition-opacity text-[var(--accent)] ${isActive ? 'opacity-100' : 'opacity-0'}`}>
                                      ↵ 開啟
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-4 py-2 border-t border-[var(--card)] bg-[var(--bg)]/30 flex items-center justify-between text-[12px] text-[var(--muted)]">
              <div className="flex gap-3">
                <span className="flex items-center gap-1"><kbd className="bg-[var(--card)] px-1 rounded border border-[var(--panel)]">↑↓</kbd> 導覽</span>
                <span className="flex items-center gap-1"><kbd className="bg-[var(--card)] px-1 rounded border border-[var(--panel)]">Enter</kbd> 開啟</span>
              </div>
              <div style={{ color: orgColor }} className="font-medium">
                找到 {results.length} 個結果
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};