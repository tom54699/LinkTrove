# Chrome Web Store 上架指南與安全檢查

## 🔒 安全性檢查清單

### ✅ 已通過的安全措施

1. **敏感資料儲存**
   - ✅ GitHub Token 使用 `chrome.storage.local` 安全儲存（非 localStorage）
   - ✅ Token 不會暴露給網頁內容或其他擴充功能
   - ✅ 已實作自動遷移機制（localStorage → chrome.storage.local）
   - ✅ `.env` 和 `.env.local` 已加入 `.gitignore`

2. **OAuth 憑證**
   - ✅ Google OAuth2 `client_id` 在 manifest.json 中（公開安全）
   - ✅ 使用 Chrome Identity API（無需 client_secret）
   - ✅ Scopes 限制為 `drive.appdata`（最小權限）

3. **環境變數管理**
   - ✅ `VITE_GITHUB_TOKEN` 僅用於開發環境
   - ✅ 生產環境要求使用者自行提供 Token
   - ✅ `.env.local` 不會被提交到 Git

4. **Manifest Key**
   - ⚠️ `manifest.json` 中的 `key` 欄位為公開金鑰（安全）
   - ℹ️ 此 key 用於保持擴充功能 ID 一致性
   - ℹ️ 私鑰（.pem）已在 `.gitignore` 中

5. **權限設置**
   - ✅ `permissions`: tabs, storage, scripting, identity（必要權限）
   - ✅ `host_permissions`: `<all_urls>` 用於 meta extraction
   - ✅ `host_permissions`: `https://www.googleapis.com/*` 用於 Google Drive API

### ⚠️ 需要注意的項目

1. **上架前必須移除的內容**
   - ⚠️ **CLAUDE.md 第 61 行**：提到 "localStorage" 的描述已過時
     ```markdown
     # 需要更新
     - Token is securely stored in browser localStorage
     # 應改為
     - Token is securely stored in chrome.storage.local
     ```

2. **開發用環境變數**
   - ℹ️ `VITE_GITHUB_TOKEN` 僅在開發環境使用
   - ℹ️ 建置時不會包含 `.env.local` 檔案
   - ✅ 生產環境完全依賴使用者輸入

### 🔐 安全評分：9/10

唯一的小問題是文件描述過時，不影響安全性。

---

## 📦 Chrome Web Store 上架步驟

### 步驟 1：準備資料

#### 1.1 建置生產版本
```bash
npm run build
```

#### 1.2 檢查 dist/ 目錄
- ✅ `manifest.json` 存在
- ✅ `background.js` 存在
- ✅ `popup.html` 和 `newtab.html` 存在
- ✅ `assets/` 目錄包含所有資源

#### 1.3 測試打包檔案
```bash
cd dist
zip -r ../linktrove-extension.zip .
```

#### 1.4 本地測試
1. 開啟 Chrome → `chrome://extensions/`
2. 啟用「開發人員模式」
3. 點擊「載入未封裝項目」
4. 選擇 `dist/` 目錄
5. 測試所有功能

### 步驟 2：準備商店素材

#### 2.1 必要圖示
創建以下尺寸的圖示（放在專案根目錄 `store-assets/`）：

```
store-assets/
├── icon-128.png     # 128x128 (manifest 使用)
├── icon-48.png      # 48x48 (manifest 使用)
├── icon-16.png      # 16x16 (manifest 使用)
├── screenshot-1.png # 1280x800 或 640x400
├── screenshot-2.png # 1280x800 或 640x400
├── screenshot-3.png # 1280x800 或 640x400
├── promo-small.png  # 440x280 (商店小圖)
└── promo-large.png  # 1400x560 (商店大圖)
```

**注意：** 目前 manifest.json 中沒有 `icons` 欄位，需要新增：
```json
"icons": {
  "16": "icon-16.png",
  "48": "icon-48.png",
  "128": "icon-128.png"
}
```

#### 2.2 商店描述文案

