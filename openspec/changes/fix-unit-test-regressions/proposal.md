# Bug Fix: Unit Test Regressions

## Change ID
`fix-unit-test-regressions`

## Status
Proposed

## Summary
修復目前 Vitest 測試中多個單元/整合測試失敗的項目，讓測試行為與現有功能規格保持一致，並恢復測試穩定性。

**約束**：本次變更僅允許修改「測試檔案」，不更動任何專案程式碼/實作。

## Problem Analysis
目前測試輸出顯示以下測試套件失敗（其餘皆通過）：

- `src/app/__tests__/drag_integration.test.tsx`（拖放從 TabsPanel 到 CardGrid）
- `src/app/__tests__/settings.import.test.tsx`（設定匯入成功/失敗提示）
- `src/app/groups/__tests__/GroupsView.delete.test.tsx`（刪除保護與錯誤處理）
- `src/app/groups/__tests__/drag-drop.ui.test.tsx`（拖放 UI legacy/atomic fallback）
- `src/app/ui/__tests__/feedback.test.tsx`（drop handler error toast）
- `src/app/webpages/__tests__/batch.test.tsx`（多選批次刪除）
- `src/app/webpages/__tests__/drop-behavior.positioning.test.tsx`（drop positioning）
- `src/app/webpages/__tests__/drop-insert.test.tsx`（drop insert before card）
- `src/app/webpages/__tests__/dropzone.test.tsx`（drop zone highlight + payload parse）
- `src/app/webpages/__tests__/tobylike-card.test.tsx`（TobyLikeCard 互動）

這些失敗集中在拖放、刪除保護、批次操作、匯入提示與卡片互動等 UI/行為層，顯示測試期望與近期實作或測試環境（mock/fixture）可能出現偏差。

## Solution
- 逐一對照現有行為與規格，釐清是實作回歸或測試期望過時。
- 修正必要的實作、測試或 mock/fixture，使行為一致且可重現。
- 若為規格變更導致的差異，先同步測試再補足說明。

## Verification
- [ ] 上述失敗測試全部通過（由使用者執行 Vitest）。
- [ ] 不影響其他既有測試套件的通過狀態。
- [ ] 針對拖放/刪除/匯入提示等關鍵行為進行基本手動驗證。
