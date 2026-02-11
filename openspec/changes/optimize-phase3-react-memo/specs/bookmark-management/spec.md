# Phase 3: React.memo 優化 - 需求規格

## 概述

本規格定義 CardRow 組件方案的詳細需求，用於修正 Phase 2 遺留的 React.memo 失效問題。

---

## ADDED Requirements

### Requirement: CardRow 組件接收穩定的 handlers 並創建 inline callbacks
系統必須（SHALL）創建 CardRow 組件，接收穩定的 handler 函數作為 props，並在內部創建綁定 item.id 的 inline callbacks 傳給 TobyLikeCard。

#### Scenario: CardRow 接收穩定的 handler props
- **GIVEN** CardGrid 使用 useCallback 定義穩定的 handler 函數
- **WHEN** CardGrid render 時傳遞 handlers 給 CardRow
- **THEN** CardRow 接收的 props 包含穩定的函數引用
- **THEN** CardRow 的 props 在 CardGrid re-render 時保持不變（除非依賴項變化）

#### Scenario: CardRow 內部創建 inline callbacks
- **GIVEN** CardRow 接收穩定的 onToggleSelect handler
- **WHEN** CardRow render 時
- **THEN** CardRow 創建 `handleToggleSelect = useCallback(() => onToggleSelect(item.id), [item.id, onToggleSelect])`
- **THEN** handleToggleSelect 傳遞給 TobyLikeCard 的 onToggleSelect prop

#### Scenario: CardRow 使用 React.memo 包裹
- **GIVEN** CardRow 組件定義
- **WHEN** 查看組件導出
- **THEN** 組件使用 `React.memo()` 包裹
- **THEN** React.memo 使用 shallow comparison 或自訂 comparator 比較 props

#### Scenario: CardRow props 未變時不 re-render
- **GIVEN** CardRow 渲染在 CardGrid 中
- **GIVEN** CardRow 接收的 item 引用和 handlers 引用未變化
- **GIVEN** selected、ghost props 未變化
- **WHEN** CardGrid re-render（例如其他 state 更新）
- **THEN** React.memo comparison 判定 props 未變化
- **THEN** CardRow 不 re-render
- **THEN** TobyLikeCard 也不 re-render

#### Scenario: item 變化時 CardRow re-render
- **GIVEN** CardRow 渲染在 CardGrid 中
- **GIVEN** 使用者編輯某張卡片的標題
- **WHEN** item 對象引用變化（title 變更）
- **THEN** React.memo 判定 props 變化（item 引用不同）
- **THEN** CardRow re-render
- **THEN** TobyLikeCard 正確顯示新標題

---

### Requirement: CardGrid 保留未變更 item 的對象引用
系統必須（SHALL）在更新 items 時保留未變更卡片的對象引用，或使用自訂 comparator 只比較必要欄位。

#### Scenario: 編輯單張卡片時保留其他卡片引用
- **GIVEN** CardGrid 包含 100 張卡片
- **WHEN** 使用者編輯其中一張卡片（id=A）
- **THEN** 新的 items 陣列中，id=A 的 item 是新對象
- **THEN** 其他 99 張卡片的 item 對象引用保持不變（shallow equality 通過）

#### Scenario: CardRow 使用自訂 comparator（替代方案）
- **GIVEN** items 更新時可能整批重建對象
- **WHEN** CardRow 使用 React.memo 時
- **THEN** 提供自訂 comparator 函數
  ```typescript
  React.memo(CardRow, (prevProps, nextProps) => {
    return (
      prevProps.item.id === nextProps.item.id &&
      prevProps.item.title === nextProps.item.title &&
      prevProps.item.url === nextProps.item.url &&
      prevProps.item.description === nextProps.item.description &&
      prevProps.selected === nextProps.selected &&
      prevProps.ghost === nextProps.ghost &&
      prevProps.onToggleSelect === nextProps.onToggleSelect
      // ... 比較所有 handler 引用
    );
  });
  ```
- **THEN** 只在必要欄位變化時才 re-render

#### Scenario: 驗證 item 引用穩定性
- **GIVEN** 測試環境中
- **WHEN** 編輯卡片 A
- **THEN** 使用 Object.is(prevItems[1], nextItems[1]) 驗證卡片 B 引用未變
- **THEN** 使用 Object.is(prevItems[0], nextItems[0]) 驗證卡片 A 引用已變

---

### Requirement: CardGrid 使用 useCallback 穩定化所有 handlers
系統必須（SHALL）在 CardGrid 中使用 useCallback 包裹所有傳給 CardRow 的 handler 函數，確保引用穩定性。

#### Scenario: handleToggleSelect 穩定化
- **GIVEN** CardGrid 定義 handleToggleSelect
- **WHEN** 使用 useCallback 包裹
  ```typescript
  const handleToggleSelect = useCallback((id: string) => {
    toggleSelect(id);
  }, [toggleSelect]);
  ```
