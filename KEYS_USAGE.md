# LinkTrove Keys/Tokens 使用說明

## 📋 目前使用的 Keys 總覽

### 1. Extension Key（擴充功能金鑰）

**位置：** `public/manifest.json` → `key` 欄位

```json
"key": "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA8KVTdXerdjtKiO1CRxRJJpm57R58vklvKMUfkVStp8zR8d9EkIWzlIilrTCESSJC4TwWe5Sn82tM31ca1BS5jB9wxrSUGjGsQMHbK2ed+n/PdNNBtQtiM2guwCDyq4VCj0EIa/MRqjoSma5mhMZvPy3ZHhyReysEFwrMSyz0QpDi+kYaEEmAGXs4ILrAKND3q0SpJ18/wtSmlD3Ee9zMIRtKjp9XLnZBu0+E/442AM+jeQfId43WBRDlwFKwjGE4TiFcspJRr5d0LZfvaPhTbyFhrs163xag5dwIw5IQDxo6CKEegHYS++LhbPvGqWI8eovKLaPT4WsrXBWYrUWgiwIDAQAB"
```

**類型：** RSA 公開金鑰（Public Key）

**用途：**
- 保持擴充功能 ID 的一致性
- 在不同版本更新時，Extension ID 保持不變
- 讓使用者能夠順利更新，而不會被視為全新的擴充功能

**安全性：**
- ✅ **公開安全**：這是公鑰，不是私鑰
- ✅ 私鑰（.pem 檔案）已在 `.gitignore` 中，不會被提交
- ✅ 即使公鑰被看到也無法偽造或竄改擴充功能

**相關檔案：**
- ❌ **私鑰不存在於專案中**（已被 .gitignore）

---

### 2. Google OAuth2 Client ID（Google Drive 同步）

**位置：** `public/manifest.json` → `oauth2.client_id` 欄位

```json
"oauth2": {
  "client_id": "731462500420-80ko62k4mmb74jajefi7fio2jftlrc61.apps.googleusercontent.com",
  "scopes": [
    "https://www.googleapis.com/auth/drive.appdata"
  ]
}
```

**類型：** OAuth 2.0 Client ID

**用途：**
- **Google Drive 雲端同步功能**
- 讓使用者透過 Google 帳號登入
- 存取使用者的 Google Drive appDataFolder（私有資料夾）
- 備份和還原書籤資料

**使用流程：**
```
1. 使用者點擊「連線 Google Drive」
   ↓
2. chrome.identity.getAuthToken() 使用此 client_id
   ↓
3. Google 顯示授權畫面（要求 drive.appdata 權限）
   ↓
4. 使用者同意後，取得 access_token
   ↓
5. 使用 access_token 呼叫 Google Drive API
```

**使用位置：**
- `src/app/data/cloud/googleDrive.ts` → `getAuthToken()`
- `src/app/data/syncService.ts` → `connect()`, `backupNow()`, `restoreNow()`
- `src/app/ui/SettingsModal.tsx` → Cloud Sync 面板

**安全性：**
- ✅ **公開安全**：OAuth Client ID 本來就是公開資訊
- ✅ 使用 Chrome Identity API，不需要 client_secret
- ✅ Scopes 限制為 `drive.appdata`（最小權限，只能存取私有資料夾）
- ✅ 重新導向 URI 受 Chrome 保護（只能重新導向到擴充功能）

**Google Cloud Console 設定：**
- 專案名稱：LinkTrove（或您的 GCP 專案名稱）
- 應用程式類型：Chrome 應用程式
- 授權的重新導向 URI：`https://<EXTENSION_ID>.chromiumapp.org/`
- 已啟用的 API：Google Drive API

**注意事項：**
- ⚠️ 上架後獲得正式 Extension ID 時，需要更新 Google Cloud Console 的重新導向 URI

---

### 3. GitHub Personal Access Token（Gist 分享功能）

**位置：**
- **開發環境**：`.env.local` → `VITE_GITHUB_TOKEN`（可選）
- **生產環境**：`chrome.storage.local` → `github.token`（使用者提供）

**類型：** GitHub Personal Access Token（classic）

**用途：**
- **GitHub Gist 分享功能**
- 將書籤群組發布為 HTML 分享頁面
- 上傳到使用者自己的 GitHub Gist

**使用流程：**
```
開發環境：
1. 開發者在 .env.local 設定 VITE_GITHUB_TOKEN（可選）
2. import.meta.env.VITE_GITHUB_TOKEN 直接使用

生產環境：
1. 使用者首次分享時，顯示 Token 設定對話框
2. 使用者前往 GitHub 生成 Token（僅需 gist 權限）
3. 輸入 Token，儲存到 chrome.storage.local
4. 後續分享直接從 chrome.storage.local 讀取
```

