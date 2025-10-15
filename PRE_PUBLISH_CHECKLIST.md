# 📋 LinkTrove 上架前最終檢查清單

> 最後更新：2025-10-15

## ✅ 已完成項目

### 1. 技術準備
- [x] 圖示已生成並包含在 manifest.json
  - [x] icon-16.png (476B)
  - [x] icon-48.png (1.2KB)
  - [x] icon-128.png (3.3KB)
- [x] 商店宣傳圖已生成
  - [x] promo-small.png (23KB, 440×280)
  - [x] promo-large.png (54KB, 1400×560)
- [x] 建置成功，無錯誤
- [x] ZIP 檔案已創建 (linktrove-v0.1.0.zip, 576KB)
- [x] 安全性檢查通過 (9/10 評分)
- [x] 所有敏感資料已妥善保護

### 2. 文件準備
- [x] PUBLISH.md - 上架指南
- [x] PUBLISH_STRATEGY.md - 發布策略
- [x] KEYS_USAGE.md - Keys 使用說明
- [x] CLAUDE.md - 專案文件
- [x] README.md - 專案說明

---

## ⏳ 待完成項目

### 必要項目（上架前必須完成）

#### 1. 準備截圖 (3-5 張)
**尺寸要求：** 1280×800 或 640×400

**建議截圖內容：**
```
□ 截圖 1: 主介面（三欄佈局）
  - 展示左側收藏夾、中間卡片、右側開啟分頁

□ 截圖 2: 拖拉功能演示
  - 展示從開啟分頁拖拉到收藏群組

□ 截圖 3: Google Drive 同步
  - 展示 Settings 中的 Cloud Sync 面板
  - 顯示已連線狀態

□ 截圖 4: GitHub Gist 分享
  - 展示分享群組對話框
  - 或分享結果對話框

□ 截圖 5: 卡片詳細資訊（可選）
  - 展示卡片的 metadata、自訂欄位
```

**截圖方式：**
1. 載入擴充功能到 Chrome
2. 使用系統截圖工具（Cmd+Shift+4）
3. 或使用瀏覽器開發者工具的裝置模擬
4. 儲存為 PNG 格式
5. 放在 `store-assets/screenshots/` 目錄

#### 2. 撰寫隱私權政策
**位置選項：**
- [ ] GitHub Pages (推薦)
- [ ] 個人網站
- [ ] Google Docs (設為公開連結)

**使用範本：** PUBLISH.md 第 281-344 行

**必須包含內容：**
- 收集哪些資料
- 如何使用資料
- 資料儲存位置
- 是否分享給第三方
- 使用者權利

**發布後取得 URL，例如：**
```
https://yourusername.github.io/LinkTrove/privacy-policy.html
```

#### 3. 註冊 Chrome Web Store 開發者帳號
- [ ] 前往 [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole/)
- [ ] 使用 Google 帳號登入
- [ ] 支付一次性開發者註冊費用 (US $5)
- [ ] 完成帳號設定

#### 4. 準備商店描述文案
**已有範本在 PUBLISH.md，但需要自訂：**

**簡短描述（132 字元以內）：**
```
□ 撰寫吸引人的簡短描述
  範本：Toby-like 書籤管理工具：拖拉式儲存分頁、視覺化卡片整理、支援 Google Drive 雲端同步與 GitHub Gist 分享
```

**詳細描述：**
```
□ 複製 PUBLISH.md 範本並修改
□ 加入使用方式說明
□ 加入權限說明
□ 加入支援連結
□ 檢查錯字和格式
```

#### 5. 準備支援連結
```
□ GitHub Issues 連結
  https://github.com/yourusername/LinkTrove/issues

□ 支援電子郵件（可選）
  your-email@example.com

□ 文件連結（可選）
  https://github.com/yourusername/LinkTrove/wiki
```

---

## 🎯 上架流程

### 步驟 1：本地最終測試
```bash
# 1. 載入 dist/ 到 Chrome
# 前往 chrome://extensions/
# 啟用「開發人員模式」
# 點擊「載入未封裝項目」
# 選擇 dist/ 目錄

# 2. 測試所有核心功能
□ 新增/刪除/編輯書籤
□ 拖拉分頁到群組
□ Google Drive 同步（連線、備份、還原）
□ GitHub Gist 分享
□ 匯入 Toby 書籤
□ 多視窗支援
□ 圖示顯示正常

# 3. 檢查 Console 無錯誤
# 按 F12 開啟開發者工具
# 切換到 Console 標籤
# 確認無紅色錯誤訊息
```

