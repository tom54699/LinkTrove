## MODIFIED Requirements

### Requirement: 拖放效能優化
系統必須（SHALL）確保拖放操作流暢，即使在包含大量卡片的群組中也不卡頓。拖放操作應避免重複渲染，確保每次操作只觸發必要的最少次數 UI 更新。

#### Scenario: 拖放 100 張卡片的群組時保持流暢
- **GIVEN** 群組包含 100 張卡片
- **WHEN** 使用者拖動其中一張卡片
- **THEN** 拖動過程中幀率保持 >30 FPS
- **THEN** 插入指示線即時更新（延遲 <50ms）
- **THEN** 放下卡片後重新排序在 100ms 內完成

#### Scenario: 批次更新 IndexedDB 避免頻繁寫入
- **GIVEN** 使用者快速連續拖放多張卡片
- **WHEN** 系統偵測到連續操作（間隔 <500ms）
- **THEN** 系統使用 debounce 延遲寫入 IndexedDB（延遲 300ms）
- **THEN** 多次拖放合併為一次 IndexedDB 寫入
- **THEN** UI 立即更新（不等待寫入完成）

#### Scenario: 使用虛擬化處理大量卡片
- **GIVEN** 群組包含 500+ 張卡片
- **WHEN** 使用者開啟該群組
- **THEN** 系統只渲染可見區域的卡片（虛擬化滾動）
- **THEN** 拖放操作不受影響（拖到可見區域外時自動滾動）

#### Scenario: 拖放操作避免重複渲染
- **GIVEN** 使用者執行一次拖放操作（同 group 排序或跨 group 移動）
- **WHEN** 操作完成且資料寫入 IndexedDB
- **THEN** UI 只觸發一次 setItems 更新
- **THEN** 操作期間的 chrome.storage.onChanged 事件被抑制
- **THEN** 抑制窗口結束後（800ms）恢復正常監聽

#### Scenario: 操作鎖定不影響跨分頁同步
- **GIVEN** 使用者在分頁 A 執行拖放操作
- **GIVEN** 分頁 B 處於閒置狀態
- **WHEN** 分頁 A 的操作完成且鎖定窗口結束
- **THEN** 分頁 B 能在下次 storage 變更時正常同步
- **THEN** 跨分頁同步最多延遲 800ms
