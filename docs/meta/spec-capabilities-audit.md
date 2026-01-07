# 7 Capabilities 規格與實作對照（初步分析）

> 目的：整理 OpenSpec 規格與現有實作的吻合度與缺口。此文件僅為分析摘要，未修改任何程式碼。

---

## 1) bookmark-management

### 對齊證據
- 階層/組織與多組織資料實作：`src/app/sidebar/organizations.tsx`、`src/app/sidebar/categories.tsx`
- 卡片元資料擷取與保存：`src/app/webpages/metaAutoFill.ts`、`src/app/webpages/WebpagesProvider.tsx`
- IndexedDB 寫入/讀取與遷移：`src/background/idb/*`
- 順序保存與跨群組更新：`src/app/webpages/*`、`src/app/dnd/dragContext.ts`

### 缺口/疑點
- 規格內含「匯入匯出支援」但實作已獨立到 `import-export` capability，存在規格職責重疊風險。
  - `openspec/specs/bookmark-management/spec.md`
  - `openspec/specs/import-export/spec.md`

### Requirement 對照（逐條）
- 階層式組織架構：對齊（組織/分類/群組資料結構與 UI 已實作）
  - `src/app/sidebar/organizations.tsx`、`src/app/sidebar/categories.tsx`
- 卡片順序保存：對齊（拖放後順序保存/重載維持）
  - `src/background/webpageService.ts`、`src/app/webpages/*`
- IndexedDB 持久化儲存：對齊（IDB 寫入/讀取）
  - `src/background/idb/*`、`src/background/storageService.ts`
- 自動資料遷移：對齊（migration 邏輯存在）
  - `src/background/idb/db.ts`、`src/background/idb/__tests__/migration.organizations.test.ts`
- 多組織支援：對齊（組織切換與保存）
  - `src/app/sidebar/organizations.tsx`、`src/background/idb/*`
- 卡片元資料管理：部分（自動擷取與編輯存在，但完整對應情境需再核）
  - `src/app/webpages/metaAutoFill.ts`、`src/app/webpages/WebpageCard.tsx`
- 匯入匯出支援：部分/重疊（功能存在但由 `import-export` 承擔）
  - `src/app/data/exportImport.ts`、`src/app/groups/import/*`

---

## 2) import-export

### 對齊證據
- LinkTrove JSON 匯出/匯入與資料寫入：`src/app/data/exportImport.ts`
- Toby/HTML 匯入 UI 與流程：`src/app/groups/import/*`
- HTML 分享/匯出：`src/app/groups/share/*`

### 缺口/疑點
- 規格中的「錯誤處理與回滾」「進度提示」在實作中可見度有限，未見明確回滾保證流程。

### Requirement 對照（逐條）
- LinkTrove JSON 格式匯出：對齊
  - `src/app/data/exportImport.ts`
- LinkTrove JSON 格式匯入：對齊（有驗證與寫入）
  - `src/app/data/exportImport.ts`
- Toby v3/v4 JSON 格式匯入：對齊（含格式差異處理）
  - `src/background/importers/toby.ts`、`src/app/groups/import/*`
- HTML 書籤格式匯入：對齊
  - `src/background/importers/html.ts`、`src/app/groups/import/*`
- 順序保留機制：部分（有 order 邏輯，但跨格式一致性需再核）
  - `src/background/webpageService.ts`、`src/background/importers/*`
- 錯誤處理與使用者反饋：部分（有 toast，但回滾/進度細節不足）
  - `src/app/groups/import/useGroupImport.ts`、`src/app/ui/feedback.tsx`
- 匯入選項與設定：未見（合併/覆蓋等模式未明確）

---

## 3) drag-drop

### 對齊證據
- 卡片拖放排序、跨群組移動、插入位置等核心流程與測試：
  - `src/app/webpages/*`
  - `src/app/dnd/dragContext.ts`
  - `src/app/groups/__tests__/drag-drop.ui.test.tsx`

### 缺口/疑點
- 規格的「多張卡片批次拖放」「撤銷拖放」「觸控長按拖放」「離線拖放」未見對應 UI 或邏輯。
- 規格要求的「拖放效能優化（虛擬化/批次寫入）」未見明確流程或對應註記。

### Requirement 對照（逐條）
- 卡片拖放排序：對齊
  - `src/app/webpages/*`、`src/app/dnd/dragContext.ts`
- 跨群組拖放移動：對齊
  - `src/app/webpages/*`、`src/app/sidebar/*`
- 拖放區域偵測：部分（有高亮/插入視覺，但規格完整性需再核）
  - `src/app/webpages/*`
- 拖放效能優化：未見（缺少虛擬化/批次寫入明確策略）
- 多張卡片批次拖放：未見（多選僅用於批次刪除）
  - `src/app/webpages/WebpageCard.tsx`
- 撤銷拖放操作：未見
- 觸控裝置支援：未見
- 拖放狀態持久化：部分（拖放後保存存在，但離線/分頁關閉等情境未明）

---

## 4) open-tabs-sync

### 對齊證據
- 與 Chrome runtime 連線、tab event 處理、多視窗分組與標籤管理：
  - `src/app/tabs/OpenTabsProvider.tsx`
  - `src/app/tabs/TabsPanel.tsx`

