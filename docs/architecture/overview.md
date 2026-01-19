# 系統概覽（現況）

本文件以現有程式碼為準，提供 LinkTrove 的整體架構概覽，並標註核心模組與入口檔案位置。

**最後更新：2026-01-19**

---

## 核心概念

- **Chrome Extension（Manifest V3）**：以新分頁（new tab）為主要 UI 入口，背景邏輯集中於 service 層與 IndexedDB。
- **資料階層**：Organizations → Categories(Collections) → Subcategories(Groups) → Webpages(Cards)。
- **狀態管理**：以 React Context Provider 為主（Organizations/Categories/Webpages/Templates/OpenTabs）。
- **資料儲存**：IndexedDB（`src/background/idb/*`）為單一資料來源，`chrome.storage` 主要用於 UI 快取或狀態同步。

---

## 入口與主要檔案

- **App 入口**：`src/app/App.tsx`
- **背景服務入口**：`src/background.ts`
- **建置/打包**：`vite.config.ts`、`scripts/postbuild.mjs`
- **擴充頁面**：`public/newtab.html`、`public/popup.html`

---

## 前端模組（app）

### Providers（狀態來源）

- **OrganizationsProvider**：`src/app/sidebar/organizations.tsx`
- **CategoriesProvider**：`src/app/sidebar/categories.tsx`
- **WebpagesProvider**：`src/app/webpages/WebpagesProvider.tsx`
- **TemplatesProvider**：`src/app/templates/TemplatesProvider.tsx`
- **OpenTabsProvider**：`src/app/tabs/OpenTabsProvider.tsx`

### UI 區塊

- **Groups 主畫面**：`src/app/groups/GroupsView.tsx`
- **卡片/拖放/批次操作**：`src/app/webpages/CardGrid.tsx`、`src/app/webpages/TobyLikeCard.tsx`、`src/app/webpages/MoveSelectedDialog.tsx`
- **搜尋（全螢幕 modal）**：`src/app/ui/SearchBox.tsx`
- **Sidebar（Collections）**：`src/app/sidebar/sidebar.tsx`
- **Organization 管理**：`src/app/sidebar/OrganizationNav.tsx`
- **設定/匯入匯出**：`src/app/ui/SettingsModal.tsx`
- **設定子面板**：`DataPanel` / `CloudSyncPanel` / `TemplatesManager`

---

## 背景層（background）

- **Storage Service**：`src/background/storageService.ts`
- **Webpage Service**：`src/background/webpageService.ts`
- **IDB 操作**：`src/background/idb/*`
- **匯入解析**：`src/background/importers/*`
- **Meta 擷取**：`src/background/pageMeta.ts`

---

## 常見擴充功能限制

- **MV3**：Service Worker 無法直接操作 DOM，必須透過 message 或儲存層回傳結果。
- **資料一致性**：UI 端需依賴 IDB 讀取回來的資料作為真正狀態。

---

## 相關文件

- 組件依賴圖：`docs/architecture/component-map.md`
- 資料流向：`docs/architecture/data-flow.md`
- 模組依賴：`docs/architecture/module-dependencies.md`
