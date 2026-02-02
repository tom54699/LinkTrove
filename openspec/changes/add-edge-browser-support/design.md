# Technical Design: Edge Browser Support for Cloud Sync

## Context
目前 LinkTrove 使用 `chrome.identity.getAuthToken` API 進行 Google OAuth2 認證，但 Microsoft Edge 不支援此 API。雖然 Edge 基於 Chromium 並支援大部分 Chrome Extension API，但 `chrome.identity.getAuthToken` 是例外，必須改用 `chrome.identity.launchWebAuthFlow`。

**限制條件：**
- 必須維持 Chrome 瀏覽器的現有功能（向下相容）
- Edge 使用者必須能夠正常使用雲端同步
- OAuth2 Client ID 和 redirect URI 已在 manifest.json 中設定
- 擴充套件 ID 在 Chrome 和 Edge 上相同（因為有固定的 manifest key）

## Goals / Non-Goals

**Goals:**
- Edge 瀏覽器使用者可以連接 Google Drive
- Chrome 瀏覽器使用者不受影響（向下相容）
- 提供友善的錯誤訊息和 loading 狀態
- 兩種瀏覽器的 token 管理方式一致

**Non-Goals:**
- 支援 Firefox 或 Safari（目前僅針對 Chromium 系瀏覽器）
- 實作離線同步或衝突解決（已有 LWW 策略）
- 重構整個雲端同步架構

## Decisions

### Decision 1: 瀏覽器偵測方式
**選擇：** 使用 `navigator.userAgent` 檢查是否包含 `"Edg/"`

**理由：**
- Edge 的 User Agent 包含 `"Edg/"` 標識符（例如：`Mozilla/5.0 ... Edg/120.0.0.0`）
- Chrome 的 User Agent 包含 `"Chrome/"`（例如：`Mozilla/5.0 ... Chrome/120.0.0.0`）
- 簡單可靠，不需要額外的 API 呼叫
- 即使在 Edge 上，`chrome` API 命名空間仍然存在，無法用 `typeof chrome` 判斷

**替代方案考慮：**
- ❌ 使用 `chrome.runtime.getPlatformInfo()` → 返回的是 OS 平台，不是瀏覽器
- ❌ Try-catch `getAuthToken` → Edge 上會報錯，但錯誤訊息可能不穩定
- ✅ User Agent 檢查 → 最直接可靠的方式

**實作：**
```typescript
function isEdgeBrowser(): boolean {
  return navigator.userAgent.includes('Edg/');
}
```

### Decision 2: OAuth2 授權流程（Edge）
**選擇：** 使用 `chrome.identity.launchWebAuthFlow` + Implicit Flow (response_type=token)

**理由：**
- `launchWebAuthFlow` 是 Edge 支援的標準方式
- Implicit Flow 直接在 redirect URL 的 hash 中返回 access_token
- 不需要 authorization code 交換（簡化流程）
- Google OAuth2 支援 Implicit Flow for Chrome Extensions

**流程：**
1. 建構授權 URL：
   ```
   https://accounts.google.com/o/oauth2/v2/auth?
     client_id=<manifest.oauth2.client_id>
     &redirect_uri=https://<extension-id>.chromiumapp.org/
     &scope=https://www.googleapis.com/auth/drive.appdata
     &response_type=token
   ```
2. 呼叫 `launchWebAuthFlow({ url, interactive: true })`
3. Google 重新導向到 `https://<extension-id>.chromiumapp.org/#access_token=...&expires_in=3600`
4. 從 URL hash 提取 `access_token`

**替代方案考慮：**
- ❌ Authorization Code Flow → 需要 server-side token exchange，複雜度高
- ✅ Implicit Flow → 適合 client-side，Chrome Extension 標準做法

