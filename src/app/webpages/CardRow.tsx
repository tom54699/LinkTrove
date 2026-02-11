import React from 'react';
import { TobyLikeCard } from './TobyLikeCard';
import type { WebpageCardData } from './WebpageCard';

interface CardRowProps {
  item: WebpageCardData;
  selected: boolean;
  ghost: boolean;

  // 穩定的 handler 函數（由 CardGrid 提供）
  onToggleSelect: (id: string) => void;
  onOpen: (id: string, opts?: { ctrlKey?: boolean }) => void;
  onDelete: (id: string) => void;
  onUpdateTitle: (id: string, value: string) => void;
  onUpdateUrl: (id: string, value: string) => void;
  onUpdateDescription: (id: string, value: string) => void;
  onUpdateMeta: (id: string, meta: Record<string, string>) => void;
  onModalOpenChange: (open: boolean) => void;
  onSave: (id: string, patch: any) => void;
}

/**
 * CardRow: TobyLikeCard 的 memoized 包裹組件
 *
 * 目的：
 * - 接收穩定的 handler 函數作為 props
 * - 在內部創建 inline callbacks（將 item.id 綁定到 handlers）
 * - 使用 React.memo 避免不必要的 re-render
 *
 * 為什麼這樣有效：
 * - CardGrid 傳入的 handlers 是穩定的（useCallback）
 * - item 對象在沒有變化時也是穩定的（引用相同）
 * - 因此 React.memo 可以正確比較 props，避免 re-render
 *
 * 注意：
 * - drag 相關 props（dragDisabled, onDragStart, onDragEnd）不傳入此組件
 * - 這些 props 在 CardGrid 的 drag wrapper 上處理
 */
export const CardRow = React.memo<CardRowProps>(function CardRow({
  item,
  selected,
  ghost,
  onToggleSelect,
  onOpen,
  onDelete,
  onUpdateTitle,
  onUpdateUrl,
  onUpdateDescription,
  onUpdateMeta,
  onModalOpenChange,
  onSave,
}) {
  // 在子元件內部創建 inline callbacks
  // 這些 callbacks 只在 CardRow re-render 時重新創建
  // 由於 CardRow 被 memo，只有在 props 真正變化時才 re-render
  const handleToggleSelect = React.useCallback(() => {
    onToggleSelect(item.id);
  }, [item.id, onToggleSelect]);

  const handleOpen = React.useCallback((opts?: { ctrlKey?: boolean }) => {
    onOpen(item.id, opts);
  }, [item.id, onOpen]);

  const handleDelete = React.useCallback(() => {
    onDelete(item.id);
  }, [item.id, onDelete]);

  const handleUpdateTitle = React.useCallback((value: string) => {
    onUpdateTitle(item.id, value);
  }, [item.id, onUpdateTitle]);

  const handleUpdateUrl = React.useCallback((value: string) => {
    onUpdateUrl(item.id, value);
  }, [item.id, onUpdateUrl]);

  const handleUpdateDescription = React.useCallback((value: string) => {
    onUpdateDescription(item.id, value);
  }, [item.id, onUpdateDescription]);

  const handleUpdateMeta = React.useCallback((meta: Record<string, string>) => {
    onUpdateMeta(item.id, meta);
  }, [item.id, onUpdateMeta]);

  const handleSave = React.useCallback((patch: any) => {
    onSave(item.id, patch);
  }, [item.id, onSave]);

  // 計算 faviconText（從 URL 提取前兩個字符）
  const faviconText = (item.url || '')
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .slice(0, 2)
    .toUpperCase() || 'WW';

  return (
    <TobyLikeCard
      title={item.title}
      description={item.description}
      faviconUrl={item.favicon}
      faviconText={faviconText}
      url={item.url}
      categoryId={item.category}
      meta={item.meta || {}}
      createdAt={item.createdAt}
      updatedAt={item.updatedAt}
      selected={selected}
      ghost={ghost}
      onToggleSelect={handleToggleSelect}
      onOpen={handleOpen}
      onDelete={handleDelete}
      onUpdateTitle={handleUpdateTitle}
      onUpdateUrl={handleUpdateUrl}
      onUpdateDescription={handleUpdateDescription}
      onUpdateMeta={handleUpdateMeta}
      onModalOpenChange={onModalOpenChange}
      onSave={handleSave}
    />
  );
});
