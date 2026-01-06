# OpenSpec 安裝與整合指南

> **OpenSpec** 是一個 AI 工具規格定義系統，幫助 AI 更好地理解專案結構與 API
>
> **文檔狀態：** 🚧 待執行
>
> **最後更新：** 2026-01-06

---

## 📋 什麼是 OpenSpec？

OpenSpec 提供結構化的專案規格描述，讓 AI 工具能夠：
- 快速理解專案架構
- 準確定位相關代碼
- 生成符合專案規範的代碼
- 減少修改時的錯誤

---

## 🚀 安裝步驟

### 前置準備

確認開發環境：
```bash
# 檢查 Node.js 版本（需 18+）
node --version

# 確認專案目錄
pwd
# 應輸出：/Users/myaninnovation/Documents/LinkTrove
```

### 安裝 OpenSpec

⚠️ **重要提醒：** 安裝 OpenSpec 需要執行 npm 安裝指令，某些安裝方式可能需要關閉當前 Claude Code Session。

**推薦安裝方式：**

```bash
# 方式 1：全域安裝（推薦）
npm install -g openspec-cli

# 方式 2：專案本地安裝
npm install --save-dev openspec-cli

# 方式 3：使用 npx（無需安裝）
npx openspec-cli --version
```

### 驗證安裝

```bash
# 檢查版本
openspec --version

# 或使用 npx
npx openspec-cli --version
```

---

## 📝 初始化專案

### 創建 OpenSpec 配置

在專案根目錄創建 `.openspec/` 目錄：

```bash
# 創建目錄結構
mkdir -p .openspec

# 初始化（如果 CLI 支援）
openspec init
```

### 配置文件結構

建議的 OpenSpec 配置結構：

```
.openspec/
├── project.yaml          # 專案概述
├── architecture.yaml     # 架構說明
├── apis/                 # API 規格
│   ├── storage.yaml      # IndexedDB API
│   ├── chrome.yaml       # Chrome Extension API
│   └── providers.yaml    # React Context API
└── components/           # 組件規格
    ├── groups.yaml       # GroupsView 模組
    ├── share.yaml        # 分享功能
    └── import.yaml       # 匯入功能
```

---

## 📄 配置範例

### project.yaml（專案概述）

```yaml
name: LinkTrove
version: 1.0.0
description: Chrome Extension for bookmark management
type: chrome-extension

tech_stack:
  - React 18
  - TypeScript
  - Vite 5
  - IndexedDB
  - Chrome Manifest V3

architecture:
  pattern: provider-based
  state_management: React Context API
  storage: IndexedDB
  background: Service Worker

entry_points:
  - src/app/App.tsx
  - src/background.ts
  - public/newtab.html
  - public/popup.html

key_directories:
  - path: src/app/groups/
    description: 群組管理功能（分享、匯入）
  - path: src/background/
    description: 背景服務與資料儲存
  - path: docs/
    description: 專案文檔
```

### architecture.yaml（架構說明）

```yaml
providers:
  - name: OrganizationsProvider
    file: src/app/sidebar/organizations.tsx
    description: 最高層級工作區管理
    dependencies: []

  - name: CategoriesProvider
    file: src/app/sidebar/categories.tsx
    description: 分類（Collections）管理
    dependencies: [OrganizationsProvider]

  - name: WebpagesProvider
    file: src/app/webpages/webpages.tsx
    description: 書籤卡片資料管理
    dependencies: [CategoriesProvider]

modules:
  - name: GroupsView
    path: src/app/groups/GroupsView.tsx
    size: 468 lines
    description: 群組管理主組件（重構後）
    sub_modules:
      - share (分享功能)
      - import (匯入功能)

  - name: Share Module
    path: src/app/groups/share/
    files:
      - generateHTML.ts (~800 lines)
      - useGroupShare.ts (239 lines)
      - dialogs/

  - name: Import Module
    path: src/app/groups/import/
    files:
      - useGroupImport.ts (155 lines)
      - dialogs/
```

### components/groups.yaml（組件規格）