**簡短描述（132 字元內）：**
```
Toby-like 書籤管理工具：拖拉式儲存分頁、視覺化卡片整理、支援 Google Drive 雲端同步與 GitHub Gist 分享
```

**詳細描述：**
```markdown
# LinkTrove - 視覺化書籤管理工具

LinkTrove 是一款仿 Toby 的現代化書籤管理擴充功能，提供直覺的拖拉式分頁管理與美觀的卡片介面。

## 主要功能

### 📁 視覺化整理
- 三欄式介面：收藏夾、卡片區、開啟分頁
- 拖拉操作：從「開啟分頁」拖曳至收藏群組快速儲存
- 階層式組織：組織 → 分類 → 群組 → 網頁

### ☁️ Google Drive 雲端同步
- 自動備份至 Google Drive appDataFolder
- 細粒度 LWW 合併策略（Last-Write-Wins）
- 衝突檢測與解決
- 本地快照功能

### 🔗 GitHub Gist 分享
- 一鍵發布群組為 HTML 分享頁面
- 永久保存於您的 GitHub Gist
- 精美的靜態頁面設計

### 📥 匯入/匯出
- 支援 Toby v3/v4 JSON 格式
- HTML 書籤匯入（Netscape Bookmark File）
- 完整專案 JSON 匯出

### 🎨 自訂模板
- 為書籤添加自訂欄位（評分、標籤、日期等）
- 支援多種欄位類型

### 🔒 隱私保護
- 所有資料儲存於本地 IndexedDB
- Google Drive 使用私有的 appDataFolder
- GitHub Token 安全儲存於 chrome.storage.local

## 使用方式

1. 安裝擴充功能後，新分頁會自動顯示 LinkTrove
2. 從右側「開啟分頁」面板拖曳分頁到收藏群組
3. 點擊設定按鈕啟用 Google Drive 同步（可選）
4. 使用右鍵選單管理群組和卡片

## 權限說明

- **tabs**: 讀取開啟的分頁資訊
- **storage**: 儲存書籤和設定
- **scripting**: 擷取網頁 metadata
- **identity**: Google Drive OAuth 登入
- **host_permissions**: 擷取網頁 favicon 和 metadata

## 開源專案

LinkTrove 是開源專案，歡迎在 GitHub 上提出建議或貢獻程式碼。
GitHub: https://github.com/yourusername/LinkTrove
```

### 步驟 3：Chrome Web Store 開發者帳戶

#### 3.1 註冊開發者帳戶
1. 前往 [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole/)
2. 使用 Google 帳號登入
3. 支付一次性開發者註冊費用（US $5）

#### 3.2 OAuth 設定檢查

**Google Cloud Console 設定：**
1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 確認 OAuth 2.0 Client ID 已設定：
   - Client ID: `731462500420-80ko62k4mmb74jajefi7fio2jftlrc61.apps.googleusercontent.com`
   - 應用程式類型：Chrome 應用程式
   - 已授權的重新導向 URI：
     ```
     https://<EXTENSION_ID>.chromiumapp.org/
     ```
3. 啟用 Google Drive API

**注意：** 首次上架後才會獲得正式的 Extension ID，屆時需要更新 OAuth 重新導向 URI。

### 步驟 4：上傳擴充功能

#### 4.1 建立新項目
1. 登入 Chrome Web Store Developer Dashboard
2. 點擊「新增項目」
3. 上傳 `linktrove-extension.zip`

#### 4.2 填寫商店資訊
1. **商品詳情**
   - 應用程式名稱：LinkTrove
   - 簡短描述：（使用上述文案）
   - 詳細說明：（使用上述文案）
   - 類別：生產力工具
   - 語言：繁體中文、英文

2. **圖形資源**
   - 上傳所有準備好的圖示和截圖

