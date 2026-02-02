# Change: 修正 Edge 瀏覽器睡眠分頁的 Meta 提取

## Why
Microsoft Edge 的 "Sleeping Tabs" 功能與 Chrome 的 "Discarded Tabs" 在技術實作上有重大差異：

1. **Chrome**: 使用 `tab.discarded` 屬性標記被 Memory Saver 卸載的分頁，擴充功能可透過此屬性偵測並主動喚醒（reload）後提取 meta
2. **Edge**: 使用 "Sleeping Tabs" 暫停（freeze）閒置分頁（預設 2 小時後），但**沒有對應的 API 屬性**讓擴充功能偵測睡眠狀態

根據 [Microsoft Edge Extensions Issue #134](https://github.com/microsoft/MicrosoftEdge-Extensions/issues/134)，當擴充功能嘗試對睡眠中的分頁執行 `chrome.scripting.executeScript` 時，Promise 會永遠卡住（hang）直到分頁被使用者喚醒，而不是正常 reject。

**實際影響**：
- 使用者在 Edge 上儲存網頁卡片時，如果分頁已進入睡眠狀態
- `extractMetaForTab()` 會卡住，無法提取標題、描述、favicon 等 meta 資料
- 卡片顯示為空白或缺少完整資訊
- Chrome 上相同功能正常運作（因為可以偵測 `discarded` 並主動 reload）

## What Changes
- **新建檔案**: `src/utils/browser.ts` - 提供跨瀏覽器偵測工具函數
  - 新增 `isEdgeBrowser()` 函數，export 供其他模組使用
- **重構**: `src/app/data/cloud/googleDrive.ts`
  - 移除內部的 `isEdgeBrowser()` 定義
  - 改為從 `src/utils/browser.ts` import
- **修改**: `src/background/pageMeta.ts`
  - Import `isEdgeBrowser()` 函數
  - 修改分頁狀態檢查邏輯（Line 373）：在 Edge 上**主動喚醒所有分頁**（執行 `chrome.tabs.reload()`）
  - 新增診斷日誌以追蹤 Edge 專用邏輯的執行
- **修改**: `src/app/webpages/WebpagesProvider.tsx` ⭐ **核心修改**
  - Import `isEdgeBrowser()` 函數
  - 修改 `addFromTab` 函數的分頁準備邏輯（Line 176-186）
  - 在 Edge 上主動 reload 分頁，而不是等待 `waitForTabComplete` timeout
  - 這是**拖曳儲存**的主要路徑，最常遇到睡眠分頁問題
- **修改（可選）**: `src/background.ts`
  - 修改 `enrichFromTabMeta` 函數（Line 97-100）加入 Edge 判斷
  - 雖然右鍵選單不太會遇到睡眠分頁，但為了程式碼一致性

**技術策略**：
- Chrome: `if (tab.discarded)` → reload → extract
- Edge: `if (isEdgeBrowser())` → reload → extract（因為無法偵測睡眠狀態，一律先喚醒）

## Impact
- **Affected specs**: `bookmark-management`（卡片元資料管理）
- **Affected code**:
  - `src/utils/browser.ts` - **新建**，共用瀏覽器偵測工具
  - `src/app/webpages/WebpagesProvider.tsx` - **核心修改**，拖曳儲存的 meta 提取邏輯（Line 176-186）
  - `src/background/pageMeta.ts` - extractMetaForTab 加入 Edge reload 邏輯（Line 373）
  - `src/app/data/cloud/googleDrive.ts` - 重構使用共用函數
  - `src/background.ts` - （可選）enrichFromTabMeta 一致性修改
- **User benefit**: Edge 使用者透過**拖曳儲存**網頁卡片時能正常取得標題、描述、favicon
- **Primary use case**: 拖曳 Open Tabs 中的分頁到 Collection/Group（最常用的儲存方式）
- **Breaking changes**: 無（向下相容，僅改善 Edge 相容性）
- **Performance impact**: Edge 上會多執行一次 reload（約 1-2 秒），但確保功能正常運作
- **已知限制**: Microsoft 目前未提供官方 API 偵測睡眠分頁，此為 workaround 方案
- **Code quality**: 消除重複程式碼（DRY 原則），未來瀏覽器相容性邏輯可集中管理
