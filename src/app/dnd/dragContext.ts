export type DragTab = {
  id: number;
  title?: string;
  url?: string;
  favIconUrl?: string;
  groupId?: number;
  windowId?: number;
  index?: number;
};

export type DragGroup = {
  id: number;
  windowId?: number;
  title?: string;
  color?: string;
};

export const DRAG_TYPES = {
  TAB: 'application/x-linktrove-tab',
  GROUP: 'application/x-linktrove-group',
};

let currentTab: DragTab | null = null;
let currentGroup: DragGroup | null = null;

export function setDragTab(tab: DragTab | null) {
  currentTab = tab;
  currentGroup = null; // Exclusive drag
}

export function getDragTab(): DragTab | null {
  return currentTab;
}

export function setDragGroup(group: DragGroup | null) {
  currentGroup = group;
  currentTab = null;
}

export function getDragGroup(): DragGroup | null {
  return currentGroup;
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