LinkTrove — 使用與安裝說明

概覽

- 這是一個類 Toby 的分頁/網頁管理 Chrome 擴充。新分頁畫面（New Tab）提供三欄介面：
  - 左：Collections（分類）
  - 中：已儲存的網頁卡片（可拖曳重排、編輯、刪除）
  - 右：Open Tabs（目前瀏覽器分頁，支援多視窗分組）
  - 額外：支援 Organizations 層級，可在側欄最上方切換不同 Organization 以分隔多個集合空間

基本操作

- 儲存分頁：在右側「Open Tabs」直接拖曳任一分頁到中間卡片區即可儲存。
  - 在某個分類下操作時，拖入的網頁會自動歸入當前分類。
  - 相同 URL 可重複儲存（以卡片 id 唯一）。
- 編輯卡片：
  - 點卡片備註區可「內聯」編輯（失焦自動儲存）。
  - 右上 Edit 圖示開啟「編輯彈窗」：可修改 Title / URL（僅 http/https，會正規化）/ Description / Category；
    - Enter 送出、Esc 關閉。
  - 右上 Delete 圖示可刪除卡片，會跳出確認。
- 重排卡片：按住卡片拖曳，即可重排順序；拖曳時會出現「插入線」提示，順序會持久化。
- 批次刪除：點「Select」進入選取模式，勾選卡片後點「Delete Selected」。

Organizations 與 Collections（分類）

- 切換 Organization：側欄最上方下拉選單（預設 Personal）
- 新增分類：右上「+ ADD COLLECTION」→ 輸入名稱與顏色 → Create（新增於目前 Organization）
- 切換分類：在左側 Sidebar 點擊分類即可切換，中間只會顯示該分類的卡片。
- 變更卡片分類：在卡片「編輯彈窗」的 Category 下拉即可切換。

Open Tabs（右側）

- 多視窗分組：依視窗分組顯示（web1、web2…）。
  - 可點標題右側 ✎ 重命名群組（會記憶在本機）。
  - 點箭頭可摺疊/展開；活動視窗會有描邊標示。
- 排序同步：群組內分頁順序與瀏覽器分頁列一致（由左至右）。
- 跨視窗拖動：把分頁拖出原視窗變成新視窗，右側會立即新增群組並移動該分頁；拖回原視窗亦會同步。

搜尋（Search）

- 位置：上方標題列右側。
- 快捷鍵：按 Ctrl+K（Windows/Linux）或 Cmd+K（macOS）快速聚焦搜尋。
- 比對欄位：Title / URL / 備註；即時顯示前 10 筆結果。
- 導引：點擊或 Enter 選擇結果後，畫面會自動：
  - 切換到該卡片所在分類
  - 捲動到卡片並暫時高亮（綠框約 3 秒）
  - 清空搜尋框

其他

- Toast 與 Loading：操作成功/失敗有提示；長作業會顯示 Loading。
- 專案備份/還原（Settings）：
  - 匯出 JSON：下載含 `organizations/categories/subcategories/webpages/templates` 與每群組順序（orders）的檔案；並含 `settings.selectedOrganizationId`、`settings.selectedCategoryId`（若存在）。
  - 匯入 JSON（取代）：以檔案匯入，取代現有資料（建議先匯出備份）。若匯入檔未包含 `organizations`，系統會自動建立 `o_default` 並為 categories 補上 `organizationId`。
- 第三方匯入（M2）：
  - Toby（群組層）：在 Home → 每個 group 標題列「匯入 Toby」，選擇 Toby v3 JSON（lists 或 cards 皆可），以向導（Wizard）匯入到該 group，保留順序。
  - Toby v4（含 Organizations）：在 Home 工具列「匯入 Toby（新集合）」：若偵測到 v4 `organizations`，會自動建立對應的 Organizations 與 Collections，並將 lists → groups、cards → cards（保留每 group 內順序）。
  - HTML（集合層）：在 Home 工具列「匯入 HTML（新集合）」：選檔後彈窗可命名新集合、選擇模式：
    - 依資料夾（H3）建立多群組（預設）
    - 扁平模式：匯入到單一群組（可命名）
  - 進度與取消：大檔會分批寫入（預設每批約 300 筆），顯示進度條並可取消。
  - 縮圖：匯入時嘗試 DDG ip3 取得 favicon，若載入失敗 UI 會自動回退為預設圖示。

小撇步

- 將常用視窗群組重命名，便於辨識（例如「工作」、「研究」、「影音」）。
- 拖曳分頁至中間卡片區儲存，建立研究收藏夾；再用搜尋（Ctrl/Cmd+K）快速回到對應卡片。

安裝流程（從原始碼）

- 需求：
  - Node.js 18+（建議 18 或 20）
  - Chrome/Chromium 系瀏覽器（支援 Manifest V3）
- 步驟：
  1. 安裝依賴
     - `npm ci` 或 `npm install`
  2. 建置產出
     - `npm run build`
     - 產物會在 `dist/` 目錄（已包含 `background.js`、`newtab.html` 等）
  3. 載入擴充
     - 打開 `chrome://extensions`
     - 右上角開啟「開發人員模式」
     - 點「載入未封裝項目（Load unpacked）」
     - 選擇專案下的 `dist/` 目錄
  4. 完成後：
     - 新開分頁（New Tab）即可看到 LinkTrove 介面
     - 如有更新程式碼，重新執行 `npm run build`，回到 `chrome://extensions` 點「重新載入（Reload）」即可

開發建議

- 快速迭代：
  - 編輯程式 → `npm run build` → 在 `chrome://extensions` 重新載入擴充
- 偵錯：
  - 新分頁頁面：在 New Tab 介面按 F12 打開 DevTools
  - 背景 Service Worker：在 `chrome://extensions` 找到 LinkTrove → Service worker → Inspect
- 權限說明（manifest）：
  - `tabs`：讀取目前分頁清單與事件，同步右側 Open Tabs 面板
  - `storage`：儲存資料（卡片、分類、群組標籤）
  - `host_permissions: <all_urls>`：擷取分頁標題/網址/網站圖示（favicon）

測試

- 單元與整合測試：
  - `npm test`
  - 重要測試：
    - 匯出/匯入順序保持：`src/background/__tests__/export-import.orders.test.ts`
    - 每群組排序/跨群組移動：`src/background/__tests__/order.pergroup.intragroup.multigroups.test.ts`
    - Toby 匯入（lists/cards → group）：`src/background/__tests__/import.toby.intoGroup.cards.test.ts`
    - HTML 匯入（群組層/集合層、多群組/扁平）：`src/background/__tests__/import.html.*.test.ts`

打包（可選）

- 產生可分發 zip：
  - `npm run build`
  - 壓縮 `dist/` 資料夾為 zip，即可用於 Chrome Web Store 上傳（需自行準備清單與商店設定）
