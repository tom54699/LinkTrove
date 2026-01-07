# Capability: Import/Export

## Purpose
提供完整的資料匯入匯出功能，支援 LinkTrove 原生格式、Toby v3/v4 JSON 格式、HTML 書籤格式的互通性。確保使用者資料的可攜性和跨平台遷移能力。

## Requirements

### Requirement: LinkTrove JSON 格式匯出
系統必須（SHALL）支援將所有書籤資料匯出為 LinkTrove 原生 JSON 格式，包含完整的階層結構和元資料。

#### Scenario: 匯出完整資料
- **WHEN** 使用者點擊匯出功能
- **THEN** 系統產生包含以下結構的 JSON 檔案：
  - `organizations`: 所有組織資料（OrganizationData[]）
  - `categories`: 所有類別資料（CategoryData[]，含 organizationId）
  - `subcategories`: 所有群組資料（SubcategoryData[]）
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
- **THEN** 系統建立預設組織（ID: `o_default`，名稱: "Personal"）
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
- **THEN** 系統將順序資訊寫入 `orders.subcategories[groupId]`
- **THEN** 匯入後卡片以正確順序顯示

#### Scenario: 處理 Toby v3 和 v4 格式差異
- **GIVEN** Toby v3 和 v4 的資料結構略有不同
- **WHEN** 系統匯入不同版本的 Toby JSON
- **THEN** 系統使用對應版本的轉換器（v3Importer, v4Importer）
- **THEN** 兩種版本都能正確轉換並匯入
- **THEN** 使用者無需手動調整格式

### Requirement: HTML 書籤格式匯入
系統必須（SHALL）支援匯入瀏覽器匯出的標準 HTML 書籤檔案（Netscape Bookmark File Format）。

#### Scenario: 解析 HTML 書籤結構
- **GIVEN** 使用者匯出 Chrome/Firefox 的書籤 HTML 檔案
- **WHEN** 使用者匯入該檔案
- **THEN** 系統解析 HTML 結構：
  - `<DT><H3>` 標籤 → 資料夾（轉為 categories/subcategories）
  - `<DT><A>` 標籤 → 書籤項目（轉為 webpages）
  - `HREF` 屬性 → URL
  - `ICON` 屬性 → favicon
- **THEN** 系統建立對應的階層結構

#### Scenario: 處理巢狀資料夾
- **GIVEN** HTML 書籤包含多層巢狀資料夾：
  ```html
  <DT><H3>前端開發</H3>
  <DL>
    <DT><H3>React</H3>
    <DL>
      <DT><A HREF="...">React Docs</A>
    </DL>
  </DL>
  ```
- **WHEN** 系統執行匯入
- **THEN** 系統將第一層資料夾映射為 Category
- **THEN** 系統將第二層資料夾映射為 Subcategory
- **THEN** 系統將書籤項目映射為 Webpage
- **THEN** 若超過兩層，系統將深層資料夾扁平化為 Subcategory

#### Scenario: 提取書籤元資料
- **GIVEN** HTML 書籤項目包含以下屬性：
  ```html
  <DT><A HREF="https://react.dev" ADD_DATE="..." ICON="...">React</A>
  ```
- **WHEN** 系統解析該書籤
- **THEN** 系統提取以下資訊：
  - `HREF` → `url`
  - 標籤文字 → `title`
  - `ICON` → `favicon`（base64 或 URL）
  - `ADD_DATE` → `createdAt`（轉換 Unix timestamp 為 ISO string）
- **THEN** 系統生成 WebpageData 並寫入 IndexedDB

#### Scenario: HTML 匯入時處理缺失 favicon
- **GIVEN** HTML 書籤項目缺少 `ICON` 屬性
- **WHEN** 系統執行匯入
- **THEN** 系統設定 `favicon` 為預設值或空字串
- **THEN** 匯入過程不中斷
- **THEN** 卡片顯示時使用預設圖示

### Requirement: 順序保留機制
系統必須（SHALL）在所有匯入匯出操作中保留卡片的顯示順序，確保使用者的組織結構不丟失。

#### Scenario: 匯出時包含順序資訊
- **GIVEN** 每個群組都有自訂的卡片順序
- **WHEN** 使用者匯出資料
- **THEN** JSON 包含 `orders.subcategories` 物件
- **THEN** 每個群組的順序陣列完整記錄（例如：`{"g_123": ["w_1", "w_2", "w_3"]}`）

#### Scenario: 匯入時恢復順序
- **GIVEN** 匯入檔案包含順序資訊
- **WHEN** 使用者匯入該檔案
- **THEN** 系統優先使用 `orders.subcategories` 的順序資訊
- **THEN** 若順序資訊缺失，系統使用預設排序（按 createdAt）

