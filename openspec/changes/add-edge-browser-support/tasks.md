# Implementation Tasks

## 1. 瀏覽器偵測與認證方式選擇
- [x] 1.1 實作 `isEdgeBrowser()` 函數偵測 Edge 瀏覽器
- [x] 1.2 實作 `getBrowserAuthMethod()` 函數返回適合的認證方式

## 2. Edge OAuth2 流程實作（launchWebAuthFlow）
- [x] 2.1 實作 `getAuthTokenViaWebAuthFlow()` 函數
- [x] 2.2 建構 Google OAuth2 授權 URL（包含 client_id, scope, redirect_uri）
- [x] 2.3 呼叫 `chrome.identity.launchWebAuthFlow` 開啟授權視窗
- [x] 2.4 從回調 URL 中提取 access_token 參數
- [x] 2.5 處理授權失敗情況（使用者拒絕、網路錯誤等）

## 3. 修改 getAuthToken 函數
- [x] 3.1 在 `getAuthToken()` 中偵測瀏覽器類型
- [x] 3.2 Chrome：使用現有的 `chrome.identity.getAuthToken` 流程
- [x] 3.3 Edge：使用新的 `getAuthTokenViaWebAuthFlow` 流程
- [x] 3.4 確保兩種流程都返回相同格式的 token

## 4. 錯誤處理改進
- [x] 4.1 在 `SettingsModal.tsx` 的 `doConnect` 中新增 loading 狀態
- [x] 4.2 在 UI 顯示錯誤訊息（目前 setError 但沒有顯示）
- [x] 4.3 提供友善的錯誤訊息（例如：「Edge 瀏覽器不支援此功能」變成「正在連接...」）

## 5. 測試與驗證
- [x] 5.1 在 Chrome 測試雲端同步功能（確保向下相容）
- [x] 5.2 在 Edge 測試雲端同步功能（確保新功能運作）
- [x] 5.3 測試錯誤情境（使用者拒絕授權、網路錯誤等）
- [x] 5.4 測試 token 快取和刷新機制

## 6. 文檔更新
- [x] 6.1 更新 CLAUDE.md 中的雲端同步說明
- [x] 6.2 記錄 Edge 支援的實作方式
