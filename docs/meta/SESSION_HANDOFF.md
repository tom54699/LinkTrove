# Session 交接文檔

> **用途：** 解決 AI 工具 Session 斷開後的連續性問題，確保下次對話能無縫接續
>
> **最後更新：** 2026-01-30 (原生分頁群組同步與拖曳修復)
>
> **更新者：** Claude Code

---

## 📍 當前狀態

### 最近完成的工作

1. ✅ **原生分頁群組收合同步與拖曳排序**（2026-01-30）
   - **收合同步**：UI 收合/展開群組時同步更新瀏覽器原生群組狀態
   - **拖曳排序**：支援 tabs/groups 拖曳重新排序（Native HTML5 DnD）
   - **Bug 修復**：
     - 修復 `isDraggingGroup` 未定義導致群組內拖曳失敗
     - 修復拖曳順序邏輯（先改群組再計算 index）
     - 修復拖到群組最尾巴無法儲存問題
     - 修復新群組建立後沒有即時同步（添加 debug logging 驗證）
   - **P0 問題修復**：
     - 完善 handleDrop 狀態清理（setDragTab/setDragGroup）
     - 添加群組拖曳 onDragEnd 清理邏輯
   - **設計決定**：
     - 群組標題不作為 drop target（只負責收合/展開）
     - 群組暫不支援拖到分頁之間（UX 複雜度考量）
   - **文檔更新**：
     - 創建 `openspec/changes/add-native-group-collapse-sync/IMPLEMENTATION.md`
     - 更新 tasks.md 記錄所有修復
     - 更新 SESSION_HANDOFF.md（本文件）
   - 建置通過，功能驗證完成

2. ✅ **OpenTabs 頂部間距調整**（2026-01-29）
   - 調整右側 OpenTabs panel 頂部 border 與第一個 window 之間間距
   - FourColumnLayout.tsx：`pb-4` → `py-4`（頂部增加 16px padding）
   - 視覺更舒適，避免內容與分隔線太擠

2. ✅ **時間戳 canonical number（內部儲存）**
   - 新增 `src/utils/time.ts`，寫入改用 `Date.now()` (number)
   - IDB migration：把舊 ISO string 轉成 number
   - export 時轉回 ISO string，保持對外相容
   - 更新 OpenSpec（unify-cascade-soft-delete）時間戳規範

2. ✅ **TypeScript 錯誤修復**（90+ 錯誤 → 0 錯誤）
   - 修復 App.tsx、categories.tsx、pageMeta.ts 等檔案
   - 建置通過，無編譯錯誤

2. ✅ **DatabaseManager 系統刪除**（997 行未使用代碼）
   - 刪除 src/background/db/ 目錄
   - 移除未執行的 SQLite 遷移計畫

3. ✅ **GroupsView.tsx 重構**（1,622 → 468 行，-71%）
   - 階段 1：提取 generateBooklistHTML (~800 行)
   - 階段 2：提取 useGroupShare Hook (239 行)
   - 階段 3：提取 useGroupImport Hook (155 行)
   - 階段 4：提取 5 個對話框組件
   - 功能測試通過：用戶確認「看起來沒問題」

4. ✅ **專案結構清理**
   - 刪除 .kiro/ 目錄（舊任務系統）
   - 刪除 docs/ACCEPTANCE.md、SPEC.md、recap.md
   - 刪除 .eslintrc.json（已使用 eslint.config.js）
   - 保留 AGENTS.md（用戶要求）

5. ✅ **文檔架構建立**
   - 創建 docs/ 分層結構（architecture/、features/、specs/、development/、meta/）
   - 移動現有文檔到新位置
   - 創建 INDEX.md、component-map.md、SESSION_HANDOFF.md（本文件）
   - 創建 openspec-installation.md（OpenSpec 安裝指南）
   - 精簡 CLAUDE.md（202 → 154 行，-24%）

6. ✅ **文檔一致性修正**
   - 修正 INDEX.md 中的錨點與連結錯誤
   - 修正跨文檔引用路徑（cloud-sync、openspec）
   - 更新過期的行號與文檔結構描述
   - 為舊文檔添加重構警告標註