3. **隱私權實踐**
   - 勾選：「這個項目會使用個人或敏感的使用者資料」
   - 說明：
     ```
     LinkTrove 收集以下資料：
     - 書籤 URL 和標題（儲存於本地 IndexedDB）
     - 開啟的分頁資訊（不上傳，僅用於顯示）
     - Google Drive 同步資料（僅儲存於使用者的私有 appDataFolder）

     所有資料僅儲存於使用者本地或使用者自己的 Google Drive，
     不會上傳至我們的伺服器。
     ```
   - 隱私權政策 URL：（需要準備）

4. **單一用途**
   說明：
   ```
   LinkTrove 是一款書籤管理工具，主要功能為：
   - 視覺化管理和整理瀏覽器書籤
   - 提供拖拉式介面快速儲存開啟的分頁
   - 可選的 Google Drive 雲端同步功能
   - 分享書籤群組功能
   ```

#### 4.3 權限說明

Chrome Web Store 會要求說明每個權限的用途：

| 權限 | 用途說明 |
|------|---------|
| `tabs` | 讀取開啟的分頁資訊並顯示於右側面板，供使用者拖曳儲存 |
| `storage` | 儲存書籤資料、使用者設定和雲端同步狀態於本地 |
| `scripting` | 擷取網頁的 metadata（標題、描述、favicon）以豐富書籤資訊 |
| `identity` | 透過 Google OAuth 登入並同步資料至使用者的 Google Drive |
| `<all_urls>` | 擷取任意網頁的 metadata 和 favicon |
| `https://www.googleapis.com/*` | 存取 Google Drive API 進行雲端同步 |

### 步驟 5：隱私權政策

**必須準備一個公開的隱私權政策頁面**，可以放在：
- GitHub Pages
- 專案 README
- 個人網站

**範本：**
```markdown
# LinkTrove 隱私權政策

最後更新日期：2025年10月15日

## 資料收集

LinkTrove 收集並儲存以下資料：

### 本地儲存資料
- 書籤 URL、標題、描述
- 書籤分類和群組資訊
- 使用者自訂的書籤欄位
- 應用程式設定

**儲存位置：** 所有資料僅儲存於您瀏覽器的本地 IndexedDB，不會上傳至我們的伺服器。

### Google Drive 同步（可選）
若您啟用 Google Drive 同步功能：
- 書籤資料會備份至您的 Google Drive appDataFolder
- appDataFolder 是您 Google Drive 中的私有資料夾，只有 LinkTrove 可以存取
- 我們無法存取您的 Google Drive 資料

### GitHub Token（可選）
若您使用 GitHub Gist 分享功能：
- 您提供的 GitHub Personal Access Token 會安全儲存於 chrome.storage.local
- Token 僅用於發布分享連結至您的 GitHub Gist
- 我們無法存取您的 Token

## 資料使用

我們收集的資料僅用於：
- 在應用程式中顯示您的書籤
- 提供雲端同步功能
- 發布分享連結

## 資料分享

我們**不會**將您的資料分享給第三方。所有資料僅存在於：
- 您的瀏覽器本地儲存
- 您的 Google Drive（若啟用同步）
- 您的 GitHub Gist（若使用分享功能）

## 資料安全

- 所有敏感資訊使用 Chrome 的安全儲存機制
- Google Drive 使用 OAuth 2.0 安全認證
- GitHub Token 儲存於 chrome.storage.local（不會暴露給網頁）

## 您的權利

您可以隨時：
- 匯出所有書籤資料
- 刪除所有本地資料
- 中斷 Google Drive 連線
- 移除 GitHub Token

## 聯絡我們

如有任何隱私權問題，請透過以下方式聯絡：
- GitHub Issues: https://github.com/yourusername/LinkTrove/issues
- Email: your-email@example.com
```

### 步驟 6：審查與發布

#### 6.1 自我檢查清單
- [ ] 所有功能正常運作
- [ ] 沒有 console 錯誤
- [ ] 權限使用說明清楚
- [ ] 圖示和截圖準備完成
- [ ] 隱私權政策已發布
- [ ] manifest.json 包含必要資訊
- [ ] 已測試 Google Drive 同步
- [ ] 已測試 GitHub Gist 分享

