# Change: 預設階層改為隨機 ID + isDefault 標記 + 同步清理 + 同步進度視窗

## Why
現行預設 Organization/Collection/Group 使用固定 ID（`o_default`/`default`/`g_default_*`），跨裝置同步時容易造成 ID 衝突與資料混合。需要改為隨機 ID，並新增 `isDefault` 以支援同步時安全清理空的預設階層。同步過程也需要明確進度與互動鎖定，避免同步中操作造成混亂。

## What Changes
- 預設 Organization / Collection / Group 改為隨機 ID（不再使用固定 ID）
- 新增 `isDefault` 欄位到 Organization/Category/Subcategory 資料模型
- 預設名稱統一：Organization = "My Space"、Collection = "Bookmarks"、Group = "General"
- 使用者更名或新增子層級時，對應實體 `isDefault` 轉為 `false`
- 同步合併時：若雲端有任何資料，且預設階層「完全空且未自訂」，則移除該預設階層
- 同步進行中顯示進度視窗，完成前不可操作其他畫面

## Impact
- Affected specs: `openspec/specs/bookmark-management/spec.md`, `openspec/specs/import-export/spec.md`
- Affected code: 預設初始化、IDB migration、匯入/匯出、同步合併、同步 UI、側邊欄 Providers、背景 context menu
- Testing: 更新既有測試案例中的固定 ID 期待值
