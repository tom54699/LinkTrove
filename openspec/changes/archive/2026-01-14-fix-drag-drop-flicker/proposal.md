# Bug Fix: Drag-Drop Card Flicker

## Change ID
`fix-drag-drop-flicker`

## Status
Complete

## Why
在 GroupsView 中拖放卡片放開後，背景與卡片會產生明顯的閃爍或跳動。這是因為 CardGrid 的 `handleDrop` 在 `onDropExistingCard` async 操作完成前就清除了 ghost 狀態，導致卡片會短暫「跳回」原位置，然後資料更新後又移到新位置。

## Problem Analysis

### Root Cause
在 `src/app/webpages/CardGrid.tsx` 的 `handleDrop` 中：

```typescript
onDropExistingCard?.(fromId, beforeId);  // async，但沒有 await

// Cleanup 立刻執行，不等 async 完成
setGhostTab(null);
setGhostType(null);
// ...
broadcastGhostActive(null);  // 卡片立刻顯示在原位置
```

### Timeline (修復前)
```
T+0ms   handleDrop START
T+1ms   calling onDropExistingCard (async, 不等待)
T+2ms   clearing ghost state ← 問題！卡片「跳回」原位置
T+30ms  onDropExistingCard 完成，資料更新
        → 卡片又移到新位置
        → 視覺閃動
```

## What Changes
- **Modified**: `src/app/webpages/CardGrid.tsx` - `handleDrop` 函數
  - 使用 `await` 等待 `onDropExistingCard` 完成
  - 使用 `try-finally` 確保 ghost 清理一定執行（即使 async 拋異常）

## Solution

```typescript
// 修復後
try {
  await onDropExistingCard?.(fromId, beforeId);
} finally {
  // Cleanup - 確保 ghost 一定會清理
  setGhostTab(null);
  setGhostType(null);
  setGhostIndex(null);
  setDraggingCardId(null);
  setIsOver(false);
  broadcastGhostActive(null);
}
```

### Timeline (修復後)
```
T+0ms   handleDrop START
T+1ms   calling onDropExistingCard (await)
T+30ms  onDropExistingCard 完成
T+30ms  clearing ghost state ← 正確時機
        → 無閃動
```

## Impact
- Affected specs: `drag-drop`
- Affected code: `src/app/webpages/CardGrid.tsx:handleDrop`

## Verification
- [x] 拖放卡片不再閃動
- [x] Ghost 預覽正常顯示
- [x] 錯誤情況下 ghost 仍會正確清理（try-finally）

## Known Limitations
此修復僅處理閃動問題。仍存在重複渲染的性能問題（一次 drop 觸發 3 次 `setItems`），可在後續優化中處理。
