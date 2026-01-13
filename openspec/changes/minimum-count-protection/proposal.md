# Proposal: Minimum Count Protection

**Change ID**: `minimum-count-protection`
**Status**: ✅ Completed (2026-01-13)
**Author**: Claude Code

---

## Summary
已在各個層級（Organization, Collection, Group）實作了最小數量保護機制。當使用者試圖刪除該層級的最後一個項目時，系統會攔截操作並顯示錯誤 Toast，防止資料結構塌陷。

## Implementation Details
- **Organization**: 在 `OrganizationNav.tsx` 中，刪除前檢查 `organizations.length > 1`。
- **Collection**: 在 `Sidebar.tsx` 中，刪除前檢查同屬該 Organization 的 collection 數量 > 1。
- **Group**: 在 `GroupsView.tsx` 中，刪除前檢查同屬該 Collection 的 group 數量 > 1。

## Verification
- [x] 手動測試通過：嘗試刪除最後一個項目時，正確顯示錯誤訊息且不執行刪除。