### 步驟 2：上傳到 Chrome Web Store

1. **登入 Developer Dashboard**
   - https://chrome.google.com/webstore/devconsole/

2. **點擊「新增項目」**

3. **上傳 ZIP 檔案**
   - 上傳 `linktrove-v0.1.0.zip`

4. **填寫商店資訊**

   **商品詳情：**
   - 應用程式名稱: LinkTrove
   - 簡短描述: (使用準備好的文案)
   - 詳細說明: (使用準備好的文案)
   - 類別: 生產力工具
   - 語言: 繁體中文、英文

   **圖形資源：**
   - 上傳圖示 (已在 ZIP 中)
   - 上傳截圖 (3-5 張)
   - 上傳 promo-small.png
   - 上傳 promo-large.png

   **隱私權實踐：**
   - 勾選使用個人或敏感資料
   - 填寫隱私權政策 URL
   - 說明資料使用方式 (使用 PUBLISH.md 範本)

   **權限說明：**
   - tabs: 讀取開啟的分頁資訊
   - storage: 儲存書籤和設定
   - scripting: 擷取網頁 metadata
   - identity: Google Drive OAuth 登入
   - <all_urls>: 擷取網頁 favicon 和 metadata
   - googleapis.com: Google Drive API

5. **選擇可見性**

   **Beta 測試（建議）：**
   - [x] 不公開
   - 分享測試連結給 10-50 人
   - 測試 1-2 週

   **正式發布：**
   - [x] 公開
   - 所有人可搜尋和安裝

6. **提交審核**
   - 檢查所有資訊
   - 點擊「提交審核」
   - 等待 1-3 天

### 步驟 3：審核通過後

1. **更新 Google Cloud Console**
   ```
   # 取得正式 Extension ID (例如: abcd1234...)
   # 前往 Google Cloud Console
   # 更新 OAuth 重新導向 URI:
   https://<EXTENSION_ID>.chromiumapp.org/
   ```

2. **測試正式版本**
   - 從商店安裝擴充功能
   - 測試 Google Drive 同步
   - 確認所有功能正常

3. **發布**
   - 在 Developer Dashboard 點擊「發布」
   - 或等待自動發布（若已設定）

---

## 📊 檢查清單摘要

### 技術檢查
- [x] 建置成功
- [x] 圖示準備完成
- [x] ZIP 檔案已創建
- [x] 安全性檢查通過

### 商店素材
- [x] 宣傳圖準備完成
- [ ] 截圖準備完成 (3-5 張)

### 文件準備
- [ ] 隱私權政策撰寫並發布
- [ ] 商店描述文案定稿
- [ ] 支援連結準備完成

### 帳號設定
- [ ] Chrome Web Store 開發者帳號已註冊
- [ ] Google Cloud Console OAuth 已設定

### 測試
- [ ] 本地完整測試
- [ ] Console 無錯誤
- [ ] 所有功能正常運作

---

## 🚀 預估時程

**如果現在開始：**

```
Day 1 (今天):
  - 準備截圖 (1-2 小時)
  - 撰寫隱私權政策 (1 小時)
  - 發布隱私權政策 (30 分鐘)
  - 註冊開發者帳號 (30 分鐘)
  - 定稿商店描述 (1 小時)

Day 2:
  - 最終本地測試 (1 小時)
  - 上傳並填寫商店資訊 (1-2 小時)
  - 提交審核

Day 3-5:
  - 等待審核

Day 5-6:
  - 審核通過
  - 更新 OAuth 設定
  - 測試並發布
```

**總時程：5-7 天（含審核）**

---

## 💡 建議

### 現在可以做的：

1. **準備截圖（最重要）**
   - 載入擴充功能
   - 截取各功能畫面
   - 確保截圖清晰、專業

2. **撰寫隱私權政策**
   - 使用 PUBLISH.md 範本
   - 修改為符合實際情況
   - 發布到 GitHub Pages

3. **註冊開發者帳號**
   - 支付 $5 費用
   - 完成帳號設定

4. **準備 Beta 測試（可選）**
   - 先進行小規模測試
   - 降低風險

### 完成後立即可上架！

所有技術準備都已完成，只差商店素材和帳號設定。

---

## 📞 需要協助？

如有問題，請參考：
- PUBLISH.md - 完整上架指南
- PUBLISH_STRATEGY.md - 發布策略
- KEYS_USAGE.md - Keys 使用說明