### 缺口/疑點
- 「快速儲存分頁到書籤」「分頁搜尋與過濾」「錯誤處理與權限管理」未見完整 UI/流程。
- 規格中的「多視窗/重連/錯誤重試」細節未看到清楚實作落點。

### Requirement 對照（逐條）
- 即時分頁同步：對齊（runtime port 監聽 tabs event）
  - `src/app/tabs/OpenTabsProvider.tsx`
- 多視窗支援：對齊（分組與標籤管理）
  - `src/app/tabs/TabsPanel.tsx`
- 快速儲存分頁到書籤：未見
- 分頁點擊切換：部分（有列表 UI，但切換行為未清楚對應）
  - `src/app/tabs/TabItem.tsx`
- 分頁搜尋與過濾：未見
- 效能優化：未見明確措施
- 視覺化顯示：部分（有 favicon/標籤，但音訊/固定分頁等未見）
- 錯誤處理與權限管理：未見

---

## 5) templates

### 對齊證據
- 模板 CRUD、欄位型別、模板使用統計、預設模板：
  - `src/app/templates/TemplatesManager.tsx`
  - `src/app/templates/TemplatesProvider.tsx`
- 模板資料進入匯出/同步流程：
  - `src/app/data/exportImport.ts`
  - `src/app/data/syncService.ts`
  - `src/app/data/mergeService.ts`

### 缺口/疑點
- 規格中的「模板變數替換（日期/計數器/自訂格式）」未見實作（未看到變數解析或 `{{ }}` 類型替換邏輯）。

### Requirement 對照（逐條）
- 建立卡片模板：對齊
  - `src/app/templates/TemplatesManager.tsx`、`src/app/templates/TemplatesProvider.tsx`
- 模板變數支援：未見
- 快速新增模板卡片：部分（有模板管理與欄位，但「模板生成卡片」流程需再核）
  - `src/app/webpages/WebpagesProvider.tsx`
- 模板管理：對齊（編輯/刪除/排序/搜尋）
  - `src/app/templates/TemplatesManager.tsx`
- 預設模板：部分（有快速建立與重置概念，但「首次啟動預設」需再核）
  - `src/app/templates/TemplatesManager.tsx`
- 模板使用統計：部分（有 usage 計算/顯示，但來源與完整度需再核）
  - `src/app/templates/TemplatesManager.tsx`
- 模板變數擴展：未見

---

## 6) settings（新增）

### 對齊證據
- Settings UI 現況僅涵蓋「匯出/匯入、Cloud Sync、Templates」：
  - `src/app/ui/SettingsModal.tsx`
- 主題切換獨立在 App Context：
  - `src/app/AppContext.tsx`
  - `src/app/App.tsx`

### 缺口/疑點
- 規格要求的外觀/行為/隱私/同步/版本資訊/更新檢查等多數條目未在 Settings UI 中呈現。
- GitHub Token 管理存在但位於分享對話框，而非設定頁：`src/app/groups/share/dialogs/TokenDialog.tsx`

### Requirement 對照（逐條）
- 外觀設定：部分（主題切換存在但不在 Settings 內）
  - `src/app/AppContext.tsx`、`src/app/App.tsx`
- 行為設定：未見
- GitHub Token 管理：部分（有 Token 流程，但位置在分享對話框）
  - `src/app/groups/share/dialogs/TokenDialog.tsx`
- 資料管理：部分（匯出/匯入存在）
  - `src/app/ui/SettingsModal.tsx`
- 隱私與安全設定：未見
- 關於與說明：未見
- 設定同步：未見（僅資料層有 settings 進出，UI 未提供）
  - `src/background/idb/storage.ts`、`src/app/data/exportImport.ts`

---

## 7) search（新增）

### 對齊證據
- 基礎搜尋 UI 與快捷鍵（Ctrl/Cmd+K）：`src/app/ui/SearchBox.tsx`

### 缺口/疑點
- 「模糊匹配」「過濾」「搜尋歷史」「搜尋建議」「效能虛擬化/取消」未見實作。
- 現況為簡單 `indexOf` 比對，無歷史或建議資料結構。

### Requirement 對照（逐條）
- 全域搜尋介面：部分（有搜尋框與快捷鍵，但缺少獨立搜尋面板設計）
  - `src/app/ui/SearchBox.tsx`
- 即時搜尋：對齊（輸入即更新）
  - `src/app/ui/SearchBox.tsx`
- 搜尋範圍：部分（標題/URL/描述有涵蓋，但多欄位細節需再核）
  - `src/app/ui/SearchBox.tsx`
- 模糊搜尋：未見
- 搜尋過濾：未見
- 搜尋結果操作：部分（Enter 導航，但快捷鍵/新分頁/快速編輯未見）
  - `src/app/ui/SearchBox.tsx`
- 搜尋歷史：未見
- 搜尋效能優化：未見
- 搜尋建議：未見

---

## 總結

- 規格層面：7 個 capability 皆存在且名稱一致。
- 實作層面：bookmark-management / import-export / templates 相對接近；drag-drop / open-tabs-sync 有多項缺口；settings / search 明顯超前實作。
