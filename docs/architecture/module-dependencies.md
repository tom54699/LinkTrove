# 模組依賴關係（現況）

本文件以**檔案級別**列出主要模組的依賴關係，便於重構時快速定位影響面。

**最後更新：2026-01-07**

---

## App 主流程

- `src/app/App.tsx`
  - Providers：`OrganizationsProvider`、`CategoriesProvider`、`WebpagesProvider`、`TemplatesProvider`
  - Settings 匯入/匯出：`src/app/data/exportImport.ts`

---

## Groups 模組

- `src/app/groups/GroupsView.tsx`
  - UI：`CardGrid`（`src/app/webpages/CardGrid.tsx`）
  - Hooks：`useGroupShare`、`useGroupImport`
  - Services：`storageService.listSubcategories`、`updateCardSubcategory`

- `src/app/groups/share/*`
  - `useGroupShare.ts`
  - `generateHTML.ts`

- `src/app/groups/import/*`
  - `useGroupImport.ts`
  - `src/background/importers/html.ts`
  - `src/background/importers/toby.ts`

---

## Webpages（卡片）

- `src/app/webpages/WebpagesProvider.tsx`
  - `createWebpageService`（`src/background/webpageService.ts`）
  - `computeAutoMeta`（`src/app/webpages/metaAutoFill.ts`）

- `src/app/webpages/CardGrid.tsx`
  - `TobyLikeCard`（`src/app/webpages/TobyLikeCard.tsx`）
  - Drag context（`src/app/dnd/*`）

---

## Sidebar / 組織與分類

- `src/app/sidebar/sidebar.tsx`
  - `useCategories`（`src/app/sidebar/categories.tsx`）
  - `useOrganizations`（`src/app/sidebar/organizations.tsx`）
  - `useWebpages`（`src/app/webpages/WebpagesProvider.tsx`）

- `src/app/sidebar/categories.tsx`
  - `storageService` / IDB

- `src/app/sidebar/organizations.tsx`
  - `idb/db.ts`（`getAll`, `tx`, `setMeta`）

---

## 背景層

- `src/background/webpageService.ts`
  - `storageService`（`src/background/storageService.ts`）
  - `idb/db.ts`（`getMeta`/`setMeta`）
  - `pageMeta.ts`

- `src/background/storageService.ts`
  - `idb/storage.ts`（實際 IDB 實作）

- `src/background/importers/*`
  - 依賴 `storageService` 與 `idb/db.ts`

---

## 同步與資料合併

- `src/app/data/syncService.ts`
  - `mergeService.ts`（LWW）
  - `cloud/googleDrive.ts`
  - `storageService`

---

## 測試依賴分布（高層）

測試檔案集中於：
- `src/app/**/__tests__`
- `src/background/**/__tests__`

大量測試仰賴 `fake-indexeddb` 與 jsdom。
