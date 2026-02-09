# Change: 修復卡片垂直拖曳時的 Ghost 位置判斷

## Why
目前在垂直方向拖曳卡片（往上或往下）時，ghost 預覽位置的判斷邏輯存在問題：
- 當滑鼠進入行間區域時，會直接將 ghost 放置在目標行的**最左側**（行首），而不考慮滑鼠的 X 座標
- 這導致使用者在垂直拖曳時，ghost 可能會突然跳到左側或右側，而不是出現在滑鼠指向的位置
- 左右拖曳正常運作（使用中心點判斷），但垂直拖曳的體驗不一致

這影響了核心的拖放 UX，違反了 spec 中「視覺上立即反映新的排序預覽」的要求。

## What Changes (實際實作)

### 原始計畫
- 移除 `betweenRows` 特殊處理邏輯，使用統一的 X 座標判斷

### 實際改動（更複雜的問題）
經過實作發現問題比預期複雜，需要更精細的邏輯：

**第一階段 (6fa9c32)：**
1. 新增 `dragStartYRef` 追蹤起始 Y 座標
2. 改用 Y 座標差異（> 25px）判斷跨行
3. 實作容差機制：
   - 跨行時 50px 容差（寬容對齊）
   - 同行時 0px 容差（精確跟隨）
4. 移除 `betweenRows` 特殊處理
5. 調整 Hysteresis buffer: 20px → 15px

**問題：** 垂直上移正常，但下移時 ghost 偏右一格

**第二階段 (330749a)：**
1. 新增 `isDraggingDown` 判斷拖曳方向
2. 跨行拖曳邏輯根據方向調整：
   - 往上：返回 `closestCard.idx`
   - 往下：返回 `nextCard.idx`（修正偏移問題）
3. 不對稱 Hysteresis buffer：
   - 往右 20px（降低敏感度）
   - 往左 10px（增加敏感度）
4. 新增詳細的 console.log 除錯訊息

## Impact
- **Affected specs**: `drag-drop`
- **Affected code**:
  - `src/app/webpages/CardGrid.tsx` - 新增 81 行邏輯（第一階段）+ 65 行改進（第二階段）
- **User experience**:
  - 垂直拖曳（上/下）：ghost 位置準確對齊
  - 水平拖曳（左/右）：敏感度平衡，不會過度敏感或遲鈍
- **Breaking changes**: 無

## Risk Assessment
- **中風險**：不是簡單的移除邏輯，而是新增複雜的方向判斷機制
- **向後相容**：不影響資料格式或 API
- **測試覆蓋**：需要手動測試驗證四個方向的拖曳行為

## Commits
- `6fa9c32` - wip(drag-drop): 改進垂直拖曳 ghost 位置判斷邏輯
- `330749a` - fix(drag-drop): 修正垂直拖曳 ghost 位置偏移與水平拖曳敏感度
