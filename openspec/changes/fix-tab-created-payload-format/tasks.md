# Implementation Tasks

## 1. 程式碼修改
- [x] 1.1 將 `background.ts` 中的 `tabToPayload` 函數提取為共用函數（在 `tabsManager.ts` 內部定義 `formatTab`）
- [x] 1.2 修改 `tabsManager.ts` 的 `created` 事件，使用 `formatTab` 轉換 payload
- [x] 1.3 檢查並修復 `updated` 事件的欄位格式（已有正確轉換邏輯，無需修復）
- [x] 1.4 檢查並修復 `replaced` 事件的欄位格式（已修復 `OpenTabsProvider.tsx`）

## 2. 測試驗證
- [ ] 2.1 手動測試：開啟新分頁，確認立即顯示在 Open Tabs 區域
- [ ] 2.2 手動測試：開啟新分頁到分頁群組，確認正確歸類到群組中
- [ ] 2.3 手動測試：快速開啟多個分頁，確認全部正確顯示
- [ ] 2.4 檢查 console 無錯誤訊息

## 3. 程式碼品質
- [x] 3.1 執行 `npm run lint` 確保無警告（無新增警告）
- [x] 3.2 執行 `npm run build` 確保編譯成功
- [ ] 3.3 在 Chrome 載入擴充功能，確認運作正常
