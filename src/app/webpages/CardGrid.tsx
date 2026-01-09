import React from 'react';
import type { WebpageCardData } from './WebpageCard';
import { TobyLikeCard } from './TobyLikeCard';
import type { TabItemData } from '../tabs/types';
import { getDragTab, getDragWebpage, setDragWebpage, broadcastGhostActive } from '../dnd/dragContext';
import { useFeedback } from '../ui/feedback';
import { dbg, isDebug } from '../../utils/debug';
import { MoveSelectedDialog } from './MoveSelectedDialog';

export interface CardGridProps {
  items?: WebpageCardData[];
  onDropTab?: (tab: TabItemData) => void;
  onDropExistingCard?: (id: string, beforeId?: string) => void;
  onDeleteMany?: (ids: string[]) => void;
  onDeleteOne?: (id: string) => void;
  onEditDescription?: (id: string, description: string) => void;
  onSave?: (
    id: string,
    patch: Partial<{
      title: string;
      description: string;
      url: string;
      meta: Record<string, string>;
    }>
  ) => void;
  density?: 'compact' | 'cozy' | 'roomy';
  collapsed?: boolean;
  onReorder?: (fromId: string, toId: string) => void;
  onUpdateTitle?: (id: string, title: string) => void;
  onUpdateUrl?: (id: string, url: string) => void;
  onUpdateCategory?: (id: string, category: string) => void;
  onUpdateMeta?: (id: string, meta: Record<string, string>) => void;
}

