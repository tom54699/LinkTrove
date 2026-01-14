# Design: Fix Drop Operation Redundant Renders

## Context

### 現狀問題
一次拖放操作觸發 3 次 `setItems()` 重渲染：

```
┌─────────────────────────────────────────────────────────────────┐
│ Drop Operation Timeline                                         │
├─────────────────────────────────────────────────────────────────┤
│ T+0ms   │ handleDrop START                                      │
│ T+26ms  │ setItems #1: actions.load() 主動呼叫                  │
│ T+249ms │ setItems #2: onChanged → debounce(200ms) → load()     │
│ T+740ms │ setItems #3: setTimeout(500ms) → saveWebpages → load()│
└─────────────────────────────────────────────────────────────────┘
```

### 觸發鏈條分析

```
GroupsView.onDropExistingCard
    │
    ├─→ actions.updateCategory()
    │       ├─→ service.updateWebpage()
    │       │       └─→ saveWebpages() ──→ chrome.storage.local.set
    │       │                                       │
    │       └─→ setItems() [直接更新]               │
    │                                               │
    ├─→ svc.updateCardSubcategory()                │
    │                                               │
    ├─→ actions.moveToEnd()                        │
    │       ├─→ service.moveWebpageToEnd()         │
    │       │       └─→ saveWebpages() ────────────┼─→ chrome.storage.local.set
    │       └─→ setItems() [直接更新]               │
    │                                               ▼
    └─→ actions.load() [多餘]          ←───── onChanged 監聽觸發
                                               (200ms debounce)
```

**問題核心**：每個 action 已經有 `setItems` 直接更新，但 `saveWebpages` 觸發的 `onChanged` 會再次 `load()`，造成重複。

## Goals / Non-Goals

### Goals
1. 將 3 次渲染減少為 1 次
2. 保持 UI 即時更新（不增加延遲）
3. 保持跨分頁同步功能（可接受極短暫延遲）
4. 不影響 import 功能

### Non-Goals
1. 不修改 `webpageService.ts` 的儲存邏輯
2. 不移除 `chrome.storage.onChanged` 監聽（需要保留跨分頁同步）
3. 不處理其他非 drop 相關的渲染優化

## Decisions

### Decision 1: 操作鎖定機制
**選擇**：使用 `useRef` 記錄最後操作時間戳，onChanged 監聽在鎖定窗口內跳過

**理由**：
- 最小改動，不影響現有邏輯
- useRef 不觸發重渲染
- 時間窗口可調整

**程式碼示意**：
```typescript
const operationLockRef = useRef<number>(0);

// 在 action 中設置鎖定
const updateCategory = useCallback(async (id, category) => {
  operationLockRef.current = Date.now();
  // ... 原有邏輯
}, []);

// onChanged 監聯中檢查
const onChanged = (changes, areaName) => {
  if (Date.now() - operationLockRef.current < 800) return; // 跳過
  // ... 原有邏輯
};
```

### Decision 2: 新增 moveCardToGroup action
**選擇**：在 WebpagesProvider 新增封裝好的 `moveCardToGroup` action

**理由**：
- 封裝完整的跨 group 移動邏輯
- GroupsView 不需要知道內部實作細節
- 使用 `service.moveCardToGroup` 返回值直接更新，避免額外 load()

**程式碼示意**：
```typescript
const moveCardToGroup = useCallback(async (cardId, categoryId, groupId, beforeId) => {
  operationLockRef.current = Date.now();
  const result = await service.moveCardToGroup(cardId, categoryId, groupId, beforeId);
  setItems(result.map(toCard));
}, [service]);
```

### Decision 3: 鎖定窗口時間
**選擇**：800ms

**計算依據**：
- `updateCategory` 的 setTimeout: 500ms
- onChanged debounce: 200ms
- Buffer: 100ms
- 總計: 800ms

**Alternatives considered**：
- 300ms（只處理前兩次）：不夠涵蓋 meta 補齊
- 1000ms：過長，可能影響跨分頁同步

### Decision 4: 不實作 pending 檢查
**選擇**：鎖定期間跳過的 onChanged 不記錄，不補執行

**理由**：
- 發生機率極低（需同時在兩分頁操作且在 800ms 內）
- 影響輕微（下次操作會同步）
- 減少程式碼複雜度

## Risks / Trade-offs

### Risk 1: 跨分頁同步延遲
**風險**：在 800ms 窗口內，如果另一個分頁有變更，本分頁會延遲同步

**Mitigation**：
- 機率極低（需要同時在兩個分頁操作）
- 延遲很短（最多 800ms）
- 下次任何操作都會觸發同步

### Risk 2: 操作失敗時的狀態不一致
**風險**：如果 `moveCardToGroup` 失敗，UI 可能顯示錯誤狀態

**Mitigation**：
- `service.moveCardToGroup` 有內建 rollback 機制
- 失敗時顯示 toast 提示
- 保留 onChanged 監聽作為最終同步保障

## Migration Plan

1. **Phase 1**: 修改 WebpagesProvider（新增 ref、action、修改監聽）
2. **Phase 2**: 修改 GroupsView（使用新 action、移除多餘 load）
3. **Phase 3**: 手動測試各種拖放場景
4. **Phase 4**: 執行現有測試確保無 regression

**Rollback**：如果發現問題，移除操作鎖定檢查即可恢復原行為
