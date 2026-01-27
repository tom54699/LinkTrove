## 1. Implementation
- [x] 調整 GC 邏輯：加入 `lastSyncedAt` 門檻與 30 天保留邏輯
- [x] 在同步成功流程中觸發自動 GC（搭配 7 天間隔限制）
- [x] 移除設定頁 GC 區塊與相關 i18n

## 2. Tests
- [x] 更新/補充 GC 與同步相關測試

## 3. Documentation
- [x] 更新相關規格或開發說明（若需要）
