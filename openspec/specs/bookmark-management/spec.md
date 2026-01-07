# Capability: Bookmark Management

## Purpose
階層式書籤管理系統，支援 Organizations → Categories (Collections) → Subcategories (Groups) → Webpages (Cards) 四層架構。提供完整的書籤組織、儲存、排序和元資料管理功能。

## Requirements

### Requirement: 階層式組織架構
系統必須（SHALL）支援四層式書籤組織架構：Organizations（組織）、Categories（類別/集合）、Subcategories（子類別/群組）、Webpages（網頁卡片）。

#### Scenario: 建立新組織
- **WHEN** 使用者建立新組織
- **THEN** 系統產生唯一 ID（格式：`o_` + timestamp）
- **THEN** 允許使用者設定組織名稱和顏色（可選）
- **THEN** 該組織出現在組織切換器中

#### Scenario: 建立類別並關聯組織
- **WHEN** 使用者在組織 A 下建立新類別
- **THEN** 系統產生唯一 ID（格式：`c_` + timestamp）
- **THEN** 該類別的 `organizationId` 自動設為組織 A 的 ID
- **THEN** 該類別顯示在左側邊欄（僅當組織 A 被選中時）

#### Scenario: 建立群組並關聯類別
- **WHEN** 使用者在類別 B 下建立新群組
- **THEN** 系統產生唯一 ID（格式：`g_` + timestamp）
- **THEN** 該群組的 `categoryId` 自動設為類別 B 的 ID
- **THEN** 該群組顯示在類別 B 的展開區域

#### Scenario: 新增網頁卡片到群組
- **WHEN** 使用者將網頁加入群組 C
- **THEN** 系統產生唯一 ID（格式：`w_` + timestamp）
- **THEN** 該卡片的 `subcategoryId` 設為群組 C 的 ID
- **THEN** 該卡片的 `category` 設為群組 C 所屬的類別 ID
- **THEN** 卡片顯示在中央區域（當群組 C 被選中時）

### Requirement: 卡片順序保存
系統必須（SHALL）為每個 Subcategory（群組）獨立保存 Webpages（卡片）的顯示順序。

#### Scenario: 拖放排序後持久化
- **WHEN** 使用者在群組 A 拖放卡片調整順序
- **THEN** 系統立即將該群組的卡片 ID 順序陣列儲存到 IndexedDB 的 `orders.subcategories[groupId]`
- **THEN** 視覺上卡片順序立即更新

#### Scenario: 重新載入後順序保持
- **GIVEN** 群組 A 的卡片順序為 [card3, card1, card2]
- **WHEN** 使用者關閉並重新開啟新分頁
- **THEN** 系統從 IndexedDB 讀取順序資訊
- **THEN** 群組 A 的卡片以 [card3, card1, card2] 順序顯示

#### Scenario: 跨群組移動卡片時更新順序
- **GIVEN** 卡片 X 原本在群組 A 的順序陣列中
- **WHEN** 使用者將卡片 X 拖放到群組 B
- **THEN** 系統從群組 A 的順序陣列中移除卡片 X
- **THEN** 系統將卡片 X 加入群組 B 的順序陣列（位置由拖放位置決定）
- **THEN** 兩個群組的順序資訊都更新到 IndexedDB

### Requirement: IndexedDB 持久化儲存
系統必須（SHALL）使用 IndexedDB 作為主要儲存機制，支援大量書籤資料（1000+ 卡片）。

#### Scenario: 應用程式啟動時載入資料
- **WHEN** 應用程式啟動（新分頁開啟）
- **THEN** 系統從 IndexedDB 的以下 stores 讀取資料：
  - `organizations`
  - `categories`
  - `subcategories`
  - `webpages`
  - `templates`
  - `meta`（包含順序資訊）

#### Scenario: 新增卡片時寫入資料庫
- **WHEN** 使用者新增一張網頁卡片
- **THEN** 系統立即將該卡片寫入 IndexedDB 的 `webpages` store
- **THEN** 系統更新該群組的順序資訊到 `meta` store

