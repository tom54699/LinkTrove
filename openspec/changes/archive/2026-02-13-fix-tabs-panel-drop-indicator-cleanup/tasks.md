# Implementation Tasks

## 1. TabsPanel State 與清理機制
- [x] 1.1 新增 `dragVersion` state (初始值 0)
- [x] 1.2 修改 `handleDragOver`: 第一次檢測到拖曳時設 `dragVersion=1`
- [x] 1.3 新增 useEffect: window 全域監聽 `dragend` 和 `drop`(capture phase)
- [x] 1.4 cleanup 函數: 清除 `dropTarget` 和重置 `dragVersion=0`

## 2. DropIndicator 渲染條件修改
- [x] 2.1 新增 helper: `const hasDrag = !!(getDragTab() || getDragGroup());`
- [x] 2.2 修改 Group top indicator (line 434)
- [x] 2.3 修改 Group bottom indicator (line 487)
- [x] 2.4 修改 Group 內 Tab top indicator (line 475)
- [x] 2.5 修改 Group 內 Tab bottom indicator (line 480)
- [x] 2.6 修改 Loose Tab top indicator (line 499)
- [x] 2.7 修改 Loose Tab bottom indicator (line 504)
- [x] 2.8 修改 Window background indicator (line 511)

## 3. 測試與驗證
- [x] 3.1 單元測試（7/10 通過，3 個 Group 測試需 Chrome API）
- [x] 3.2 構建測試（npm run build 成功）
- [ ] 3.3 手動測試 - 待執行（已創建 TEST_CHECKLIST.md）
  - [ ] 驗證右側 Tab → Tab 排序拖曳
  - [ ] 驗證右側 Tab → Group 加入
  - [ ] 驗證右側 Group → Group 排序
  - [ ] 驗證拖到 Window 背景尾端插入
  - [ ] 驗證拖曳取消(ESC)無殘留 indicator
  - [ ] 驗證拖曳到非有效區域無殘留
  - [ ] 驗證跨區拖曳: 右側 Tab → 中間 CardGrid
  - [ ] 驗證不影響中間 CardGrid 自身拖曳
  - [ ] 驗證快速連續拖曳無累積殘留

## 4. 程式碼品質
- [x] 4.1 確認無 ESLint 錯誤（無新增錯誤）
- [x] 4.2 確認無 TypeScript 錯誤（build 成功）
- [x] 4.3 檢查 console 無不必要的 log（✓）
- [x] 4.4 更新相關註解（已添加清理機制註解）
