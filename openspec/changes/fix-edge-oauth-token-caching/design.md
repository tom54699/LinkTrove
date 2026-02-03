# Technical Design: Edge OAuth Token 快取機制

## Context
當前 Edge 瀏覽器的 OAuth 實作因為缺少 token 快取，導致每次 API 呼叫都會彈出授權視窗。這在以下場景特別嚴重：
- 頁面載入時的初始化（`bootstrapStatus()`）
- 自動同步檢查遠端更新（`ensureRemoteFreshness()`）
- 2 秒 debounce 後的自動備份（`backupNow()`）

使用者體驗：**每隔幾秒就彈出授權視窗**。

## Goals / Non-Goals

### Goals
- ✅ Edge 使用者在 token 有效期內（~1 小時）可以靜默使用自動同步
- ✅ 避免初始化時觸發授權視窗
- ✅ Token 過期時顯示清楚的錯誤提示，而非突然彈窗
- ✅ 向下相容 Chrome 瀏覽器（不受影響）

### Non-Goals
- ❌ 實作完全無感的 token 刷新（Edge 不支援 refresh token）
- ❌ 加密儲存 token（使用 chrome.storage.local，已由瀏覽器保護）
- ❌ 支援多帳號切換（當前產品範圍外）

## Decisions

### Decision 1: 使用 chrome.storage.local 儲存 token 快取
**Why:**
- Chrome Extensions 最適合的本地儲存機制
- 自動同步到使用者的瀏覽器配置（如果啟用）
- 相較於 IndexedDB 更簡單，適合少量結構化資料

**Alternative considered:**
- IndexedDB: 過度複雜，適合大量資料
- LocalStorage: 不適用於 Service Worker 環境

**Data structure:**
```typescript
interface EdgeTokenCache {
  token: string;         // OAuth2 access_token
  expiresAt: number;     // Unix timestamp (milliseconds)
}
```

**Storage key:** `edgeGoogleToken`

### Decision 2: 加入 5 分鐘安全緩衝區
**Why:**
- Google access_token 預設有效期 3600 秒（1 小時）
- 避免 token 即將過期時發起 API 呼叫，導致 401 錯誤
- 提前標記為過期，要求使用者重新授權

**Implementation:**
```typescript
const isValid = Date.now() < cache.expiresAt - 5 * 60 * 1000;
```

### Decision 3: interactive=false 時拋出特定錯誤而非彈窗
**Why:**
- 背景自動同步不應該打斷使用者
- 清楚的錯誤訊息比突然彈窗更友善
- 允許上層（syncService）決定如何處理

**Error handling flow:**
```
getAuthToken(interactive=false)
  → Edge 檢查快取
  → 無效 → throw new Error('EDGE_TOKEN_EXPIRED')
  → syncService 捕捉錯誤
  → setLocalStatus({ error: '授權已過期，請重新連接' })
  → UI 顯示錯誤 + 重新連接按鈕
```

### Decision 4: OAuth URL 加入 prompt=consent
**Why:**
- 確保每次授權都取得新的 access_token
- 避免 Google 返回已過期的 token
- 明確告知使用者正在重新授權

**URL example:**
```
https://accounts.google.com/o/oauth2/v2/auth?
  client_id=...&
  redirect_uri=...&
  scope=...&
  response_type=token&
  prompt=consent  ← 強制顯示授權畫面
```

### Decision 5: 初始化時只檢查快取，不實際連接
**Why:**
- 避免頁面載入時彈出授權視窗
- 快速確認連接狀態（本地檢查）
- 實際 API 呼叫延遲到使用者操作時

**Implementation in syncService.ts:**
```typescript
if (stored.connected) {
  if (isEdgeBrowser()) {
    // 只檢查快取，不觸發 OAuth
    const cache = await getEdgeTokenCache();
    status.connected = cache && Date.now() < cache.expiresAt - 5*60*1000;
  } else {
    // Chrome: 使用原本的邏輯
    await drive.connect(false);
  }
}
```

## Data Flow

### 首次連接流程（Edge）
```
使用者點擊「連接 Google Drive」
  ↓
SettingsModal → connect(interactive=true)
  ↓
getAuthToken(true) → isEdgeBrowser() = true
  ↓
getAuthTokenViaWebAuthFlow(true)
  ↓
launchWebAuthFlow({ url: authUrl, interactive: true })
  ↓
【使用者授權】
  ↓
提取 access_token + expires_in from URL hash
  ↓
saveEdgeTokenCache(token, expiresIn)
  ↓
儲存到 chrome.storage.local
  ↓
返回 token 給 Drive API
```

