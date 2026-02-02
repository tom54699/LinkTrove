# Implementation Tasks

## 1. 建立共用瀏覽器偵測工具
- [ ] 1.1 建立 `src/utils/browser.ts`
- [ ] 1.2 實作並 export `isEdgeBrowser()` 函數
- [ ] 1.3 加入 JSDoc 註解說明函數用途

## 2. 重構 Google Drive 模組使用共用函數
- [ ] 2.1 修改 `src/app/data/cloud/googleDrive.ts`，移除內部的 `isEdgeBrowser()` 定義
- [ ] 2.2 在檔案開頭 import `isEdgeBrowser` from `@/utils/browser`
- [ ] 2.3 驗證 Google Drive 雲端同步功能在 Chrome 和 Edge 上仍正常運作

## 3. 修改 WebpagesProvider 的拖曳儲存邏輯 ⭐ 核心修改
- [ ] 3.1 修改 `src/app/webpages/WebpagesProvider.tsx`，import `isEdgeBrowser` from `@/utils/browser`
- [ ] 3.2 調整 `addFromTab` 函數的分頁準備邏輯（Line 176-186）
- [ ] 3.3 修改條件：`if (tab.discarded || isEdgeBrowser())` → 執行 reload
- [ ] 3.4 移除原有的 `if (!tabInfo?.discarded)` 等待邏輯，改為統一在 reload 後等待
- [ ] 3.5 新增診斷 console.log 記錄 Edge 喚醒分頁的操作
- [ ] 3.6 測試 Edge 上**拖曳儲存**睡眠分頁時能正常提取 meta

## 4. 修改 pageMeta.ts 的 Meta 提取邏輯
- [ ] 4.1 修改 `src/background/pageMeta.ts`，import `isEdgeBrowser` from `@/utils/browser`
- [ ] 4.2 調整分頁狀態檢查條件（Line 373）：`if (tab.discarded || isEdgeBrowser())`
- [ ] 4.3 新增診斷 console.log 記錄 Edge 喚醒分頁的操作

## 5. 修改 background.ts（可選，一致性）
- [ ] 5.1 修改 `src/background.ts` 的 `enrichFromTabMeta` 函數（Line 97-100）
- [ ] 5.2 加入 Edge 判斷和 reload 邏輯（與 WebpagesProvider 一致）
- [ ] 5.3 雖然右鍵選單不太會遇到睡眠分頁，但保持邏輯一致性

## 6. 測試與驗證
- [ ] 6.1 在 Chrome 上測試：拖曳儲存 discarded 分頁能正常提取 meta
- [ ] 6.2 在 Edge 上測試：**拖曳儲存**睡眠分頁（閒置 2+ 小時或手動 freeze）能正常提取 meta
- [ ] 6.3 在 Edge 上測試：拖曳儲存正常活躍分頁會執行 reload（已知權衡）
- [ ] 6.4 驗證 Google Drive 同步在兩個瀏覽器上都正常運作
- [ ] 6.5 測試右鍵選單儲存（雖然不會遇到睡眠問題，但驗證功能正常）

## 7. 文檔更新
- [ ] 7.1 更新 `docs/meta/SESSION_HANDOFF.md` 記錄此次修正
- [ ] 7.2 在程式碼中新增註解說明 Edge Sleeping Tabs 的限制與 workaround
- [ ] 7.3 移除臨時的 DEBUG 日誌（`src/background.ts` 的 🔍 標記）