**實作：**
```typescript
async function getAuthTokenViaWebAuthFlow(): Promise<string> {
  const clientId = '731462500420-80ko62k4mmb74jajefi7fio2jftlrc61.apps.googleusercontent.com';
  const redirectUri = chrome.identity.getRedirectURL();
  const scope = 'https://www.googleapis.com/auth/drive.appdata';

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${encodeURIComponent(clientId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=${encodeURIComponent(scope)}` +
    `&response_type=token`;

  const responseUrl = await new Promise<string>((resolve, reject) => {
    chrome.identity.launchWebAuthFlow(
      { url: authUrl, interactive: true },
      (url) => {
        if (chrome.runtime.lastError || !url) {
          reject(new Error(chrome.runtime.lastError?.message || 'Auth failed'));
        } else {
          resolve(url);
        }
      }
    );
  });

  // Extract token from URL hash: #access_token=ya29...&expires_in=3600
  const match = responseUrl.match(/access_token=([^&]+)/);
  if (!match) throw new Error('No access token in response');

  return match[1];
}
```

### Decision 3: 統一的 getAuthToken 介面
**選擇：** 修改現有的 `getAuthToken()` 函數，內部根據瀏覽器選擇實作

**理由：**
- 上層程式碼（`syncService.ts`）不需要修改
- 封裝瀏覽器差異在 `googleDrive.ts` 內部
- 單一責任原則：OAuth2 認證邏輯集中在一處

**實作：**
```typescript
async function getAuthToken(interactive = false): Promise<string> {
  // Edge: use launchWebAuthFlow
  if (isEdgeBrowser()) {
    if (!interactive) {
      // Edge 不支援非互動模式，拋出錯誤讓上層重試 interactive
      throw new Error('OAuth2 token not cached');
    }
    return getAuthTokenViaWebAuthFlow();
  }

  // Chrome: use existing getAuthToken API
  return new Promise((resolve, reject) => {
    try {
      chrome.identity.getAuthToken({ interactive }, (token: string) => {
        const err = chrome.runtime?.lastError;
        if (token) resolve(token);
        else reject(new Error(err?.message || 'Failed to obtain auth token'));
      });
    } catch (e) {
      reject(e);
    }
  });
}
```

### Decision 4: UI 改進（錯誤訊息顯示）
**選擇：** 在 `SettingsModal.tsx` 的 CloudSyncPanel 中新增錯誤訊息顯示區塊

**理由：**
- 目前 `doConnect` 會 `setError()` 但 UI 上沒有顯示
- 使用者看不到錯誤訊息，不知道為什麼失敗
- 新增簡單的錯誤訊息 UI 提升使用者體驗

**實作：**
```tsx
// 在 CloudSyncPanel 的連接按鈕下方新增
{error && (
  <div className="mt-3 px-3 py-2 rounded-lg border border-red-700 bg-red-900/30 text-red-300 text-[13px]">
    {error}
  </div>
)}
```

## Risks / Trade-offs

### Risk 1: Edge launchWebAuthFlow 的 token 無法快取
- **問題**: `getAuthToken({ interactive: false })` 在 Chrome 上可以無互動刷新 token，但 Edge 的 `launchWebAuthFlow` 每次都需要使用者互動
- **影響**: Edge 使用者在 token 過期後需要重新授權（約 1 小時）
- **緩解**:
  - Token 過期時友善提示：「請重新連接 Google Drive」
  - 延長 token 有效期（如果 Google 支援）
  - 考慮實作 refresh token（需要 Authorization Code Flow，複雜度高）

### Risk 2: User Agent 偵測不穩定
- **問題**: 如果 Edge 未來修改 User Agent 字串，偵測可能失效
- **影響**: Edge 使用者可能無法正確使用 launchWebAuthFlow
- **緩解**:
  - 優先使用 try-catch `getAuthToken`，失敗時自動 fallback 到 `launchWebAuthFlow`
  - 定期檢查 Edge 的 User Agent 格式
  - 加入版本檢測邏輯

### Risk 3: OAuth2 redirect URI 設定
- **問題**: 如果 Google Cloud Console 中沒有設定正確的 redirect URI，Edge 認證會失敗
- **影響**: Edge 使用者無法連接 Google Drive
- **緩解**:
  - 文檔中說明需要新增 `https://<extension-id>.chromiumapp.org/` 到 OAuth2 Client ID
  - 提供友善的錯誤訊息：「請檢查 OAuth2 設定」
  - 在開發環境中測試並驗證

## Migration Plan

### Phase 1: 實作與測試（本次）
1. 修改 `googleDrive.ts` 實作瀏覽器偵測和 Edge 支援
2. 在 Chrome 和 Edge 上測試所有雲端同步功能
3. 確保 Chrome 使用者不受影響

### Phase 2: UI 改進（本次）
1. 新增 loading 狀態到 `doConnect` 函數
2. 新增錯誤訊息顯示區塊
3. 改進使用者體驗

### Phase 3: 監控與優化（未來）
1. 收集 Edge 使用者的錯誤報告
2. 如果 token 快取問題嚴重，考慮實作 refresh token
3. 監控 User Agent 變化

### Rollback Plan
如果 Edge 支援出現問題：
1. 在 `getAuthToken` 中新增 feature flag 控制 Edge 支援
2. 暫時停用 Edge 支援，顯示「Edge 瀏覽器暫不支援雲端同步」
3. 調查並修復問題後重新啟用

## Open Questions
- ❓ Google OAuth2 是否支援 refresh token for Chrome Extensions（Implicit Flow）？
- ❓ Edge 的 `launchWebAuthFlow` 是否支援 `interactive: false` 模式？（文檔未明確說明）
- ❓ 是否需要針對其他 Chromium 系瀏覽器（Brave, Vivaldi）進行測試？

## References
- [Chrome Identity API](https://developer.chrome.com/docs/extensions/reference/identity/)
- [Edge Extension APIs](https://learn.microsoft.com/en-us/microsoft-edge/extensions-chromium/developer-guide/api-support)
- [Google OAuth2 for Chrome Extensions](https://developers.google.com/identity/protocols/oauth2/javascript-implicit-flow)
- [Issue: Edge not supporting getAuthToken](https://github.com/MicrosoftDocs/edge-developer/issues/1234)
