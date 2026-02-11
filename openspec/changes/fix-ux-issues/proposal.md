# Proposal: Fix UX Issues

## Overview

**Change ID**: `fix-ux-issues`

**Status**: ✅ Completed (2026-02-11)

**Summary**: 修復 3 個影響用戶體驗的卡片操作問題：(1) Meta 欄位 Enter 鍵無反應，(2) Move 按鈕無載入回饋，(3) 批次刪除逐一執行且緩慢。

**Motivation**:
- **Problem 1**: 使用者在編輯卡片的 meta 欄位時，按 Enter 鍵無法觸發保存，與其他欄位（title, url, description）行為不一致，造成困惑。
- **Problem 2**: 批次移動卡片時，使用者點擊 Move 按鈕後沒有任何回饋，不知道操作是否成功觸發（特別是移動 5+ 張卡片時需等待 1+ 秒），造成焦慮。
- **Problem 3**: 批次刪除使用 sequential execution (`for await`)，每張卡片約需 200ms，5 張卡片需等待 1 秒以上，且 UI 更新只在全部完成後才發生，造成卡頓感。

**Goals**:
1. 統一所有 input 欄位的 Enter 鍵行為（包含 meta 欄位）
2. 為批次移動操作提供視覺回饋（loading state）
3. 優化批次刪除性能至 <300ms（使用 parallel execution + optimistic update）

**Non-Goals**:
- 不修改單張卡片刪除的行為（已經使用 optimistic update，無性能問題）
- 不改變 Move 對話框的 UI 設計（只添加 loading state）
- 不修改 meta 欄位的驗證邏輯

---

## Context

### Current Behavior

#### Problem 1: Meta 欄位 Enter 鍵無反應

**現況 (`TobyLikeCard.tsx`)**:
```typescript
// Title/URL/Description 欄位 (line 383-385)
<input
  onKeyDown={(e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      performAutoSaveRef.current();
      setShowModal(false);
      onModalOpenChange?.(false);
    }
  }}
/>

// Meta 欄位 (line 556-561)
<input
  className={baseCls}
  value={val}
  placeholder={f.defaultValue || ''}
  onChange={(e) => set(e.target.value)}
  // ❌ 缺少 onKeyDown handler
/>
```

**問題**: Meta 欄位沒有 Enter 鍵處理，使用者需點擊 Save 按鈕才能保存。

---

#### Problem 2: Move 按鈕無載入回饋

**現況 (`MoveSelectedDialog.tsx`)**:
```typescript
// line 74-77
const handleMove = () => {
  if (!selectedCategoryId || !selectedSubcategoryId) return;
  onMove(selectedCategoryId, selectedSubcategoryId); // ❌ 立即調用，無回饋
};

// line 179-186: Move 按鈕
<button
  onClick={handleMove}
  disabled={!selectedCategoryId || !selectedSubcategoryId}
>
  {t('btn_move')}  {/* ❌ 無 loading 狀態 */}
</button>
```

**現況 (`CardGrid.tsx`)**:
```typescript
// Move 操作調用 WebpagesProvider
const handleMoveSelected = React.useCallback((catId: string, subId: string) => {
  moveMany(selectedIdsOrdered, subId); // ⏳ 需等待 200ms * N
  clearSelection();
  setShowMoveDialog(false);
}, [moveMany, selectedIdsOrdered, clearSelection]);
```

**問題**: 移動 5 張卡片需約 1 秒，但按鈕無 loading 狀態，使用者不知道操作是否成功。

---

#### Problem 3: 批次刪除逐一執行

**現況 (`WebpagesProvider.tsx`)**:
```typescript
// line 272-278
const deleteMany = React.useCallback(
  async (ids: string[]) => {
    for (const id of ids) await service.deleteWebpage(id); // ❌ Sequential
    await load(); // ❌ UI 只在最後更新
  },
  [service, load]
);
```

**性能問題**:
- Sequential execution: 5 張卡片 = 5 × 200ms = 1000ms+
- UI 更新延遲: 使用者看到所有卡片同時消失（非漸進式）
- 無 optimistic update: 等待實際刪除完成才更新 UI

**對比**: `deleteOne` 使用 optimistic update (line 280-288)，體驗流暢。

---

### Related Components

