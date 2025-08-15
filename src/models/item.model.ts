export interface Item {
  id: string;              // UUID
  title: string;           // Required
  url?: string;            // Unique constraint
  coverUrl?: string;
  description?: string;
  categoryPath: string[];  // Multi-level category path
  tags: string[];          // Tag array
  customFields: Record<string, any>; // Custom field values
  createdAt: Date;
  updatedAt: Date;
  isPrivate: boolean;      // Item privacy
}
