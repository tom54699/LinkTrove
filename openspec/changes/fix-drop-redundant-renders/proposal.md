# Change: Fix Drop Operation Redundant Renders

## Why
一次拖放操作會觸發 3 次 `setItems()` 重渲染，造成不必要的性能開銷和潛在的 UI 閃爍問題。

**Log 證據：**
```
T+0ms   handleDrop START
T+26ms  [WP] setItems() ← 第1次：actions.load() 主動調用
T+249ms [WP] setItems() ← 第2次：storage.onChanged 200ms debounce
T+740ms [WP] setItems() ← 第3次：updateCategory 的 500ms setTimeout meta 補齊
```

**根本原因：**
1. `storageService` 沒有 `moveCardToGroup`，導致 GroupsView 走 fallback 路徑
2. Fallback 呼叫 `updateCategory`、`moveToEnd`、`reorder` 等 action
3. 這些 action 都會：a) 直接 `setItems` 更新 UI，b) 呼叫 `saveWebpages` 觸發 `chrome.storage.onChanged`
4. `onChanged` 監聽再次觸發 `load()`，造成重複渲染
5. Drop 完成後又主動呼叫 `actions.load()`，再次重複

## What Changes
- 在 `WebpagesProvider` 新增操作鎖定機制（`operationLockRef`）
- 新增 `actions.moveCardToGroup` 封裝完整的跨 group 移動邏輯
- 現有 `updateCategory`、`reorder`、`moveToEnd` 等 action 設置操作鎖定
- 修改 `chrome.storage.onChanged` 監聽，在鎖定期間跳過 load
- GroupsView 使用新的 `actions.moveCardToGroup`，移除多餘的 `actions.load()`

## Impact
- **Affected specs**: drag-drop
- **Affected code**:
  - `src/app/webpages/WebpagesProvider.tsx` - 新增操作鎖定和 moveCardToGroup action
  - `src/app/groups/GroupsView.tsx` - 使用新 action，移除多餘 load()
- **Performance**: 3 次渲染減少為 1 次
- **Risk**: 800ms 鎖定窗口內的跨分頁同步會延遲（機率極低）