#### 6.2 提交審查
1. 在 Developer Dashboard 點擊「提交審查」
2. 選擇可見性：「公開」或「不公開」
3. 審查時間：通常 1-3 個工作日

#### 6.3 審查後處理

**若被拒絕：**
- 查看拒絕原因
- 修正問題
- 重新上傳並提交

**若通過：**
1. 獲得正式 Extension ID
2. 更新 Google Cloud Console 的 OAuth 重新導向 URI：
   ```
   https://<EXTENSION_ID>.chromiumapp.org/
   ```
3. 等待 Google 審核 OAuth 更新（數小時至1天）

---

## 🔧 上架前需要修改的檔案

### 1. manifest.json
```json
{
  // 新增圖示
  "icons": {
    "16": "icon-16.png",
    "48": "icon-48.png",
    "128": "icon-128.png"
  },

  // 更新版本（如果需要）
  "version": "1.0.0",

  // 更新描述為英文
  "description": "Toby-like bookmark manager with drag-and-drop, cloud sync, and beautiful card UI"
}
```

### 2. CLAUDE.md（第 61 行）
```markdown
# 更新前
- Token is securely stored in browser localStorage

# 更新後
- Token is securely stored in chrome.storage.local (secure extension storage)
```

### 3. 創建圖示檔案
需要設計師協助創建以下檔案：
- `public/icon-16.png`
- `public/icon-48.png`
- `public/icon-128.png`

### 4. 準備商店資源
```bash
mkdir store-assets
# 將所有商店圖片放在此目錄
```

---

## ⚡ 快速建置檢查腳本

創建 `scripts/pre-publish-check.sh`：

```bash
#!/bin/bash

echo "🔍 LinkTrove 上架前檢查..."

# 檢查必要檔案
echo "📦 檢查必要檔案..."
files=(
  "public/manifest.json"
  "public/icon-16.png"
  "public/icon-48.png"
  "public/icon-128.png"
  ".gitignore"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "  ✅ $file"
  else
    echo "  ❌ $file 缺少"
  fi
done

# 檢查 .env 檔案沒有被提交
echo ""
echo "🔒 檢查敏感檔案..."
if git ls-files | grep -q "\.env"; then
  echo "  ❌ .env 檔案不應該被提交到 Git"
else
  echo "  ✅ .env 檔案未被提交"
fi

# 建置
echo ""
echo "🔨 建置擴充功能..."
npm run build

if [ $? -eq 0 ]; then
  echo "  ✅ 建置成功"
else
  echo "  ❌ 建置失敗"
  exit 1
fi

# 創建 ZIP
echo ""
echo "📦 打包擴充功能..."
cd dist
zip -r ../linktrove-extension.zip . -x "*.DS_Store"
cd ..
echo "  ✅ 已創建 linktrove-extension.zip"

echo ""
echo "✅ 檢查完成！請檢查 linktrove-extension.zip"
```

---

## 📝 檢查清單總結

### 安全性
- [x] GitHub Token 使用 chrome.storage.local
- [x] .env 檔案在 .gitignore 中
- [x] manifest.json 的 key 是公鑰（安全）
- [x] OAuth client_id 公開（符合規範）
- [ ] 更新 CLAUDE.md 中過時的描述

### 上架準備
- [ ] 創建圖示檔案（16x16, 48x48, 128x128）
- [ ] 更新 manifest.json 加入 icons
- [ ] 準備商店截圖
- [ ] 撰寫隱私權政策並發布
- [ ] 註冊 Chrome Web Store 開發者帳號
- [ ] 建置並測試最終版本
- [ ] 打包 ZIP 檔案
- [ ] 準備商店描述文案

### Google OAuth
- [ ] 確認 Google Cloud Console 設定
- [ ] 等待首次上架獲得 Extension ID
- [ ] 更新 OAuth 重新導向 URI

---

需要協助的話，請隨時詢問！