7. ✅ **最小數量刪除保護（Minimum Count Protection）**
   - Data layer + UI layer 三層刪除保護完成（Organization/Collection/Group）
   - 級聯刪除行為確認（Organization → Collections → Groups → Webpages）
   - 測試修正完成：Organizations/Categories/Groups/Integration

8. ✅ **新增 Organization 管理入口與自動儲存**
   - OrganizationNav 新增「管理 Organizations」按鈕與對話框
   - 重新命名與顏色調整改為自動儲存
   - 新增管理對話框 UI 測試

9. ✅ **手動驗證最小數量刪除保護**
   - Organization/Collection/Group 最小數量保護皆通過手動驗證
   - 級聯刪除與錯誤提示符合預期

10. ✅ **批次操作功能（Batch Operations）**（2026-01-09）
   - 使用 OpenSpec 規範完成需求設計與提案
   - 實作多選卡片功能（hover 顯示 checkbox）
   - 新增浮動工具列（MOVE / Open tabs / DELETE）
   - 批次開啟標籤頁（10+ 張時顯示確認提示）
   - 批次移動卡片（MoveSelectedDialog 對話框）
   - 批次刪除卡片（含確認對話框）
   - **UX 改進**：移除 "Select" 按鈕，改為 hover 顯示 checkbox（更直覺）
   - 建置通過，無編譯錯誤
   - 更新 CLAUDE.md 文檔

11. ✅ **拖放冗餘重渲染修復**
   - `WebpagesProvider` 加入操作鎖定，避免 drop 期間多次 `load()`
   - 新增 `actions.moveCardToGroup` 封裝跨群組移動

12. ✅ **休眠分頁 Meta 擷取修復**
   - `pageMeta` 對 discarded tab 改為背景 `reload`，避免切換焦點
   - `OpenTabsProvider` 補強 onReplaced 事件處理

13. ✅ **搜尋 UI 強化**
   - Pill 觸發 + 全螢幕 modal
   - 快捷鍵：Ctrl/Cmd+K、Ctrl/Cmd+F、`/`
   - Recent Search（最近 10 筆）與相對時間顯示

14. ✅ **卡片編輯對話框修復**
   - 補回 Note 欄位
   - 修正自動儲存回朔問題（僅在 modal 開啟時初始化）

15. ✅ **模板欄位鍵格式驗證**
   - 限制欄位鍵僅允許英數與底線
   - 驗證失敗時阻止儲存並提示錯誤

16. ✅ **文檔同步更新（2026-01-19）**
   - 新增功能文檔：搜尋 / 模板 / 批次操作
   - 更新架構文檔：overview / data-flow / component-map / INDEX
   - 更新現況稽核：spec-capabilities-audit / drag-drop-storage-display

17. ✅ **搜尋自動載入與簡繁互通（2026-01-19）**
   - SearchBox 加入接近底部自動載入（每頁 20）
   - 引入 OpenCC 轉換器，支援簡繁互通搜尋
   - 新增搜尋測試：簡繁互通 + 自動載入

18. ✅ **右鍵保存改為階層式選單（2026-01-22）**
   - 新增右鍵選單入口（分頁/連結/選取文字）
   - 右鍵選單內直接選擇 Organization → Collection → Group（無對話框）
   - 保存邏輯與拖放一致，卡片追加到末端順位
   - 不寫入選取文字描述，改為補抓頁面 meta（含模板欄位）
   - 移除保存對話框頁面與相關 UI/測試

19. ✅ **預設 Organization/Collection/Group 改為隨機 ID**
   - 新增 `isDefault` 標記與預設名稱（My Space / Bookmarks / General）
   - migration / ensureBaseline / createOrganization / import-export / Providers 全面改寫
   - 移除固定 `o_default` / `default` ID 依賴

20. ✅ **同步清理空預設層級 + 同步進度阻擋視窗**
   - 僅當雲端有資料時，合併後清理空的預設 Organization/Collection/Group
   - 同步時顯示進度提示並阻擋操作，錯誤可手動關閉

