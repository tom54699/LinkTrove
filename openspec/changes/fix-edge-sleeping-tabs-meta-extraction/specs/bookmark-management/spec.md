# Bookmark Management - Spec Delta

## MODIFIED Requirements

### Requirement: 卡片元資料管理
系統必須（SHALL）自動擷取並儲存網頁卡片的元資料（標題、URL、favicon、截圖），並確保在不同瀏覽器（Chrome、Edge）上都能正常運作。

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

#### Scenario: Chrome 瀏覽器上提取 discarded 分頁的 meta
- **GIVEN** Chrome 瀏覽器的 Memory Saver 功能已啟用
- **GIVEN** 分頁因閒置被系統標記為 discarded（`tab.discarded = true`）
- **WHEN** 使用者將該分頁儲存為書籤卡片
- **THEN** 系統偵測到 `tab.discarded` 屬性
- **THEN** 系統執行 `chrome.tabs.reload()` 喚醒分頁（不切換使用者焦點）
- **THEN** 系統等待分頁完全載入（最多 8 秒）
- **THEN** 系統提取網頁 meta 資料（標題、描述、favicon）
- **THEN** 卡片顯示完整的元資料

#### Scenario: Edge 瀏覽器上提取睡眠分頁的 meta（新增）
- **GIVEN** Microsoft Edge 瀏覽器的 Sleeping Tabs 功能已啟用
- **GIVEN** 分頁因閒置進入睡眠狀態（sleeping，但無 API 屬性可偵測）
- **WHEN** 使用者將該分頁儲存為書籤卡片
- **THEN** 系統偵測到當前瀏覽器為 Edge（`navigator.userAgent.includes('Edg/')`）
- **THEN** 系統執行 `chrome.tabs.reload()` 主動喚醒分頁（不切換使用者焦點）
- **THEN** 系統等待分頁完全載入（最多 8 秒）
- **THEN** 系統提取網頁 meta 資料（標題、描述、favicon）
- **THEN** 卡片顯示完整的元資料
- **THEN** 系統記錄診斷日誌：`[pageMeta] Edge browser detected, proactive reload for tab ${tabId}`

#### Scenario: Edge 瀏覽器上提取正常活躍分頁的 meta（已知權衡）
- **GIVEN** Microsoft Edge 瀏覽器
- **GIVEN** 分頁處於正常活躍狀態（非睡眠）
- **WHEN** 使用者將該分頁儲存為書籤卡片
- **THEN** 系統偵測到當前瀏覽器為 Edge
- **THEN** 系統仍執行 `chrome.tabs.reload()` 喚醒分頁（因無法區分是否睡眠）
- **THEN** 使用者可能看到分頁重新載入（1-2 秒延遲，已知權衡）
- **THEN** 系統提取網頁 meta 資料
- **THEN** 卡片顯示完整的元資料

#### Scenario: 跨瀏覽器一致性
- **WHEN** 使用者在 Chrome 或 Edge 上儲存網頁卡片
- **THEN** 系統都能成功提取完整的 meta 資料
- **THEN** 卡片顯示一致的使用者體驗（標題、描述、favicon）
- **THEN** 不會出現空白卡片或缺少元資料的情況
