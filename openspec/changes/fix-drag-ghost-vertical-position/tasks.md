# Implementation Tasks

## 1. Code Changes (已完成)

### 第一階段 - Commit 6fa9c32 (2026-02-06 17:26)
- [x] 1.1 新增 `dragStartYRef` 追蹤起始 Y 座標
- [x] 1.2 實作 Y 座標差異判斷（> 25px）識別跨行
- [x] 1.3 實作容差機制：跨行 50px、同行 0px
- [x] 1.4 移除 `betweenRows` 和 `GAP_THRESHOLD` 特殊處理
- [x] 1.5 調整 Hysteresis buffer: 20px → 15px
- [x] 1.6 補償滑鼠抓取偏移量（grabOffsetX）

**發現問題：** 垂直上移正常，但下移時 ghost 偏右一格

### 第二階段 - Commit 330749a (2026-02-06 18:00)
- [x] 1.7 新增 `isDraggingDown` 方向判斷（yDiff > 0）
- [x] 1.8 實作方向相關的 newIndex 計算：
  - 往上：返回 `closestCard.idx`
  - 往下：返回 `nextCard.idx`（修正偏移）
- [x] 1.9 實作不對稱 Hysteresis buffer：
  - `bufferRight = 20` (降低右側敏感度)
  - `bufferLeft = 10` (增加左側敏感度)
- [x] 1.10 新增詳細 console.log 除錯訊息

## 2. Testing (待使用者驗證)
- [ ] 2.1 手動測試：左右拖曳卡片（確認敏感度平衡）
- [ ] 2.2 手動測試：往上拖曳卡片到上一行（驗證 ghost 位置正確）
- [ ] 2.3 手動測試：往下拖曳卡片到下一行（驗證 ghost 位置正確）
- [ ] 2.4 手動測試：在行間區域移動滑鼠（驗證 ghost 隨 X 座標調整）
- [ ] 2.5 手動測試：快速拖曳（驗證 Hysteresis 防抖正常）
- [ ] 2.6 檢查現有測試是否通過：`npm test -- dropzone.test`

## 3. Documentation (待完成)
- [x] 3.1 更新 OpenSpec proposal.md 反映實際實作
- [x] 3.2 更新 OpenSpec tasks.md 記錄完成狀態
- [ ] 3.3 更新 SESSION_HANDOFF.md（session 結束時）
- [ ] 3.4 考慮移除除錯 console.log（測試通過後）

## 4. Validation (待完成)
- [ ] 4.1 在不同瀏覽器測試（Chrome, Edge）
- [ ] 4.2 測試不同螢幕尺寸（確保 Grid 佈局正確）
- [ ] 4.3 測試大量卡片場景（30+ 卡片，多行排列）
- [ ] 4.4 確認沒有 console 錯誤或警告

## 5. 已知限制
- 目前保留大量 console.log 除錯訊息，待測試通過後可移除
- 不對稱 buffer 值（20/10）基於經驗調整，可能需要根據實際測試微調
