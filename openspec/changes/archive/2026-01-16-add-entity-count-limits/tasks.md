# Tasks: add-entity-count-limits

## Task List

- [x] 1. 在 `storage.ts` 添加 `ENTITY_LIMITS` 常量定義
- [x] 2. 在 `createOrganization` 函數添加數量檢查（max 8）
- [x] 3. 在 `addCategory` 函數添加數量檢查（max 20 per org）
- [x] 4. 在 `createSubcategory` 函數添加數量檢查（max 50 per category）
- [x] 5. 在 `App.tsx` 添加 Organization UI 錯誤提示
- [x] 6. 在 `App.tsx` 添加 Category UI 錯誤提示
- [x] 7. 在 `GroupsView.tsx` 添加 Group UI 錯誤提示
- [x] 8. 撰寫單元測試 `entity-limits.test.ts`

## Dependencies
- 任務 2-4 可平行執行（storage 層）
- 任務 5-7 可平行執行（UI 層）
- 任務 5-7 依賴任務 1-4 完成

## Validation
- [x] `npm run build` 編譯成功
- [x] 單元測試通過（10 tests）
- [x] UI 操作測試：嘗試創建超過上限的實體，確認出現 toast 提示
