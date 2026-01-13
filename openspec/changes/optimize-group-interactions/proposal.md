# Proposal: Optimize Group Interactions

## Change ID
`optimize-group-interactions`

## Status
Proposed

## Summary
優化 Group 的互動體驗，包括解決刪除時的視覺跳動問題，以及提升操作按鈕的可見度。

## Motivation
1.  **刪除跳動**：目前刪除 Group 時，會先關閉對話框，等待 API 回應後才移除 DOM，導致視覺上有「停頓後消失」的不自然感。
2.  **按鈕不明顯**：Group 標題列右側的「⋯」設定按鈕顏色過淡，使用者難以發現。

## Scope
### 1. GroupsView.tsx
- **Optimistic Delete**: 在 `remove` 函數中，點擊確認後立即更新本地 `groups` state，再非同步呼叫刪除 API。
- **Button Styling**: 將 Group Header 的「⋯」按鈕樣式改為 `text-[var(--accent)]` 或增加 hover 背景，使其更顯眼。

## Risks
- **樂觀更新失敗**：若 API 刪除失敗，需要有 rollback 機制或重新載入資料以確保 UI 與資料庫一致（目前的 `load()` 機制已涵蓋此點）。

## References
- Component: `src/app/groups/GroupsView.tsx`