export const CardGrid: React.FC<CardGridProps> = ({
  items = [],
  onDropTab,
  onDeleteMany,
  onDeleteOne,
  onEditDescription,
  onSave,
  density = 'cozy',
  collapsed = false,
  onReorder,
  onDropExistingCard,
  onUpdateTitle,
  onUpdateUrl,
  onUpdateCategory,
  onUpdateMeta,
}) => {
  const [isOver, setIsOver] = React.useState(false);
  const { showToast } = useFeedback();
  const [selected, setSelected] = React.useState<Record<string, boolean>>({});

  const selectedCount = Object.values(selected).filter(Boolean).length;
  const toggleSelect = (id: string) =>
    setSelected((s) => ({ ...s, [id]: !s[id] }));
  const clearSelection = () => setSelected({});

  const [confirming, setConfirming] = React.useState(false);
  const [showMoveDialog, setShowMoveDialog] = React.useState(false);
  const [showOpenTabsConfirm, setShowOpenTabsConfirm] = React.useState(false);

  // Handler for batch open tabs
  const handleOpenTabs = () => {
    const selectedIds = Object.entries(selected)
      .filter(([, v]) => v)
      .map(([key]) => key);

    // If more than 10 tabs, show confirmation
    if (selectedIds.length > 10) {
      setShowOpenTabsConfirm(true);
      return;
    }

    executeOpenTabs();
  };

  const executeOpenTabs = () => {
    try {
      const selectedIds = Object.entries(selected)
        .filter(([, v]) => v)
        .map(([key]) => key);
      const selectedItems = items.filter((item) => selectedIds.includes(item.id));
      selectedItems.forEach((item) => {
        window.open(item.url, '_blank');
      });
      clearSelection();
      setShowOpenTabsConfirm(false);
    } catch {
      showToast('Failed to open tabs', 'error');
    }
  };

  // Handler for batch move
  const handleBatchMove = async (categoryId: string, subcategoryId: string) => {
    try {
      const selectedIds = Object.entries(selected)
        .filter(([, v]) => v)
        .map(([key]) => key);

      // Import storage service for subcategory update
      const { createStorageService } = await import('../../background/storageService');
      const svc = createStorageService();

      // Update each card's category and subcategory
      await Promise.all(
        selectedIds.map(async (cardId) => {
          // Update category first
          if (onUpdateCategory) {
            await onUpdateCategory(cardId, categoryId);
          }
          // Then update subcategory
          await (svc as any).updateCardSubcategory?.(cardId, subcategoryId);
        })
      );

      setShowMoveDialog(false);
      clearSelection();
      showToast(`已移動 ${selectedIds.length} 張卡片`, 'success');
    } catch (error) {
      showToast('移動失敗', 'error');
      console.error('Batch move error:', error);
    }
  };
  const [dragDisabled, setDragDisabled] = React.useState(false);
  const [ghostTab, setGhostTab] = React.useState<TabItemData | null>(null);
  const [ghostType, setGhostType] = React.useState<'tab' | 'card' | null>(null);
  const [ghostIndex, setGhostIndex] = React.useState<number | null>(null);
  const prevGiRef = React.useRef<number | null>(null);
  const ghostBeforeRef = React.useRef<string | '__END__' | null>(null);
  const [draggingCardId, setDraggingCardId] = React.useState<string | null>(null);
  const [hiddenCardId, setHiddenCardId] = React.useState<string | null>(null);
  const zoneRef = React.useRef<HTMLDivElement | null>(null);
  // Testing aid: record last dropped tab title to surface minimal feedback even if parent items haven't updated yet
  const [lastDropTitle, setLastDropTitle] = React.useState<string | null>(null);

  // Compute ghost insertion index based on pointer and grid layout
  const computeGhostIndex = React.useCallback(
    (
      clientX: number | undefined,
      clientY: number | undefined,
      target?: EventTarget | null
    ) => {
      const zone = zoneRef.current;
      if (!zone) return null;
      // Prefer using child card wrappers' rects to infer rows/cols
      let wrappers = Array.from(
        zone.querySelectorAll('.toby-card-flex')
      ) as HTMLElement[];
      // Ignore any existing ghost wrapper and any hidden wrapper (original dragged card)
      wrappers = wrappers.filter(
        (el) =>
          !el.querySelector('[data-testid="ghost-card"]') &&
          el.getAttribute('data-hidden') !== 'true'
      );
      if (!wrappers.length) return 0;

      // If event targets a wrapper and we lack coordinates, fall back to index of that wrapper
      if ((clientX == null || clientY == null) && target) {
        const wrap = (target as HTMLElement).closest('.toby-card-flex');
        if (wrap) {
          const idx = wrappers.indexOf(wrap as HTMLElement);
          return Math.max(0, idx);
        }
      }

      // If we still lack coordinates, default to end
      if (clientX == null || clientY == null) return wrappers.length;

      // Build rows by grouping by top within tolerance
      type R = {
        start: number;
        items: { idx: number; rect: DOMRect }[];
        top: number;
        bottom: number;
      };
      const rows: R[] = [];
      const tol = 8; // px
      const sorted = wrappers
        .map((el, idx) => ({ idx, rect: el.getBoundingClientRect() }))
        .sort((a, b) => a.rect.top - b.rect.top || a.rect.left - b.rect.left);
      for (const it of sorted) {
        const row = rows.find((r) => Math.abs(r.top - it.rect.top) <= tol);
        if (row) {
          row.items.push(it);
          row.bottom = Math.max(row.bottom, it.rect.bottom);
        } else {
          rows.push({
            start: it.idx,
            items: [it],
            top: it.rect.top,
            bottom: it.rect.bottom,
          });
        }
      }
      // Sort items in each row by left
      for (const r of rows) r.items.sort((a, b) => a.rect.left - b.rect.left);

      // Find row by Y
      let rowIndex = rows.findIndex(
        (r) => clientY >= r.top && clientY <= r.bottom
      );
      if (rowIndex === -1) {
        if (clientY < rows[0].top) rowIndex = 0;
        else rowIndex = rows.length - 1;
      }
      const row = rows[rowIndex];
      // If pointer is in last row, handle special cases for trailing position
      if (rowIndex === rows.length - 1) {
        const last = row.items[row.items.length - 1];
        const midYLast = (last.rect.top + last.rect.bottom) / 2;
        const midXLast = (last.rect.left + last.rect.right) / 2;
        const inLastHoriz =
          clientX >= last.rect.left && clientX <= last.rect.right;
        const inLastVert =
          clientY >= last.rect.top && clientY <= last.rect.bottom;
        // 1) If cursor is over the last card and in its lower half → place at end
        if (inLastHoriz && inLastVert && clientY > midYLast)
          return wrappers.length;
        // 2) If cursor is to the right of the last card midpoint → end
        if (clientX > midXLast) return wrappers.length;
        // 3) If cursor is below the last row midpoint → end
        if (clientY > (row.top + row.bottom) / 2) return wrappers.length;
      }
      // Within the row: find first item whose midpoint is to the right of X
      for (let i = 0; i < row.items.length; i++) {
        const it = row.items[i];
        const midX = (it.rect.left + it.rect.right) / 2;
        if (clientX <= midX) {
          // insertion index is the global index of this item
          return it.idx;
        }
      }
      // Otherwise insert at end of this row (after last item of row)
      const lastInRow = row.items[row.items.length - 1].idx;
      // insertion index is lastInRow + 1, capped at wrappers.length
      return Math.min(wrappers.length, lastInRow + 1);
    },
    []
  );

  // Subscribe to global ghost-active to hide original card even in source group
  React.useEffect(() => {
    const onGhost = (e: any) => {
      const id = (e?.detail as string) ?? null;
      setHiddenCardId(id);
    };
    try { window.addEventListener('lt:ghost-active', onGhost as any); } catch {}
    return () => { try { window.removeEventListener('lt:ghost-active', onGhost as any); } catch {} };
  }, []);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    try { e.dataTransfer.dropEffect = 'move'; } catch {}
    setIsOver(true);
    // Update ghost: prefer dragContext for reliability, fallback to dataTransfer
    let tab: TabItemData | null = (getDragTab() as any) || null;
    if (!tab) {
      const raw = e.dataTransfer.getData('application/x-linktrove-tab');
      if (raw) {
        try {
          tab = JSON.parse(raw);
        } catch {}
      }
    }
    if (tab) {
      setGhostTab(tab);
      setGhostType('tab');
      const gi = computeGhostIndex(e.clientX, e.clientY, e.target);
      setGhostIndex(gi);
      try { const list = hiddenCardId ? items.filter((x)=>x.id!==hiddenCardId) : items; ghostBeforeRef.current = gi==null? null : gi>=list.length ? '__END__' : list[gi].id; } catch {}
      if (gi !== prevGiRef.current) { prevGiRef.current = gi; dbg('dnd','dragOver(tab)',{gi,len:items.length}); }
      return;
    }
    // Existing card being dragged (possibly cross-group)
    try {
      const fromId = e.dataTransfer.getData('application/x-linktrove-webpage');
      if (fromId) {
        setGhostType('card');
        // Use meta from dragContext or payload to show favicon/title
        let meta: any = null;
        try { meta = getDragWebpage(); } catch {}
        if (!meta) {
          try {
            const raw = e.dataTransfer.getData('application/x-linktrove-webpage-meta');
            if (raw) meta = JSON.parse(raw);
          } catch {}
        }
        try {
          const id = (meta?.id as string) || fromId;
          setDraggingCardId(id);
          try { broadcastGhostActive(id); } catch {}
        } catch {}
        if (meta) {
          setGhostTab({
            id: -1,
            title: meta.title,
            url: meta.url,
            favIconUrl: meta.favicon,
            description: meta.description,
          } as any);
        } else {
          setGhostTab(null);
        }
        const gi = computeGhostIndex(e.clientX, e.clientY, e.target);
        setGhostIndex(gi);
        try { const list = hiddenCardId ? items.filter((x)=>x.id!==hiddenCardId) : items; ghostBeforeRef.current = gi==null? null : gi>=list.length ? '__END__' : list[gi].id; } catch {}
        if (gi !== prevGiRef.current) { prevGiRef.current = gi; dbg('dnd','dragOver(card)',{gi,len:items.length,fromId}); }
        return;
      }
    } catch {}
    // Fallback: some browsers restrict getData during dragover; detect by type list
    try {
      const types = Array.from((e.dataTransfer?.types as any) || []);
      if (types.includes('application/x-linktrove-webpage')) {
        setGhostType('card');
        const meta = (() => { try { return getDragWebpage(); } catch { return null; } })();
        if (meta) {
          try { broadcastGhostActive((meta as any).id || null); } catch {}
          setGhostTab({ id: -1, title: meta.title, url: meta.url, favIconUrl: meta.favicon, description: meta.description } as any);
        } else setGhostTab(null);
        const gi = computeGhostIndex(e.clientX, e.clientY, e.target);
        setGhostIndex(gi);
        try { const list = hiddenCardId ? items.filter((x)=>x.id!==hiddenCardId) : items; ghostBeforeRef.current = gi==null? null : gi>=list.length ? '__END__' : list[gi].id; } catch {}
        if (gi !== prevGiRef.current) { prevGiRef.current = gi; dbg('dnd','dragOver(type-detect)',{gi,len:items.length,types}); }
        return;
      }
      if (types.includes('application/x-linktrove-tab')) {
        setGhostType('tab');
        // Without full tab payload, still show a generic ghost
        setGhostTab(null);
        setGhostIndex(computeGhostIndex(e.clientX, e.clientY, e.target));
        return;
      }
    } catch {}
  };
  const handleDragLeave = () => {
    setIsOver(false);
    setGhostTab(null);
    setGhostType(null);
    setGhostIndex(null);
    setDraggingCardId(null);
    try { broadcastGhostActive(null); } catch {}
  }
  // Global safety: clear hidden state on dragend anywhere
  React.useEffect(() => {
    const onEnd = () => { try { broadcastGhostActive(null); } catch {} };
    try { window.addEventListener('dragend', onEnd as any); } catch {}
    return () => { try { window.removeEventListener('dragend', onEnd as any); } catch {} };
  }, []);
