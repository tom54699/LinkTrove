# 資料流向與狀態管理（現況）

本文件描述**現有流程**，包含 UI → Provider → Service → IndexedDB 的路徑與回流節點。

**最後更新：2026-01-19**

---

## 高層資料流

1. **UI 互動**（例如拖放、編輯卡片）
2. **Provider actions**（`useWebpages / useCategories / useOrganizations`）
3. **Service 層**（`webpageService / storageService`）
4. **IndexedDB 寫入**
5. **Provider reload / local state 更新**

---

## Webpages（卡片）流程

### 新增卡片（常見入口：拖放 / 新增）

- UI：`src/app/webpages/CardGrid.tsx`
- Provider：`src/app/webpages/WebpagesProvider.tsx`
  - `actions.addFromTab(tab, { categoryId?, subcategoryId?, beforeId? })`
- Service：`src/background/webpageService.ts`
  - `addWebpageFromTab`（支援帶入 group 與排序）
- 儲存：`src/background/idb/storage.ts` → `webpages` store

#### 重要備註

- 拖放到 Group 時，`CardGrid` 會計算 `beforeId`，由 `GroupsView` 傳入 `addFromTab`，一次完成建立 + 指派 group + 排序。

### 更新卡片（title/url/note/meta）

- UI：`src/app/webpages/TobyLikeCard.tsx`
- Provider：`WebpagesProvider.actions.update*`
- Service：`webpageService.updateWebpage`
- 儲存：IDB `webpages`

---

## Groups（群組）流程

### 群組資料載入

- `GroupsView` 透過 `storageService.listSubcategories`
- 來源：IDB `subcategories` store

### 群組內排序

- 排序資訊儲存在 IDB meta：`order.subcat.<groupId>`
- Service：`webpageService.reorderWebpages` / `moveCardToGroup`

### 跨群組移動（drop 既有卡片）

- UI：`CardGrid` 計算 `beforeId`
- Provider：`actions.moveCardToGroup(cardId, categoryId, groupId, beforeId)`
- Service：`webpageService.moveCardToGroup`（原子更新）

---

## 批次操作（多選）

- UI：`CardGrid`（選取狀態與工具列）
- 批次移動：`onUpdateCategory` + `storageService.updateCardSubcategory`（逐筆）
- 批次刪除：`onDeleteMany(ids)`
- 批次開啟：`window.open` 逐筆開啟

---

## 操作鎖定（Drop 時的重複載入防護）

- `WebpagesProvider` 在 drop 操作期間設置短暫鎖定
- `chrome.storage.onChanged` 監聽在鎖定期內跳過 `load()`
- 目的：降低 drop 期間的冗餘重渲染

---

## Categories / Organizations

- Provider：`src/app/sidebar/categories.tsx`、`src/app/sidebar/organizations.tsx`
- Service：`storageService` + `idb/*` 直接操作
- 依賴：`categories.organizationId` 決定作用域

---

## 匯入 / 匯出

- UI：`src/app/App.tsx`（Settings 區塊）
- Service：`src/app/data/exportImport.ts`
- IDB：`storageService.importData` / `exportData`

---

## 雲端同步（現況設計狀態）

已存在服務碼與測試，但是否啟用需依實際 UI/設定流程：

- `src/app/data/syncService.ts`
- `src/app/data/cloud/googleDrive.ts`

目前同步機制採用：
- `mergeLWW`（`src/app/data/mergeService.ts`）
- `cloudSync.status` 存於 `chrome.storage.local`

---

## 重要注意事項

- UI 端若要反映最新資料，需呼叫 provider `load()` 或觸發 reload。
- IDB 是唯一真實資料來源，`chrome.storage` 主要作為快取與 UI 同步。
