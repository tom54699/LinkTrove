## MODIFIED Requirements

### Requirement: 拖放效能優化
系統必須（SHALL）確保拖放操作流暢，即使在包含大量卡片的群組中也不卡頓，並在生產環境中禁用調試日誌以提升性能。

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

#### Scenario: 生產環境禁用調試日誌
- **GIVEN** 系統運行在生產環境（非開發模式）
- **WHEN** 使用者執行拖放操作
- **THEN** 系統不輸出任何 console.log 調試訊息
- **THEN** 避免日誌輸出造成的性能開銷（每次 >5ms）

#### Scenario: 開發模式可選啟用調試日誌
- **GIVEN** 系統運行在開發環境
- **GIVEN** `DEBUG_DND` flag 設為 `true`
- **WHEN** 使用者執行拖放操作
- **THEN** 系統輸出詳細的拖曳計算過程日誌
- **THEN** 開發者可查看 ghost index、座標計算等調試資訊

#### Scenario: 避免重複 setState 觸發 re-render
- **GIVEN** ghost index 當前值為 3
- **WHEN** 拖曳計算結果仍為 3（位置未變化）
- **THEN** 系統不調用 `setGhostIndex(3)`
- **THEN** 避免觸發不必要的組件 re-render
- **THEN** 減少拖曳過程中的渲染負擔
