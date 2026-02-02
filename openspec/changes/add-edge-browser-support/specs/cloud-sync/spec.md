# Capability: Google Drive Cloud Sync

## ADDED Requirements

### Requirement: 跨瀏覽器 OAuth2 認證
系統必須（SHALL）支援 Chrome 和 Edge 兩種瀏覽器的 Google OAuth2 認證，自動選擇適合的 API。

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
  - 參數包含：client_id, redirect_uri, scope, response_type=token
- **THEN** 開啟新視窗導向授權 URL
- **WHEN** 使用者授權成功
- **THEN** Google 重新導向到 `https://<extension-id>.chromiumapp.org/`
- **THEN** 系統從 URL hash 中提取 access_token
- **THEN** 關閉授權視窗
- **THEN** 系統儲存 access_token
- **THEN** 顯示「已連接 Google Drive」訊息

#### Scenario: 瀏覽器自動偵測
- **WHEN** 系統執行 OAuth2 認證前
- **THEN** 系統檢查 `navigator.userAgent` 是否包含 "Edg/"
- **WHEN** 包含 "Edg/"
- **THEN** 判定為 Edge 瀏覽器，使用 launchWebAuthFlow
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
- **WHEN** access_token 過期（401 Unauthorized）
- **THEN** 系統根據瀏覽器類型重新取得 token
- **WHEN** 在 Chrome 上
- **THEN** 使用 `getAuthToken({ interactive: false })` 嘗試無互動刷新
- **WHEN** 無互動刷新失敗
- **THEN** 使用 `getAuthToken({ interactive: true })` 要求使用者重新授權
- **WHEN** 在 Edge 上
- **THEN** 使用 `launchWebAuthFlow` 重新取得 token（需要使用者互動）

### Requirement: Google Drive 備份與還原
系統必須（SHALL）提供 Google Drive appDataFolder 的資料備份和還原功能。

#### Scenario: 上傳備份到 Drive
- **GIVEN** 使用者已連接 Google Drive
- **WHEN** 使用者點擊「立即備份」按鈕
- **THEN** 系統匯出所有資料為 JSON 格式
- **THEN** 系統使用 gzip 壓縮 JSON 內容
- **THEN** 系統呼叫 Drive API 上傳檔案到 appDataFolder
  - 檔名：`linktrove.json.gz`
  - Content-Type: `application/gzip`
- **THEN** 顯示進度：「正在上傳... (壓縮後 X KB)」
- **WHEN** 上傳成功
- **THEN** 更新「上次同步時間」為當前時間
- **THEN** 顯示成功訊息：「備份成功」

#### Scenario: 從 Drive 還原資料
- **GIVEN** 使用者已連接 Google Drive
- **GIVEN** Drive 上存在備份檔案
- **WHEN** 使用者點擊「從雲端還原」按鈕
- **THEN** 系統顯示確認對話框：「此操作將覆蓋本地資料，確定繼續？」
- **WHEN** 使用者確認
- **THEN** 系統從 Drive 下載 `linktrove.json.gz`
- **THEN** 系統解壓縮檔案（自動偵測 gzip 格式）
- **THEN** 系統匯入資料（覆蓋模式）
- **THEN** 重新載入頁面
- **THEN** 顯示成功訊息：「還原成功」

#### Scenario: 合併雲端資料
- **GIVEN** 使用者已連接 Google Drive
- **GIVEN** 本地和雲端都有資料
- **WHEN** 使用者點擊「合併」按鈕
- **THEN** 系統下載雲端資料
- **THEN** 系統使用 LWW (Last-Write-Wins) 策略合併資料
  - 比較每個實體的 `updatedAt` 時間戳記
  - 保留較新的版本
- **THEN** 系統建立本地快照（合併前）
- **THEN** 系統套用合併結果
- **THEN** 重新載入頁面
- **THEN** 顯示合併結果：「已合併 X 個項目」

#### Scenario: 自動同步
- **GIVEN** 使用者啟用「自動同步」選項
- **GIVEN** 使用者已連接 Google Drive
- **WHEN** 使用者修改任何資料（新增/編輯/刪除卡片）
- **THEN** 系統等待 2 秒（debounce）
- **WHEN** 2 秒內沒有新的修改
- **THEN** 系統自動上傳備份到 Drive
- **THEN** 系統不顯示 UI 提示（背景執行）
- **THEN** 更新「上次同步時間」

### Requirement: 連接狀態管理
系統必須（SHALL）管理 Google Drive 連接狀態，並在 UI 顯示即時狀態。

#### Scenario: 顯示連接狀態
- **WHEN** 使用者開啟設定頁面的「雲端同步」區塊
- **WHEN** 使用者未連接 Google Drive
- **THEN** 顯示「未連接」狀態
- **THEN** 顯示「連接 Google Drive」按鈕
- **WHEN** 使用者已連接 Google Drive
- **THEN** 顯示「已連接」綠色標籤
- **THEN** 顯示「上次同步時間：2026-02-02 12:34」
- **THEN** 顯示「斷開連接」按鈕
- **THEN** 顯示「立即備份」「合併」「還原」按鈕

#### Scenario: 斷開 Drive 連接
- **GIVEN** 使用者已連接 Google Drive
- **WHEN** 使用者點擊「斷開連接」按鈕
- **THEN** 系統呼叫 `chrome.identity.removeCachedAuthToken` 清除 token
- **THEN** 系統清除本地儲存的連接狀態
- **THEN** 顯示「已斷開連接」訊息
- **THEN** 按鈕變回「連接 Google Drive」

#### Scenario: 連接錯誤顯示
- **GIVEN** 使用者點擊「連接 Google Drive」
- **WHEN** OAuth2 認證失敗（任何原因）
- **THEN** 系統在設定頁面顯示錯誤訊息（紅色框）
- **THEN** 錯誤訊息包含具體原因（例如：「使用者拒絕授權」「網路錯誤」）
- **THEN** 提供「重試」按鈕
- **THEN** 連接狀態保持為「未連接」

#### Scenario: 同步進行中狀態
- **WHEN** 系統正在執行備份或還原操作
- **THEN** 所有雲端同步按鈕變為 disabled 狀態
- **THEN** 顯示 loading spinner
- **THEN** 顯示進度訊息：「正在上傳...」或「正在下載...」
- **WHEN** 操作完成
- **THEN** 按鈕恢復可用
- **THEN** Loading spinner 消失
- **THEN** 顯示成功或失敗訊息

## Related Documentation
- **技術設計**: `design.md` - OAuth2 流程與瀏覽器相容性策略
- **實作位置**:
  - `src/app/data/cloud/googleDrive.ts` - Google Drive API 封裝
  - `src/app/data/syncService.ts` - 同步服務邏輯
  - `src/app/ui/SettingsModal.tsx` - 雲端同步 UI
- **Chrome Identity API**: https://developer.chrome.com/docs/extensions/reference/identity/
- **Google Drive API**: https://developers.google.com/drive/api/v3/appdata
