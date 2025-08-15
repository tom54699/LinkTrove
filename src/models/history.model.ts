export interface History {
  id: string;
  timestamp: Date;
  type: string; // e.g., 'create', 'update', 'delete'
  affectedItemIds: string[];
}
