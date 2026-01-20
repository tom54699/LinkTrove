## Context
現行 `orders.subcategories` 可能因匯入/合併/中斷而缺漏，導致載入時 fallback 到 storage 原始順序，進而造成同群組內排序跳動。同步合併目前以整組覆寫 order，容易遺失順序資訊。

## Goals / Non-Goals
- Goals:
  - 任何匯入/同步/載入都能得到穩定且可預期的群組內排序。
  - 缺漏的 order 必須被自動補齊並持久化。
  - 不更改卡片所屬群組（不修改 subcategoryId）。
- Non-Goals:
  - 不新增新的資料庫欄位或改變既有 schema。
  - 不調整 UI 互動行為（只修正排序資料完整性）。

## Decisions
- Decision: 讀取時改為「群組內合併 order」
  - 以 group 分組，再依 `orders.subcategories[groupId]` 依序加入卡片，最後補上缺漏項。
- Decision: 正規化策略
  - base order 先過濾不存在 ID。
  - 將缺漏 ID 依 `createdAt`（或匯入順序）追加至尾端，確保 deterministic。
  - 正規化後立即寫回 `orders.subcategories`。
- Decision: 合併策略
  - 選擇較新的 order 作為基準，追加另一邊缺漏 ID，最後再正規化。

## Risks / Trade-offs
- 若 `createdAt` 不可靠（某些來源缺失），補齊順序可能不完全符合使用者期望。
  - Mitigation: 優先採用現有 order/匯入順序，僅對缺漏使用 createdAt。

## Migration Plan
- 在 import/merge/sync 完成後立即執行 order 正規化。
- 讀取時即使 order 不完整，也能穩定組裝清單並補齊。
- 逐步在後台修復 `orders.subcategories`，不影響 UI 互動。

## Open Questions
- 是否需要在 UI 提供「重建排序」的手動入口？
- 缺漏順序排序基準是否一律使用 createdAt？
