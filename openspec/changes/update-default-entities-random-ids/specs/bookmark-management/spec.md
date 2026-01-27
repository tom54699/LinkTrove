## ADDED Requirements
### Requirement: 預設階層標記與同步清理
系統必須（SHALL）為預設 Organization/Collection/Group 加上 `isDefault` 標記，並在同步合併時清理空的預設階層。

#### Scenario: 初始化時建立預設階層
- **GIVEN** IndexedDB 沒有任何組織與類別資料
- **WHEN** 應用程式啟動
- **THEN** 系統建立預設 Organization（名稱為 "My Space"）並標記 `isDefault = true`
- **THEN** 系統建立預設 Collection（名稱為 "Bookmarks"）並標記 `isDefault = true`
- **THEN** 系統建立預設 Group（名稱為 "General"）並標記 `isDefault = true`
- **THEN** 以上實體的 ID 均為隨機唯一值

#### Scenario: 更名或新增子層級使預設標記失效
- **GIVEN** 預設 Organization/Collection/Group 的 `isDefault = true`
- **WHEN** 使用者更名其中任一實體
- **THEN** 該實體的 `isDefault` 變更為 `false`
- **WHEN** 使用者在預設 Organization 新增 Collection
- **THEN** 預設 Organization 的 `isDefault` 變更為 `false`
- **WHEN** 使用者在預設 Collection 新增 Group
- **THEN** 預設 Collection 的 `isDefault` 變更為 `false`

#### Scenario: 同步合併時清理空預設階層
- **GIVEN** 雲端資料包含任何資料（organizations/categories/subcategories/webpages 任一非空）
- **GIVEN** 存在 `isDefault = true` 的預設 Organization/Collection/Group
- **GIVEN** 預設名稱未被更改（My Space / Bookmarks / General）
- **GIVEN** 預設 Organization 只有 1 個 Collection（該預設 Collection）
- **GIVEN** 預設 Collection 只有 1 個 Group（該預設 Group）
- **GIVEN** 預設 Group 內沒有任何卡片
- **WHEN** 系統執行同步合併
- **THEN** 系統移除該預設 Organization、Collection、Group

#### Scenario: 同步合併時保留非空或已自訂預設階層
- **GIVEN** 預設階層存在任一條件不成立（更名/新增子層級/含卡片）
- **WHEN** 系統執行同步合併
- **THEN** 系統保留該預設階層

### Requirement: 同步進度視窗與互動鎖定
系統必須（SHALL）在同步期間顯示進度視窗並鎖定其他畫面互動，直到同步完成或失敗。

#### Scenario: 同步開始時顯示進度視窗
- **GIVEN** 雲端資料包含任何資料（organizations/categories/subcategories/webpages 任一非空）
- **WHEN** 同步流程開始（首次同步或再次同步）
- **THEN** 系統顯示同步進度視窗
- **THEN** 進度視窗阻斷其他畫面互動

#### Scenario: 同步完成後解除鎖定
- **GIVEN** 同步進度視窗已顯示
- **WHEN** 同步完成（成功或失敗）
- **THEN** 系統解除畫面互動鎖定
- **THEN** 若同步失敗，進度視窗顯示錯誤訊息並可關閉

## MODIFIED Requirements
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
- **THEN** 系統自動建立預設組織（名稱 "My Space"、`isDefault = true`、隨機 ID）
- **THEN** 系統為所有類別補上 `organizationId` 指向該預設組織
- **THEN** 所有書籤正確顯示在預設組織下

#### Scenario: IndexedDB 已有資料時跳過遷移
- **GIVEN** IndexedDB 已包含資料
- **WHEN** 應用程式啟動
- **THEN** 系統直接從 IndexedDB 載入資料
- **THEN** 不執行 chrome.storage 檢查和遷移流程

### Requirement: 匯入匯出支援
系統必須（SHALL）支援匯出完整書籤資料為 JSON 格式，並能匯入相容的 JSON 資料（包含 Toby v3/v4 格式）。

#### Scenario: 匯出當前組織資料
- **WHEN** 使用者觸發匯出功能
- **THEN** 系統產生包含以下結構的 JSON 檔案：
  - `organizations`: 所有組織資料（含 `isDefault`）
  - `categories`: 所有類別資料（含 `organizationId`、`isDefault`）
  - `subcategories`: 所有群組資料（含 `isDefault`）
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
- **THEN** 系統自動建立預設組織（名稱 "My Space"、`isDefault = true`、隨機 ID）
- **THEN** 系統為所有類別補上 `organizationId` 指向該預設組織
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
