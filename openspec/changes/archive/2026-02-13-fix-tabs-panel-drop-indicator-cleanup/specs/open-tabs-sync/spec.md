# Delta: Open Tabs Sync

## ADDED Requirements

### Requirement: 拖曳清理機制
系統必須（SHALL）確保右側面板拖曳結束後,所有拖曳相關的 UI 狀態（包含 DropIndicator）都被正確清理,不殘留視覺元素。

#### Scenario: 拖曳 Tab 結束後清理 DropIndicator
- **GIVEN** 使用者拖曳右側 Tab A 經過 Tab B
- **GIVEN** Tab B 上方顯示 DropIndicator（半透明插入線）
- **WHEN** 使用者在右側外放開滑鼠（拖曳取消）
- **THEN** dragend 事件觸發
- **THEN** 系統清除 `dropTarget` state
- **THEN** 系統重置 `dragVersion` state
- **THEN** DropIndicator 立即消失
- **THEN** UI 回復到初始狀態,無殘留視覺元素

#### Scenario: 拖曳 Group 結束後清理 DropIndicator
- **GIVEN** 使用者拖曳右側 Group A 經過 Group B
- **GIVEN** Group B 下方顯示 DropIndicator
- **WHEN** 使用者按 ESC 取消拖曳
- **THEN** dragend 事件觸發
- **THEN** 系統清除 `dropTarget` 和 `dragVersion`
- **THEN** DropIndicator 立即消失

#### Scenario: 跨區拖曳結束後右側清理
- **GIVEN** 使用者從右側拖曳 Tab 到中間 CardGrid
- **GIVEN** 拖曳過程中右側曾顯示 DropIndicator
- **WHEN** 拖曳在中間區域結束（drop 或 dragend）
- **THEN** Window 全域 dragend 事件觸發
- **THEN** 右側 TabsPanel 清除自己的 `dropTarget` 和 `dragVersion`
- **THEN** 右側 DropIndicator 消失（即使 drop 發生在其他區域）

#### Scenario: DropIndicator 渲染條件
- **GIVEN** `dropTarget` state 存在（type: 'tab', id: 123, position: 'top'）
- **WHEN** 系統渲染 DropIndicator
- **THEN** 系統先檢查是否有活躍拖曳（`getDragTab() || getDragGroup()`）
- **THEN** 只在拖曳進行中才渲染 DropIndicator
- **THEN** 若無活躍拖曳,即使 `dropTarget` 存在也不渲染（防止殘留）

#### Scenario: 快速連續拖曳無累積殘留
- **GIVEN** 使用者連續拖曳 3 次 Tab（每次都取消）
- **WHEN** 每次拖曳結束時
- **THEN** 系統透過全域 dragend 監聽清理 state
- **THEN** 不會累積多個 DropIndicator 或殘留 state
- **THEN** 第 4 次拖曳時 UI 狀態乾淨（`dragVersion=0`, `dropTarget=null`）

#### Scenario: 中間卡片拖曳不影響右側清理
- **GIVEN** 使用者在中間 CardGrid 拖曳卡片
- **WHEN** dragend 事件冒泡到 window
- **THEN** 右側 TabsPanel 的 cleanup 函數被觸發
- **THEN** 清除右側的 `dropTarget` 和 `dragVersion`（僅內部 state）
- **THEN** 不清除 dragContext 的 `currentWebpage`
- **THEN** 中間 CardGrid 功能不受影響

## Related Documentation
- **技術實作**: `src/app/tabs/TabsPanel.tsx` - 拖曳清理邏輯
- **拖曳上下文**: `src/app/dnd/dragContext.ts` - getDragTab/getDragGroup helpers
- **相關修復**: `fix-cardgrid-ghost-early-render` - 中間區域類似問題的修復參考
