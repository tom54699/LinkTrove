## MODIFIED Requirements
### Requirement: LinkTrove JSON 格式匯出
系統必須（SHALL）支援將所有書籤資料匯出為 LinkTrove 原生 JSON 格式，包含完整的階層結構和元資料。

#### Scenario: 匯出完整資料
- **WHEN** 使用者點擊匯出功能
- **THEN** 系統產生包含以下結構的 JSON 檔案：
  - `organizations`: 所有組織資料（OrganizationData[]，含 `isDefault`）
  - `categories`: 所有類別資料（CategoryData[]，含 `organizationId`、`isDefault`）
  - `subcategories`: 所有群組資料（SubcategoryData[]，含 `isDefault`）
  - `webpages`: 所有卡片資料（WebpageData[]）
  - `templates`: 模板資料（TemplateData[]）
  - `orders.subcategories`: 每個群組的卡片順序（Record<groupId, string[]>）
  - `settings`: 當前選擇狀態（selectedOrganizationId, selectedCategoryId）
- **THEN** 檔案命名為 `linktrove-export-[timestamp].json`（例如：`linktrove-export-20260107.json`）
- **THEN** 瀏覽器自動下載該檔案

#### Scenario: 匯出時保留完整 ID
- **GIVEN** 系統包含 100 張卡片
- **WHEN** 使用者匯出資料
- **THEN** 所有實體的 ID 完整保留（不重新生成）
- **THEN** 關聯關係正確（categoryId, subcategoryId, organizationId）
- **THEN** `isDefault` 欄位原樣保留
- **THEN** 重新匯入時可恢復相同的 ID 和關聯

#### Scenario: 匯出時保留卡片順序
- **GIVEN** 群組 A 的卡片順序為 [card3, card1, card2]
- **WHEN** 使用者匯出資料
- **THEN** JSON 檔案的 `orders.subcategories` 包含該群組的順序資訊
- **THEN** 重新匯入後，群組 A 的卡片順序保持 [card3, card1, card2]

### Requirement: LinkTrove JSON 格式匯入
系統必須（SHALL）支援匯入 LinkTrove 原生 JSON 格式，完整恢復所有資料和狀態。

#### Scenario: 匯入完整資料
- **GIVEN** 使用者有 LinkTrove 匯出的 JSON 檔案
- **WHEN** 使用者選擇匯入該檔案
- **THEN** 系統解析 JSON 並驗證格式有效性
- **THEN** 系統將資料寫入 IndexedDB（保留原有 ID）
- **THEN** 系統恢復卡片順序（從 `orders.subcategories` 讀取）
- **THEN** 系統恢復選擇狀態（從 `settings` 讀取）
- **THEN** 使用者看到所有匯入的組織、類別和卡片

#### Scenario: 匯入時處理重複 ID
- **GIVEN** IndexedDB 已包含 ID 為 `w_123` 的卡片
- **GIVEN** 匯入檔案也包含 ID 為 `w_123` 的卡片
- **WHEN** 使用者匯入該檔案
- **THEN** 系統提示使用者選擇衝突解決策略：
  - 選項 1：覆蓋現有資料（Replace）
  - 選項 2：保留現有資料，跳過匯入項目（Skip）
  - 選項 3：匯入並重新生成 ID（Duplicate）
- **THEN** 根據使用者選擇執行對應操作

#### Scenario: 匯入驗證失敗
- **GIVEN** JSON 檔案格式錯誤（缺少必要欄位或結構錯誤）
- **WHEN** 使用者匯入該檔案
- **THEN** 系統拒絕匯入並顯示錯誤訊息
- **THEN** 錯誤訊息包含具體問題描述（例如：「缺少 categories 陣列」）
- **THEN** IndexedDB 資料保持不變（不執行部分匯入）

#### Scenario: 匯入缺少 isDefault 欄位的資料
- **GIVEN** 匯入檔案的 organizations/categories/subcategories 缺少 `isDefault`
- **WHEN** 系統匯入該檔案
- **THEN** 系統將缺少的 `isDefault` 視為 `false`

### Requirement: Toby v3/v4 JSON 格式匯入
系統必須（SHALL）支援匯入 Toby v3 和 v4 版本匯出的 JSON 格式，自動轉換為 LinkTrove 資料結構。

#### Scenario: 偵測 Toby JSON 格式
- **GIVEN** 使用者選擇匯入 Toby 匯出的 JSON 檔案
- **WHEN** 系統讀取檔案內容
- **THEN** 系統偵測 Toby 格式特徵（檢查 `lists` 和 `cards` 結構）
- **THEN** 系統識別版本號（v3 或 v4）
- **THEN** 系統選擇對應的轉換器處理

#### Scenario: 轉換 Toby Lists 到 LinkTrove Categories/Subcategories
- **GIVEN** Toby JSON 包含以下結構：
  ```json
  {
    "lists": [
      {"id": "list1", "title": "前端開發", "cards": ["card1", "card2"]}
    ]
  }
  ```
- **WHEN** 系統執行匯入
- **THEN** 系統建立預設組織（名稱 "My Space"、`isDefault = true`、隨機 ID）
- **THEN** 系統將 Toby list 轉換為 LinkTrove category/subcategory
- **THEN** 系統保留原有標題和關聯關係

#### Scenario: 轉換 Toby Cards 到 LinkTrove Webpages
- **GIVEN** Toby JSON 包含卡片資料（title, url, favicon）
- **WHEN** 系統執行匯入
- **THEN** 系統將每張 Toby card 轉換為 WebpageData：
  - `title` → `title`
  - `url` → `url`
  - `favicon` → `favicon`
  - `index` → 用於建立順序資訊
- **THEN** 系統生成 LinkTrove 格式的 ID（`w_[timestamp]`）
- **THEN** 系統建立正確的關聯關係（categoryId, subcategoryId）

#### Scenario: 保留 Toby 卡片順序
- **GIVEN** Toby JSON 中的卡片包含 `index` 欄位（例如：index: 0, 1, 2）
- **WHEN** 系統執行匯入
- **THEN** 系統根據 `index` 欄位排序卡片
- **THEN** 系統為每個群組生成順序陣列寫入 `orders.subcategories`
- **THEN** 匯入後卡片以正確順序顯示

#### Scenario: 處理 Toby v3 和 v4 格式差異
- **GIVEN** Toby v3 和 v4 的資料結構略有不同
- **WHEN** 系統匯入不同版本的 Toby JSON
- **THEN** 系統使用對應版本的轉換器（v3Importer, v4Importer）
- **THEN** 兩種版本都能正確轉換並匯入
- **THEN** 使用者無需手動調整格式