;
  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsOver(false);
    try {
      // 1) Existing webpage card dropped into this grid (possibly cross-group)
      const fromId = e.dataTransfer.getData('application/x-linktrove-webpage');
      if (fromId) {
        // Prefer DOM-based ghost position → next card wrapper id
        let beforeId: string | '__END__' | null = null;
        try {
          const zone = zoneRef.current;
          const ghostCard = zone?.querySelector('[data-testid="ghost-card"]') as HTMLElement | null;
          const ghostWrap = ghostCard ? ghostCard.closest('.toby-card-flex') as HTMLElement | null : null;
          let next = ghostWrap?.nextElementSibling as HTMLElement | null | undefined;
          while (
            next && (
              !next.getAttribute('data-card-id') ||
              next.getAttribute('data-hidden') === 'true' ||
              next.getAttribute('data-card-id') === fromId
            )
          ) {
            next = next.nextElementSibling as any;
          }
          beforeId = (next?.getAttribute('data-card-id') as string) || '__END__';
        } catch {}
        if (!beforeId) {
          // Fallback: ghost-captured id during dragOver
          beforeId = ghostBeforeRef.current;
        }
        if (!beforeId) {
          let idx = ghostIndex;
          if (idx == null)
            idx = computeGhostIndex(e.clientX, e.clientY, e.target);
          const list = hiddenCardId ? items.filter((x) => x.id !== hiddenCardId) : items;
          if (idx == null) idx = list.length;
          beforeId = idx >= list.length ? '__END__' : list[idx].id;
        }
        dbg('dnd', 'drop(card→grid)', { fromId, idx: ghostIndex, beforeId, list: (hiddenCardId ? items.filter((x)=>x.id!==hiddenCardId):items).map((x)=>x.id) });
        onDropExistingCard?.(fromId, beforeId);
        setGhostTab(null);
        setGhostType(null);
        setGhostIndex(null);
        setDraggingCardId(null);
        try { broadcastGhostActive(null); } catch {}
        return;
      }
      // 2) New tab dropped into this grid
      let raw = '';
      try { raw = e.dataTransfer.getData('application/x-linktrove-tab'); } catch {}
      let tab: TabItemData | null = null;
      if (raw) {
        tab = JSON.parse(raw);
      }
      if (!tab) {
        try { tab = (getDragTab() as any) || null; } catch { tab = null; }
      }
      if (tab) {
        // Determine insertion index from current ghost or pointer
        // Determine insertion index using DOM ghost position when possible
        let beforeId: string | '__END__' | null = null;
        try {
          const zone = zoneRef.current;
          const ghostCard = zone?.querySelector('[data-testid="ghost-card"]') as HTMLElement | null;
          const ghostWrap = ghostCard ? ghostCard.closest('.toby-card-flex') as HTMLElement | null : null;
          let next = ghostWrap?.nextElementSibling as HTMLElement | null | undefined;
          while (
            next && (
              !next.getAttribute('data-card-id') ||
              next.getAttribute('data-hidden') === 'true'
            )
          ) {
            next = next.nextElementSibling as any;
          }
          beforeId = (next?.getAttribute('data-card-id') as string) || '__END__';
        } catch {}
        if (!beforeId) beforeId = ghostBeforeRef.current;
        if (!beforeId) {
          let idx = ghostIndex;
          if (idx == null)
            idx = computeGhostIndex(e.clientX, e.clientY, e.target);
          const list = hiddenCardId ? items.filter((x) => x.id !== hiddenCardId) : items;
          if (idx == null) idx = list.length;
          beforeId = idx >= list.length ? '__END__' : list[idx].id;
        }
        dbg('dnd', 'drop(tab→grid)', { idx: ghostIndex, beforeId, list: (hiddenCardId ? items.filter((x)=>x.id!==hiddenCardId):items).map((x)=>x.id) });
        // 容器 drop：有既有項目時提供 beforeId，空清單則維持單一參數（back-compat）
        let ret;
        if ((items?.length || 0) > 0) ret = (onDropTab as any)?.(tab, beforeId);
        else ret = (onDropTab as any)?.(tab);
        try { if (ret && typeof (ret as any).then === 'function') await ret; } catch {}
        try { setLastDropTitle(String((tab as any).title || (tab as any).url || '')); } catch {}
        setGhostTab(null);
        setGhostType(null);
        setGhostIndex(null);
        setDraggingCardId(null);
        try { broadcastGhostActive(null); } catch {}
        return;
      }
    } catch {
      showToast('Failed to add tab', 'error');
    }
    // Clear ghost on non-tab drops
    setGhostTab(null);
    setGhostType(null);
    setGhostIndex(null);
    setDraggingCardId(null);
    try { broadcastGhostActive(null); } catch {}
  };

  return (
    <div>
      {/* Floating toolbar when cards are selected */}
      {selectedCount > 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 bg-[var(--panel)] border border-slate-700 rounded-lg shadow-2xl px-4 py-3 flex items-center gap-4">
          <p className="text-sm font-medium opacity-90">
            ({selectedCount} {selectedCount === 1 ? 'tab' : 'tabs'} selected)
          </p>

          <button
            type="button"
            className="flex items-center gap-2 px-3 py-1.5 text-sm rounded border border-slate-600 hover:bg-slate-800 transition-colors"
            onClick={() => setShowMoveDialog(true)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 4h4l3 3h7a2 2 0 0 1 2 2v8a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-11a2 2 0 0 1 2 -2"></path>
            </svg>
            MOVE
          </button>

          <button
            type="button"
            className="flex items-center gap-2 px-3 py-1.5 text-sm rounded border border-slate-600 hover:bg-slate-800 transition-colors"
            onClick={handleOpenTabs}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 7l-10 10"></path>
              <path d="M8 7l9 0l0 9"></path>
            </svg>
            Open tabs
          </button>

          <button
            type="button"
            className="flex items-center gap-2 px-3 py-1.5 text-sm rounded border border-red-600 text-red-300 hover:bg-red-950/30 transition-colors"
            onClick={() => {
              (document.activeElement as HTMLElement | null)?.blur?.();
              setConfirming(true);
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 7l16 0"></path>
              <path d="M10 11l0 6"></path>
              <path d="M14 11l0 6"></path>
              <path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12"></path>
              <path d="M9 7v-3a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v3"></path>
            </svg>
            DELETE
          </button>

          <button
            type="button"
            className="ml-2 p-1 hover:bg-slate-800 rounded transition-colors"
            onClick={clearSelection}
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6l-12 12"></path>
              <path d="M6 6l12 12"></path>
            </svg>
          </button>
        </div>
      )}
      <div
        aria-label="Drop Zone"
        data-testid="drop-zone"
        ref={zoneRef}
        onDragOver={handleDragOver}
        onDragEnter={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`min-h-[200px] rounded border p-4 transition-all ${
          isOver
            ? 'border-emerald-500 ring-2 ring-emerald-500 bg-emerald-950/20'
            : 'border-slate-700'
        }`}
      >
        {lastDropTitle ? (
          <span className="sr-only" aria-hidden="true">{lastDropTitle}</span>
        ) : null}
        {items.length === 0 && !((ghostTab != null || ghostType != null) && ghostIndex != null) ? (
          <div className="opacity-70">Drag tabs here to save</div>
        ) : (
          <div
            className={`toby-cards-flex ${density === 'compact' ? 'density-compact' : density === 'roomy' ? 'density-roomy' : ''} ${collapsed ? 'cards-collapsed' : ''}`}
          >
            {(() => {
              // Hide original only when a ghost is visible (i.e., cursor in a drop zone with computed index)
              const ghostActive = isOver || ghostTab != null || ghostType != null || ghostIndex != null;
              const viewItems = ghostActive && draggingCardId
                ? items.filter((x) => x.id !== draggingCardId)
                : items;
              const renderList: Array<
                { type: 'card'; item: WebpageCardData } | { type: 'ghost' }
              > = [];
              // Prefer recorded beforeId to keep ghost position stable when the source card is hidden
              let gIdx = -1;
              if (ghostActive) {
                const gBefore = ghostBeforeRef.current;
                if (gBefore === '__END__') gIdx = viewItems.length;
                else if (gBefore) gIdx = viewItems.findIndex((it) => it.id === gBefore);
                if (gIdx < 0) {
                  const idx = ghostIndex == null ? 0 : (ghostIndex as number);
                  gIdx = Math.max(0, Math.min(viewItems.length, idx));
                }
              }
              for (let i = 0; i < viewItems.length; i++) {
                if (i === gIdx) renderList.push({ type: 'ghost' });
                renderList.push({ type: 'card', item: viewItems[i] });
              }
              if (gIdx === viewItems.length) renderList.push({ type: 'ghost' });
              return renderList;
            })().map((node, idx) => (
              <div
                key={
                  node.type === 'card' ? (node.item as any).id : `ghost-${idx}`
                }
                className="toby-card-flex relative"
                id={node.type === 'card' ? `card-${(node.item as any).id}` : undefined}
                data-card-id={node.type === 'card' ? (node.item as any).id : undefined}
                data-hidden={
                  node.type === 'card' && hiddenCardId === (node.item as any).id
                    ? 'true'
                    : undefined
                }
                data-testid={node.type === 'card' ? `card-wrapper-${(node.item as any).id}` : undefined}
                style={
                  node.type === 'card' && hiddenCardId === (node.item as any).id
                    ? { display: 'none' }
                    : undefined
                }
                draggable={node.type === 'card' && !dragDisabled}
                onDragStart={
                  node.type === 'card'
                    ? (e) => {
                        const it = node.item as any;
                        e.dataTransfer.setData(
                          'application/x-linktrove-webpage',
                          it.id
                        );
                        try {
                          e.dataTransfer.setData(
                            'application/x-linktrove-webpage-meta',
                            JSON.stringify({ id: it.id, title: it.title, url: it.url, favicon: it.favicon, description: it.description })
                          );
                        } catch {}
                        e.dataTransfer.effectAllowed = 'move';
                        try { setDragWebpage({ id: it.id, title: it.title, url: it.url, favicon: it.favicon, description: it.description }); } catch {}
                        (e.currentTarget as HTMLElement).setAttribute(
                          'data-dragging',
                          'true'
                        );
                      }
                    : undefined
                }
                onDragEnd={
                  node.type === 'card'
                    ? (e) => {
                        (e.currentTarget as HTMLElement).removeAttribute(
                          'data-dragging'
                        );
                        setDraggingCardId(null);
                        try { setDragWebpage(null); } catch {}
                      }
                    : undefined
                }
                onDrop={
                  node.type === 'card'
                    ? (e) => {
                        e.preventDefault();
                        const it = node.item as any;
                        // 1) New tab dropped on a specific card → insert before target, unless last-card lower half → end
                        const rawTab = e.dataTransfer.getData(
                          'application/x-linktrove-tab'
                        );
                        if (rawTab) {
                          try {
                            const tab: TabItemData = JSON.parse(rawTab);
                            const rect = (
                              e.currentTarget as HTMLElement
                            ).getBoundingClientRect();
                            const midY = (rect.top + rect.bottom) / 2;
                            const list = draggingCardId
                              ? items.filter((x) => x.id !== draggingCardId)
                              : items;
                            const isLast =
                              list.length > 0 &&
                              it.id === (list[list.length - 1] as any).id;
                            const atEnd = isLast && e.clientY > midY;
                            const beforeId = atEnd ? '__END__' : it.id;
                            (onDropTab as any)?.(tab, beforeId);
                            return;
                          } catch {
                            /* ignore */
                          }
                        }
                        // 2) Existing card dropped on a specific card
                        const fromId = e.dataTransfer.getData(
                          'application/x-linktrove-webpage'
                        );
                        if (fromId && fromId !== it.id) {
                          // If caller provided cross-group handler, prefer it; otherwise fallback to reorder
                          if (onDropExistingCard) onDropExistingCard(fromId, it.id);
                          else onReorder?.(fromId, it.id);
                        }
                      }
                    : undefined
                }
              >
                {node.type === 'ghost' ? (
                  <TobyLikeCard
                    title={(ghostTab?.title || (ghostTab as any)?.url || (ghostType === 'card' ? 'Moving' : 'New'))}
                    description={(ghostTab as any)?.description || ''}
                    faviconText={
                      ((ghostTab?.url || '')
                        .replace(/^https?:\/\//, '')
                        .replace(/^www\./, '')
                        .slice(0, 2)
                        .toUpperCase() || 'WW')
                    }
                    faviconUrl={(ghostTab as any)?.favIconUrl}
                    ghost
                  />
                ) : (
                  <TobyLikeCard
                    title={(node.item as any).title}
                    description={(node.item as any).description}
                    faviconText={
                      ((node.item as any).url || '')
                        .replace(/^https?:\/\//, '')
                        .replace(/^www\./, '')
                        .slice(0, 2)
                        .toUpperCase() || 'WW'
                    }
                    faviconUrl={(node.item as any).favicon}
                    url={(node.item as any).url}
                    categoryId={(node.item as any).category}
                    meta={(node.item as any).meta || {}}
                    selected={!!selected[(node.item as any).id]}
                    onToggleSelect={() => toggleSelect((node.item as any).id)}
                    onOpen={() => {
                      try {
                        window.open((node.item as any).url, '_blank');
                      } catch {}
                    }}
                    onDelete={() => onDeleteOne?.((node.item as any).id)}
                    onUpdateTitle={(v) =>
                      onUpdateTitle?.((node.item as any).id, v)
                    }
                    onUpdateUrl={(v) => onUpdateUrl?.((node.item as any).id, v)}
                    onUpdateDescription={(v) =>
                      onEditDescription?.((node.item as any).id, v)
                    }
                    onUpdateMeta={(m) =>
                      onUpdateMeta?.((node.item as any).id, m)
                    }
                    onMoveToCategory={(cid) =>
                      onUpdateCategory?.((node.item as any).id, cid)
                    }
                    onModalOpenChange={(open) => setDragDisabled(open)}
                    onSave={(patch) => {
                      const it = node.item as any;
                      if (onSave) onSave(it.id, patch);
                      else {
                        if (patch.title) onUpdateTitle?.(it.id, patch.title);
                        if (patch.url) onUpdateUrl?.(it.id, patch.url);
                        if (patch.description !== undefined)
                          onEditDescription?.(it.id, patch.description);
                        if (patch.meta) onUpdateMeta?.(it.id, patch.meta);
                      }
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      {confirming && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setConfirming(false)}
        >
          <div
            className="rounded border border-slate-700 bg-[var(--bg)] p-4"
            role="dialog"
            aria-label="Confirm Delete Selected"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 font-medium">Confirm Delete Selected</div>
            <div className="flex gap-2 justify-end">
              <button
                className="px-3 py-1 rounded border border-slate-600 hover:bg-slate-800"
                onClick={() => setConfirming(false)}
              >
                Cancel
              </button>
              <button
                className="px-3 py-1 rounded border border-red-600 text-red-300 hover:bg-red-950/30"
                onClick={() => {
                  const ids = Object.entries(selected)
                    .filter(([, v]) => v)
                    .map(([key]) => key);
                  setConfirming(false);
                  clearSelection();
                  onDeleteMany?.(ids);
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      {showOpenTabsConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setShowOpenTabsConfirm(false)}
        >
          <div
            className="rounded border border-slate-700 bg-[var(--bg)] p-4"
            role="dialog"
            aria-label="Confirm Open Tabs"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 font-medium">
              確定要開啟 {selectedCount} 個標籤頁嗎？
            </div>
            <div className="flex gap-2 justify-end">
              <button
                className="px-3 py-1 rounded border border-slate-600 hover:bg-slate-800"
                onClick={() => setShowOpenTabsConfirm(false)}
              >
                Cancel
              </button>
              <button
                className="px-3 py-1 rounded border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent-hover)]"
                onClick={executeOpenTabs}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
      <MoveSelectedDialog
        isOpen={showMoveDialog}
        selectedCount={selectedCount}
        onClose={() => setShowMoveDialog(false)}
        onMove={handleBatchMove}
      />
    </div>
  );
};
