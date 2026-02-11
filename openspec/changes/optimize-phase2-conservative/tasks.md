## 1. 收合 Group 延遲載入
- [ ] 1.1 在 GroupsView.tsx 修改渲染邏輯，收合時不渲染 CardGrid
- [ ] 1.2 收合時顯示簡單的卡片數量提示
- [ ] 1.3 測試 Group 展開/收合功能正常
- [ ] 1.4 確認初次渲染速度改善

## 2. TobyLikeCard memo 化
- [ ] 2.1 在 TobyLikeCard.tsx 使用 React.memo 包裹組件
- [ ] 2.2 測試卡片渲染功能正常
- [ ] 2.3 使用 React DevTools Profiler 確認 re-render 減少
- [ ] 2.4 測試所有卡片互動功能（編輯、刪除、選取）

## 3. 動態 RAF 節流
- [ ] 3.1 在 CardGrid.tsx 定義 DND_RAF_THRESHOLD 閾值
- [ ] 3.2 提取 handleDragOverDirect 函數
- [ ] 3.3 實作動態 RAF 節流邏輯
- [ ] 3.4 測試 <300 卡時拖曳即時反應
- [ ] 3.5 測試 >300 卡時拖曳流暢度改善
- [ ] 3.6 測試跨 Group 拖曳正常

## 4. selected 計算 memo
- [ ] 4.1 在 CardGrid.tsx 使用 useMemo 包裹 selectedCount
- [ ] 4.2 使用 useMemo 包裹 selectedIds
- [ ] 4.3 更新所有使用這些值的地方
- [ ] 4.4 測試批次選取、刪除、移動功能正常

## 5. 驗證與測試
- [ ] 5.1 執行 `npm run build` 確認編譯通過
- [ ] 5.2 完整測試所有功能（拖曳、選取、Group 操作）
- [ ] 5.3 使用 React DevTools Profiler 測試性能改善
- [ ] 5.4 測試不同卡片數量場景（50, 300, 500, 1000）
- [ ] 5.5 確認 Console 無錯誤訊息

## 6. 文檔更新
- [ ] 6.1 更新 MEMORY.md 記錄優化內容
- [ ] 6.2 更新 SESSION_HANDOFF.md（如有需要）
