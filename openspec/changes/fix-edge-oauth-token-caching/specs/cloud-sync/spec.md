# Capability: Google Drive Cloud Sync

## MODIFIED Requirements

### Requirement: 跨瀏覽器 OAuth2 認證
系統必須（SHALL）支援 Chrome 和 Edge 兩種瀏覽器的 Google OAuth2 認證，自動選擇適合的 API，並在 Edge 上實作 token 快取以避免頻繁彈窗。

#### Scenario: Chrome 瀏覽器認證
- **WHEN** 使用者在 Chrome 瀏覽器中點擊「連接 Google Drive」
- **THEN** 系統偵測為 Chrome 瀏覽器
- **THEN** 系統使用 `chrome.identity.getAuthToken({ interactive: true })` 取得 token
- **THEN** 彈出 Google 授權視窗
- **WHEN** 使用者授權成功
- **THEN** 系統取得 access_token 並儲存
- **THEN** 顯示「已連接 Google Drive」訊息

#### Scenario: Edge 瀏覽器認證
- **WHEN** 使用者在 Microsoft Edge 瀏覽器中點擊「連接 Google Drive」
- **THEN** 系統偵測為 Edge 瀏覽器
- **THEN** 系統使用 `chrome.identity.launchWebAuthFlow` 啟動 OAuth2 流程
- **THEN** 建構授權 URL：`https://accounts.google.com/o/oauth2/v2/auth`
  - 參數包含：client_id, redirect_uri, scope, response_type=token, prompt=consent
- **THEN** 開啟新視窗導向授權 URL
- **WHEN** 使用者授權成功
- **THEN** Google 重新導向到 `https://<extension-id>.chromiumapp.org/`
- **THEN** 系統從 URL hash 中提取 `access_token` 和 `expires_in`
- **THEN** 系統將 token 和過期時間儲存到 `chrome.storage.local` (key: `edgeGoogleToken`)
- **THEN** 關閉授權視窗
- **THEN** 顯示「已連接 Google Drive」訊息

#### Scenario: Edge Token 快取檢查
- **GIVEN** Edge 使用者已連接 Google Drive
- **WHEN** 系統需要呼叫 Drive API（`interactive=false` 模式）
- **THEN** 系統從 `chrome.storage.local` 讀取快取的 token
- **WHEN** 快取的 token 存在且未過期（距離過期時間 > 5 分鐘）
- **THEN** 系統使用快取的 token，不開啟授權視窗
- **WHEN** 快取的 token 不存在或已過期
- **THEN** 系統拋出錯誤 `EDGE_TOKEN_EXPIRED`
- **THEN** 不開啟授權視窗（避免背景自動同步時彈窗）

#### Scenario: Edge Token 過期處理
- **GIVEN** Edge 使用者已連接 Google Drive
- **GIVEN** 快取的 token 已過期（距離過期時間 < 5 分鐘或已超過）
- **WHEN** 系統嘗試自動同步（`interactive=false`）
- **THEN** 系統拋出 `EDGE_TOKEN_EXPIRED` 錯誤
- **THEN** 同步服務設定錯誤訊息：「授權已過期，請重新連接 Google Drive」
- **THEN** 自動同步暫停
- **WHEN** 使用者點擊「重新連接」按鈕（`interactive=true`）
- **THEN** 系統開啟授權視窗取得新 token
- **THEN** 更新快取
- **THEN** 恢復自動同步

#### Scenario: 瀏覽器自動偵測
- **WHEN** 系統執行 OAuth2 認證前
- **THEN** 系統檢查 `navigator.userAgent` 是否包含 "Edg/"
- **WHEN** 包含 "Edg/"
- **THEN** 判定為 Edge 瀏覽器，使用 launchWebAuthFlow with token caching
- **WHEN** 不包含 "Edg/"
- **THEN** 判定為 Chrome 或其他瀏覽器，使用 getAuthToken

#### Scenario: 認證失敗處理（Edge）
- **GIVEN** 使用者在 Edge 中啟動 OAuth2 認證
- **WHEN** 使用者在授權視窗中點擊「拒絕」
- **THEN** `launchWebAuthFlow` 返回錯誤
- **THEN** 系統顯示錯誤訊息：「您拒絕了 Google Drive 授權」
- **THEN** 連接狀態保持為「未連接」
- **WHEN** 授權過程中網路錯誤
- **THEN** 系統顯示錯誤訊息：「網路錯誤，請稍後再試」

#### Scenario: Token 刷新（跨瀏覽器）
- **GIVEN** 使用者已連接 Google Drive
- **WHEN** access_token 過期（401 Unauthorized from Drive API）
- **THEN** 系統根據瀏覽器類型重新取得 token
- **WHEN** 在 Chrome 上
- **THEN** 使用 `getAuthToken({ interactive: false })` 嘗試無互動刷新
- **WHEN** 無互動刷新失敗
- **THEN** 使用 `getAuthToken({ interactive: true })` 要求使用者重新授權
- **WHEN** 在 Edge 上
- **THEN** 檢查快取的 token 是否有效
- **WHEN** 快取 token 無效
- **THEN** 拋出 `EDGE_TOKEN_EXPIRED` 錯誤，要求使用者手動重新連接

#### Scenario: Edge 斷開連接時清除快取
- **GIVEN** Edge 使用者已連接 Google Drive
- **WHEN** 使用者點擊「斷開連接」按鈕
- **THEN** 系統呼叫 `chrome.identity.removeCachedAuthToken` 清除 token
- **THEN** 系統從 `chrome.storage.local` 清除 `edgeGoogleToken`
- **THEN** 系統清除本地儲存的連接狀態
- **THEN** 顯示「已斷開連接」訊息

#### Scenario: Edge 初始化不觸發彈窗
- **GIVEN** Edge 使用者之前已連接 Google Drive
- **WHEN** 使用者開啟新分頁（擴充功能頁面載入）
- **THEN** 系統執行 `bootstrapStatus()` 初始化
- **THEN** 系統檢查 `chrome.storage.local` 中的 `edgeGoogleToken` 快取
- **WHEN** 快取存在且未過期
- **THEN** 設定 `status.connected = true`
- **THEN** **不**開啟授權視窗
- **WHEN** 快取不存在或已過期
- **THEN** 設定 `status.connected = false`
- **THEN** **不**開啟授權視窗

## Related Documentation
- **技術設計**: `design.md` - Token 快取策略與錯誤處理流程
- **實作位置**:
  - `src/app/data/cloud/googleDrive.ts` - Token 快取與 OAuth2 流程
  - `src/app/data/syncService.ts` - 初始化與錯誤處理
  - `src/utils/browser.ts` - 瀏覽器偵測
- **Chrome Storage API**: https://developer.chrome.com/docs/extensions/reference/storage/
- **OAuth2 Token Expiration**: Google access tokens 預設有效期為 3600 秒（1 小時）
