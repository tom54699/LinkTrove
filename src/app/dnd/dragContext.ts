export type DragTab = { id: number; title?: string; url?: string; favIconUrl?: string };

let current: DragTab | null = null;

export function setDragTab(tab: DragTab | null) {
  current = tab;
}

export function getDragTab(): DragTab | null {
  return current;
}