#### Scenario: 刪除卡片時從資料庫移除
- **WHEN** 使用者刪除卡片 Y
- **THEN** 系統從 IndexedDB 的 `webpages` store 刪除該記錄
- **THEN** 系統從對應群組的順序陣列中移除該卡片 ID
- **THEN** 系統更新順序資訊到 `meta` store

#### Scenario: 大量資料查詢效能
- **GIVEN** 資料庫包含 1000+ 張卡片
- **WHEN** 使用者切換到包含 100 張卡片的群組
- **THEN** 系統使用 IndexedDB 索引查詢該群組的卡片（`subcategoryId` 索引）
- **THEN** 查詢結果在 100ms 內返回並渲染

### Requirement: 自動資料遷移
系統必須（SHALL）自動偵測並執行從 chrome.storage 到 IndexedDB 的資料遷移。

#### Scenario: 首次啟動時遷移舊資料
- **GIVEN** IndexedDB 為空（首次使用或清除資料後）
- **GIVEN** chrome.storage.local 包含舊版本資料
- **WHEN** 應用程式啟動
- **THEN** 系統自動從 chrome.storage.local 讀取資料
- **THEN** 系統轉換資料格式並寫入 IndexedDB
- **THEN** 系統清除 chrome.storage.local 的舊資料（防止重複遷移）
- **THEN** 使用者無需手動操作即可看到所有舊書籤

#### Scenario: 遷移時補全缺失欄位
- **GIVEN** chrome.storage 的舊資料缺少 `organizationId` 欄位
- **WHEN** 執行遷移
- **THEN** 系統自動建立預設組織（ID: `o_default`，名稱: "Personal"）
- **THEN** 系統為所有類別補上 `organizationId = "o_default"`
- **THEN** 所有書籤正確顯示在預設組織下

#### Scenario: IndexedDB 已有資料時跳過遷移
- **GIVEN** IndexedDB 已包含資料
- **WHEN** 應用程式啟動
- **THEN** 系統直接從 IndexedDB 載入資料
- **THEN** 不執行 chrome.storage 檢查和遷移流程

### Requirement: 多組織支援
系統必須（SHALL）支援使用者建立和切換多個組織，各組織的資料完全獨立。

#### Scenario: 切換組織時更新視圖
- **GIVEN** 系統包含組織 A（包含類別 C1, C2）和組織 B（包含類別 C3）
- **WHEN** 使用者切換到組織 A
- **THEN** 左側邊欄只顯示類別 C1, C2
- **THEN** 系統將選擇狀態（`selectedOrganizationId = A`）儲存到 chrome.storage.local

#### Scenario: 重新開啟時恢復組織選擇
- **GIVEN** 使用者上次選擇的組織為 A
- **WHEN** 使用者重新開啟新分頁
- **THEN** 系統從 chrome.storage.local 讀取 `selectedOrganizationId`
- **THEN** 自動切換到組織 A
- **THEN** 顯示組織 A 的類別和卡片

#### Scenario: 刪除組織時清理關聯資料
- **GIVEN** 組織 A 包含類別 C1, C2 和多張卡片
- **WHEN** 使用者刪除組織 A
- **THEN** 系統提示確認（警告：將刪除所有關聯資料）
- **WHEN** 使用者確認刪除
- **THEN** 系統刪除所有 `organizationId = A` 的類別
- **THEN** 系統刪除所有屬於這些類別的群組和卡片
- **THEN** 系統自動切換到另一個組織（若存在）

### Requirement: 卡片元資料管理
系統必須（SHALL）自動擷取並儲存網頁卡片的元資料（標題、URL、favicon、截圖）。

