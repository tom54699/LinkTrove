# Change: 修復新增分頁時欄位格式不一致導致無法即時顯示

## Why
當使用者建立新分頁時，右側 Open Tabs 區域無法正確即時顯示新分頁。問題根源在於 `tabsManager` 發送的 `created` 事件 payload 使用 Chrome 原生的欄位名稱（`groupId`），但 UI 層期望使用內部統一的欄位名稱（`nativeGroupId`），導致欄位名稱不一致，新分頁無法被正確歸類到分頁群組中，或根本無法正確渲染。

## What Changes
- **修改 `src/background/tabsManager.ts`**：在 `created` 事件處理函數中，將 Chrome 原生 tab 物件轉換為內部格式，確保欄位名稱一致（`groupId` → `nativeGroupId`）
- **統一格式轉換**：在 `background.ts` 中建立或重用 `tabToPayload` 函數，確保所有 tab 事件的 payload 格式一致
- **確保其他事件一致性**：檢查並修復其他 tab 事件（`updated`、`replaced` 等）是否也有相同問題

## Impact
- **Affected specs**: `open-tabs-sync`
- **Affected code**:
  - `src/background/tabsManager.ts` - 修改 `created` 事件處理邏輯
  - `src/background.ts` - 可能需要調整 `tabToPayload` 的位置或重用方式
- **使用者影響**: 修復後，新建立的分頁將立即正確顯示在 Open Tabs 區域，包含正確的群組歸屬和所有欄位資訊
- **Breaking changes**: 無，這是 bug 修復，恢復 spec 預期行為
