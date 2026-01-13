# Change: Add Organization Management Dialog

## Change ID
`add-organization-management-dialog`

## Status
✅ Completed (2026-01-13)

## Summary
新增了專用的 Organization 管理對話框，並移除了原有的右鍵選單 (Context Menu) 操作，統一了管理入口。

## Changes Implemented
- **管理按鈕**: 在 `OrganizationNav` 底部新增了「管理 Organizations」按鈕。
- **管理對話框**: 提供列表視圖，允許使用者重新命名或刪除現有組織。
- **移除右鍵選單**: 為了避免功能重複與混淆，移除了 Organization Icon 上的右鍵選單功能。

## Verification
- [x] 點擊管理按鈕可開啟對話框。
- [x] 對話框內可正常重新命名與刪除。
- [x] 右鍵點擊 Organization Icon 不再觸發選單。