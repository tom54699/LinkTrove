# 14.x Organizations 任務計劃（新增層級：organization）

> 說明：本檔聚焦「Organizations」階層的導入與遷移，延續既有資料模型與 UI。執行時仍遵循專案工作流（TDD、順序、DoD）。

## 目標與對應

- 資料層級：organization → collection(=category) → group(=subcategory) → card(=webpage)
- Toby v3 對應：list → group（匯入到單一新 collection 或既有 collection）
- Toby v4 對應：group → collection、lists → group；若有 organizations：organization → organization（新建），group → collection，list → group

## 資料模型

- 新增 OrganizationData：`{ id: string; name: string; color?: string; order: number }`
- 調整 CategoryData：新增 `organizationId?: string`（遷移期間 optional，完成後視情況改為必填）
- 既有 SubcategoryData、WebpageData 不變
- ID 命名慣例：`o_`（organization）、`c_`（category）、`g_`（group）、`w_`（webpage）

## IndexedDB 遷移（DB v2 → v3）

- `openDb()` 版本升級為 `3`
- 建立 `organizations` store（`keyPath: id`，index：`order`）
- 為 `categories` 增加 index：`by_organizationId`、`by_organizationId_order`
- 遷移策略：
  - 建立預設 organization：`o_default`，`name: Personal`（或依設定）
  - 將既有 `categories` 補上 `organizationId = o_default`，並確保在該 org 內的 `order` 連續
- 新增 `migrateOrganizationsOnce()`：在 `createIdbStorageService` 啟動時呼叫（比照 subcategories 遷移）

## StorageService API（新增/調整）

- Organizations
  - `listOrganizations(): Promise<OrganizationData[]>`
  - `createOrganization(name: string, color?: string): Promise<OrganizationData>`
  - `renameOrganization(id: string, name: string): Promise<void>`
  - `deleteOrganization(id: string, options?: { reassignTo?: string }): Promise<void>`（未指定則建立新預設 org 並遷移 collections）
  - `reorderOrganizations(orderedIds: string[]): Promise<void>`
- Categories 調整
  - `addCategory(name: string, color?: string, organizationId?: string)`（預設落在目前選取的 org）
  - `reorderCategories(categoryIds: string[], organizationId: string)`（僅在該 org 範圍內排序）

## Sync/Local 同步

- `chrome.storage.sync` 加入 organizations 同步（類似 categories）
- local 端也存一份以利啟動合併與離線使用

## Toby 匯入調整（不破壞既有）

- 保留既有：
  - `importTobyV3IntoGroup`
  - `importTobyAsNewCategory`（v3/v4 groups → 單一 new category）
- 新增：
  - `importTobyV4WithOrganizations(json, opts)`：
    - 若 JSON 有 `organizations`：逐一建立 `organization → group → list → cards`
    - 若僅有 `groups`：視為單一 organization（可用 `opts.targetOrganizationId` 指定或自動新建，預設建立 `Imported`）
    - 映射：`group → collection`、`list → group`、`card → card`；維持 `order.subcat.<gid>` 順序
  - 建議 `opts`：`createOrganizations?: boolean`（預設 true）、`targetOrganizationId?: string`、`dedupSkip?: boolean`、`signal?`、`onProgress?`
  - 預覽/統計（UI 顯示）：`{ orgs, groups, lists, cards }`

### 預設行為（已確認）

- Toby v4 匯入：預設「自動建立 organizations」（`createOrganizations: true`）。

## UI 與互動

- 新增 `OrganizationsProvider`（模式比照 `CategoriesProvider`）
  - 狀態：`organizations`, `selectedOrgId`，`setCurrentOrganization(id)`
  - 啟動載入順序：先 organizations，再 categories（依當前 org 篩選）
  - 持久化：`settings.selectedOrganizationId`
- 調整 `CategoriesProvider`
  - 依 `selectedOrgId` 載入該 org 下的 categories
  - `addCategory` 預設落在 `selectedOrgId`
  - `reorderCategories` 僅在同 org 內；跨 org 改由 `updateCategoryOrganization(id, toOrgId)`
