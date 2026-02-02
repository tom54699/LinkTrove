# 批次操作（Batch Operations）

本文件整理多選批次操作的 UI 與資料流程，供開發與維護參考。

**最後更新：2026-01-19**

---

## 範疇與入口

- UI 元件：`src/app/webpages/CardGrid.tsx`
- 對話框：`src/app/webpages/MoveSelectedDialog.tsx`
- 入口位置：Groups 內容區的卡片格網（CardGrid）

---

## 使用流程（現況）

1. **滑入卡片**：卡片左上角出現 checkbox
2. **勾選卡片**：進入多選狀態
3. **浮動工具列出現**（畫面底部）
   - MOVE：批次移動
   - Open tabs：批次開啟分頁
   - DELETE：批次刪除
4. **點擊 ✕**：清空選取並退出多選

---

## 批次操作流程

### 1) 批次開啟分頁

- 取出被選取的卡片 URL
- 優先使用 `chrome.tabs.create({ url, active: false })` 逐一開啟（無法使用時 fallback 到 `window.open(url, '_blank')`）
- 超過 10 筆時會先顯示確認提示

### 2) 批次移動

- UI：`MoveSelectedDialog` 選擇目標 Collection / Group
- 邏輯：
  - 依序執行 `onUpdateCategory`（更新 category）
  - 呼叫 `storageService.updateCardSubcategory`（更新 subcategoryId）
- 操作完成後清空選取並顯示成功 toast

### 3) 批次刪除

- UI：確認對話框
- 呼叫 `onDeleteMany(ids)` 批次刪除
- 操作完成後清空選取並顯示成功 toast

---

## 已知限制

- 不支援「多張卡片批次拖放」（僅多選操作）
- 批次移動為逐筆更新，尚未合併為原子操作
- 無撤銷（undo）機制
