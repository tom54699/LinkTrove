export interface TabItemData {
  id: number;
  title?: string;
  favIconUrl?: string;
  url?: string;
  index?: number;
  windowId?: number;
  nativeGroupId?: number;
}

export interface NativeTabGroup {
  id: number;
  windowId: number;
  title?: string;
  color: 'grey' | 'blue' | 'red' | 'yellow' | 'green' | 'pink' | 'purple' | 'cyan';
  collapsed?: boolean;
}