- UI 元件
  - 側欄上方增加 Organization 切換器（Dropdown + 管理入口）
  - 管理面板：新增、改名、刪除、排序（精簡版即可）
  - 參考 `newtab.jpeg` 做簡化版先行
- 匯入 UI
  - 「匯入 Toby（新集合/組織）」加入模式：
    - v3 模式（既有）
    - v4 groups → 多集合（選擇導入至現有 organization 或自動新建）
    - v4 organizations → 多組織多集合（自動新建 organizations）
  - 預覽顯示層級數量

## 匯出/匯入（本專案 JSON）

- 匯出：加入 `organizations`、`categories.organizationId`
- 匯入：若無 `organizations` 欄位 → 建立預設 `o_default` 並賦值；若有 → 先寫 `organizations` → `categories` → `subcategories` → `webpages`
- 文件：`docs/` 說明 JSON 結構與相容策略

## 測試計劃（TDD）

- IDB 遷移
  - `migration.organizations.test.ts`：v2 → v3 建立 organizations、categories 補 `organizationId`、`order` 正確
- StorageService
  - `organizations.crud.test.ts`：建立/改名/刪除/排序；刪除時 `categories/group/pages` 連動處理
- Toby 匯入
  - `toby.v4.orgs.import.test.ts`：含 organizations → 建立 org/collections/groups/cards（順序正確）
  - `toby.v4.groups.import.test.ts`：無 organizations、只有 groups → 單一 org 路徑
- UI
  - `organizations.switcher.test.tsx`：切換 org 時 categories 清單變動；新增 collection 落在當前 org
- 匯出/匯入
  - `export-import.organizations.test.ts`：進出 JSON 後資料等價（含 `organizationId`）

## 實作步驟與 Commit（建議）

- [x] 14.1 IDB v3 + organizations store + 遷移
- [x] 14.2 StorageService 組織 API + 同步/本地載入（先完成 API 與測試；同步策略將於 14.6 併同調整）
- [x] 14.3 OrganizationsProvider + UI 切換器（最小化：側欄 Select 切換）
- [x] 14.4 CategoriesProvider 串 org + 新增/排序/刪除調整（以 org 範圍載入與操作；新增預設落在當前 org）
- [ ] 14.3 OrganizationsProvider + UI 切換器（最小化）
- [ ] 14.4 CategoriesProvider 串 org + 新增/排序/刪除調整
- [ ] 14.5 Toby v4 importer（with organizations）+ UI 匯入模式
- [ ] 14.6 專案匯出/匯入擴充（含 organizations）
- [ ] 14.7 更新 README/docs 與 `.kiro/specs` 並在對應 tasks 勾選

Commit 範例：

- `feat(tasks/14.1): IDB v3 + organizations store + migration`
- `feat(tasks/14.2): storage service org APIs + sync/local`
- `feat(tasks/14.3): OrganizationsProvider + simple org switcher`
- `feat(tasks/14.4): categories scoped by org + reorder`
- `feat(tasks/14.5): Toby v4 importer with organizations`
- `feat(tasks/14.6): export/import include organizations`
- `docs(tasks/14.7): update README/docs and specs`

## 風險與相容

- 既有 categories 無 `organizationId`：遷移補上預設 org，UI 預設選取該 org
- Sync/local 雙寫一致性：初期以 categories/organizations 雙向覆蓋（以 sync 為主、local 補缺）
- 重新排序：在 org 維度內排序，避免跨 org 排序造成不一致

## 需要確認的選項

- 預設 organization 名稱與顏色（建議：`Personal` / `#64748b`）
- Toby v4 若發現 organizations：是否預設「自動建立 organizations」；或提供選項將所有資料匯入目前選取的 organization？
- 是否同意以「14.x Organizations」獨立任務集按上述拆解（TDD）推進？
