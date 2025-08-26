import React, { createContext, useContext, useMemo, useState } from 'react';

export interface Category {
  id: string;
  name: string;
  color: string;
  order: number;
}

interface CategoriesState {
  categories: Category[];
  selectedId: string; // 'all' or category id
  setCurrentCategory: (id: string) => void;
}

const Ctx = createContext<CategoriesState | null>(null);

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'default', name: 'Default', color: '#64748b', order: 0 },
];

export const CategoriesProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [categories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [selectedId, setSelectedId] = useState<string>('all');

  const value = useMemo(
    () => ({ categories, selectedId, setCurrentCategory: setSelectedId }),
    [categories, selectedId]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export function useCategories(): CategoriesState {
  const v = useContext(Ctx);
  if (!v) throw new Error('CategoriesProvider missing');
  return v;
}