**影響範圍**:
1. `TobyLikeCard.tsx` - Meta input 欄位需添加 Enter 鍵處理
2. `MoveSelectedDialog.tsx` - Move 按鈕需添加 loading state
3. `WebpagesProvider.tsx` - `deleteMany` 需改為 parallel + optimistic
4. `CardGrid.tsx` - 需調整 `handleMoveSelected` 支援 loading callback

**依賴關係**:
- Problem 1: 獨立修改，無依賴
- Problem 2: 需修改 `CardGrid.tsx` 和 `MoveSelectedDialog.tsx`
- Problem 3: 獨立修改，無依賴

---

## Proposed Solution

### Solution 1: 為 Meta 欄位添加 Enter 鍵處理

**Implementation** (`TobyLikeCard.tsx`):

在 `TemplateFields` 組件中，為所有 text input 類型的 meta 欄位添加 `onKeyDown` handler：

```typescript
// line 556-561 (修改後)
<input
  className={baseCls}
  value={val}
  placeholder={f.defaultValue || ''}
  onChange={(e) => set(e.target.value)}
  onKeyDown={(e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      // Trigger parent modal save
      const saveBtn = document.querySelector('[data-save-btn]') as HTMLButtonElement;
      saveBtn?.click();
    }
  }}
/>
```

**替代方案**: 使用 ref 傳遞 save callback（更乾淨但需重構）。

**Trade-offs**:
- ✅ 簡單快速，與 title/url/description 行為一致
- ⚠️ 使用 DOM query（不理想但可接受）
- 🔄 未來可重構為 callback 傳遞

---

### Solution 2: 為 Move 按鈕添加 Loading State

**Implementation**:

#### Step 2.1: `MoveSelectedDialog.tsx` 添加 moving state

```typescript
// 添加 moving state
const [moving, setMoving] = React.useState(false);

const handleMove = async () => {
  if (!selectedCategoryId || !selectedSubcategoryId) return;
  setMoving(true);
  try {
    await onMove(selectedCategoryId, selectedSubcategoryId); // 改為 async
  } finally {
    setMoving(false);
  }
};

// Move 按鈕顯示 loading
<button
  onClick={handleMove}
  disabled={!selectedCategoryId || !selectedSubcategoryId || moving}
>
  {moving ? (
    <>
      <svg className="animate-spin" ...>...</svg>
      {t('btn_moving')}
    </>
  ) : (
    t('btn_move')
  )}
</button>
```

#### Step 2.2: `CardGrid.tsx` 修改 `onMove` 簽名

```typescript
// 改為 async function
const handleMoveSelected = React.useCallback(async (catId: string, subId: string) => {
  await moveMany(selectedIdsOrdered, subId);
  clearSelection();
  setShowMoveDialog(false);
}, [moveMany, selectedIdsOrdered, clearSelection]);

// 傳遞給 MoveSelectedDialog
<MoveSelectedDialog
  onMove={handleMoveSelected} // 現在是 async
/>
```

**Trade-offs**:
- ✅ 清晰的視覺回饋
- ✅ 防止重複點擊
- ⚠️ 需修改 2 個組件（合理的耦合）

---

### Solution 3: 優化批次刪除性能

**Implementation** (`WebpagesProvider.tsx`):

```typescript
// line 272-278 (修改後)
const deleteMany = React.useCallback(
  async (ids: string[]) => {
    // Optimistic update: 立即從 UI 移除
    setItems((prev) => {
      const next = prev.filter((p) => !ids.includes(p.id));
      logOrderSnapshot('deleteMany', next);
      return next;
    });

    // Parallel execution: 同時刪除所有卡片
    try {
      await Promise.all(ids.map(id => service.deleteWebpage(id)));
    } catch (error) {
      console.error('Failed to delete cards:', error);
      // 失敗時重新載入（恢復實際狀態）
      await load();
    }
  },
  [service, load]
);
```

**Performance Improvement**:
- **Before**: Sequential 1000ms+ (5 cards)
- **After**: Parallel <300ms (5 cards) + Immediate UI update
- **User Experience**: 卡片立即消失（如同 `deleteOne`）

**Error Handling**:
- 成功: UI 已更新，無需額外操作
- 失敗: 重新載入恢復實際狀態（罕見）

