## MODIFIED Requirements

### Requirement: IndexedDB 持久化儲存
系統必須（SHALL）使用 IndexedDB 作為主要儲存機制，支援大量書籤資料（1000+ 卡片），並使用軟刪除機制標記已刪除項目。

#### Scenario: 應用程式啟動時載入資料
- **WHEN** 應用程式啟動（新分頁開啟）
- **THEN** 系統從 IndexedDB 的以下 stores 讀取資料：
  - `organizations`
  - `categories`
  - `subcategories`
  - `webpages`
  - `templates`
  - `meta`（包含順序資訊）
- **THEN** 系統自動過濾所有標記 `deleted: true` 的項目

#### Scenario: 新增卡片時寫入資料庫
- **WHEN** 使用者新增一張網頁卡片
- **THEN** 系統立即將該卡片寫入 IndexedDB 的 `webpages` store
- **THEN** 系統更新該群組的順序資訊到 `meta` store

#### Scenario: 刪除卡片時標記軟刪除
- **WHEN** 使用者刪除卡片 Y
- **THEN** 系統更新該卡片記錄，設定以下欄位：
  - `deleted: true`
  - `deletedAt: [Unix ms timestamp]`
  - `updatedAt: [Unix ms timestamp]`
- **THEN** 系統將更新後的記錄寫回 IndexedDB 的 `webpages` store
- **THEN** UI 立即隱藏該卡片（透過過濾 `deleted: true`）

#### Scenario: 大量資料查詢時過濾已刪除項目
- **GIVEN** 資料庫包含 1000+ 張卡片（包含已軟刪除的）
- **WHEN** 使用者切換到包含 100 張卡片的群組
- **THEN** 系統使用 IndexedDB 索引查詢該群組的卡片（`subcategoryId` 索引）
- **THEN** 系統過濾所有 `deleted: true` 的卡片
- **THEN** 查詢結果在 100ms 內返回並渲染（僅顯示未刪除的卡片）

### Requirement: 多組織支援
系統必須（SHALL）支援使用者建立和切換多個組織，各組織的資料完全獨立，刪除組織時使用級聯軟刪除機制。

#### Scenario: 切換組織時更新視圖
- **GIVEN** 系統包含組織 A（包含類別 C1, C2）和組織 B（包含類別 C3）
- **WHEN** 使用者切換到組織 A
- **THEN** 左側邊欄只顯示類別 C1, C2（已過濾 `deleted: true` 的類別）
- **THEN** 系統將選擇狀態（`selectedOrganizationId = A`）儲存到 chrome.storage.local

#### Scenario: 重新開啟時恢復組織選擇
- **GIVEN** 使用者上次選擇的組織為 A
- **WHEN** 使用者重新開啟新分頁
- **THEN** 系統從 chrome.storage.local 讀取 `selectedOrganizationId`
- **THEN** 自動切換到組織 A
- **THEN** 顯示組織 A 的類別和卡片（已過濾已刪除項目）

#### Scenario: 刪除組織時級聯軟刪除關聯資料
- **GIVEN** 組織 A 包含類別 C1, C2 和多張卡片
- **WHEN** 使用者刪除組織 A
- **THEN** 系統提示確認（警告：將刪除所有關聯資料）
- **WHEN** 使用者確認刪除
- **THEN** 系統在單一 IndexedDB 交易中執行以下操作：
  - 標記組織 A 為 `deleted: true, deletedAt: [now], updatedAt: [now]`
  - 標記所有 `organizationId = A` 的類別為 `deleted: true`
  - 標記所有屬於這些類別的群組為 `deleted: true`
  - 標記所有屬於這些群組的卡片為 `deleted: true`
  - 所有項目使用相同的 `deletedAt` 時間戳
- **THEN** 系統自動切換到另一個組織（若存在）
- **THEN** UI 立即隱藏組織 A 及其所有關聯資料
- **PERFORMANCE NOTE**: 目前實作使用 `getAll()` 全表掃描，對大型資料量（1000+ items）可能有延遲
  - 未來優化：使用 IndexedDB 索引查詢（`by_organizationId`, `by_categoryId`, `category_subcategory`）

#### Scenario: 刪除組織時過濾已刪除的子項目
- **GIVEN** 組織 A 包含類別 C1（未刪除）、C2（已軟刪除）
- **WHEN** 使用者刪除組織 A
- **THEN** 系統只處理未刪除的類別（C1）
- **THEN** 系統不會重複處理已標記 `deleted: true` 的類別（C2）
- **THEN** 所有級聯刪除邏輯正確過濾已刪除項目

## ADDED Requirements

### Requirement: 軟刪除生命週期管理
系統必須（SHALL）為所有實體（Organizations, Categories, Subcategories, Webpages, Templates）提供統一的軟刪除生命週期管理，包括標記、過濾、和自動垃圾回收。