- **THEN** handleToggleSelect 依賴 toggleSelect
- **WHEN** toggleSelect 引用未變化
- **THEN** handleToggleSelect 引用保持不變（在 re-render 之間）

#### Scenario: handleOpen 包含正確邏輯
- **GIVEN** CardGrid 定義 handleOpen
- **WHEN** 使用 useCallback 包裹
  ```typescript
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
  ```
- **THEN** handleOpen 依賴 items
- **WHEN** 使用者點擊卡片
- **THEN** handleOpen 正確找到對應的 item
- **THEN** 使用 chrome.tabs.create 或 window.open 開啟 URL

#### Scenario: handleDelete 穩定化
- **GIVEN** CardGrid 定義 handleDelete
- **WHEN** 使用 useCallback 包裹
  ```typescript
  const handleDelete = useCallback((id: string) => {
    onDeleteOne?.(id);
  }, [onDeleteOne]);
  ```
- **THEN** handleDelete 依賴 onDeleteOne
- **WHEN** 使用者刪除卡片
- **THEN** handleDelete 正確調用 onDeleteOne(id)

#### Scenario: handleUpdate* 系列穩定化
- **GIVEN** CardGrid 定義 handleUpdateTitle, handleUpdateUrl, handleUpdateDescription, handleUpdateMeta
- **WHEN** 使用 useCallback 包裹各個 handler
- **THEN** 每個 handler 依賴對應的 onUpdate* prop
- **WHEN** 使用者編輯卡片欄位
- **THEN** 對應的 handler 正確調用 onUpdate*(id, value)

#### Scenario: handleModalOpenChange 穩定化
- **GIVEN** CardGrid 定義 handleModalOpenChange
- **WHEN** 使用 useCallback 包裹
  ```typescript
  const handleModalOpenChange = useCallback((open: boolean) => {
    setDragDisabled(open);
  }, []);
  ```
- **THEN** handleModalOpenChange 無外部依賴（setDragDisabled 是 setState）
- **WHEN** 卡片編輯 modal 開啟或關閉
- **THEN** handleModalOpenChange 正確調用 setDragDisabled(open)

#### Scenario: handleSave 包含 fallback 邏輯
- **GIVEN** CardGrid 定義 handleSave
- **WHEN** 使用 useCallback 包裹
  ```typescript
  const handleSave = useCallback((id: string, patch: any) => {
    const item = items.find(i => i.id === id);
    if (!item) return;
    if (onSave) {
      onSave(id, patch);
    } else {
      // fallback logic
      if (patch.title) onUpdateTitle?.(id, patch.title);
      if (patch.url) onUpdateUrl?.(id, patch.url);
      if (patch.description !== undefined) onEditDescription?.(id, patch.description);
      if (patch.meta) onUpdateMeta?.(id, patch.meta);
    }
  }, [items, onSave, onUpdateTitle, onUpdateUrl, onEditDescription, onUpdateMeta]);
  ```
- **THEN** handleSave 依賴 items 和所有 onUpdate* props
- **WHEN** 使用者保存卡片變更
- **THEN** handleSave 正確執行保存邏輯

---

### Requirement: CardGrid 渲染邏輯保持 drag wrapper 架構
系統必須（SHALL）修改 CardGrid 渲染邏輯，在 drag wrapper 內使用 CardRow 包裹 TobyLikeCard，保持現有的拖曳架構。

#### Scenario: Drag wrapper 包裹 CardRow
- **GIVEN** CardGrid 渲染 visibleNodes
- **WHEN** node.type === 'item'（一般卡片）
- **THEN** 渲染結構為：
  ```jsx
  <div
    draggable={!dragDisabled}
    onDragStart={handleCardDragStart}
    onDragEnd={handleCardDragEnd}
    onDragOver={handleDragOver}
    onDrop={handleDrop}
    onDragLeave={handleDragLeave}
  >
    <CardRow
      item={item}
      selected={!!selected[item.id]}
      ghost={false}
      onToggleSelect={handleToggleSelect}
      // ... 其他 handlers
    />
  </div>
  ```
- **THEN** drag 事件在 wrapper 上處理，不傳入 CardRow

#### Scenario: CardRow 正確 mapping TobyLikeCard props
- **GIVEN** CardRow 接收 item 對象
- **WHEN** CardRow 渲染 TobyLikeCard
- **THEN** 明確 mapping props：
  ```typescript
  <TobyLikeCard
    title={item.title}
    description={item.description}
    faviconUrl={item.favicon}  // 注意：item.favicon -> faviconUrl
    faviconText={/* 計算 faviconText */}
    url={item.url}
    categoryId={item.category}
    meta={item.meta || {}}
    createdAt={item.createdAt}
    updatedAt={item.updatedAt}
    selected={selected}
    ghost={ghost}
    onToggleSelect={handleToggleSelect}
    // ... 其他 handlers
  />
  ```
