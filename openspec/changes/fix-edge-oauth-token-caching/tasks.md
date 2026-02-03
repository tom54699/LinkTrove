# Implementation Tasks

## 1. Token 快取基礎設施 (googleDrive.ts)
- [x] 1.1 定義 `EdgeTokenCache` 介面（token, expiresAt）
- [x] 1.2 實作 `getEdgeTokenCache()` - 從 chrome.storage.local 讀取快取
- [x] 1.3 實作 `saveEdgeTokenCache(token, expiresIn)` - 儲存 token 和過期時間
- [x] 1.4 實作 `clearEdgeTokenCache()` - 清除快取
- [x] 1.5 加入 5 分鐘安全緩衝區（避免 token 即將過期的邊界情況）

## 2. OAuth 流程改進 (googleDrive.ts)
- [x] 2.1 修改 `getAuthTokenViaWebAuthFlow()` 接受 `interactive: boolean` 參數
- [x] 2.2 實作 `interactive=false` 邏輯：檢查快取，無效則拋出 `EDGE_TOKEN_EXPIRED` 錯誤
- [x] 2.3 修改授權 URL 加入 `prompt=consent` 確保取得新 token
- [x] 2.4 從 OAuth 回應 URL 解析 `expires_in` 參數（預設 3600 秒）
- [x] 2.5 授權成功後呼叫 `saveEdgeTokenCache()` 儲存 token
- [x] 2.6 修改 `getAuthToken()` 傳遞 `interactive` 參數給 `getAuthTokenViaWebAuthFlow()`

## 3. 同步服務錯誤處理 (syncService.ts)
- [x] 3.1 修改 `bootstrapStatus()` 在 Edge 上只檢查 token 快取，不實際連接
- [x] 3.2 在錯誤處理中捕捉 `EDGE_TOKEN_EXPIRED` 錯誤（ensureRemoteFreshness, backupNow, restoreNow）
- [x] 3.3 設定友善的錯誤訊息：「授權已過期，請重新連接 Google Drive」
- [x] 3.4 確保 token 過期時標記為 disconnected，不會觸發無限重試

## 4. UI 改進 (SettingsModal.tsx, 可選)
- [x] 4.1 在雲端同步區塊檢測 Edge 瀏覽器 - **已跳過**（現有錯誤訊息已足夠）
- [x] 4.2 顯示 token 過期錯誤時，突顯「重新連接」按鈕 - **已跳過**
- [x] 4.3 加入工具提示說明 Edge 的 token 管理機制 - **已跳過**

## 5. 清理與斷開連接
- [x] 5.1 修改 `disconnect()` 函數呼叫 `clearEdgeTokenCache()`
- [x] 5.2 確保斷開連接時清除所有 Edge token 快取

## 6. 測試與驗證
- [x] 6.1 在 Edge 上測試首次連接流程（應彈出 1 次授權視窗）
- [x] 6.2 測試 token 有效期內的自動同步（應無彈窗）
- [ ] 6.3 測試手動備份/還原操作（應無彈窗）
- [ ] 6.4 測試 token 過期後的錯誤提示（應顯示友善訊息）
- [ ] 6.5 測試重新連接後恢復正常（應彈出 1 次授權視窗）
- [ ] 6.6 驗證 Chrome 瀏覽器不受影響（向下相容）
