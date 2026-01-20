export type DragTab = {
  id: number;
  title?: string;
  url?: string;
  favIconUrl?: string;
};

let current: DragTab | null = null;

export function setDragTab(tab: DragTab | null) {
  current = tab;
}

export function getDragTab(): DragTab | null {
  return current;
}

// Webpage drag context for cross-group ghost preview
export type DragWebpage = {
  id: string;
  title?: string;
  url?: string;
  favicon?: string;
  description?: string;
};

let currentWebpage: DragWebpage | null = null;

export function setDragWebpage(card: DragWebpage | null) {
  currentWebpage = card;
  // 當拖曳結束時（card 為 null），廣播清理事件給所有 CardGrid 實例
  if (card === null) {
    try {
      window.dispatchEvent(new CustomEvent('lt:ghost-clear'));
    } catch {}
  }
}

export function getDragWebpage(): DragWebpage | null {
  return currentWebpage;
}

// Global helper for ghost-active broadcasts
export function broadcastGhostActive(id: string | null) {
  try {
    const evt = new CustomEvent('lt:ghost-active', { detail: id } as any);
    window.dispatchEvent(evt);
  } catch {}
}