21. ✅ **自動 GC（同步成功後）＋ 移除設定頁 GC 區塊**
   - 同步成功後自動清理 tombstones（保留 30 天、7 天間隔）
   - 只清理 `deletedAt <= lastSyncedAt` 的項目，避免未同步刪除被誤清
   - 設定頁移除 GC 統計與手動清理 UI

21. ✅ **同步提示整合與 i18n**
   - 手動同步沿用 Settings 對話框進度
   - 背景同步改為右下角 Toast（含多語系字串）
   - 修正 syncService 測試與 migration 卡住問題

**新增檔案：**
- `openspec/changes/add-native-group-collapse-sync/IMPLEMENTATION.md` - 拖曳功能實施總結（400+ 行）
- `openspec/changes/add-native-group-collapse-sync/proposal.md` - 功能提案
- `openspec/changes/add-native-group-collapse-sync/tasks.md` - 實作與修復任務清單
- `openspec/changes/add-native-group-collapse-sync/specs/open-tabs-sync/spec.md` - 規格 delta
- `src/app/webpages/MoveSelectedDialog.tsx` - 批次移動對話框組件
- `openspec/changes/add-batch-operations/proposal.md` - OpenSpec 提案
- `openspec/changes/add-batch-operations/tasks.md` - 實作任務清單
- `openspec/changes/add-batch-operations/specs/bookmark-management/spec.md` - Spec Delta
- `src/utils/opencc.ts` - OpenCC 轉換器載入與封裝
- `src/types/opencc-js.d.ts` - opencc-js 型別宣告
- `src/app/ui/__tests__/search.opencc.loadmore.test.tsx` - 搜尋簡繁與載入測試
- `openspec/changes/update-search-infinite-scroll-opencc/*` - OpenSpec 變更提案與規格
- `src/utils/defaults.ts` - 預設名稱與 ID 工具
- `src/app/ui/SyncProgressOverlay.tsx` - 同步進度阻擋視窗
- `openspec/changes/update-default-entities-random-ids/*` - 預設 ID 隨機化提案
- `docs/features/context-menu-save.md` - 右鍵保存功能文檔
- `openspec/changes/add-contextmenu-save-dialog/*` - 右鍵保存提案與規格

**修改檔案：**
- `src/app/tabs/TabsPanel.tsx` - 實作拖曳排序、收合同步、修復所有 P0 問題（+340 行淨變更）
- `src/app/tabs/TabItem.tsx` - 添加 draggable 支援
- `src/app/dnd/dragContext.ts` - 新增 DragTab/DragGroup 類型與狀態管理
- `src/app/tabs/OpenTabsProvider.tsx` - 修復新群組同步（移除 debug log）
- `src/background.ts` - 群組事件監聽與廣播（移除 debug log）
- `docs/meta/SESSION_HANDOFF.md` - 更新本次 Session 工作記錄
- `src/app/webpages/CardGrid.tsx` - 新增浮動工具列與批次操作邏輯（移除 selectMode）
- `src/app/webpages/TobyLikeCard.tsx` - 簡化 checkbox 邏輯（移除 selectMode 檢查）
- `src/styles/toby-like.css` - 新增 hover 顯示 checkbox 樣式
- `CLAUDE.md` - 新增批次操作使用說明
- `src/app/ui/SearchBox.tsx` - 搜尋結果分頁、自動載入、簡繁互通與計數更新
- `package.json` - 新增 opencc-js 依賴
- `openspec/changes/update-search-infinite-scroll-opencc/tasks.md` - 任務狀態更新
- `public/manifest.json` - 新增 contextMenus 權限
- `vite.config.ts` - 右鍵保存改為階層式選單（移除保存對話框入口）
- `src/background.ts` - 右鍵選單註冊與階層保存
- `public/_locales/en/messages.json` - 右鍵保存選單文案
- `public/_locales/zh_TW/messages.json` - 右鍵保存選單文案
- `docs/INDEX.md` - 功能文檔索引新增右鍵保存
- `openspec/changes/add-contextmenu-save-dialog/tasks.md` - 任務完成狀態

