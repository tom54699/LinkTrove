## ADDED Requirements

### Requirement: 自動清理刪除標記
系統必須（SHALL）在同步成功後自動清理已過期的刪除標記（tombstones），且不需要使用者手動操作。

#### Scenario: 同步成功後自動清理
- **GIVEN** 使用者已完成一次雲端同步（備份/合併/還原任一成功）
- **WHEN** 同步完成且距離上次 GC 已超過 7 天
- **THEN** 系統僅清理 `deletedAt` 早於 `lastSyncedAt` 且超過 30 天的刪除標記
- **THEN** 不顯示額外 UI 或提示訊息
