# Bug Fix: Group Highlight Stuck After Drop

## Change ID
`fix-group-highlight-stuck`

## Status
Proposed

## Summary
修復在 `CardGrid` 內完成拖放 (Drop) 操作後，父層 `GroupsView` 的群組高亮框框 (Highlight Ring) 依然殘留的問題。

## Problem Analysis
1.  **高亮機制**：`GroupsView` 使用 `activeDropGroupId` 狀態來控制哪個群組應顯示高亮邊框。
2.  **事件衝突**：`CardGrid` 的 `handleDrop` 函數為了防止重複處理，呼叫了 `e.stopPropagation()`。
3.  **狀態未清除**：由於事件被阻止冒泡，`GroupsView` 綁定在 `<section>` 上的 `onDrop` 處理器（原本負責執行 `setActiveDropGroupId(null)`）不會被觸發。
4.  **結果**：當拖曳結束後，即使資料已更新，UI 仍保持高亮狀態，造成視覺誤導。

## Solution
在 `GroupsView.tsx` 中，於傳遞給 `CardGrid` 的兩個關鍵回調函數 `onDropTab` 與 `onDropExistingCard` 的實作中，顯式加入 `setActiveDropGroupId(null)`。

這樣無論事件是否冒泡，只要 Drop 邏輯開始執行，高亮狀態就會被清除。

## Verification
- [ ] 拖曳分頁 (Tab) 到 CardGrid 後，高亮消失。
- [ ] 拖曳現有卡片 (Existing Card) 到 CardGrid 後，高亮消失。
- [ ] 跨群組拖曳移動後，原群組與目標群組的高亮皆正常重置。
