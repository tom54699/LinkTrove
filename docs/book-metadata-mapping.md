# 書籍類擷取欄位與模板對照（規格）

本文件說明：拖曳新增卡片時的「書籍類」欄位擷取、寫入 IndexedDB 的固定鍵名、與 Template 欄位對應。此為規格文件，便於前後端與模板保持一致。

## 固定欄位鍵名（Canonical Keys）
- bookTitle（書名，text）
- author（作者，text）
- serialStatus（連載狀態，select：連載中 / 已完結 / 太監）
- genre（類型，text）
- wordCount（字數，number）
- rating（評分，rating；不自動擷取，保留使用者填寫）
- siteName（站名，text）
- lastUpdate（最後更新時間，date 或原字串）

可選延伸（有則存、模板可選擇是否顯示）：
- latestChapter（最新章節名，text）
- coverImage（封面圖 URL，url）
- bookUrl（書籍首頁 URL，url）

說明：
- 以上鍵名一律存於 `webpage.meta[<key>]`。
- 卡片描述 `note`（UI 的 description）僅在 note 為空且抽到 `og:description` 時回填；不寫入 meta。
- 模板欄位的 key 必須與此固定鍵名一致，才能直接顯示與比對。

## OG Meta → 固定鍵名對應
- `og:novel:book_name`、`og:title` → bookTitle
- `og:novel:author` → author
- `og:novel:status` → serialStatus（映射：連載/連載中→連載中；完本/已完本→已完結；太監/斷更→太監）
- `og:novel:category` → genre（原樣文本）
- `og:novel:word_count` → wordCount（數字正規化）
- `og:novel:update_time` → lastUpdate（可 parse 則存 ISO，否則存原字串）
- `og:novel:latest_chapter_name` → latestChapter
- `og:image` → coverImage
- `og:url` → bookUrl
- `og:site_name` → siteName；若無，從標題分隔詞推導或 fallback hostname（延用現有邏輯）
- `og:description` → 用於回填 `note`（僅在 note 為空時）

補充 heuristics：
- bookTitle：若 `og:novel:book_name` 空 → `og:title` → `document.title` 去尾。

## 正規化規則
- serialStatus：標準化為三值（連載中 / 已完結 / 太監）。
- wordCount：移除逗號與非數字後 `parseInt`；不可解析則略過。
- lastUpdate：可解析則轉 ISO；無法解析保留原字串（前端照字串顯示）。

## 合併寫入策略（非阻塞 enrich）
- 觸發時機：新增後的 enrich（有 `tab.id` 則 waitForTabComplete → extractMeta）或以 cache 合併。
- 來源優先序：使用者已編輯 > 既有 DB 值 > 新抽到/快取值。
- 寫入條件：僅填「目前為空」的欄位；不覆寫使用者修改。
- 寫入位置：`webpage.meta[...]`；`note` 回填規則同上。
- 寫回 DB 後，前端透過 `chrome.storage.onChanged('webpages')` 節流自動 reload，反映最新資料。

## Template 對應與顯示
- 書籍模板的欄位 key 與以上固定鍵名一致（快速建立已對齊）。
- 即便未套用模板，資料也先存入 meta；套用模板後即可直接顯示。
- 模板決定顯示順序與型別；固定鍵名確保對齊與可擴充性。

## 測試建議（實作時）
- 抽取單元：各 `og:novel:*` → 對應鍵名、狀態/字數/日期解析。
- 服務整合：enrich 僅填空；`note` 回填；寫回觸發前端 reload。
- UI 顯示：有/無模板時欄位呈現一致；使用者手動編輯後不被覆蓋。

