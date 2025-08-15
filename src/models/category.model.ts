export interface Category {
  id: string;
  name: string;
  parentId?: string;
  description?: string;
  icon?: string;
  color?: string;
  order: number;
}
