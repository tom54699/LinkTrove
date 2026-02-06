# Change: 修正 Tab 拖放時 Ghost 被 Meta Enrichment 阻塞

## Why
當啟用「儲存後關閉分頁」設定時，從 Open Tabs 拖曳分頁新增卡片後，Ghost 預覽會等到 meta enrichment 完成（最多 8+ 秒）才消失。這導致糟糕的使用者體驗：卡片已經出現在目標位置，但 Ghost 仍然顯示，直到 meta 抓取完成才消失。

## Root Cause
`handleDrop` 的 Ghost 清理邏輯位於 `finally` 塊中，必須等待 `await onDropTab()` 完成：
```
handleDrop → await onDropTab() → await addFromTab({ waitForMeta: true })
                                       ↓
                                 await enrichmentPromise (8+ 秒)
                                       ↓
                                 onDropTab 返回
                                       ↓
                                 finally: 清理 Ghost
```

## What Changes
- 修改 `CardGrid.tsx` 的 `handleDrop` 邏輯：在計算完 `beforeId` 後，**先清理 Ghost 狀態**，再執行 `await onDropTab()`
- 這樣 Ghost 會立即消失，meta enrichment 和關閉分頁會在背景繼續執行
- 同時適用於現有卡片拖放（`onDropExistingCard`）以保持一致性

## Safety Analysis

### 不受影響的功能

| 功能 | 原因 |
|------|------|
| beforeId 計算 | 在清理之前完成，仍可正確讀取 `ghostBeforeRef` 和 `ghostIndex` |
| DOM 查詢 ghost 位置 | 在清理之前完成，ghost 仍在 DOM 中 |
| 跨 group 拖曳 | `setDragWebpage(null)` 仍會觸發 `lt:ghost-clear` 廣播，通知其他 CardGrid |
| 錯誤處理 | 如果 async 操作失敗，toast 仍會顯示，ghost 已被清理（合理行為） |
| 渲染邏輯 | 清理狀態後，`ghostTab/ghostType/ghostIndex` 為 null，ghost 不再渲染 |

### 修改後的時序

```
修改前：
1. 計算 beforeId（讀取 ghostBeforeRef, ghostIndex）
2. await onDropTab/onDropExistingCard（可能等 8+ 秒）
3. finally 清理 ghost 狀態
4. 下一次 render：ghost 消失

修改後：
1. 計算 beforeId（讀取 ghostBeforeRef, ghostIndex）
2. 清理 ghost 狀態 + 廣播
3. 下一次 render：ghost 立即消失
4. await onDropTab/onDropExistingCard（背景執行）
```

### 重複清理無害

`lt:ghost-clear` 廣播會觸發本地 `onGhostClear` 再次執行，但設置 null 狀態多次是無害的。

## Impact
- Affected specs: `drag-drop`
- Affected code:
  - `src/app/webpages/CardGrid.tsx:582-704` - handleDrop 函數