### 自動同步流程（Edge, token 有效）
```
資料變更 → 2 秒 debounce → backupNow()
  ↓
drive.createOrUpdate(json)
  ↓
driveFetch() → getAuthToken(false)
  ↓
isEdgeBrowser() = true
  ↓
getAuthTokenViaWebAuthFlow(false)
  ↓
getEdgeTokenCache()
  ↓
【快取有效】→ 返回 cached token
  ↓
使用 token 呼叫 Drive API ✅ 無彈窗
```

### Token 過期流程（Edge）
```
資料變更 → backupNow()
  ↓
getAuthToken(false) → getEdgeTokenCache()
  ↓
【快取過期】→ throw Error('EDGE_TOKEN_EXPIRED')
  ↓
syncService 捕捉錯誤
  ↓
setLocalStatus({ error: '授權已過期，請重新連接' })
  ↓
【UI 顯示錯誤 + 重新連接按鈕】
  ↓
使用者點擊重新連接
  ↓
connect(interactive=true) → 開啟授權視窗
  ↓
更新快取 → 恢復自動同步
```

## Risks / Trade-offs

### Risk 1: Token 儲存在 chrome.storage.local（明文）
**Mitigation:**
- chrome.storage.local 由瀏覽器保護，需要存取使用者本機檔案系統
- Access token 本身有效期只有 1 小時
- 不儲存 refresh token（Edge 流程本身不支援）
- 使用者可以隨時斷開連接清除 token

### Risk 2: 5 分鐘緩衝區可能過於保守
**Trade-off:**
- 緩衝區太小：可能在 API 呼叫時 token 剛好過期（401 錯誤）
- 緩衝區太大：使用者需要更頻繁重新授權

**Decision:** 5 分鐘是合理的平衡點
- 1 小時有效期，5 分鐘佔比不到 10%
- 給予網路延遲、時鐘偏移等容錯空間

### Risk 3: 時鐘偏移問題
**Scenario:** 使用者調整系統時間
**Mitigation:**
- 使用 `Date.now()` 而非 server timestamp
- 快取失效時重新授權即可（非致命錯誤）
- 顯示清楚的錯誤訊息指引使用者操作

## Migration Plan

### Phase 1: 部署新程式碼
1. 部署包含 token 快取的新版本
2. 現有 Edge 使用者下次開啟擴充功能時：
   - 如果之前已連接，`status.connected` 會變為 `false`（無快取）
   - 顯示「未連接」狀態
   - 使用者點擊「連接 Google Drive」→ 彈出 1 次授權視窗
   - 之後進入正常流程（快取生效）

### Phase 2: 驗證
- 監控 Edge 使用者的連接成功率
- 確認沒有使用者回報「不斷彈窗」問題
- Chrome 使用者不受影響

### Rollback Plan
如果新實作有問題：
1. 回滾到上一版本
2. Edge 使用者回到「每次彈窗」的狀態（已知問題）
3. 不會遺失使用者資料（token 快取是獨立的）

## Open Questions
無。技術方案已明確。

## Implementation Notes

### 檔案修改清單
1. **`src/app/data/cloud/googleDrive.ts`**
   - 新增 `EdgeTokenCache` 介面
   - 新增 `getEdgeTokenCache()`, `saveEdgeTokenCache()`, `clearEdgeTokenCache()`
   - 修改 `getAuthTokenViaWebAuthFlow(interactive: boolean)`
   - 修改 `getAuthToken()` 傳遞 `interactive` 參數
   - 修改 `disconnect()` 呼叫 `clearEdgeTokenCache()`

2. **`src/app/data/syncService.ts`**
   - 修改 `bootstrapStatus()` 在 Edge 上的初始化邏輯
   - （可選）加強錯誤訊息處理

3. **`src/app/ui/SettingsModal.tsx`**
   - （可選）加強 token 過期錯誤的顯示

### 測試清單
- [ ] Edge 首次連接（彈出 1 次視窗）
- [ ] Edge 自動同步（token 有效期內無彈窗）
- [ ] Edge 手動備份/還原（無彈窗）
- [ ] Edge token 過期後顯示錯誤
- [ ] Edge 重新連接恢復功能
- [ ] Edge 斷開連接清除快取
- [ ] Chrome 不受影響（向下相容）

## Performance Impact
- **Storage overhead:** ~200 bytes per user (token + expiresAt)
- **CPU overhead:** Negligible (快取檢查是同步操作)
- **Network overhead:** 無變化（減少不必要的 OAuth 重新授權）

## Security Considerations
- Access token 明文儲存在 chrome.storage.local（瀏覽器保護）
- Token 有效期 1 小時（自動過期）
- 使用者可隨時斷開連接清除 token
- 不儲存 refresh token（Edge 流程不支援）
