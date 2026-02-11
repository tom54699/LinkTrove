## 1. CardGrid DnD 優化
- [x] 1.1 在 CardGrid.tsx 頂部定義 `DEBUG_DND` flag（預設 false）
- [x] 1.2 用 `if (DEBUG_DND)` 包裹所有 console.log（約 20+ 處）
- [x] 1.3 在 `handleDragOver` 中 `setGhostIndex` 前加值比較
- [x] 1.4 測試拖曳功能正常（ghost 位置正確、drop 成功）
- [x] 1.5 確認生產環境無 DnD log 輸出

## 2. GroupsView useMemo grouping
- [x] 2.1 在 GroupsView.tsx 中新增 `groupedItems` useMemo
- [x] 2.2 將 `items.filter(...)` 邏輯移至 useMemo 內，建立 Map<groupId, items[]>
- [x] 2.3 更新 `groups.map((g) => ...)` 使用 `groupedItems.get(g.id) || []`
- [x] 2.4 更新所有使用 `groupItems` 的地方（line 359, 369, 495, 618）
- [x] 2.5 測試 groups 渲染正確（卡片數量、內容一致）

## 3. 驗證與測試
- [x] 3.1 執行 `npm run build` 確認編譯通過
- [x] 3.2 測試拖曳卡片（同 group / 跨 group / 垂直拖曳）
- [x] 3.3 測試 groups 操作（展開/收合、新增/刪除、重新排序）
- [x] 3.4 檢查 Chrome DevTools Performance（確認 re-render 減少）
- [x] 3.5 確認所有現有測試通過（如果執行測試）

## 4. 文檔更新
- [x] 4.1 在 MEMORY.md 記錄「DnD debug 可用 DEBUG_DND flag 開啟」
- [ ] 4.2 更新 SESSION_HANDOFF.md（如有需要）
