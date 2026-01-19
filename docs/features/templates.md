# 模板功能（Templates）

本文件整理模板系統的現況與約束，供開發與維護參考。

**最後更新：2026-01-19**

---

## 範疇與入口

- UI 元件：`src/app/templates/TemplatesManager.tsx`
- Provider：`src/app/templates/TemplatesProvider.tsx`
- 入口位置：Settings → Templates

---

## 功能概覽

- 模板 CRUD（新增、編輯、刪除、重新命名）
- 模板欄位管理（新增/排序/刪除/必填/型別/選項）
- 快速預設模板：
  - 書籍模板
  - 工具模板
- 模板使用數統計（被多少 Collection 作為 defaultTemplateId）

---

## 資料與儲存

- **IndexedDB**：`storageService.saveTemplates/loadTemplates`
- **chrome.storage.local**：作為 UI 快取（讀取優先）
- **Cloud Sync**：觸發 `cloudsync:restored` 時重新載入模板

---

## 欄位型別（支援）

- `text` / `number` / `date` / `url`
- `select`（多個選項）
- `rating`
- `tags`

---

## 欄位鍵（key）限制

- 僅允許 **英文字母 / 數字 / 底線**
- 同一模板內不可重複
- 驗證失敗時阻止儲存並提示錯誤

---

## 刪除限制

- 若模板被任一 Collection 使用（`defaultTemplateId`），禁止刪除

---

## 模板套用方式

- Collection 具有 `defaultTemplateId`
- 卡片渲染時依該模板顯示欄位（`TobyLikeCard.tsx`）

---

## 已知限制

- 無模板變數替換（`{{ }}` 類型）
- 無模板版本管理或遷移流程
