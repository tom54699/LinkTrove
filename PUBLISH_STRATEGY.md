# LinkTrove 發布策略（基於 Chrome MV3 官方指南）

> 參考：[Chrome Extensions - 發佈 Manifest V3](https://developer.chrome.com/docs/extensions/develop/migrate/publish-mv3?hl=zh-cn)

## 📋 推薦的發布流程

### 階段 1：Beta 測試（建議）

#### 1.1 準備 Beta 版本

**修改 manifest.json：**
```json
{
  "name": "LinkTrove (Beta)",
  "version": "0.9.0",
  "description": "Toby-like bookmark manager (Beta testing)"
}
```

**目的：**
- 向小規模測試人員收集反饋
- 發現潛在問題
- 驗證核心功能
- 測試 Google Drive OAuth 流程

#### 1.2 Beta 測試方式

**方式 1：不公開發布（推薦新手）**
- 在 Chrome Web Store 選擇「不公開」
- 生成直接安裝連結
- 分享給 10-50 位測試者
- 優點：不會出現在商店搜尋中，問題影響範圍小

**方式 2：公開 Beta**
- 標記為 Beta 版本（名稱中加入 Beta）
- 小範圍推廣
- 積極收集反饋

**測試重點：**
```
□ Google Drive 同步功能
□ GitHub Gist 分享功能
□ 多瀏覽器視窗支援
□ 拖拉功能穩定性
□ 匯入 Toby 書籤
□ 各種瀏覽器版本相容性
```

#### 1.3 Beta 測試期建議

- **時長**：1-2 週
- **測試人數**：10-50 人
- **收集資料**：
  - 錯誤報告
  - 功能建議
  - 使用體驗
  - 效能問題

---

### 階段 2：正式發布

#### 2.1 準備正式版本

**更新 manifest.json：**
```json
{
  "name": "LinkTrove",
  "version": "1.0.0",
  "description": "Toby-like bookmark manager with cloud sync and beautiful card UI"
}
```

**發布前檢查清單：**
```
□ 修復所有 Beta 期間的已知問題
□ 更新截圖（使用最新 UI）
□ 準備完整的商店描述
□ 撰寫隱私權政策
□ 準備支援連結（GitHub Issues 或電子郵件）
□ 測試所有核心功能
□ 檢查權限說明是否清楚
□ 確認 OAuth 設定正確
```

#### 2.2 發布策略選擇

**選項 A：立即完全發布（適合小專案）**
- 通過審核後立即向所有用戶發布
- 適合：首次發布、用戶基數小
- 風險：若有問題影響所有用戶

**選項 B：分階段發布（適合大型專案）**
- **條件**：活躍用戶超過 10,000 人
- **流程**：
  1. 初始發布給 10% 用戶
  2. 觀察 24-48 小時
  3. 若無重大問題，增加到 50%
  4. 再觀察 24 小時
  5. 最終發布給 100% 用戶

**LinkTrove 建議：選項 A**
- 首次發布，用戶基數為 0
- Beta 測試已驗證穩定性
- 可隨時回滾或推送修復版本

---

### 階段 3：審核與發布

#### 3.1 提交審核

**審核時間：**
- 大多數擴充功能：1-3 天
- 複雜權限或功能：可能需要更長時間

**審核重點：**
```
✓ 權限使用是否合理
✓ 隱私權政策是否完整
✓ 功能描述是否準確
✓ OAuth 設定是否正確
✓ 是否符合商店政策
```

**可能被拒絕的原因：**
- ❌ 權限說明不清楚
- ❌ 隱私權政策缺失或不完整
- ❌ 要求過多不必要的權限
- ❌ 功能與描述不符
- ❌ 含有惡意程式碼

#### 3.2 審核通過後

**發布期限：**
- 審核通過後有 **30 天**發布期限
- 建議盡快發布（除非需要協調其他事項）

**發布前最後確認：**
```
□ OAuth 重新導向 URI 已更新（使用正式 Extension ID）
□ Google Cloud Console 設定已更新
□ 測試正式 Extension ID 版本
□ 準備好支援管道
```

---

## 🛡️ 風險控制策略

### 1. 準備快速回滾

**保留上一個穩定版本：**
```bash
# 建立發布分支
git checkout -b release/v1.0.0
git tag v1.0.0

# 保留 ZIP 備份
cp linktrove-extension.zip linktrove-v1.0.0-backup.zip
```

**若發現重大問題：**
1. 立即從商店下架（暫時）
2. 推送修復版本（緊急審核通常較快）
3. 或回滾到上一版本

### 2. 監控用戶反饋

**設置反饋管道：**
- GitHub Issues（主要）
- Chrome Web Store 評論（每日檢查）
- 電子郵件支援
- 社群媒體（可選）

**重點監控指標：**
```
- 安裝量 vs 移除量
- 評分變化
- 常見問題類型
- 錯誤報告
```

### 3. 分階段功能發布

**使用 Feature Flags：**
```typescript
// 範例：逐步開放新功能
const FEATURES = {
  advancedSync: import.meta.env.VITE_ENABLE_ADVANCED_SYNC === 'true',
  aiSuggestions: import.meta.env.VITE_ENABLE_AI === 'true',
};

// 或使用遠端配置（未來可考慮）
```

---

## 📊 發布時間表建議

### 第 1 週：Beta 準備
```
Day 1-2: 完成 Beta 版本建置
Day 3:   提交 Beta 審核
Day 4-7: 等待審核通過
```

### 第 2-3 週：Beta 測試
```
Day 8:    Beta 版本上線
Day 8-14: 招募測試者（目標 20-50 人）
Day 15-21: 收集反饋、修復問題
```

### 第 4 週：正式版準備
```
Day 22-24: 修復 Beta 問題
Day 25:    準備正式版素材
Day 26:    提交正式版審核
Day 27-29: 等待審核
```

### 第 5 週：正式發布
```
Day 30:    審核通過
Day 30:    更新 OAuth 設定
Day 30-31: 最終測試
Day 31:    正式發布 🎉
```

**總時程：約 4-5 週**

---

## 🎯 LinkTrove 具體發布計劃

### Phase 0：準備工作（當前）
```
☐ 生成 PNG 圖示
  - 執行 ./scripts/generate-icons.sh
  - 或使用線上工具轉換 SVG

☐ 準備截圖
  - 截取主要功能畫面（3-5 張）
  - 尺寸：1280×800 或 640×400
  - 重點：拖拉功能、雲端同步、分享功能

☐ 撰寫隱私權政策
  - 使用 PUBLISH.md 中的範本
  - 發布到 GitHub Pages 或個人網站
  - 取得公開 URL

☐ 註冊開發者帳號
  - Chrome Web Store ($5 一次性費用)

☐ 最終測試
  - 本地完整測試所有功能
  - 確認建置無錯誤
```

### Phase 1：Beta 測試（可選，建議）
```
☐ 創建 Beta 版本
  - 更新 manifest.json 名稱加入 (Beta)
  - 版本設為 0.9.x

☐ 提交 Beta 審核
  - 選擇「不公開」發布
  - 填寫所有必要資訊

☐ Beta 測試（1-2 週）
  - 招募 10-20 位測試者
  - 收集反饋
  - 修復問題
```

### Phase 2：正式發布
```
☐ 準備正式版本
  - 版本號：1.0.0
  - 移除 (Beta) 標記
  - 更新所有文案

☐ 提交審核
  - 選擇「公開」發布
  - 完整填寫商店資訊

☐ 等待審核（1-3 天）

☐ 審核通過後
  - 更新 Google Cloud Console OAuth URI
  - 使用正式 Extension ID
  - 最終測試

☐ 正式發布 🚀
```

---

## 💡 其他最佳實踐

### 1. 版本號策略

遵循 [Semantic Versioning](https://semver.org/)：

```
0.9.x - Beta 測試版本
1.0.0 - 首次正式發布
1.0.x - Bug 修復
1.x.0 - 新功能（向下相容）
x.0.0 - 重大變更（可能不相容）
```

### 2. 更新說明

**在商店中提供清晰的更新說明：**
```
v1.0.0 (2025-10-20)
- 🎉 首次正式發布
- ✨ 完整的書籤管理功能
- ☁️ Google Drive 雲端同步
- 🔗 GitHub Gist 分享
- 📥 Toby 書籤匯入支援

v1.0.1 (2025-10-25)
- 🐛 修復 Google Drive 同步偶爾失敗的問題
- 🐛 修復多視窗拖拉時的顯示問題
- 🎨 改善圖示顯示
```

### 3. 支援連結

**在商店頁面提供清楚的支援管道：**
- 📧 Email: your-email@example.com
- 🐛 Bug Report: https://github.com/yourusername/LinkTrove/issues
- 📖 Documentation: https://github.com/yourusername/LinkTrove/wiki
- 💬 Discussions: https://github.com/yourusername/LinkTrove/discussions

### 4. 用戶溝通

**在商店描述中說明：**
```markdown
## 回饋與支援

我們重視您的意見！若遇到問題或有建議：

1. 在 Chrome Web Store 留下評論（我們會回覆）
2. 在 GitHub 提交 Issue
3. 寄信到支援信箱

## 開發路線圖

我們正在開發：
- [ ] 更多雲端同步選項（Dropbox, OneDrive）
- [ ] 行動裝置同步
- [ ] 進階搜尋功能
- [ ] 主題自訂

歡迎在 GitHub Discussions 提出您的想法！
```

---

## 📞 需要協助？

發布過程中若遇到問題：

1. **審核被拒**：檢查拒絕原因，通常是權限說明或隱私權政策問題
2. **OAuth 問題**：確認 Google Cloud Console 設定與 Extension ID 一致
3. **技術問題**：查看 PUBLISH.md 和 KEYS_USAGE.md

**參考資源：**
- [Chrome Web Store 開發者政策](https://developer.chrome.com/docs/webstore/program-policies/)
- [Chrome Extensions 文件](https://developer.chrome.com/docs/extensions/)
- [發布 MV3 擴充功能指南](https://developer.chrome.com/docs/extensions/develop/migrate/publish-mv3)

---

## ✅ 總結

LinkTrove 發布策略：

1. **Beta 測試（建議）**：1-2 週小規模測試
2. **正式發布**：完全發布（非分階段）
3. **監控反饋**：積極回應用戶問題
4. **快速迭代**：準備好快速推送修復

**預估總時程：4-5 週**

成功的關鍵：
- ✅ 充分的 Beta 測試
- ✅ 清楚的權限說明
- ✅ 完整的隱私權政策
- ✅ 積極的用戶支援
