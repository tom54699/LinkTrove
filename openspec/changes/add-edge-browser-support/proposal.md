# Change: Edge 瀏覽器雲端同步支援

## Why
目前 LinkTrove 的 Google Drive 雲端同步功能在 Chrome 瀏覽器上運作正常，但在 Microsoft Edge 上完全無法使用。Edge 不支援 `chrome.identity.getAuthToken` API，導致使用者按下「連接 Google Drive」按鈕時沒有任何反應，錯誤訊息為：

```
This API is not supported on Microsoft Edge
```

這影響了所有使用 Edge 瀏覽器的使用者，無法使用雲端同步功能備份和同步資料。

## What Changes
- 修改 `src/app/data/cloud/googleDrive.ts` 的 `getAuthToken` 函數，改用 Edge 支援的 `chrome.identity.launchWebAuthFlow` API
- 實作瀏覽器偵測邏輯，自動選擇適合的認證方式（Chrome 用 getAuthToken，Edge 用 launchWebAuthFlow）
- 新增 OAuth2 授權流程處理，從回調 URL 中提取 access token
- 確保 Chrome 和 Edge 兩種瀏覽器都能正常使用雲端同步功能
- 新增錯誤處理和使用者友善的錯誤訊息

## Impact
- **Affected specs**: 新增 `cloud-sync` capability（目前不存在）
- **Affected code**:
  - `src/app/data/cloud/googleDrive.ts` - OAuth2 認證邏輯
  - `src/app/ui/SettingsModal.tsx` - 錯誤訊息顯示（可選改進）
- **User benefit**: Edge 使用者可以使用雲端同步功能
- **Breaking changes**: 無（向下相容）
