# Phase 3: React.memo 修正 - CardRow 子元件方案

**變更 ID**: `optimize-phase3-react-memo`
**狀態**: Ready for Implementation
**作者**: Claude Sonnet 4.5
**日期**: 2026-02-11
**優先級**: High

---

## 摘要

修正 Phase 2 遺留的 React.memo 失效問題，透過抽取 `CardRow` 子元件來穩定化 callbacks 引用，使 React.memo 真正生效。

**修正方案**: 抽取 `CardRow` 子元件 + React.memo
**預期效益**: 編輯單張卡片時，其他卡片不 re-render（React DevTools Profiler 可驗證）

---

## 背景

### Phase 2 遺留問題：React.memo 完全失效

**Phase 2 實作**：
```typescript
// TobyLikeCard.tsx (已完成)
export const TobyLikeCard = React.memo<TobyLikeCardProps>(function TobyLikeCard({
  // ...
}) {
  // ...
});
```

**Phase 2 問題**：
```typescript
// CardGrid.tsx (問題所在)
{items.map(item => (
  <TobyLikeCard
    onToggleSelect={() => handleToggleSelect(item.id)}  // ❌ 每次新函數
    onOpen={(opts) => handleOpen(item.id, opts)}        // ❌ 每次新函數
    onDelete={() => handleDelete(item.id)}              // ❌ 每次新函數
    // ... 8 個 inline callbacks
  />
))}
```

**問題核心**：
- 即使 `handleToggleSelect` 是穩定的（Phase 2 可能用 useCallback），外層的 `() => handleToggleSelect(item.id)` 仍是每次新建的
- **每次 CardGrid re-render → 800 個新函數引用（100 卡 × 8 callbacks）→ React.memo 失效**

---

## 解決方案：CardRow 子元件

### 核心思路

**將 inline callback 的創建移到子元件內部**：
- 父組件（CardGrid）傳入穩定的 handler 函數
- 子組件（CardRow）內部創建 inline callbacks
- CardRow 用 React.memo 包裹，只在 `item` 或 `handlers` 變化時 re-render

### 實作設計

#### 1. 新增 CardRow 子元件

```typescript
// src/app/webpages/CardRow.tsx (新文件)
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

// 注意：drag 相關 props（dragDisabled, onDragStart, onDragEnd）
// 不傳入 CardRow，而是在 CardGrid 的 drag wrapper 上處理

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
 * - item 對象在沒有變化時也是穩定的
 * - 因此 React.memo 可以正確比較 props，避免 re-render
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
      faviconUrl={item.favicon}  // 注意：item.favicon -> faviconUrl
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
```

#### 2. 修改 CardGrid 使用 CardRow

```typescript
// src/app/webpages/CardGrid.tsx
import { CardRow } from './CardRow';

// ... 在 CardGrid 組件內

// 定義穩定的 handler 函數（使用 useCallback）
const handleToggleSelect = useCallback((id: string) => {
  toggleSelect(id);
}, [toggleSelect]);

const handleOpen = useCallback((id: string, opts?: { ctrlKey?: boolean }) => {
  const item = items.find(i => i.id === id);
  if (!item) return;

  try {
    const openInBackground = opts?.ctrlKey ?? false;
    if (chrome?.tabs?.create) {
      chrome.tabs.create({ url: item.url, active: !openInBackground });
    } else {
      window.open(item.url, '_blank');
    }
  } catch {}
}, [items]);

const handleDelete = useCallback((id: string) => {
  onDeleteOne?.(id);
}, [onDeleteOne]);

const handleUpdateTitle = useCallback((id: string, value: string) => {
  onUpdateTitle?.(id, value);
}, [onUpdateTitle]);

const handleUpdateUrl = useCallback((id: string, value: string) => {
  onUpdateUrl?.(id, value);
}, [onUpdateUrl]);

const handleUpdateDescription = useCallback((id: string, value: string) => {
  onEditDescription?.(id, value);
}, [onEditDescription]);

const handleUpdateMeta = useCallback((id: string, meta: Record<string, string>) => {
  onUpdateMeta?.(id, meta);
}, [onUpdateMeta]);

const handleSave = useCallback((id: string, patch: any) => {
  const item = items.find(i => i.id === id);
  if (!item) return;

  if (onSave) {
    onSave(id, patch);
  } else {
    // fallback logic...
  }
}, [items, onSave]);

// 渲染時使用 CardRow（保持 drag wrapper 架構）
{visibleNodes.map((node) => {
  if (node.type === 'ghost') {
    // Ghost 卡片直接渲染（不需要 memo）
    return (
      <div key="ghost" /* drag wrapper 省略 */>
        <TobyLikeCard {...ghostProps} />
      </div>
    );
  }

  const item = node.item as WebpageCardData;

  return (
    <div
      key={item.id}
      draggable={!dragDisabled}
      onDragStart={handleCardDragStart}
      onDragEnd={handleCardDragEnd}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onDragLeave={handleDragLeave}
      /* 其他 drag wrapper 屬性 */
    >
      <CardRow
        item={item}
        selected={!!selected[item.id]}
        ghost={false}
        onToggleSelect={handleToggleSelect}  // ✅ 穩定引用
        onOpen={handleOpen}                  // ✅ 穩定引用
        onDelete={handleDelete}              // ✅ 穩定引用
        onUpdateTitle={handleUpdateTitle}    // ✅ 穩定引用
        onUpdateUrl={handleUpdateUrl}        // ✅ 穩定引用
        onUpdateDescription={handleUpdateDescription}  // ✅ 穩定引用
        onUpdateMeta={handleUpdateMeta}      // ✅ 穩定引用
        onModalOpenChange={setDragDisabled}  // ✅ 穩定引用（useState setter）
        onSave={handleSave}                  // ✅ 穩定引用
      />
    </div>
  );
})}
```