- **THEN** 避免使用 `{...item}` spread（因為欄位名稱不一致）

#### Scenario: Ghost 卡片直接使用 TobyLikeCard
- **GIVEN** CardGrid 渲染 visibleNodes
- **WHEN** node.type === 'ghost'（ghost 卡片）
- **THEN** 在 drag wrapper 內直接渲染 TobyLikeCard
- **THEN** 不使用 CardRow 包裹（ghost 卡片不需要 memo）

#### Scenario: CardRow key 使用 item.id
- **GIVEN** CardGrid 渲染 items
- **WHEN** 渲染 CardRow
- **THEN** drag wrapper 使用 `key={item.id}` 確保 React 正確識別
- **THEN** 避免不必要的 mount/unmount

---

### Requirement: 非相關卡片在編輯操作下不 re-render
系統必須（SHALL）在使用者編輯單張卡片時，非相關卡片不 re-render，除非 selected/items identity 變化。

#### Scenario: 編輯標題時只有目標卡片 re-render
- **GIVEN** CardGrid 包含 100 張卡片
- **GIVEN** 所有卡片已用 CardRow 包裹（含 React.memo）
- **GIVEN** selected={}, items 引用穩定
- **WHEN** 使用者編輯其中一張卡片的標題
- **THEN** 只有被編輯的卡片 re-render（item 引用變化）
- **THEN** 其他 99 張卡片不 re-render（props 未變化）

#### Scenario: selected 變化時只有相關卡片 re-render
- **GIVEN** CardGrid 包含 100 張卡片
- **WHEN** 使用者選取其中 1 張卡片
- **THEN** 只有被選取的卡片 re-render（selected: false → true）
- **THEN** 工具欄 re-render（selectedCount 變化，不影響卡片）
- **THEN** 其他 99 張卡片不 re-render

#### Scenario: items 引用變化時所有卡片可能 re-render
- **GIVEN** CardGrid 包含 100 張卡片
- **WHEN** items 陣列引用變化但內容未變（例如 items.map 產生新陣列）
- **THEN** 如果使用自訂 comparator，根據欄位比較決定是否 re-render
- **THEN** 如果未使用自訂 comparator，item 引用相同的卡片不 re-render

---

### Requirement: Phase 2 優化保持運作
系統必須（SHALL）確保 Phase 2 的所有優化在 Phase 3 後仍正常運作，無 regression。

#### Scenario: GroupsView useMemo 仍運作
- **GIVEN** Phase 3 優化完成
- **WHEN** GroupsView 渲染包含多個 groups 的列表
- **THEN** useMemo 正確預先分組 items
- **THEN** 複雜度保持 O(n)（不退化為 O(n×g)）

#### Scenario: CardGrid selected 計算 memo 仍運作
- **GIVEN** Phase 3 優化完成
- **WHEN** CardGrid render 時
- **THEN** selectedCount, selectedIds, selectedIdsOrdered 使用 useMemo
- **THEN** 不在每次 render 時重新計算

#### Scenario: RAF 節流仍運作
- **GIVEN** Phase 3 優化完成
- **GIVEN** CardGrid 包含 500 張卡片（超過閾值 300）
- **WHEN** 使用者拖曳卡片
- **THEN** RAF 節流生效
- **THEN** 拖曳流暢度保持 50-60 FPS

---

### Requirement: 功能完全保持不變
系統必須（SHALL）在優化後保持所有卡片互動功能正常運作。

#### Scenario: 選取功能正常
- **GIVEN** Phase 3 優化完成
- **WHEN** 使用者點擊卡片 checkbox
- **THEN** 卡片選取狀態正確切換
- **THEN** 工具欄顯示正確的 selectedCount

#### Scenario: 開啟卡片功能正常
- **GIVEN** Phase 3 優化完成
- **WHEN** 使用者點擊卡片
- **THEN** 卡片正確開啟在新分頁
- **WHEN** 使用者 Ctrl+點擊卡片
- **THEN** 卡片在背景開啟

#### Scenario: 刪除功能正常
- **GIVEN** Phase 3 優化完成
- **WHEN** 使用者點擊刪除按鈕
- **THEN** 卡片正確從列表中移除

#### Scenario: 編輯功能正常
- **GIVEN** Phase 3 優化完成
- **WHEN** 使用者編輯卡片標題/URL/描述並保存
- **THEN** 變更成功保存到 storage
- **THEN** 卡片顯示新內容

#### Scenario: Modal 與拖曳互動正常
- **GIVEN** Phase 3 優化完成
- **WHEN** 使用者開啟編輯 modal
- **THEN** modal 正確顯示
- **THEN** 拖曳功能正確禁用（dragDisabled = true）
- **WHEN** 使用者關閉 modal
- **THEN** 拖曳功能正確恢復（dragDisabled = false）
