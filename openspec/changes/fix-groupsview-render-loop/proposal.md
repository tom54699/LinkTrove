# Bug Fix: GroupsView Infinite Render Loop

## Change ID
`fix-groupsview-render-loop`

## Status
Proposed

## Summary
修復 `GroupsView` 因 `useEffect` 依賴設定不當導致的無限重渲染 (Infinite Render Loop) 問題。

## Problem Analysis
在 `src/app/groups/GroupsView.tsx` 中，存在以下 `useEffect`：

```typescript
  React.useEffect(() => {
    load();
    const onChanged = () => { load(); };
    try { window.addEventListener('groups:changed', onChanged as any); } catch {}
    // ...
  }, [load, groups, categoryId, persistCollapsed]); // <--- 依賴了 groups
```

1. `useEffect` 執行並呼叫 `load()`。
2. `load()` 非同步取得資料後，呼叫 `setGroups(list)` 更新狀態。
3. `groups` 狀態變更（即使內容相同，陣列引用也會改變）。
4. React 偵測到 `useEffect` 的依賴項 `groups` 變更，再次觸發 Effect。
5. 回到步驟 1，形成無限迴圈。

這導致 CPU 佔用過高、UI 卡頓，若有 Log 則會瘋狂輸出。

## Solution
從 `useEffect` 的依賴陣列中移除 `groups`。
`load()` 的目的在於「獲取」最新的 groups，它不應該依賴於「當前」的 groups 狀態來決定是否執行。

## Verification
- [ ] 編譯通過。
- [ ] 重新載入擴充功能，確認 `GroupsView` 正常顯示。
- [ ] 確認操作（如新增、刪除 Group）後，畫面能正常更新（依賴 `groups:changed` 事件觸發 `load`，而非依賴 state 變更）。