---

## 關鍵需求：Item 引用穩定性

### 問題：Item 對象重建導致 React.memo 失效

即使 CardRow 正確實作，**如果 items 更新時整批重建對象（例如 `items.map(...)` 產生新物件）**，React.memo 仍會失效。

### 解決方案 A：保留未變更 item 的引用（推薦）

```typescript
// 在更新 items 的地方（例如 WebpagesProvider）
const updateItem = (id: string, patch: Partial<WebpageCardData>) => {
  setItems(prev => prev.map(item =>
    item.id === id
      ? { ...item, ...patch }  // 只有被編輯的 item 是新對象
      : item                    // 其他 item 保持原引用 ✅
  ));
};
```

### 解決方案 B：使用自訂 Comparator

```typescript
export const CardRow = React.memo<CardRowProps>(
  function CardRow({ item, selected, ghost, ...handlers }) {
    // ... 實作
  },
  (prevProps, nextProps) => {
    // 自訂比較邏輯：只比較必要欄位
    return (
      prevProps.item.id === nextProps.item.id &&
      prevProps.item.title === nextProps.item.title &&
      prevProps.item.url === nextProps.item.url &&
      prevProps.item.description === nextProps.item.description &&
      prevProps.item.favicon === nextProps.item.favicon &&
      prevProps.selected === nextProps.selected &&
      prevProps.ghost === nextProps.ghost &&
      prevProps.onToggleSelect === nextProps.onToggleSelect
      // ... 比較所有 handler 引用
    );
  }
);
```

**選擇建議**：
- **方案 A** 更符合 React 最佳實踐（保持引用穩定）
- **方案 B** 作為 fallback（當無法控制 items 更新邏輯時）

---

## 效果驗證

### Before (Phase 2)
```
編輯卡片 A
→ CardGrid re-render
→ 所有 TobyLikeCard 收到新 callbacks
→ React.memo 判定 props 變化
→ 100 張卡片全部 re-render ❌
```

### After (Phase 3)
```
編輯卡片 A
→ CardGrid re-render
→ 所有 CardRow 收到穩定的 handlers
→ React.memo 判定 props 未變（除了卡片 A）
→ 只有卡片 A re-render ✅
→ 其他 99 張卡片顯示 "Did not render"

例外情況（符合預期）：
- selected 變化時，相關卡片 re-render
- items 陣列引用變化時，根據 comparator 決定是否 re-render
```

---

## 效果驗證（詳細）

### Before (Phase 2)
```
編輯卡片 A
→ CardGrid re-render
→ 所有 TobyLikeCard 收到新 callbacks
→ React.memo 判定 props 變化
→ 100 張卡片全部 re-render ❌
```

### After (Phase 3)
```
編輯卡片 A
→ CardGrid re-render
→ 所有 CardRow 收到穩定的 handlers
→ React.memo 判定 props 未變（除了卡片 A）
→ 只有卡片 A re-render ✅
→ 其他 99 張卡片顯示 "Did not render"
```

---

## 風險評估

**風險等級**: 低

**潛在風險**:
1. 多一層組件包裹（CardRow）
   - **影響**: 可忽略（React 組件包裹開銷極小）
2. useCallback 依賴項管理
   - **緩解**: eslint-plugin-react-hooks 自動檢查

**測試策略**:
- React DevTools Profiler 驗證 re-render 減少
- 手動測試所有卡片互動功能
- 單元測試驗證 handlers 正確調用

---

## 成功指標

### 核心目標
✅ **編輯單張卡片時，非相關卡片不 re-render**（除非 selected/items identity 變化）

### 驗收條件
1. ✅ React DevTools Profiler 顯示非相關卡片 "Did not render"
2. ✅ 所有卡片互動功能正常（選取、開啟、刪除、編輯）
3. ✅ Phase 2 優化無 regression（useMemo、RAF 節流仍運作）
4. ✅ eslint 無 exhaustive-deps 警告
5. ✅ TypeScript 編譯通過

**詳細測量方法與任務清單**：見 `tasks.md`

---

## 相關議題

- Phase 2: `optimize-phase2-conservative` (已完成)
- Phase 3A: `optimize-phase3-high-value` (已廢棄，原因見下方附註)

---

## 附註

### 為什麼不直接修改 TobyLikeCard props？
- 方案 B（調整 TobyLikeCard props 接收 `id`）需要大量修改 TobyLikeCard 內部邏輯
- CardRow 方案對現有代碼影響最小，只需添加一個新文件
- CardRow 提供了清晰的責任分離（props 轉換層）

### Phase 3A 高價值優化方案為何廢棄？
**原提案**: `optimize-phase3-high-value` 包含兩項優化：
1. React.memo 修正（useCallback 方案）
2. Share 流程掃描優化

**廢棄原因**:
1. **React.memo 修正方案不足**: 原提案使用 useCallback 但仍在 render 中用 inline arrow 轉接，無法解決根本問題
2. **Share 優化基於錯誤假設**: 實際代碼調查顯示不存在"雙重掃描"問題
   - 用戶只點擊一個按鈕（Gist 或 HTML，二擇一）
   - `generateBooklistHTML` 是純同步字串拼接，無效能瓶頸
   - 不存在 meta enrichment 冗餘

**重新設計**:
- 本提案（`optimize-phase3-react-memo`）採用 CardRow 組件方案，正確解決 React.memo 失效問題
- Share 優化已移除（無實際需求）

**文檔處理**:
- `openspec/changes/optimize-phase3-high-value/` 保留作為歷史記錄
- 不建議實施該方案
