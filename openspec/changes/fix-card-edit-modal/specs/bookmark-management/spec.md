## MODIFIED Requirements

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

#### Scenario: 編輯對話框顯示完整欄位
- **WHEN** 使用者開啟卡片編輯對話框
- **THEN** 對話框必須顯示以下可編輯欄位：
  - Title（標題）
  - URL（網址）
  - Note（備註）
  - 模板欄位（若該類別有綁定模板）
- **THEN** 各欄位預填入卡片目前的值

#### Scenario: 編輯時自動儲存不覆蓋用戶輸入
- **GIVEN** 使用者正在編輯對話框中輸入內容
- **WHEN** 自動儲存觸發（500ms debounce）
- **THEN** 系統儲存目前輸入的值到 IndexedDB
- **THEN** 儲存完成後，對話框保持用戶正在輸入的內容
- **THEN** 不會將輸入框重置為儲存前的值

#### Scenario: 重新開啟編輯對話框載入最新值
- **GIVEN** 使用者關閉編輯對話框
- **WHEN** 使用者再次開啟同一張卡片的編輯對話框
- **THEN** 對話框載入該卡片目前儲存的最新值
- **THEN** 顯示上次儲存的 Title、URL、Note 和模板欄位

#### Scenario: 卡片顯示時使用元資料
- **GIVEN** 卡片包含完整元資料
- **WHEN** 系統渲染卡片
- **THEN** 顯示 favicon 作為卡片圖示
- **THEN** 顯示 title 作為主標題
- **THEN** 顯示 URL（截短顯示域名）
- **THEN** 若有 note，顯示備註區塊
