# Change: Phase 2 保守優化（低風險、漸進式）

## Why
Phase 1 已經改善了基礎性能（grouping O(n×g) → O(n)，移除 console.log），但仍有優化空間：

1. **收合的 Group 仍在渲染** - 即使用戶收合了 Group，CardGrid 仍會渲染所有卡片（只是 display:none），浪費資源
2. **所有卡片都會 re-render** - 拖曳或選取操作時，即使其他卡片沒有變化，也會觸發 re-render
3. **大量卡片時拖曳卡頓** - >300 張卡片時，computeGhostIndex 每秒執行 1000+ 次，CPU 使用率高
4. **選取計算重複執行** - 每次 render 都重新計算 selectedCount 和 selectedIds

這些問題在用戶執行以下操作時影響體驗：
- 有多個 Groups 時初次載入緩慢
- 拖曳大量卡片時感到延遲
- 選取多張卡片時 UI 有輕微卡頓

## What Changes

### 1. 收合 Group 延遲載入
- **完全不渲染收合的 CardGrid**：收合時只顯示卡片數量，不載入 CardGrid 組件
- **展開時才渲染**：用戶展開 Group 時才載入卡片內容

### 2. TobyLikeCard memo 化
- **React.memo 包裹**：避免不必要的 re-render
- **簡單 props 比較**：使用預設的淺比較，不自訂 areEqual

### 3. 動態 RAF 節流
- **閾值控制**：只在卡片數量 >300 時啟用 RAF 節流
- **保留原有邏輯**：<300 卡時保持即時反應
- **自動適應**：根據卡片數量動態決定

### 4. selected 計算 memo
- **useMemo 快取**：selectedCount 和 selectedIds 使用 useMemo
- **避免重複計算**：只在 selected 改變時重新計算

### 5. 效能影響
- **初次渲染**：提升 2-4 倍（收合 Group 不渲染）
- **拖曳流暢度**：提升 50-120%（RAF 節流 + memo）
- **選取操作**：提升 30%（memo 計算）

**無破壞性變更**：所有修改都是純粹的性能優化，不改變任何業務邏輯。

## Impact

### Affected Specs
- `drag-drop` - 拖曳計算優化（RAF 節流）
- `bookmark-management` - Groups 渲染優化（延遲載入 + memo）

### Affected Code
- `src/app/groups/GroupsView.tsx` - 收合 Group 延遲載入
- `src/app/webpages/TobyLikeCard.tsx` - React.memo 包裹
- `src/app/webpages/CardGrid.tsx` - RAF 節流 + selected memo

### Risk Assessment
**🟢 極低風險**：
- ✅ 每個優化都可獨立回滾
- ✅ 使用 Feature Flag 控制
- ✅ 不改變任何 API 或資料結構
- ✅ 所有測試用例維持不變
- ✅ 漸進式實施，逐步測試

### Performance Metrics (預期)
| 場景 | Phase 1 | Phase 2 | 改善 |
|------|---------|---------|------|
| 初次渲染 (1000 卡, 10 Groups, 7 收合) | ~600ms | ~150ms | 4x ↑ |
| 拖曳幀率 (500 卡) | 45 FPS | 55 FPS | 22% ↑ |
| 選取 10 張卡 | ~50ms | ~35ms | 30% ↑ |
