## Context
目前預設 Organization/Collection/Group 使用固定 ID（`o_default`/`default`/`g_default_*`），跨裝置同步時造成 ID 衝突與資料混合。此變更改為隨機 ID，並引入 `isDefault` 來辨識「系統自動建立的預設階層」，以支援同步清理空的預設資料。

## Goals / Non-Goals
- Goals:
  - 預設階層使用隨機 ID，避免跨裝置衝突
  - 支援 `isDefault` 旗標與同步清理規則
  - 同步期間提供清楚的進度視窗並鎖定操作
  - 保持匯入/匯出與同步的資料完整性
- Non-Goals:
  - 不針對既有資料做強制遷移（開發階段無舊資料）
  - 不改變現有階層結構或上限規則

## Decisions
- Decision: 在 Organization/Category/Subcategory 加入 `isDefault?: boolean`
  - Why: 明確標記系統自動建立的預設資料，避免靠固定 ID 判斷
- Decision: 預設名稱統一為 My Space / Bookmarks / General
  - Why: 通用、易理解，避免與固定 ID 綁定
- Decision: 只在「同步合併後」做清理
  - Why: 保留本地使用者操作的可預期性，避免本地流程隱性刪除
- Decision: 同步期間顯示阻斷式進度視窗
  - Why: 避免同步中 UI 狀態混亂，確保資料完成後再操作

## Default 清理規則（同步階段）
在合併結果中，僅當以下條件全滿足時移除預設階層：
1) 雲端資料存在（organizations/categories/subcategories/webpages 任一非空）
2) 存在 `isDefault=true` 的 Organization/Collection/Group
3) 預設名稱未被更改（仍為 My Space / Bookmarks / General）
4) 預設 Organization 只有 1 個 Collection（該預設 Collection）
5) 預設 Collection 只有 1 個 Group（該預設 Group）
6) 預設 Group 內沒有任何卡片
若任何條件不成立，保留整個預設階層。

## 同步進度視窗規則
- 只在「同步實際執行」時顯示（包含首次同步或再次同步，且雲端有資料）
- 視窗需阻斷其他畫面互動，直到同步完成或失敗
- 顯示步驟狀態（例如：下載 → 合併 → 匯入/寫入）
- 同步失敗時顯示錯誤訊息並可關閉，關閉後解除互動鎖定

## isDefault 失效條件（本地/同步一致）
- 使用者更名 Organization/Collection/Group → 해당實體 `isDefault=false`
- 使用者在預設 Organization 新增 Collection → 預設 Organization `isDefault=false`
- 使用者在預設 Collection 新增 Group → 預設 Collection `isDefault=false`

## Risks / Trade-offs
- 新增 `isDefault` 欄位會影響匯入/匯出與同步格式
- 多處固定 ID 假設需移除，測試需大量調整
- 清理條件過嚴可能保留空預設資料（可接受）

## Migration Plan
- 不針對既有資料做批次遷移（開發階段無舊資料）
- 若匯入舊格式缺 `isDefault`，視為 `false`

## Open Questions
- 無
