# Technical Design

## GC 條件
- 觸發點：同步成功（備份/合併/還原）後
- 篩選條件：
  - `deleted === true`
  - `deletedAt` 早於 `lastSyncedAt`
  - `deletedAt` 超過保留天數（30 天）
- 觸發頻率：沿用 `shouldAutoGC()` 的 7 天間隔

## 介面
- 移除設定頁 GC 統計與手動清理 UI
- 不新增任何使用者互動提示（靜默執行）