**其他近期修改（摘要）：**
- `src/app/webpages/WebpagesProvider.tsx` - drop 操作鎖定與 moveCardToGroup
- `src/background/pageMeta.ts` - discarded tab 背景 reload
- `src/app/tabs/OpenTabsProvider.tsx` - onReplaced 事件補強
- `src/app/ui/SearchBox.tsx` - 搜尋 UI/快捷鍵/歷史
- `src/app/webpages/TobyLikeCard.tsx` - Note 欄位與輸入回朔修復
- `src/app/templates/TemplatesManager.tsx` - 欄位鍵格式驗證

---

## 💾 程式碼狀態

### 建置狀態
- ✅ TypeScript 編譯通過
- ✅ Vite 建置成功
- ✅ 無執行時錯誤
- ✅ 功能測試通過（用戶驗證）
 - ✅ 測試已執行（2026-01-08）：
   - `npm test -- src/app/__tests__/delete-protection.integration.test.tsx`
   - `npm test -- src/app/sidebar/__tests__/categories.delete.test.tsx`
   - `npm test -- src/app/sidebar/__tests__/organizations.delete.test.tsx`
   - `npm test -- src/app/groups/__tests__/GroupsView.delete.test.tsx`
   - `npm test -- src/app/sidebar/__tests__/organization-nav.manage.test.tsx`

### Git 狀態
- ⚠️ 工作目錄有未提交變更（預設 ID 隨機化、同步提示 i18n、測試/文檔更新）
- ⚠️ 未追蹤變更包含：
  - `mockups/sidebar-dracula-circular.html`（非本次新增，注意確認）
  - `openspec/changes/sidebar-native-groups-minimal-list/`
  - `openspec/changes/update-default-entities-random-ids/`
  - `src/app/ui/SyncProgressOverlay.tsx`
  - `src/utils/defaults.ts`

### 分支狀態
- 當前分支：`main`
- ⚠️ 本地領先遠端 1 commit（main...origin/main [ahead 1]）

---

## 🎯 待辦事項

### 優先級 P0（本 Session 已完成）

- [x] 創建文檔目錄結構
- [x] 移動現有文檔到新位置
- [x] 創建 docs/INDEX.md
- [x] 創建 docs/architecture/component-map.md
- [x] 創建 docs/meta/SESSION_HANDOFF.md（本文件）
- [x] 創建 docs/development/openspec-installation.md
- [x] 精簡 CLAUDE.md
- [x] 修正文檔一致性問題
- [x] Git 提交所有變更（截至 2026-01-08）
- [x] 補齊缺失文檔（overview/data-flow/testing-guide/commit-conventions）
- [x] OpenSpec 已安裝並建立 specs/changes

### 優先級 P1（下次 Session 開始時）

0. **完成預設 ID 隨機化變更收尾**
   - 使用者手動執行相關 Vitest（sidebar/groups/background）
   - 檢查同步進度視窗在首次/重新同步時是否正確阻擋操作
   - 更新 `openspec/changes/update-default-entities-random-ids/tasks.md` 勾選狀態

1. **完成 OpenSpec 未完變更（tasks 未勾）**
   - `update-settings-ui`
   - `ui-stacked-flush-tabs`
   - `optimize-group-interactions`
   - `fix-groupsview-render-loop`
   - `refactor-atomic-card-save`（仍有手動驗證）
   - `ui-alignment-groups-cards`

2. **補跑/補確認測試（依 OpenSpec 清單）**
   - `fix-unit-test-regressions` 內列出的 Vitest 測試（需使用者執行）

3. **補驗證已歸檔變更**
   - `archive/2026-01-16-refactor-lazy-load-conflict-dialog`
   - `archive/2026-01-08-auto-default-collection`

### 優先級 P2（功能改進，可選）