**Trade-offs**:
- ✅ 與 `deleteOne` 行為一致
- ✅ 5-10x 性能提升
- ⚠️ 網路失敗時需 rollback（透過 `load()` 實現）

---

## Impact Assessment

### User Experience Impact

**Positive**:
1. ✅ Meta 欄位可用 Enter 鍵保存（減少摩擦）
2. ✅ Move 操作有明確的視覺回饋（減少焦慮）
3. ✅ 批次刪除流暢如單張刪除（一致性）

**Negative**:
- None

### Technical Debt

**Added**:
- Problem 1: 使用 DOM query（可接受的短期方案）

**Removed**:
- Problem 3: 移除 sequential execution 反模式

### Performance

**Metrics**:
- Problem 2: Move 操作體驗提升（視覺上）
- Problem 3: Batch delete 從 1000ms+ → <300ms（5 張卡片）

### Compatibility

**Backward Compatibility**:
- ✅ 所有修改向後兼容
- ✅ 不影響現有功能

**Browser Compatibility**:
- ✅ Promise.all 和 DOM query 所有現代瀏覽器支援

---

## Testing Strategy

### Unit Tests

**Problem 1**: `TobyLikeCard.test.tsx`
- ✅ Meta input 按 Enter 鍵時觸發保存
- ✅ Meta input 按 Shift+Enter 不觸發保存

**Problem 2**: `MoveSelectedDialog.test.tsx`
- ✅ Move 按鈕在 moving=true 時顯示 loading 狀態
- ✅ Move 按鈕在 moving=true 時 disabled
- ✅ 調用 onMove 時設置 moving=true

**Problem 3**: `WebpagesProvider.test.tsx`
- ✅ deleteMany 立即從 UI 移除卡片（optimistic）
- ✅ deleteMany 並行調用 service.deleteWebpage（Promise.all）
- ✅ deleteMany 失敗時調用 load() 恢復狀態

### Manual Testing

**Test Plan**:
1. **Meta Enter 鍵**:
   - [ ] 編輯卡片，修改 meta 欄位，按 Enter 鍵
   - [ ] 驗證: Modal 關閉，變更已保存

2. **Move Loading**:
   - [ ] 選取 5 張卡片，點擊 Move 按鈕
   - [ ] 驗證: 按鈕顯示 loading 狀態（spinner + "Moving..." 文字）
   - [ ] 驗證: 移動完成後 loading 消失

3. **Batch Delete Performance**:
   - [ ] 選取 10 張卡片，點擊 Delete 並確認
   - [ ] 驗證: 卡片立即從 UI 消失（<100ms）
   - [ ] 驗證: 無卡頓感（如同單張刪除）

---

## Rollout Plan

### Implementation Order

1. **Phase 1**: Problem 1 (Meta Enter 鍵) - 5 分鐘
2. **Phase 2**: Problem 3 (Batch Delete) - 10 分鐘
3. **Phase 3**: Problem 2 (Move Loading) - 10 分鐘

**Rationale**: 按照影響範圍從小到大排序，Problem 2 最後因為需要修改 2 個組件。

### Rollback Strategy

- 所有修改獨立，可單獨 revert
- Git commit 分 3 個 commits（對應 3 個 problems）

---

## Alternatives Considered

### Alternative for Problem 1

**Option A**: 使用 ref 傳遞 save callback
- ✅ 更乾淨的實現
- ❌ 需重構 `TemplateFields` 組件結構
- ❌ 時間成本 3x

**Chosen**: DOM query（短期可接受）

### Alternative for Problem 2

**Option A**: 在 `CardGrid` 管理 loading state
- ✅ 單一數據源
- ❌ 需透過 props 傳遞 loading state
- ❌ 增加 props drilling

**Chosen**: `MoveSelectedDialog` 內部管理 loading（更封裝）

### Alternative for Problem 3

**Option A**: 保留 sequential 但添加 progress bar
- ✅ 視覺上有進度回饋
- ❌ 仍然緩慢（1000ms+）
- ❌ 增加 UI 複雜度

**Chosen**: Parallel + optimistic（徹底解決性能問題）

---

## Open Questions

None. All implementation details are clear.

---

## References

- **Related Changes**: `optimize-phase3-react-memo` (completed)
- **Related Specs**: `bookmark-management`
- **Related Issues**: User manual testing feedback (Phase 3 follow-up)
