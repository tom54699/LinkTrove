import React from 'react';
import type { WebpageCardData } from './WebpageCard';
import { TobyLikeCard } from './TobyLikeCard';
import type { TabItemData } from '../tabs/types';
import { getDragTab, getDragWebpage, setDragWebpage, broadcastGhostActive } from '../dnd/dragContext';
import { useFeedback } from '../ui/feedback';
import { MoveSelectedDialog } from './MoveSelectedDialog';
import { useI18n } from '../i18n';

export interface CardGridProps {
  groupId?: string;
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
  onUpdateTitle?: (id: string, title: string) => void;
  onUpdateUrl?: (id: string, url: string) => void;
  onUpdateCategory?: (id: string, category: string) => void;
  onUpdateMeta?: (id: string, meta: Record<string, string>) => void;
  onMoveCardToGroup?: (
    id: string,
    categoryId: string,
    subcategoryId: string
  ) => Promise<void>;
}

export const CardGrid: React.FC<CardGridProps> = ({
  groupId,
  items = [],
  onDropTab,
  onDeleteMany,
  onDeleteOne,
  onEditDescription,
  onSave,
  onDropExistingCard,
  onUpdateTitle,
  onUpdateUrl,
  onUpdateCategory,
  onUpdateMeta,
  onMoveCardToGroup,
}) => {
  const { t } = useI18n();
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

  const handleOpenTabs = () => {
    const selectedIds = Object.entries(selected).filter(([, v]) => v).map(([key]) => key);
    if (selectedIds.length > 10) { setShowOpenTabsConfirm(true); return; }
    executeOpenTabs();
  };

  const executeOpenTabs = () => {
    try {
      const selectedIds = Object.entries(selected).filter(([, v]) => v).map(([key]) => key);
      const selectedItems = items.filter((item) => selectedIds.includes(item.id));
      selectedItems.forEach((item) => {
        if (chrome?.tabs?.create) {
          chrome.tabs.create({ url: item.url, active: false });
        } else {
          window.open(item.url, '_blank');
        }
      });
      clearSelection();
      setShowOpenTabsConfirm(false);
    } catch { showToast(t('toast_open_tabs_failed'), 'error'); }
  };

  const handleBatchMove = async (categoryId: string, subcategoryId: string) => {
    try {
      // Preserve order: filter from items instead of using Object.entries
      const selectedIds = items.filter(item => selected[item.id]).map(item => item.id);

      // Prefer provider action to keep UI state in sync
      if (onMoveCardToGroup) {
        for (const cardId of selectedIds) {
          await onMoveCardToGroup(cardId, categoryId, subcategoryId);
        }
      } else {
        const { createStorageService } = await import('../../background/storageService');
        const svc = createStorageService();

        // Sequential execution to prevent race conditions and preserve order
        for (const cardId of selectedIds) {
          if (onUpdateCategory) await onUpdateCategory(cardId, categoryId);
          await (svc as any).updateCardSubcategory?.(cardId, subcategoryId);
        }
      }

      setShowMoveDialog(false); clearSelection(); showToast(t('toast_moved_cards', [String(selectedIds.length)]), 'success');
    } catch { showToast(t('toast_move_failed'), 'error'); }
  };

  const [dragDisabled, setDragDisabled] = React.useState(false);
  const [ghostTab, setGhostTab] = React.useState<TabItemData | null>(null);
  const [ghostType, setGhostType] = React.useState<'tab' | 'card' | null>(null);
  const [ghostIndex, setGhostIndex] = React.useState<number | null>(null);
  const ghostBeforeRef = React.useRef<string | '__END__' | null>(null);
  const [draggingCardId, setDraggingCardId] = React.useState<string | null>(null);
  const [hiddenCardId, setHiddenCardId] = React.useState<string | null>(null);
  const zoneRef = React.useRef<HTMLDivElement | null>(null);
  const [lastDropTitle, setLastDropTitle] = React.useState<string | null>(null);

  const prevGiRef = React.useRef<number | null>(null);
  const dragStartXRef = React.useRef<number | null>(null);
  const dragStartYRef = React.useRef<number | null>(null);
  const grabOffsetXRef = React.useRef<number>(0);

  const normalizeBeforeId = React.useCallback(
    (beforeId: string | '__END__' | null) => {
      if (!beforeId || beforeId === '__END__') return beforeId;
      const validIds = new Set(
        items
          .filter((x) => x.id !== hiddenCardId && x.id !== draggingCardId)
          .map((x) => x.id)
      );
      if (!validIds.has(beforeId)) {
        return '__END__';
      }
      return beforeId;
    },
    [items, hiddenCardId, draggingCardId, groupId]
  );
  
  const computeGhostIndex = React.useCallback(
    (
      clientX: number | undefined,
      clientY: number | undefined,
      _target?: EventTarget | null
    ) => {
      const zone = zoneRef.current;
      if (!zone || clientX == null || clientY == null) return null;

      let wrappers = Array.from(
        zone.querySelectorAll('.toby-card-flex')
      ) as HTMLElement[];

      // 嚴格過濾：排除 Ghost 卡片、隱藏卡片、無效卡片
      wrappers = wrappers.filter((el) => {
        if (el.querySelector('[data-testid="ghost-card"]')) return false;
        if (el.getAttribute('data-hidden') === 'true') return false;
        const cardId = el.getAttribute('data-card-id');
        if (!cardId || cardId === 'null' || cardId === 'undefined') return false;
        const rect = el.getBoundingClientRect();
        if (rect.left === 0 && rect.top === 0 && rect.width === 0 && rect.height === 0) return false;
        return true;
      });

      if (wrappers.length === 0) {
        return 0;
      }

      // --- Row-Aware 插入計算 ---
      // Step 1: 將卡片按 row 分組（容錯 ±10px）
      const ROW_TOLERANCE = 10;
      const cardsWithPos = wrappers.map((el, idx) => {
        const rect = el.getBoundingClientRect();
        const cardId = el.getAttribute('data-card-id');
        return { el, idx, rect, cardId, centerX: rect.left + rect.width / 2, centerY: rect.top + rect.height / 2 };
      });

      // 按 Y 座標排序，然後分組成 rows
      cardsWithPos.sort((a, b) => a.rect.top - b.rect.top);

      const rows: typeof cardsWithPos[] = [];
      let currentRow: typeof cardsWithPos = [];
      let lastTop = -1000;

      for (const card of cardsWithPos) {
        if (currentRow.length === 0 || Math.abs(card.rect.top - lastTop) <= ROW_TOLERANCE) {
          currentRow.push(card);
          lastTop = card.rect.top;
        } else {
          // 同一 row 內按 X 排序
          currentRow.sort((a, b) => a.rect.left - b.rect.left);
          rows.push(currentRow);
          currentRow = [card];
          lastTop = card.rect.top;
        }
      }
      if (currentRow.length > 0) {
        currentRow.sort((a, b) => a.rect.left - b.rect.left);
        rows.push(currentRow);
      }

      // Step 2: 判斷滑鼠在哪一行（或行間區域）
      let targetRow = -1;

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowTop = row[0].rect.top;
        const rowBottom = row[0].rect.bottom;

        if (clientY >= rowTop && clientY <= rowBottom) {
          targetRow = i;
          break;
        }

        // 檢查是否在兩行之間（移除間隙大小限制）
        if (i < rows.length - 1) {
          const nextRow = rows[i + 1];
          const gapTop = rowBottom;
          const gapBottom = nextRow[0].rect.top;

          if (clientY > gapTop && clientY < gapBottom) {
            // 判斷靠近哪一行
            if (clientY - gapTop < gapBottom - clientY) {
              targetRow = i;
            } else {
              targetRow = i + 1;
            }
            break;
          }
        }
      }

      // 如果在最後一行之下
      if (targetRow === -1) {
        if (clientY > rows[rows.length - 1][0].rect.bottom) {
          return wrappers.length;
        } else {
          targetRow = 0;
        }
      }

      // Step 3: 在目標行內，根據 X 座標判斷位置
      const row = rows[targetRow];
      let newIndex = 0;

      // 計算卡片中心的 X 座標（補償滑鼠抓取偏移量）
      const cardCenterX = clientX - grabOffsetXRef.current;

      // 策略：一直使用實時 cardCenterX，但透過容差（TOLERANCE）來處理跨行對齊
      // 判斷是否跨行：比較目標行的 Y 座標和起始 Y 座標
      let isCrossingRows = false;
      if (dragStartYRef.current !== null && row.length > 0) {
        const targetRowY = row[0].centerY;
        const yDiff = Math.abs(targetRowY - dragStartYRef.current);
        // 如果 Y 座標差異超過 25px，視為跨行
        isCrossingRows = yDiff > 25;
      }

      // 一直使用實時 X 座標，避免來回拖曳時 refX 跳動
      const refX = cardCenterX;

      if (row.length === 0) {
        newIndex = 0;
      } else {
        // 跨行時容錯範圍大（寬容對齊），同行時無容錯（精確）
        const TOLERANCE = isCrossingRows ? 50 : 0;
        let inserted = false;

        if (isCrossingRows && TOLERANCE > 0) {
          // 跨行模式：先找最接近的卡片
          let closestCard = row[0];
          let minDist = Math.abs(refX - row[0].centerX);

          for (let i = 1; i < row.length; i++) {
            const dist = Math.abs(refX - row[i].centerX);
            if (dist < minDist) {
              minDist = dist;
              closestCard = row[i];
            }
          }

          // 如果最接近的卡片在容差範圍內，插入到該位置
          if (minDist <= TOLERANCE) {
            newIndex = closestCard.idx;
            inserted = true;
          }
        }

        // 如果跨行模式沒有找到匹配，或是同行模式，使用正常邏輯
        if (!inserted) {
          for (let i = 0; i < row.length; i++) {
            const card = row[i];
            const diff = refX - card.centerX;

            // refX 在卡片中心點左側：插入到該卡片之前
            if (diff < 0) {
              newIndex = card.idx;
              inserted = true;
              break;
            }
          }
        }

        if (!inserted) {
          // refX 在所有卡片中心點右側：插入到最後
          newIndex = row[row.length - 1].idx + 1;
        }
      }

      // Step 4: 應用 Hysteresis（使用與 Step 3 相同的 refX）
      // buffer 控制切換靈敏度：值越小越敏感，但可能抖動；值越大越穩定，但需要拖更遠
      const buffer = 15;
      const currentIndex = prevGiRef.current;

      if (currentIndex !== null && currentIndex >= 0 && currentIndex <= wrappers.length) {
        if (newIndex === currentIndex) {
          return currentIndex;
        }

        // 如果變化不大（相鄰位置），使用較嚴格的 Hysteresis
        if (Math.abs(newIndex - currentIndex) === 1) {
          // 找出相關的卡片邊界
          const card1 = cardsWithPos.find(c => c.idx === Math.min(newIndex, currentIndex));
          const card2 = cardsWithPos.find(c => c.idx === Math.max(newIndex, currentIndex) - 1);

          if (card1 && newIndex > currentIndex) {
            // 向右移動：必須超過中心點一定的 buffer
            if (refX < card1.centerX + buffer) {
              return currentIndex;
            }
          } else if (card2 && newIndex < currentIndex) {
            // 向左移動：必須超過中心點一定的 buffer
            if (refX > card2.centerX - buffer) {
              return currentIndex;
            }
          }
        }
      }

      return newIndex;
    },
    []
  );

  React.useEffect(() => {
    const onGhost = (e: any) => {
      const id = (e?.detail as string) ?? null;
      setHiddenCardId(id);
    };
    try { window.addEventListener('lt:ghost-active', onGhost as any); } catch {}
    return () => {
      try { window.removeEventListener('lt:ghost-active', onGhost as any); } catch {}
      // 清理延遲計時器
      if (dragLeaveTimeoutRef.current) {
        clearTimeout(dragLeaveTimeoutRef.current);
      }
    };
  }, []);

  // 監聽全局 ghost 清理事件（當 setDragWebpage(null) 被調用時觸發）
  // 這確保跨 Group 拖曳結束時，所有 CardGrid 實例都能清理 ghost 狀態
  React.useEffect(() => {
    const onGhostClear = () => {
      setGhostTab(null);
      setGhostType(null);
      setGhostIndex(null);
      setIsOver(false);
      setDraggingCardId(null);
      ghostBeforeRef.current = null;
      prevGiRef.current = null;
      if (dragLeaveTimeoutRef.current) {
        clearTimeout(dragLeaveTimeoutRef.current);
        dragLeaveTimeoutRef.current = null;
      }
    };
    try { window.addEventListener('lt:ghost-clear', onGhostClear); } catch {}
    return () => {
      try { window.removeEventListener('lt:ghost-clear', onGhostClear); } catch {}
    };
  }, []);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    try { e.dataTransfer.dropEffect = 'move'; } catch {}
    setIsOver(true);

    // 取消 DragLeave 的延遲計時器（因為我們又回到容器內了）
    if (dragLeaveTimeoutRef.current) {
      clearTimeout(dragLeaveTimeoutRef.current);
      dragLeaveTimeoutRef.current = null;
    }

    let tab: TabItemData | null = (getDragTab() as any) || null;
    if (!tab) {
      const raw = e.dataTransfer.getData('application/x-linktrove-tab');
      if (raw) { try { tab = JSON.parse(raw); } catch {} }
    }
    if (tab) {
      setGhostTab(tab);
      setGhostType('tab');
      const gi = computeGhostIndex(e.clientX, e.clientY, e.target);
      setGhostIndex(gi);
      try { const list = hiddenCardId ? items.filter((x)=>x.id!==hiddenCardId) : items; ghostBeforeRef.current = gi==null? null : gi>=list.length ? '__END__' : list[gi].id; } catch {}
      if (gi !== prevGiRef.current) { prevGiRef.current = gi; }
      return;
    }
    try {
      const fromId = e.dataTransfer.getData('application/x-linktrove-webpage');
      if (fromId) {
        setGhostType('card');
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

        try {
          const list = hiddenCardId ? items.filter((x)=>x.id!==hiddenCardId) : items;
          ghostBeforeRef.current = gi==null? null : gi>=list.length ? '__END__' : list[gi].id;
        } catch {}

        if (gi !== prevGiRef.current) { prevGiRef.current = gi; }
        return;
      }
    } catch {}
    try {
      const types = Array.from((e.dataTransfer?.types as any) || []);
      if (types.includes('application/x-linktrove-webpage')) {
        setGhostType('card');
        const meta = (() => { try { return getDragWebpage(); } catch { return null; } })();
        if (meta) {
          const id = (meta as any).id;
          if (id) setDraggingCardId(id); // 🔧 修正：設定 draggingCardId
          try { broadcastGhostActive(id || null); } catch {}
          setGhostTab({ id: -1, title: meta.title, url: meta.url, favIconUrl: meta.favicon, description: meta.description } as any);
        } else setGhostTab(null);
        const gi = computeGhostIndex(e.clientX, e.clientY, e.target);
        setGhostIndex(gi);
        if (gi !== prevGiRef.current) { prevGiRef.current = gi; } // 🔧 修正：更新 prevGiRef
        try { const list = hiddenCardId ? items.filter((x)=>x.id!==hiddenCardId) : items; ghostBeforeRef.current = gi==null? null : gi>=list.length ? '__END__' : list[gi].id; } catch {}
        return;
      }
      if (types.includes('application/x-linktrove-tab')) {
        setGhostType('tab');
        setGhostTab(null);
        const gi = computeGhostIndex(e.clientX, e.clientY, e.target);
        setGhostIndex(gi);
        if (gi !== prevGiRef.current) { prevGiRef.current = gi; } // 🔧 修正：更新 prevGiRef
        return;
      }
    } catch {}
  };

  const dragLeaveTimeoutRef = React.useRef<number | null>(null);

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    const currentTarget = e.currentTarget as HTMLElement;
    const relatedTarget = e.relatedTarget as HTMLElement | null;
    const mousePos = { x: e.clientX, y: e.clientY };

    // 如果 relatedTarget 仍在當前容器內，忽略此 leave 事件
    if (relatedTarget && currentTarget.contains(relatedTarget)) {
      return;
    }

    // 🔧 使用 elementFromPoint 確認滑鼠位置的元素
    try {
      const elementAtMouse = document.elementFromPoint(mousePos.x, mousePos.y);
      if (elementAtMouse && currentTarget.contains(elementAtMouse)) {
        return;
      }
    } catch {}

    // 使用延遲確認真的離開了（防止快速 leave/enter 循環）
    if (dragLeaveTimeoutRef.current) {
      clearTimeout(dragLeaveTimeoutRef.current);
    }

    dragLeaveTimeoutRef.current = window.setTimeout(() => {
      // 🔧 再次確認滑鼠是否在容器外
      try {
        const elementAtMouse = document.elementFromPoint(mousePos.x, mousePos.y);
        if (elementAtMouse && currentTarget.contains(elementAtMouse)) {
          return;
        }
      } catch {}
      setIsOver(false);
      setGhostTab(null);
      setGhostType(null);
      setGhostIndex(null);
      setDraggingCardId(null);
      ghostBeforeRef.current = null;
      prevGiRef.current = null; // Reset hysteresis tracking when leaving group
      try { broadcastGhostActive(null); } catch {}
    }, 50); // 50ms 延遲確認
  }

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    // 取消任何待處理的 DragLeave 延遲
    if (dragLeaveTimeoutRef.current) {
      clearTimeout(dragLeaveTimeoutRef.current);
      dragLeaveTimeoutRef.current = null;
    }

    // Do not clear isOver yet; we need the ghost in DOM to calculate position
    try {
      const fromId = e.dataTransfer.getData('application/x-linktrove-webpage');
      if (fromId) {
        let beforeId: string | '__END__' | null = null;
        try {
          const zone = zoneRef.current;
          // Find the ghost wrapper in the DOM
          // Note: The ghost might be inside a wrapper, so we need to find the wrapper that contains the ghost-card testid
          const ghostIndicator = zone?.querySelector('[data-testid="ghost-card"]');
          const ghostWrapper = ghostIndicator?.closest('.toby-card-flex');
          
          if (ghostWrapper) {
             let next = ghostWrapper.nextElementSibling as HTMLElement | null;
             // Skip hidden/dragged items
             while (next && (
               !next.getAttribute('data-card-id') || 
               next.getAttribute('data-hidden') === 'true'
             )) {
               next = next.nextElementSibling as HTMLElement | null;
             }
             beforeId = next?.getAttribute('data-card-id') || '__END__';
          }
        } catch {}
        
        if (!beforeId) {
          beforeId = ghostBeforeRef.current;
        }
        const rawBeforeId = beforeId;
        beforeId = normalizeBeforeId(beforeId);
        
        // Fallback calculation if DOM lookups fail
        if (!beforeId) {
          let idx = ghostIndex;
          if (idx == null)
            idx = computeGhostIndex(e.clientX, e.clientY, e.target);
          const list = hiddenCardId ? items.filter((x) => x.id !== hiddenCardId) : items;
          if (idx == null) idx = list.length;
          beforeId = idx >= list.length ? '__END__' : list[idx].id;
        }
        
        beforeId = normalizeBeforeId(beforeId);
        try {
          await onDropExistingCard?.(fromId, beforeId);
        } finally {
          // Cleanup - 確保 ghost 一定會清理，即使 async 拋異常
          // 重要：跨 group 拖曳時，原卡片 DOM 會被移除，onDragEnd 不會觸發
          // 所以必須在這裡直接調用 setDragWebpage(null) 來觸發全局清理
          setGhostTab(null); setGhostType(null); setGhostIndex(null); setDraggingCardId(null);
          ghostBeforeRef.current = null;
          prevGiRef.current = null;
          setIsOver(false);
          try { broadcastGhostActive(null); } catch {}
          try { setDragWebpage(null); } catch {}  // 觸發 lt:ghost-clear 廣播
        }
        return;
      }
      // ... similar logic for new tab drop ...
      let raw = '';
      try { raw = e.dataTransfer.getData('application/x-linktrove-tab'); } catch {}
      let tab: TabItemData | null = null;
      if (raw) tab = JSON.parse(raw);
      if (!tab) { try { tab = (getDragTab() as any) || null; } catch { tab = null; } }
      if (tab) {
        let beforeId: string | '__END__' | null = null;
        try {
          const zone = zoneRef.current;
          const ghostIndicator = zone?.querySelector('[data-testid="ghost-card"]');
          const ghostWrapper = ghostIndicator?.closest('.toby-card-flex');
          
          if (ghostWrapper) {
             let next = ghostWrapper.nextElementSibling as HTMLElement | null;
             while (next && (
               !next.getAttribute('data-card-id') || 
               next.getAttribute('data-hidden') === 'true'
             )) {
               next = next.nextElementSibling as HTMLElement | null;
             }
             beforeId = next?.getAttribute('data-card-id') || '__END__';
          }
        } catch {}
        
        if (!beforeId) {
          beforeId = ghostBeforeRef.current;
        }
        const rawBeforeId = beforeId;
        beforeId = normalizeBeforeId(beforeId);
        
        let ret;
        if ((items?.length || 0) > 0) ret = (onDropTab as any)?.(tab, beforeId);
        else ret = (onDropTab as any)?.(tab);
        try { if (ret && typeof (ret as any).then === 'function') await ret; } catch {}
        try { setLastDropTitle(String((tab as any).title || (tab as any).url || '')); } catch {}
        
        // Cleanup
        setGhostTab(null); setGhostType(null); setGhostIndex(null); setDraggingCardId(null);
        ghostBeforeRef.current = null;
        prevGiRef.current = null;
        setIsOver(false);
        try { broadcastGhostActive(null); } catch {}
        try { setDragWebpage(null); } catch {}  // 觸發 lt:ghost-clear 廣播
        return;
      }
    } catch {
      showToast(t('toast_add_tab_failed'), 'error');
    }
    setGhostTab(null); setGhostType(null); setGhostIndex(null); setDraggingCardId(null);
    ghostBeforeRef.current = null;
    prevGiRef.current = null;
    setIsOver(false);
    try { broadcastGhostActive(null); } catch {}
    try { setDragWebpage(null); } catch {}  // 觸發 lt:ghost-clear 廣播
  };

  return (
    <div>
      <div className={`fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-300 ease-out ${
        selectedCount > 0 ? 'translate-y-0 opacity-100' : 'translate-y-[150%] opacity-0 pointer-events-none'
      }`}>
        <div className="flex items-center gap-1 p-1.5 pl-4 pr-2 bg-[var(--panel)]/90 backdrop-blur-xl border border-slate-700/50 rounded-full shadow-2xl shadow-black/50 text-slate-200">
          <div className="flex items-center gap-2 mr-2">
            <span className="flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 bg-[var(--accent)] text-[var(--accent-fg)] text-xs font-bold rounded-full">
              {selectedCount}
            </span>
            <span className="text-sm font-medium opacity-80 hidden sm:inline">
              {t('batch_selected')}
            </span>
          </div>

          <div className="w-px h-5 bg-slate-700/80 mx-1"></div>

          <button type="button" onClick={() => setShowMoveDialog(true)} 
            className="group flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-full hover:bg-slate-700/60 transition-colors" 
            title={t('batch_move')}>
            <svg className="w-4 h-4 opacity-70 group-hover:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
            <span className="hidden sm:inline">{t('batch_move')}</span>
          </button>

          <button type="button" onClick={handleOpenTabs} 
            className="group flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-full hover:bg-slate-700/60 transition-colors" 
            title={t('batch_open_tabs')}>
            <svg className="w-4 h-4 opacity-70 group-hover:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
            <span className="hidden sm:inline">{t('batch_open_tabs')}</span>
          </button>

          <button type="button" onClick={() => { (document.activeElement as HTMLElement | null)?.blur?.(); setConfirming(true); }} 
            className="group flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-full text-red-300 hover:text-red-200 hover:bg-red-500/20 transition-colors" 
            title={t('batch_delete')}>
            <svg className="w-4 h-4 opacity-70 group-hover:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            <span className="hidden sm:inline">{t('batch_delete')}</span>
          </button>

          <div className="w-px h-5 bg-slate-700/80 mx-1"></div>

          <button type="button" onClick={clearSelection} 
            className="p-2 rounded-full hover:bg-slate-700/60 text-slate-400 hover:text-white transition-colors"
            aria-label="Close">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      </div>
      <div
        aria-label="Drop Zone"
        ref={zoneRef}
        onDragOver={handleDragOver}
        onDragEnter={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className="min-h-[100px] rounded-xl transition-all"
      >
        {lastDropTitle && <span className="sr-only" aria-hidden="true">{lastDropTitle}</span>}
        {items.length === 0 && !((ghostTab != null || ghostType != null) && ghostIndex != null) ? (
          <div className="py-12 text-center text-[var(--muted)] opacity-50 font-medium">{t('drag_tabs_hint')}</div>
        ) : (
          <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 270px))', maxWidth: '1200px' }}>
            {(() => {
              const ghostSignalsActive = isOver || ghostTab != null || ghostType != null || ghostIndex != null;
              const cardGhostReady = ghostType !== 'card' || (draggingCardId != null && ghostIndex != null);
              const ghostActive = ghostSignalsActive && cardGhostReady;
              const viewItems = ghostActive && draggingCardId ? items.filter((x) => x.id !== draggingCardId) : items;
              const renderList: Array<{ type: 'card'; item: WebpageCardData } | { type: 'ghost' }> = [];
              let gIdx = -1;
              if (ghostActive) {
                // Use the ghostIndex state that was set by dragOver
                gIdx = ghostIndex == null ? 0 : (ghostIndex as number);
              }
              for (let i = 0; i < viewItems.length; i++) {
                if (i === gIdx) renderList.push({ type: 'ghost' });
                renderList.push({ type: 'card', item: viewItems[i] });
              }
              if (gIdx === viewItems.length) renderList.push({ type: 'ghost' });
              return renderList;
            })().map((node, idx) => (
              <div
                key={node.type === 'card' ? (node.item as any).id : `ghost-${idx}`}
                className="toby-card-flex w-full relative"
                id={node.type === 'card' ? `card-${(node.item as any).id}` : undefined}
                data-card-id={node.type === 'card' ? (node.item as any).id : undefined}
                data-hidden={node.type === 'card' && hiddenCardId === (node.item as any).id ? 'true' : undefined}
                style={{
                  opacity: node.type === 'card' && hiddenCardId === (node.item as any).id ? 0.2 : undefined,
                  pointerEvents: node.type === 'card' && hiddenCardId === (node.item as any).id ? 'none' : undefined,
                  transition: 'opacity 0.15s ease',
                }}
                draggable={node.type === 'card' && !dragDisabled}
                onDragStart={node.type === 'card' ? (e) => {
                  const it = node.item as any;
                  e.dataTransfer.setData('application/x-linktrove-webpage', it.id);
                  try { e.dataTransfer.setData('application/x-linktrove-webpage-meta', JSON.stringify({ id: it.id, title: it.title, url: it.url, favicon: it.favicon, description: it.description })); } catch {}
                  e.dataTransfer.effectAllowed = 'move';
                  setDraggingCardId(it.id);
                  try { setDragWebpage({ id: it.id, title: it.title, url: it.url, favicon: it.favicon, description: it.description }); } catch {}
                  (e.currentTarget as HTMLElement).setAttribute('data-dragging', 'true');
                  // 初始化 prevGiRef 為當前卡片位置，避免拖曳初期 ghost 跳動
                  const currentIndex = items.findIndex(card => card.id === it.id);
                  if (currentIndex !== -1) {
                    prevGiRef.current = currentIndex;
                  }
                  // 記錄卡片中心 X/Y 和滑鼠抓取偏移量
                  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                  const cardCenterX = rect.left + rect.width / 2;
                  const cardCenterY = rect.top + rect.height / 2;
                  dragStartXRef.current = cardCenterX;
                  dragStartYRef.current = cardCenterY;
                  grabOffsetXRef.current = e.clientX - cardCenterX;
                } : undefined}
                onDragEnd={node.type === 'card' ? (e) => {
                  (e.currentTarget as HTMLElement).removeAttribute('data-dragging');
                  setDraggingCardId(null); try { setDragWebpage(null); } catch {}
                  try { broadcastGhostActive(null); } catch {}
                  ghostBeforeRef.current = null;
                  prevGiRef.current = null;
                  dragStartXRef.current = null;
                  dragStartYRef.current = null;
                  grabOffsetXRef.current = 0;
                } : undefined}
              >
                {node.type === 'ghost' ? (
                  <TobyLikeCard
                    title={(ghostTab?.title || (ghostTab as any)?.url || (ghostType === 'card' ? 'Moving' : 'New'))}
                    description={(ghostTab as any)?.description || ''}
                    faviconText={((ghostTab?.url || '').replace(/^https?:\/\//, '').replace(/^www\./, '').slice(0, 2).toUpperCase() || 'WW')}
                    faviconUrl={(ghostTab as any)?.favIconUrl}
                    ghost
                  />
                ) : (
                  <TobyLikeCard
                    title={(node.item as any).title}
                    description={(node.item as any).description}
                    faviconText={((node.item as any).url || '').replace(/^https?:\/\//, '').replace(/^www\./, '').slice(0, 2).toUpperCase() || 'WW'}
                    faviconUrl={(node.item as any).favicon}
                    url={(node.item as any).url}
                    categoryId={(node.item as any).category}
                    meta={(node.item as any).meta || {}}
                    createdAt={(node.item as any).createdAt}
                    updatedAt={(node.item as any).updatedAt}
                    selected={!!selected[(node.item as any).id]}
                    onToggleSelect={() => toggleSelect((node.item as any).id)}
                    onOpen={(opts) => {
                      try {
                        const url = (node.item as any).url;
                        const openInBackground = opts?.ctrlKey ?? false;
                        if (chrome?.tabs?.create) {
                          chrome.tabs.create({ url, active: !openInBackground });
                        } else {
                          window.open(url, '_blank');
                        }
                      } catch {}
                    }}
                    onDelete={() => onDeleteOne?.((node.item as any).id)}
                    onUpdateTitle={(v) => onUpdateTitle?.((node.item as any).id, v)}
                    onUpdateUrl={(v) => onUpdateUrl?.((node.item as any).id, v)}
                    onUpdateDescription={(v) => onEditDescription?.((node.item as any).id, v)}
                    onUpdateMeta={(m) => onUpdateMeta?.((node.item as any).id, m)}
                    onModalOpenChange={(open) => setDragDisabled(open)}
                    onSave={(patch) => {
                      const it = node.item as any;
                      if (onSave) onSave(it.id, patch);
                      else {
                        if (patch.title) onUpdateTitle?.(it.id, patch.title);
                        if (patch.url) onUpdateUrl?.(it.id, patch.url);
                        if (patch.description !== undefined) onEditDescription?.(it.id, patch.description);
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setConfirming(false)}>
          <div className="rounded border border-slate-700 bg-[var(--bg)] p-4" role="dialog" aria-label={t('confirm_delete_selected_title')} onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 font-medium">{t('confirm_delete_selected_title')}</div>
            <div className="flex gap-2 justify-end">
              <button className="px-3 py-1 rounded border border-slate-600 hover:bg-slate-800" onClick={() => setConfirming(false)}>{t('btn_cancel')}</button>
              <button className="px-3 py-1 rounded border border-red-600 text-red-300 hover:bg-red-950/30" onClick={() => { const ids = Object.entries(selected).filter(([, v]) => v).map(([key]) => key); setConfirming(false); clearSelection(); onDeleteMany?.(ids); }}>{t('menu_delete')}</button>
            </div>
          </div>
        </div>
      )}
      {showOpenTabsConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowOpenTabsConfirm(false)}>
          <div className="rounded border border-slate-700 bg-[var(--bg)] p-4" role="dialog" aria-label={t('confirm_open_tabs', [String(selectedCount)])} onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 font-medium">{t('confirm_open_tabs', [String(selectedCount)])}</div>
            <div className="flex gap-2 justify-end">
              <button className="px-3 py-1 rounded border border-slate-600 hover:bg-slate-800" onClick={() => setShowOpenTabsConfirm(false)}>{t('btn_cancel')}</button>
              <button className="px-3 py-1 rounded border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent-hover)]" onClick={executeOpenTabs}>{t('btn_confirm')}</button>
            </div>
          </div>
        </div>
      )}
      <MoveSelectedDialog isOpen={showMoveDialog} selectedCount={selectedCount} onClose={() => setShowMoveDialog(false)} onMove={handleBatchMove} />
    </div>
  );
};
