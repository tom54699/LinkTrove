# Tasks: 儲存分頁後自動關閉功能

## 1. 設定功能
- [x] 1.1 在 `behaviorSettings.ts` 新增 `closeTabAfterSave: boolean` 設定欄位
- [x] 1.2 建立讀取/寫入設定的 helper 函數
- [x] 1.3 在設定頁面 UI 新增開關元件（行為設定區塊）
- [x] 1.4 加入 i18n 翻譯 key（繁中、簡中、英文、日文、韓文、西班牙文、德文、法文、葡萄牙文）

## 2. 核心邏輯
- [x] 2.1 修改 `WebpagesProvider.addFromTab` 新增 `waitForMeta` 選項
- [x] 2.2 建立 `closeTabSafely(tabId)` 輔助函數，處理邊界情況
- [x] 2.3 修改 `GroupsView.onDropTab` 整合關閉分頁邏輯
- [x] 2.4 確保關閉分頁失敗不影響儲存成功（使用 try-catch）

## 3. 邊界情況處理
- [x] 3.1 檢查是否為視窗中最後一個分頁，是則跳過關閉
- [x] 3.2 處理 tab 已被使用者手動關閉的情況
- [x] 3.3 處理無權限關閉分頁的情況（如 chrome:// 頁面）

## 4. 測試與驗證
- [ ] 4.1 手動測試：設定開關功能
- [ ] 4.2 手動測試：拖曳儲存後關閉分頁
- [ ] 4.3 手動測試：最後一個分頁不關閉
- [ ] 4.4 手動測試：meta enrichment 正常運作
