# Implementation Tasks

## 1. Collapse Sync Implementation
- [x] 1.1 修改 `TabsPanel.tsx` 的 `toggleGroup` 函數，新增 `chrome.tabGroups.update()` 呼叫
- [x] 1.2 處理 API 呼叫錯誤（try-catch，權限檢查）
- [x] 1.3 確保 local state 和 native state 保持一致

## 2. Drag & Drop Implementation
- [x] 2.1 定義 Drag Types 與 State (擴充 `src/app/dnd/dragContext.ts` 或在 TabsPanel 內局部處理)
- [x] 2.2 實作 TabItem Draggable
  - [x] 在 `TabItem.tsx` 加入 `draggable`, `onDragStart`
  - [x] 設定 Drag Data (Tab ID, Group ID, Window ID)
- [x] 2.3 實作 Group Header Draggable
  - [x] 在 `TabsPanel.tsx` 的 Group Header 加入 `draggable`
- [x] 2.4 實作 Drop Zones & Handling (`TabsPanel.tsx`, `TabItem.tsx`)
  - [x] `onDragOver` 處理 (計算 Drop Position: Above, Below, Inside)
  - [x] `onDrop` 處理邏輯分流：
    - [x] Tab Reorder (Same Group/Window) -> `chrome.tabs.move`
    - [x] Tab Move to Group -> `chrome.tabs.group` + `chrome.tabs.move`
    - [x] Tab Remove from Group -> `chrome.tabs.ungroup` + `chrome.tabs.move`
    - [x] Group Reorder -> `chrome.tabGroups.move`
- [x] 2.5 優化 UX
  - [x] 拖曳時的視覺回饋 (Ghost Image, Drop Indicator line)
  - [x] 防止無效拖曳 (e.g. 拖曳到自己身上)

## 3. Testing
- [x] 3.1 測試收合群組時瀏覽器同步收合/展開
- [x] 3.2 測試 Tab 在同一群組內排序
- [x] 3.3 測試 Tab 跨群組移動
- [x] 3.4 測試 Tab 移出/移入群組
- [x] 3.5 測試 Group 整體排序
- [x] 3.6 測試 API 失敗時的錯誤處理

## 4. Documentation
- [x] 4.1 更新 `open-tabs-sync` spec 文件
- [x] 4.2 記錄 DnD 互動邏輯與限制
- [x] 4.3 創建 IMPLEMENTATION.md 實施總結文檔

## 5. Bug Fixes (2026-01-30)
- [x] 5.1 修復 `isDraggingGroup` 未定義錯誤
- [x] 5.2 移除 `pointer-events-none` 阻塞
- [x] 5.3 修復拖曳順序邏輯（先改群組再計算 index）
- [x] 5.4 修復群組內拖到最尾巴無法儲存
- [x] 5.5 完善 `handleDrop` 狀態清理 (P0)
- [x] 5.6 添加群組拖曳 `onDragEnd` (P0)
- [x] 5.7 確認設計決定：群組標題不作為 drop target

## 6. Code Quality Improvements (Planned)
- [ ] 6.1 遷移 dragContext 到 Zustand/React Context (P2)
- [ ] 6.2 改善錯誤處理和用戶反饋 (P1)
- [ ] 6.3 抽取重複的 index 計算邏輯 (P1)
- [ ] 6.4 抽取重複的 window drop 邏輯 (P2)
- [ ] 6.5 定義魔法數字常量 (P3)
- [ ] 6.6 移除未使用的 TypeScript 參數 (P3)
- [ ] 6.7 優化性能（useMemo 依賴）(P3)
