# Tasks: Fix Unit Test Regressions

## Implementation
- [x] 1.1 盤點拖放相關測試失敗（`drag_integration`, `drag-drop.ui`, `drop-behavior.positioning`, `drop-insert`, `dropzone`），對齊拖放事件處理、legacy/atomic fallback 與 drop payload 解析。
- [x] 1.2 修正設定匯入流程與提示（`settings.import`），確保成功/失敗 toast 觸發條件一致。
- [x] 1.3 修正 `GroupsView` 刪除保護與錯誤處理（`GroupsView.delete`），包含最後一個群組保護與級聯刪除行為。
- [x] 1.4 修正 drop handler throw 時的提示邏輯（`feedback`）。
- [x] 1.5 修正多選批次刪除流程（`batch`）。
- [x] 1.6 修正 `TobyLikeCard` 互動行為（選取模式、編輯 modal、關閉行為）。
- [x] 1.7 本次修正僅修改測試檔案，不改動專案實作。

## Verification
- [ ] 由使用者執行 Vitest：`src/app/__tests__/drag_integration.test.tsx`。
- [ ] 由使用者執行 Vitest：`src/app/groups/__tests__/drag-drop.ui.test.tsx` 與 `src/app/webpages/__tests__/dropzone.test.tsx`。
- [ ] 由使用者執行 Vitest：`src/app/__tests__/settings.import.test.tsx`、`src/app/groups/__tests__/GroupsView.delete.test.tsx`、`src/app/ui/__tests__/feedback.test.tsx`、`src/app/webpages/__tests__/batch.test.tsx`、`src/app/webpages/__tests__/drop-behavior.positioning.test.tsx`、`src/app/webpages/__tests__/drop-insert.test.tsx`、`src/app/webpages/__tests__/tobylike-card.test.tsx`。
