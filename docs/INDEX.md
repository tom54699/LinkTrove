# LinkTrove 文檔索引

> 本文檔提供 LinkTrove 專案的完整導航索引，幫助快速找到所需資訊

---

## 快速導航

- 🚀 [快速開始](../CLAUDE.md#quick-start) - 開發環境設置與常用命令
- 🏗️ [系統架構](architecture/overview.md) - 專案整體架構說明
- 🧩 [組件關係圖](architecture/component-map.md) - 防止改 A 壞 B 的組件依賴圖
- 📦 [功能列表](#功能文檔) - 各功能模組說明
- 🔄 [Session 交接](meta/SESSION_HANDOFF.md) - AI 工具 Session 交接文檔

---

## 按主題瀏覽

### 架構與設計

- [組件關係圖](architecture/component-map.md) - GroupsView 模組架構與依賴關係
- [系統概覽](architecture/overview.md) - 整體架構說明
- [資料流向](architecture/data-flow.md) - 資料流與狀態管理
- [模組依賴關係](architecture/module-dependencies.md) - 模組間依賴分析

### 功能文檔

- [群組管理](../src/app/groups/) - 群組管理功能（重構後架構）
  - [分享功能](../src/app/groups/share/) - GitHub Gist 分享與 HTML 匯出
  - [匯入功能](../src/app/groups/import/) - Toby JSON 與 HTML 書籤匯入
- [雲端同步](features/cloud-sync.google-drive.md) - Google Drive 同步功能
- [拖放操作](features/drag-drop-storage-display.md) - 拖放排序與儲存

### 規格文檔

- [資料格式](specs/data-format.md) - JSON 資料結構規範
- [書籤元資料映射](specs/book-metadata-mapping.md) - 書籤元資料欄位映射

### 開發指南

- [快速開始](../CLAUDE.md#quick-start) - 安裝與開發命令
- [測試指南](development/testing-guide.md) - 測試策略與執行
- [提交規範](development/commit-conventions.md) - Git 提交訊息規範
- [OpenSpec 安裝](development/openspec-installation.md) - OpenSpec 整合指南

### 元文檔

- [重構總結](meta/REFACTORING_SUMMARY.md) - GroupsView.tsx 重構記錄
- [文檔架構計畫](meta/DOCUMENTATION_PLAN.md) - 本文檔系統的設計計畫
- [Session 交接](meta/SESSION_HANDOFF.md) - AI 工具 Session 交接文檔

---

## 重要提醒

### 修改代碼前必讀

1. **查看組件關係圖** - 修改組件前先閱讀 [component-map.md](architecture/component-map.md)
2. **理解影響範圍** - 確認修改是否會影響其他模組
3. **更新相關文檔** - 重大變更後記得更新對應文檔
4. **更新交接文檔** - Session 結束前更新 [SESSION_HANDOFF.md](meta/SESSION_HANDOFF.md)

### 文檔維護原則

- 新增功能時同步創建功能文檔
- 重構代碼後更新架構文檔
- 保持 CLAUDE.md 精簡，詳細內容放在專門文檔
- 使用交叉引用連結，避免重複內容

---

## 文檔狀態說明

- ✅ **已完成** - 文檔內容完整且最新
- 🚧 **待建立** - 已規劃但尚未創建
- 🔄 **需更新** - 內容需要更新或補充

---

**最後更新：2026-01-07**