**使用位置：**
- `src/app/groups/GroupsView.tsx` → `publishToGist()`
  - 讀取：從 `import.meta.env.VITE_GITHUB_TOKEN` 或 `chrome.storage.local['github.token']`
  - 儲存：設定對話框儲存到 `chrome.storage.local['github.token']`

**所需權限：**
- ✅ 僅需 `gist` 權限（建立和管理 Gists）
- ❌ 不需要 repo、user 等其他權限

**安全性：**
- ✅ **開發環境**：`.env.local` 已在 `.gitignore`，不會被提交
- ✅ **生產環境**：儲存在 `chrome.storage.local`（安全）
  - 不會暴露給網頁內容
  - 不會被其他擴充功能存取
  - 受 Chrome 安全沙箱保護
- ✅ 已實作自動遷移（從 localStorage → chrome.storage.local）

**使用者指引：**
1. 前往 https://github.com/settings/tokens
2. 點擊「Generate new token (classic)」
3. 僅勾選「gist」權限
4. 複製生成的 Token
5. 在 LinkTrove 分享對話框中輸入

---

## 🔐 安全性總結

### 可以公開的 Keys（已在程式碼中）

✅ **Extension Key（公鑰）**
- 位置：manifest.json
- 原因：公鑰本來就可以公開
- 風險：無

✅ **Google OAuth2 Client ID**
- 位置：manifest.json
- 原因：OAuth Client ID 是公開資訊
- 風險：無（受 Chrome Identity API 和 Scopes 保護）

### 必須保密的 Keys（不在程式碼中）

❌ **Extension Private Key（私鑰）**
- 位置：.gitignore（不在專案中）
- 原因：用於簽署擴充功能
- 風險：若洩漏可能被用來偽造更新

❌ **GitHub Personal Access Token**
- 開發環境：.env.local（已在 .gitignore）
- 生產環境：使用者自己提供，儲存於 chrome.storage.local
- 原因：可以存取使用者的 GitHub Gist
- 風險：若洩漏可能被用來操作使用者的 Gist

---

## 📊 Keys 使用對照表

| Key 類型 | 儲存位置 | 功能 | 是否敏感 | 保護措施 |
|---------|---------|------|---------|---------|
| Extension Public Key | manifest.json | 保持 Extension ID 一致 | ❌ 否（公鑰） | 已公開在 manifest |
| Extension Private Key | 不在專案中 | 簽署擴充功能 | ✅ 是 | .gitignore |
| Google OAuth Client ID | manifest.json | Google Drive 同步 | ❌ 否（公開） | Scopes + Chrome Identity |
| GitHub Token (開發) | .env.local | Gist 分享 | ✅ 是 | .gitignore |
| GitHub Token (生產) | chrome.storage.local | Gist 分享 | ✅ 是 | Chrome 安全儲存 |

---

## ⚙️ 環境變數說明

### .env.local（開發環境，可選）

```bash
# GitHub Personal Access Token（開發用，可選）
# 僅用於開發時測試 Gist 分享功能
# 生產環境使用者需自行提供 Token
VITE_GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**注意：**
- ✅ `.env.local` 已在 `.gitignore` 中
- ✅ 建置時不會包含此檔案
- ✅ 生產環境完全依賴使用者輸入

---

## 🔄 上架後需要更新的設定

### Google Cloud Console

**首次上架前：**
- 目前 Extension ID：未知（本地開發用臨時 ID）
- OAuth 重新導向 URI：未設定或使用臨時 ID

**上架後：**
1. 獲得正式 Extension ID（例如：`abcdefghijklmnopqrstuvwxyz123456`）
2. 前往 [Google Cloud Console](https://console.cloud.google.com/)
3. 更新 OAuth 2.0 Client 設定：
   ```
   授權的重新導向 URI：
   https://abcdefghijklmnopqrstuvwxyz123456.chromiumapp.org/
   ```
4. 等待 Google 審核（通常數小時）

---

## 🛡️ 安全最佳實踐

### 目前已實施：

✅ **敏感檔案保護**
```gitignore
.env
.env.local
*.pem
```

✅ **安全儲存**
- GitHub Token 使用 `chrome.storage.local`
- 不使用 localStorage（可被 XSS 攻擊）

✅ **最小權限原則**
- Google Drive：僅 `drive.appdata` scope
- GitHub Token：僅要求 `gist` 權限

✅ **自動遷移**
- 舊版 localStorage token 自動遷移到 chrome.storage.local

### 建議給使用者：

📝 **GitHub Token 安全提示**
- 僅勾選「gist」權限（不要給予更多權限）
- 定期檢查 Token 使用情況
- 若懷疑 Token 洩漏，立即在 GitHub 撤銷並重新生成

---

## 📞 需要協助？

如果對 Keys 使用有任何疑問：
- 查看 PUBLISH.md 瞭解上架流程
- 查看 CLAUDE.md 瞭解專案架構
- GitHub Issues: [專案 URL]/issues