#### Scenario: 軟刪除標記格式
- **WHEN** 任何實體被刪除
- **THEN** 系統必須設定以下欄位：
  - `deleted: true` (boolean)
  - `deletedAt: [Unix ms timestamp]` (number, 例如 1769572800000)
  - `updatedAt: [Unix ms timestamp]` (number, 與 deletedAt 相同)
- **THEN** 記錄仍保留在 IndexedDB 中（不執行硬刪除）
- **NOTE**: 歷史資料可能包含 ISO string 格式，讀取時允許 string | number，寫入時統一為 number

#### Scenario: 載入時自動過濾已刪除項目
- **WHEN** 系統從 IndexedDB 載入任何實體
- **THEN** 所有讀取路徑必須過濾 `deleted: true` 的項目
- **THEN** UI 層完全看不到已刪除的項目
- **NOTE**: 過濾邏輯分散在 Storage Layer 和 Provider Layer：
  - Storage Layer (`storage.ts`): `listSubcategoriesImpl`, `loadFromLocal` 等
  - Provider Layer (`categories.tsx`, `organizations.tsx`): 載入、同步、刪除前檢查
  - UI Layer (`sidebar.tsx`): 前置檢查、保護邏輯

#### Scenario: 匯出時包含已刪除項目（tombstone）
- **WHEN** 使用者匯出資料（用於雲端同步）
- **THEN** 系統必須包含所有項目（包括 `deleted: true` 的）
- **THEN** 匯出的 JSON 完整保留 `deleted` 和 `deletedAt` 欄位
- **THEN** 跨設備同步時可正確處理刪除狀態

#### Scenario: 自動垃圾回收（GC）
- **GIVEN** 系統包含多個已軟刪除超過 30 天的項目
- **WHEN** 雲端同步成功完成後，GC 服務自動觸發（每 7 天檢查一次）
- **THEN** 系統識別所有滿足以下條件的項目：
  - `deleted: true`
  - `deletedAt` 早於 30 天前
  - `deletedAt` 早於或等於上次同步時間（防止同步衝突）
- **THEN** 系統從 IndexedDB 永久刪除這些項目（硬刪除）
- **THEN** 系統清理相關的 order metadata（`order.subcat.{id}` 從 meta store 移除）

#### Scenario: 手動觸發垃圾回收（未實作）
- **NOTE**: 手動 GC UI 目前未實作，僅保留自動 GC 機制
- **FUTURE**: 若需要手動清理，可使用現有 API：
  - `getGCStats()` - 取得 tombstone 統計
  - `runGC(retentionDays)` - 手動執行 GC
  - 可在未來的設置頁面中整合

#### Scenario: 跨設備同步時的 tombstone 合併
- **GIVEN** 設備 A 刪除卡片 X（deletedAt: 2026-01-20）
- **GIVEN** 設備 B 更新卡片 X（updatedAt: 2026-01-25）
- **WHEN** 兩設備進行雲端同步合併
- **THEN** 系統使用 LWW（Last-Write-Wins）策略
- **THEN** 系統比較 `deletedAt` 和 `updatedAt`
- **THEN** 設備 B 的更新較新，卡片 X 恢復為未刪除狀態
- **THEN** 兩設備同步後都顯示卡片 X

#### Scenario: 級聯軟刪除保持原子性
- **WHEN** 使用者刪除包含 100 張卡片的組織
- **THEN** 系統在單一 IndexedDB 交易中執行所有軟刪除操作
- **THEN** 若交易中斷（例如：瀏覽器崩潰），所有變更回滾
- **THEN** 不會出現部分刪除的情況（要麼全部成功，要麼全部失敗）

### Requirement: Order Metadata 生命週期管理
系統必須（SHALL）在軟刪除時保留 order metadata，延遲至垃圾回收時清理，以支援未來的恢復功能。

#### Scenario: 軟刪除時保留 order metadata
- **GIVEN** 群組 A 的卡片順序為 [card1, card2, card3]
- **WHEN** 使用者刪除 card2
- **THEN** 系統標記 card2 為 `deleted: true`
- **THEN** 系統保留 order metadata：`orders.subcategories[A] = [card1, card2, card3]`
- **THEN** 載入時系統過濾已刪除的卡片，顯示順序為 [card1, card3]

#### Scenario: GC 時清理孤兒 order metadata
- **GIVEN** 群組 A 已被軟刪除超過 30 天
- **WHEN** GC 服務執行垃圾回收
- **THEN** 系統永久刪除群組 A 的記錄
- **THEN** 系統清理 `orders.subcategories[A]` 的 order metadata
- **THEN** `meta` store 不再包含該群組的順序資訊

#### Scenario: 載入時自動過濾已刪除項目的 order
- **GIVEN** 群組 A 的 order metadata 為 [card1, card2, card3]
- **GIVEN** card2 已軟刪除
- **WHEN** 系統載入群組 A 的卡片
- **THEN** 系統讀取所有卡片並過濾 `deleted: true`（得到 [card1, card3]）
- **THEN** 系統應用 order metadata（保持相對順序）
- **THEN** UI 顯示順序為 [card1, card3]
