# Change: 自動 GC（同步成功後）並移除設定頁 GC 區塊

## Why
目前 GC 需要手動觸發且容易讓使用者困惑。改為在同步成功後自動清理刪除標記，可降低 DB 成長、簡化使用者心智負擔，同時確保同步一致性。

## What Changes
- 在同步成功後自動執行 GC（僅當符合條件時）
- GC 僅清理 `deletedAt` 早於 `lastSyncedAt` 且超過保留天數（30 天）的墓碑
- 保留自動 GC 的間隔檢查（每 7 天）
- 移除設定頁「GC 統計/手動清理」區塊與相關文案

## Impact
- Affected specs: settings
- Affected code: `src/app/data/gcService.ts`, `src/app/data/syncService.ts`, `src/app/ui/SettingsModal.tsx`, i18n