#### Scenario: 新增卡片時自動擷取元資料
- **WHEN** 使用者將網頁加入書籤
- **THEN** 系統自動擷取以下資訊：
  - `title`: 網頁標題
  - `url`: 完整 URL
  - `favicon`: 網站圖示 URL
  - `screenshot`: 網頁縮圖（可選）
- **THEN** 系統將元資料儲存到 WebpageData 記錄

#### Scenario: 手動編輯卡片標題和備註
- **GIVEN** 卡片 X 的標題為 "React Docs"
- **WHEN** 使用者手動將標題改為 "React 官方文檔"
- **THEN** 系統更新該卡片的 `title` 欄位
- **WHEN** 使用者新增備註 "常用參考"
- **THEN** 系統將備註儲存到 `note` 欄位
- **THEN** 系統更新 `updatedAt` 時間戳記（ISO string 格式）

#### Scenario: 卡片顯示時使用元資料
- **GIVEN** 卡片包含完整元資料
- **WHEN** 系統渲染卡片
- **THEN** 顯示 favicon 作為卡片圖示
- **THEN** 顯示 title 作為主標題
- **THEN** 顯示 URL（截短顯示域名）
- **THEN** 若有 note，顯示備註區塊

### Requirement: 匯入匯出支援
系統必須（SHALL）支援匯出完整書籤資料為 JSON 格式，並能匯入相容的 JSON 資料（包含 Toby v3/v4 格式）。

#### Scenario: 匯出當前組織資料
- **WHEN** 使用者觸發匯出功能
- **THEN** 系統產生包含以下結構的 JSON 檔案：
  - `organizations`: 所有組織資料
  - `categories`: 所有類別資料（含 `organizationId`）
  - `subcategories`: 所有群組資料
  - `webpages`: 所有卡片資料
  - `templates`: 模板資料
  - `orders.subcategories`: 每個群組的卡片順序
  - `settings`: 當前選擇狀態（`selectedOrganizationId`, `selectedCategoryId`）
- **THEN** 下載檔案命名為 `linktrove-export-[timestamp].json`

#### Scenario: 匯入 LinkTrove JSON 格式
- **GIVEN** 使用者有匯出的 LinkTrove JSON 檔案
- **WHEN** 使用者選擇匯入該檔案
- **THEN** 系統解析 JSON 並驗證格式
- **THEN** 系統將資料寫入 IndexedDB（保留原有 ID）
- **THEN** 系統恢復卡片順序（從 `orders.subcategories` 讀取）
- **THEN** 使用者看到所有匯入的組織、類別和卡片

#### Scenario: 匯入缺少組織資訊的舊格式
- **GIVEN** JSON 檔案缺少 `organizations` 陣列
- **GIVEN** 類別資料缺少 `organizationId` 欄位
- **WHEN** 使用者匯入該檔案
- **THEN** 系統自動建立預設組織（`o_default`）
- **THEN** 系統為所有類別補上 `organizationId = "o_default"`
- **THEN** 系統正常匯入並顯示所有資料

#### Scenario: 匯入 Toby v3/v4 JSON 格式
- **GIVEN** 使用者有 Toby 匯出的 JSON 檔案
- **WHEN** 使用者選擇匯入該檔案
- **THEN** 系統偵測 Toby 格式（檢查 `lists` 和 `cards` 結構）
- **THEN** 系統轉換資料結構：
  - Toby `lists` → LinkTrove `categories/subcategories`
  - Toby `cards` → LinkTrove `webpages`
  - 保留卡片順序（Toby 的 `index` 欄位）
- **THEN** 系統將轉換後的資料寫入 IndexedDB
- **THEN** 使用者看到所有 Toby 書籤成功匯入

## Related Documentation
- **技術規格**: `/docs/specs/data-format.md` - JSON 資料結構定義
- **技術設計**: `design.md` - 儲存方案和架構決策
- **架構說明**: `/docs/architecture/component-map.md` - 組件關係圖
- **功能文檔**: `/docs/features/drag-drop-storage-display.md` - 拖放排序實作
