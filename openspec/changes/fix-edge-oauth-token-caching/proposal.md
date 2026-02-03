# Change: 修正 Edge OAuth Token 快取與自動同步彈窗問題

## Why
當前 Edge 瀏覽器的 Google Drive 同步實作存在嚴重的使用者體驗問題：**每隔幾秒就會彈出 OAuth 授權視窗**。

根本原因：
1. `googleDrive.ts:70-76` 的 `getAuthToken()` 函數在 Edge 上**完全忽略 `interactive` 參數**，總是呼叫 `getAuthTokenViaWebAuthFlow()` 並開啟授權視窗
2. `getAuthTokenViaWebAuthFlow()` 沒有實作 token 快取機制，每次 API 呼叫都要求使用者重新授權
3. `syncService.ts:108` 初始化時呼叫 `drive.connect(false)` → 第 1 次彈窗
4. `syncService.ts:119` 自動同步時呼叫 `ensureRemoteFreshness()` → 第 2 次彈窗
5. 如果有資料變更，2 秒後 `backupNow()` → 第 3 次彈窗

這導致 Edge 使用者無法正常使用雲端同步功能。

## What Changes
- **修改 `src/app/data/cloud/googleDrive.ts`**：
  - 實作 Edge token 快取機制（儲存到 `chrome.storage.local`）
  - `getAuthTokenViaWebAuthFlow()` 加入 `interactive` 參數支援
  - 從 OAuth 回應中解析 `expires_in` 參數並快取 token 和過期時間
  - `interactive=false` 時：先檢查快取，有效就使用，無效則拋出 `EDGE_TOKEN_EXPIRED` 錯誤（不彈窗）
  - `interactive=true` 時：開啟授權視窗並快取新 token
  - 加入 5 分鐘安全緩衝區避免邊界情況

- **修改 `src/app/data/syncService.ts`**：
  - `bootstrapStatus()` 在 Edge 上改為檢查 token 快取而非實際連接
  - 捕捉 `EDGE_TOKEN_EXPIRED` 錯誤並設定友善的錯誤訊息
  - 避免在初始化時觸發授權視窗

- **修改 `src/app/ui/SettingsModal.tsx`**（可選強化）：
  - 當 Edge 顯示 token 過期錯誤時，顯示明確的「重新連接」提示

## Impact
- **Affected specs**: `cloud-sync` - 修改「跨瀏覽器 OAuth2 認證」requirement
- **Affected code**:
  - `src/app/data/cloud/googleDrive.ts` - Token 快取與 OAuth 流程
  - `src/app/data/syncService.ts` - 初始化與錯誤處理邏輯
  - `src/app/ui/SettingsModal.tsx` - 錯誤訊息顯示（可選）
- **User benefit**:
  - Edge 使用者在 token 有效期內（約 1 小時）可以靜默使用自動同步
  - 不再出現每隔幾秒就彈出授權視窗的問題
  - Token 過期時顯示清楚的錯誤提示，而非突然彈窗
- **Breaking changes**: 無（向下相容）