- 考慮改進 GitHub Gist 分享機制（避免洗掉舊連結）
- 評估 Google Drive 同步功能是否保留
- CardGrid 拖放邏輯提取為獨立 Hook
- 移除代碼中的 `any` 類型（目前 200+ 處）

---

## 📚 上下文參考

### 重要決策記錄

1. **AGENTS.md 保留**
   - 用戶明確要求保留
   - 包含 AI 代理設定

2. **.claude/skills/ 暫不規劃**
   - 用戶選擇「暫不規劃」
   - 未來需要時再創建

3. **文檔架構設計**
   - 採用 docs/ 分層結構
   - INDEX.md 作為導航入口
   - component-map.md 防止「改 A 壞 B」

4. **OpenSpec 整合計畫**
   - 需要安裝（須關閉 Session）
   - 安裝指南已創建

5. **CLAUDE.md 精簡策略**
   - 保持簡短概述
   - 詳細內容分散到專門文檔
   - 使用 INDEX.md 導航

### 關鍵檔案位置

**文檔：**
- 重構總結：`docs/meta/REFACTORING_SUMMARY.md`
- 文檔計畫：`docs/meta/DOCUMENTATION_PLAN.md`
- 組件關係圖：`docs/architecture/component-map.md`
- 核心索引：`docs/INDEX.md`

**程式碼：**
- 主組件：`src/app/groups/GroupsView.tsx` (468 行)
- 分享模組：`src/app/groups/share/` (generateHTML.ts, useGroupShare.ts, dialogs/)
- 匯入模組：`src/app/groups/import/` (useGroupImport.ts, dialogs/)

**配置：**
- CLAUDE.md（根目錄，已精簡）
- AGENTS.md（根目錄）

---

## 🔧 開發環境設置

### 必要工具
- Node.js 18+
- npm 或 yarn
- Git
- Chrome 瀏覽器（用於擴充功能測試）

### 常用命令
```bash
# 安裝依賴
npm ci

# 開發模式（熱重載）
npm run dev

# 建置生產版本
npm run build

# 執行測試（需用戶同意）
npm test

# 程式碼檢查
npm run lint
npm run format
```

### 測試擴充功能
1. 執行 `npm run build`
2. 開啟 Chrome → 擴充功能管理
3. 啟用「開發者模式」
4. 點擊「載入未封裝項目」
5. 選擇 `dist/` 目錄

---

## 🚨 重要提醒

### 修改代碼前必做

1. **閱讀組件關係圖** - `docs/architecture/component-map.md`
2. **確認影響範圍** - 檢查依賴組件
3. **執行建置測試** - `npm run build`
4. **功能測試** - 手動測試相關功能

### Session 交接流程

**本 Session 結束前：**
1. ✅ 更新本文件的「最近完成的工作」
2. ✅ 更新「待辦事項」狀態
3. ✅ 記錄重要決策
4. ⏳ Git 提交所有變更

**下次 Session 開始時：**
1. 閱讀本文件（SESSION_HANDOFF.md）
2. 檢查 Git 狀態：`git status`
3. 執行建置測試：`npm run build`
4. 確認待辦事項優先級

---

## 📝 下次 Session 檢查清單

當你開始新的 Session 時，請依序檢查：

- [ ] 閱讀 `docs/meta/SESSION_HANDOFF.md`（本文件）
- [ ] 執行 `git status` 檢查未提交變更
- [ ] 執行 `npm run build` 確認建置狀態
- [ ] 查看 `docs/INDEX.md` 了解文檔結構
- [ ] 檢查「待辦事項」區塊的 P0/P1 任務
- [ ] 如需修改代碼，先閱讀 `docs/architecture/component-map.md`

---

## 🎯 當前 Session 目標達成狀況

- [x] 修復所有 TypeScript 錯誤
- [x] 清理未使用代碼
- [x] 重構 GroupsView.tsx（-71% 行數）
- [x] 清理專案結構
- [x] 建立文檔架構系統
- [ ] 精簡 CLAUDE.md（進行中）
- [ ] 安裝 OpenSpec（待下次 Session）

---

**下次對話請從「下次 Session 檢查清單」開始！**