#### Scenario: Toby 匯入時從 index 欄位建立順序
- **GIVEN** Toby JSON 中每張卡片有 `index` 欄位
- **WHEN** 系統執行匯入
- **THEN** 系統將所有卡片按 `index` 排序
- **THEN** 系統為每個群組生成順序陣列寫入 `orders.subcategories`
- **THEN** 匯入後顯示順序與 Toby 一致

#### Scenario: HTML 匯入時按文件順序排列
- **GIVEN** HTML 書籤檔案中書籤項目有特定出現順序
- **WHEN** 系統執行匯入
- **THEN** 系統按 HTML 文件中的出現順序建立卡片
- **THEN** 系統生成對應的順序陣列
- **THEN** 匯入後顯示順序與 HTML 檔案一致

### Requirement: 錯誤處理與使用者反饋
系統必須（SHALL）在匯入匯出過程中提供清楚的錯誤訊息和進度反饋。

#### Scenario: 匯入大型檔案時顯示進度
- **GIVEN** 匯入檔案包含 1000+ 張卡片
- **WHEN** 使用者匯入該檔案
- **THEN** 系統顯示進度指示器（例如：「正在匯入：500/1000 張卡片」）
- **THEN** 系統在背景執行匯入，不阻塞 UI
- **THEN** 匯入完成後顯示成功訊息（例如：「成功匯入 1000 張卡片」）

#### Scenario: 匯入失敗時回滾變更
- **GIVEN** 匯入過程中發生錯誤（例如：IndexedDB 寫入失敗）
- **WHEN** 系統偵測到錯誤
- **THEN** 系統回滾所有已寫入的資料（使用 IndexedDB 交易機制）
- **THEN** 系統顯示錯誤訊息並記錄詳細資訊到 console
- **THEN** IndexedDB 保持匯入前的狀態（原子性操作）

#### Scenario: 匯出時處理檔案系統錯誤
- **GIVEN** 使用者的磁碟空間不足
- **WHEN** 系統嘗試下載匯出檔案
- **THEN** 瀏覽器顯示檔案系統錯誤
- **THEN** 系統提示使用者清理磁碟空間或選擇其他位置
- **THEN** 使用者可重新觸發匯出操作

#### Scenario: 格式無法識別時提示
- **GIVEN** 使用者選擇匯入的檔案格式無法識別（非 JSON 也非 HTML）
- **WHEN** 系統嘗試解析檔案
- **THEN** 系統顯示錯誤訊息：「無法識別的檔案格式，請選擇 JSON 或 HTML 書籤檔案」
- **THEN** 系統不執行任何匯入操作

### Requirement: 匯入選項與設定
系統必須（SHALL）提供匯入選項，讓使用者控制匯入行為（例如：合併或覆蓋）。

#### Scenario: 選擇匯入模式
- **WHEN** 使用者觸發匯入功能
- **THEN** 系統顯示匯入模式選擇對話框：
  - **合併模式**（Merge）：保留現有資料，新增匯入項目
  - **覆蓋模式**（Replace）：清空現有資料，完全替換為匯入內容
  - **取消**：取消匯入操作
- **THEN** 使用者選擇模式後，系統執行對應操作

#### Scenario: 合併模式匯入
- **GIVEN** 使用者選擇「合併模式」
- **GIVEN** IndexedDB 已包含 50 張卡片
- **WHEN** 使用者匯入包含 100 張卡片的檔案
- **THEN** 系統保留原有 50 張卡片
- **THEN** 系統新增 100 張新卡片（處理 ID 衝突）
- **THEN** 匯入完成後，系統共有 150 張卡片

#### Scenario: 覆蓋模式匯入
- **GIVEN** 使用者選擇「覆蓋模式」
- **GIVEN** 系統顯示警告訊息：「此操作將刪除所有現有資料，確定繼續？」
- **WHEN** 使用者確認繼續
- **THEN** 系統清空所有 IndexedDB stores
- **THEN** 系統匯入檔案內容
- **THEN** 匯入完成後，系統只包含匯入的資料

## Related Documentation
- **技術設計**: `design.md` - 匯入匯出實作細節
- **資料格式**: `/docs/specs/data-format.md` - JSON 結構定義
- **實作位置**: `src/app/groups/import/` - 匯入功能實作
- **測試案例**: `src/background/__tests__/import.toby.v4.groups.test.ts` - Toby 匯入測試
- **範例檔案**: `fixtures/` - 測試用 JSON 和 HTML 範例
