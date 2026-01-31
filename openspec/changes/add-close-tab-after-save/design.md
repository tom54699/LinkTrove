# Design: 儲存分頁後自動關閉功能

## Context
使用者從 Open Tabs 拖曳分頁儲存到卡片區後，希望分頁自動關閉。需要處理：
1. 使用者可控的設定開關
2. Meta enrichment 需要在分頁關閉前完成
3. Chrome 不允許關閉視窗中最後一個分頁

## Goals / Non-Goals
- Goals:
  - 提供設定開關讓使用者自行選擇
  - 確保 meta 資料（標題、描述、favicon）在關閉前提取完成
  - 優雅處理無法關閉分頁的情況（靜默失敗）
- Non-Goals:
  - 不處理批次拖曳多個分頁的情況（保持現有行為）
  - 不改變 Context Menu 儲存的行為（僅限拖曳）

## Decisions

### 決策 1: Meta Enrichment 順序
**選擇**: 先同步等待 meta enrichment 完成，再關閉分頁

**原因**:
- 目前 meta enrichment 是非同步的，關閉分頁後會失敗
- 使用者體驗：關閉分頁前確保資料完整

**實作方式**:
```typescript
// WebpagesProvider.addFromTab 中
const created = await service.addWebpageFromTab(tab, options);

// 等待 meta enrichment（如果設定要關閉分頁）
if (shouldCloseTab) {
  await extractMetaForTab(tab.id);  // 同步等待
  await closeTabSafely(tab.id);
} else {
  extractMetaForTab(tab.id);  // 非同步（現有行為）
}
```

### 決策 2: 最後一個分頁處理
**選擇**: 檢查視窗中分頁數量，如果是最後一個則跳過關閉

**原因**:
- Chrome API 會拋出錯誤如果關閉最後一個分頁
- 使用者可能正在使用該分頁

**實作方式**:
```typescript
async function closeTabSafely(tabId: number): Promise<boolean> {
  try {
    const tab = await chrome.tabs.get(tabId);
    const tabs = await chrome.tabs.query({ windowId: tab.windowId });

    if (tabs.length <= 1) {
      console.log('Skipping close: last tab in window');
      return false;
    }

    await chrome.tabs.remove(tabId);
    return true;
  } catch (e) {
    // Tab already closed or no permission
    console.warn('Failed to close tab:', e);
    return false;
  }
}
```

### 決策 3: 設定預設值
**選擇**: 預設關閉（`closeTabAfterSave: false`）

**原因**:
- 保持與現有行為一致，避免驚嚇現有使用者
- 使用者可在設定中啟用

## Risks / Trade-offs

| 風險 | 影響 | 緩解方式 |
|------|------|----------|
| Meta enrichment 變慢 | 使用者感知延遲 | 顯示 loading 狀態或使用 optimistic update |
| Tab 已被關閉 | 無法提取 meta | 使用已儲存的基本資料（title, favicon from drag data） |
| 權限問題 | 無法關閉某些分頁 | 靜默失敗，不影響儲存成功 |

## Open Questions
- 是否需要在關閉分頁前顯示短暫的 toast 通知？（建議：否，保持簡潔）