```yaml
component: GroupsView
file: src/app/groups/GroupsView.tsx
lines: 468
refactored_from: 1622 lines (-71%)

dependencies:
  hooks:
    - useGroupShare (分享功能)
    - useGroupImport (匯入功能)
  contexts:
    - WebpagesProvider
    - CategoriesProvider
  components:
    - CardGrid

features:
  - name: 群組管理
    operations: [建立, 刪除, 重新命名]

  - name: 分享功能
    file: share/useGroupShare.ts
    operations:
      - 發布到 GitHub Gist
      - 下載 HTML 檔案
    dialogs:
      - ShareDialog
      - TokenDialog
      - ShareResultDialog

  - name: 匯入功能
    file: import/useGroupImport.ts
    operations:
      - 匯入 Toby JSON (v3/v4)
      - 匯入 HTML 書籤
    dialogs:
      - TobyImportDialog
      - TobyProgressDialog

risk_assessment:
  safe_modifications:
    - 樣式調整
    - UI 文案
  risky_modifications:
    - Hook 介面
    - Provider 結構
    - 匯入解析邏輯

related_docs:
  - docs/architecture/component-map.md
  - docs/meta/REFACTORING_SUMMARY.md
```

---

## 🔗 整合到開發流程

### 1. Claude Code 整合

在 `.claude/settings.local.json` 中配置：

```json
{
  "tools": {
    "openspec": {
      "enabled": true,
      "config_path": ".openspec/"
    }
  }
}
```

### 2. Git 配置

將 OpenSpec 配置加入版本控制：

```bash
# .gitignore 確保不排除 .openspec/
# 檢查是否已排除
grep -q "^.openspec/$" .gitignore && echo "需要移除排除規則" || echo "OK"

# 提交配置
git add .openspec/
git commit -m "feat: 新增 OpenSpec 專案規格配置"
```

### 3. 文檔同步

重要：OpenSpec 配置應與文檔保持同步

- 修改架構後更新 `architecture.yaml`
- 新增功能後更新對應 YAML 檔案
- 與 `docs/architecture/component-map.md` 保持一致

---

## ✅ 驗證安裝成功

### 檢查清單

- [ ] OpenSpec CLI 已安裝並可執行
- [ ] `.openspec/` 目錄已創建
- [ ] `project.yaml` 已配置
- [ ] `architecture.yaml` 已配置
- [ ] 組件規格檔案已創建
- [ ] 與 Claude Code 整合成功
- [ ] Git 提交配置完成

### 測試命令

```bash
# 驗證配置有效性（如果 CLI 支援）
openspec validate

# 查看專案結構
openspec show structure

# 生成文檔（如果支援）
openspec generate docs
```

---

## 🎯 下次 Session 執行計畫

### 階段 1：安裝（需關閉 Session）

1. 關閉當前 Claude Code Session
2. 執行安裝指令
3. 驗證安裝成功
4. 重新開啟 Session

### 階段 2：配置

1. 閱讀 SESSION_HANDOFF.md 恢復上下文
2. 創建 `.openspec/` 目錄結構
3. 撰寫配置檔案（project.yaml、architecture.yaml）
4. 添加組件規格（groups.yaml、share.yaml、import.yaml）

### 階段 3：整合

1. 配置 Claude Code 整合
2. 測試 AI 工具是否能讀取規格
3. 更新 CLAUDE.md 加入 OpenSpec 說明
4. Git 提交所有配置

### 階段 4：維護

1. 建立規格更新流程
2. 與文檔保持同步
3. 定期驗證規格準確性

---

## 📚 相關資源

### 官方文檔
- OpenSpec 官方網站：https://openspec.dev （假設）
- GitHub Repository：https://github.com/openspec/openspec （假設）
- 使用指南：查閱官方文檔

### 專案文檔
- [文檔索引](../INDEX.md)
- [組件關係圖](../architecture/component-map.md)
- [Session 交接](../meta/SESSION_HANDOFF.md)
- [CLAUDE.md](../../CLAUDE.md)

---

## 🔍 常見問題

### Q: 安裝會影響現有功能嗎？
A: 不會。OpenSpec 是開發工具，不影響專案運行。

### Q: 配置錯誤會導致建置失敗嗎？
A: 不會。OpenSpec 配置僅供 AI 工具讀取，與建置無關。

### Q: 如何保持規格與代碼同步？
A: 建議在重大變更後更新對應 YAML 檔案，並加入 Code Review 流程。

### Q: 可以不安裝 OpenSpec 嗎？
A: 可以。這是可選優化，不影響開發流程。但會提升 AI 工具的準確性。

---

**準備好了就開始安裝吧！記得先閱讀 SESSION_HANDOFF.md 確認當前狀態。**
