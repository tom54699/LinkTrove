# Tasks: fix-tab-drop-ghost-blocking

## 1. Implementation

- [x] 1.1 修改 `CardGrid.tsx` handleDrop - Tab 拖放部分 (Line 655-693)
  - 在 `beforeId` 計算完成後（Line 678 之後），立即執行 Ghost 清理
  - 將 Line 687-692 的清理邏輯移到 `await ret` 之前
  - 保留 try-catch 錯誤處理

- [x] 1.2 修改 `CardGrid.tsx` handleDrop - 現有卡片拖放部分 (Line 595-647)
  - 同樣在 `beforeId` 計算完成後（Line 633 之後），立即執行 Ghost 清理
  - 將 Line 640-645 的清理邏輯移到 `await onDropExistingCard()` 之前
  - 移除 try-finally 包裝（改為 try-catch）

## 2. Regression Testing - 確保不影響原有功能

- [ ] 2.1 Tab 拖放基本功能
  - 從 Open Tabs 拖曳分頁到空群組 → 卡片出現在正確位置
  - 從 Open Tabs 拖曳分頁到有卡片的群組中間 → 卡片插入正確位置
  - 從 Open Tabs 拖曳分頁到群組末尾 → 卡片出現在末尾

- [ ] 2.2 現有卡片拖放
  - 同群組內拖放卡片重排 → 順序正確更新
  - 跨群組拖放卡片 → 卡片移動到目標群組正確位置
  - 跨 Category 拖放卡片 → category 和 subcategoryId 都正確更新

- [ ] 2.3 Ghost 視覺效果
  - 拖曳過程中 ghost 正確顯示在預期位置
  - 放下後 ghost 立即消失（不等待 async 操作）
  - 取消拖曳（ESC 或拖到無效區域）ghost 正確消失

- [ ] 2.4 跨 CardGrid 廣播
  - 從 Group A 拖曳卡片到 Group B 時，Group A 的 ghost 也正確清理

## 3. Target Issue Testing

- [ ] 3.1 啟用「儲存後關閉分頁」設定
  - 從 Open Tabs 拖曳分頁到卡片區
  - **確認 Ghost 立即消失**（不等待 meta enrichment）
  - 確認卡片正確出現在目標位置
  - 確認分頁在 meta 抓取完成後關閉

- [ ] 3.2 停用「儲存後關閉分頁」設定
  - 從 Open Tabs 拖曳分頁到卡片區
  - 確認行為與之前相同（Ghost 立即消失）

## 4. Edge Cases

- [ ] 4.1 網路慢或 meta 抓取失敗
  - Ghost 應該仍然立即消失
  - 卡片應該正確建立（即使沒有 enriched meta）
  - 錯誤應該正確顯示（toast）

- [ ] 4.2 快速連續拖放
  - 快速連續拖放多個 Tab
  - 確認沒有殘留的 Ghost
  - 確認所有卡片都正確建立

- [ ] 4.3 拖放失敗（例如目標群組被刪除）
  - Ghost 應該仍然消失
  - 錯誤 toast 應該顯示
