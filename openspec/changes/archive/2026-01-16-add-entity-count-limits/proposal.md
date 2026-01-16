# Proposal: add-entity-count-limits

## Summary
為 Organization、Collection（Category）、Group（Subcategory）添加數量上限限制，以確保 UI 佈局的穩定性和良好的使用者體驗。

## Motivation
目前系統對實體數量沒有任何限制，當使用者創建過多的 Organization、Collection 或 Group 時，可能導致：
1. UI 佈局錯亂或溢出
2. 左側邊欄過於擁擠，難以瀏覽
3. 效能下降

## Proposed Limits
| 實體類型 | 上限 | 範圍 |
|---------|------|------|
| Organization | 8 | 全域 |
| Collection (Category) | 20 | 每個 Organization |
| Group (Subcategory) | 50 | 每個 Category |

## Scope
- **Capability**: bookmark-management
- **Files affected**:
  - `src/background/idb/storage.ts` - 添加創建前的數量檢查
  - `src/app/sidebar/organizations.tsx` - UI 層錯誤處理和提示
  - `src/app/sidebar/categories.tsx` - UI 層錯誤處理和提示
  - `src/app/groups/GroupsView.tsx` - UI 層錯誤處理和提示

## Implementation Approach
1. 在 `storage.ts` 中定義常量 `ENTITY_LIMITS`
2. 在各 `create*` 函數中添加數量檢查
3. 超過上限時拋出帶有特定錯誤碼的錯誤（例如 `LIMIT_EXCEEDED`）
4. UI 層捕獲錯誤並顯示友善的 toast 提示

## Out of Scope
- 匯入資料時不強制限制（避免匯入失敗）
- 不影響現有超過限制的資料（僅限制新增）
