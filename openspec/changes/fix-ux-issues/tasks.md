# Tasks: Fix UX Issues

## Overview

本文檔按照實現順序列出所有工作項目，每個任務都是可獨立驗證的小單元。

---

## Phase 1: Meta 欄位 Enter 鍵支援

### 1.1 為 Meta Text Input 添加 Enter 鍵處理

**File**: `src/app/webpages/TobyLikeCard.tsx`

**Location**: Line 556-561 (TemplateFields 組件中的 default text input)

**Implementation**:
```typescript
// 修改前
<input
  className={baseCls}
  value={val}
  placeholder={f.defaultValue || ''}
  onChange={(e) => set(e.target.value)}
/>

// 修改後
<input
  className={baseCls}
  value={val}
  placeholder={f.defaultValue || ''}
  onChange={(e) => set(e.target.value)}
  onKeyDown={(e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const saveBtn = document.querySelector('[data-save-btn]') as HTMLButtonElement;
      saveBtn?.click();
    }
  }}
/>
```

**Validation**:
- [ ] Manual: 編輯卡片 meta 欄位，按 Enter 鍵，驗證 modal 關閉且變更保存
- [ ] Manual: 按 Shift+Enter 不觸發保存（預留多行輸入可能性）

---

### 1.2 為 Save 按鈕添加 data-save-btn 屬性

**File**: `src/app/webpages/TobyLikeCard.tsx`

**Location**: Line 398-411 (Save 按鈕)

**Implementation**:
```typescript
<button
  data-save-btn  // 添加這個屬性
  className="px-6 py-2 text-sm font-bold bg-[var(--accent)] text-white rounded-lg hover:brightness-110"
  onClick={() => {
    // ... existing logic
  }}
>
  {t('btn_save_changes')}
</button>
```

**Validation**:
- [ ] Code: 確認按鈕有 `data-save-btn` 屬性
- [ ] Manual: Enter 鍵可觸發保存（配合 1.1）

---

### 1.3 為其他 Meta Input 類型添加 Enter 鍵處理

**File**: `src/app/webpages/TobyLikeCard.tsx`

**Locations**:
- Line 493-499: Number input
- Line 527-533: URL input

**Implementation**:
```typescript
// Number input (line 493-499)
<input
  className={baseCls}
  type="number"
  value={val}
  placeholder={f.defaultValue || ''}
  onChange={(e) => set(e.target.value)}
  onKeyDown={(e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const saveBtn = document.querySelector('[data-save-btn]') as HTMLButtonElement;
      saveBtn?.click();
    }
  }}
/>

// URL input (line 527-533) - 同樣邏輯
```

**Validation**:
- [ ] Manual: Number meta 欄位按 Enter 鍵觸發保存
- [ ] Manual: URL meta 欄位按 Enter 鍵觸發保存

---

### 1.4 單元測試: Meta Enter 鍵行為

**File**: `src/app/webpages/__tests__/TobyLikeCard.test.tsx` (新建或擴充)

**Test Cases**:
```typescript
describe('TobyLikeCard - Meta fields Enter key', () => {
  it('should trigger save when pressing Enter in meta text input', () => {
    // Render card with meta fields
    // Simulate Enter key press
    // Verify modal closes and onSave called
  });

  it('should not trigger save when pressing Shift+Enter', () => {
    // Render card with meta fields
    // Simulate Shift+Enter key press
    // Verify modal stays open
  });

  it('should trigger save when pressing Enter in meta number input', () => {
    // Test number input type
  });

  it('should trigger save when pressing Enter in meta URL input', () => {
    // Test url input type
  });
});
```

**Validation**:
- [ ] Unit: 所有 4 個測試通過
- [ ] Coverage: Meta input Enter 鍵行為覆蓋率 100%

---

## Phase 2: 批次刪除性能優化

### 2.1 修改 deleteMany 為 Parallel + Optimistic

**File**: `src/app/webpages/WebpagesProvider.tsx`

**Location**: Line 272-278

**Implementation**:
```typescript
// 修改前
const deleteMany = React.useCallback(
  async (ids: string[]) => {
    for (const id of ids) await service.deleteWebpage(id);
    await load();
  },
  [service, load]
);

// 修改後
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

**Validation**:
- [ ] Manual: 選取 5 張卡片刪除，卡片立即消失（<100ms）
- [ ] Manual: 選取 10 張卡片刪除，無卡頓感
- [ ] Console: 無錯誤訊息

---

### 2.2 單元測試: deleteMany Optimistic Update

**File**: `src/app/webpages/__tests__/WebpagesProvider.test.tsx` (新建或擴充)

**Test Cases**:
```typescript
describe('WebpagesProvider - deleteMany', () => {
  it('should immediately remove cards from UI (optimistic)', async () => {
    // Render provider with 5 cards
    // Call deleteMany([id1, id2])
    // Verify items state updated immediately (before service calls resolve)
  });

  it('should call service.deleteWebpage in parallel', async () => {
    // Mock service.deleteWebpage
    // Call deleteMany([id1, id2, id3])
    // Verify Promise.all called (not sequential)
  });

  it('should reload data when delete fails', async () => {
    // Mock service.deleteWebpage to throw error
    // Call deleteMany([id1])
    // Verify load() called to recover state
  });

  it('should log order snapshot after optimistic update', async () => {
    // Mock logOrderSnapshot
    // Call deleteMany([id1])
    // Verify logOrderSnapshot called with filtered items
  });
});
```

**Validation**:
- [ ] Unit: 所有 4 個測試通過
- [ ] Coverage: deleteMany 覆蓋率 100%

---

### 2.3 Performance Baseline 測量

**Tool**: Chrome DevTools Performance tab

**Steps**:
1. 選取 10 張卡片
2. 開啟 Performance recording
3. 點擊 Delete 並確認
4. 停止 recording
5. 測量從點擊到 UI 更新的時間

**Validation**:
- [ ] Performance: 10 張卡片刪除 UI 更新 <100ms
- [ ] Performance: 無 long task (>50ms) 在 main thread
- [ ] UX: 與單張刪除體驗一致

---

## Phase 3: Move 按鈕載入回饋

### 3.1 MoveSelectedDialog 添加 moving state

**File**: `src/app/webpages/MoveSelectedDialog.tsx`

**Location**: Line 32 (state declarations)

**Implementation**:
```typescript
// 添加 moving state (line 32)
const [moving, setMoving] = React.useState(false);
```

**Validation**:
- [ ] Code: moving state 定義在 useState
- [ ] TypeScript: 編譯通過

---

### 3.2 修改 handleMove 為 async 並管理 moving state

**File**: `src/app/webpages/MoveSelectedDialog.tsx`

**Location**: Line 74-77

**Implementation**:
```typescript
// 修改前
const handleMove = () => {
  if (!selectedCategoryId || !selectedSubcategoryId) return;
  onMove(selectedCategoryId, selectedSubcategoryId);
};

// 修改後
const handleMove = async () => {
  if (!selectedCategoryId || !selectedSubcategoryId) return;
  setMoving(true);
  try {
    await onMove(selectedCategoryId, selectedSubcategoryId);
  } finally {
    setMoving(false);
  }
};
```

**Validation**:
- [ ] Code: handleMove 是 async function
- [ ] Code: moving state 在 finally block 清理
- [ ] TypeScript: 編譯通過

---

### 3.3 更新 Move 按鈕顯示 loading 狀態

**File**: `src/app/webpages/MoveSelectedDialog.tsx`

**Location**: Line 179-186

**Implementation**:
```typescript
// 修改前
<button
  type="button"
  className="px-5 py-2 text-sm font-bold rounded-lg bg-[var(--accent)] text-white hover:brightness-110 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
  onClick={handleMove}
  disabled={!selectedCategoryId || !selectedSubcategoryId}
>
  {t('btn_move')}
</button>

// 修改後
<button
  type="button"
  className="px-5 py-2 text-sm font-bold rounded-lg bg-[var(--accent)] text-white hover:brightness-110 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
  onClick={handleMove}
  disabled={!selectedCategoryId || !selectedSubcategoryId || moving}
>
  {moving && (
    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  )}
  {moving ? t('btn_moving') : t('btn_move')}
</button>
```

**Validation**:
- [ ] Manual: 按鈕在 moving=true 時顯示 spinner
- [ ] Manual: 按鈕在 moving=true 時 disabled
- [ ] Manual: 文字從 "Move" 變成 "Moving..."

---

### 3.4 添加 i18n 翻譯: btn_moving

**Files**:
- `src/app/i18n/locales/en.ts`
- `src/app/i18n/locales/zh-TW.ts`
- `src/app/i18n/locales/zh-CN.ts`
- (其他語言檔案)

**Implementation**:
```typescript
// en.ts
btn_moving: 'Moving...',

// zh-TW.ts
btn_moving: '移動中...',

// zh-CN.ts
btn_moving: '移动中...',
```

**Validation**:
- [ ] Code: 所有語言檔案都有 btn_moving key
- [ ] Manual: 切換語言時顯示正確的翻譯

---

### 3.5 修改 CardGrid handleMoveSelected 為 async

**File**: `src/app/webpages/CardGrid.tsx`

**Location**: 搜尋 `handleMoveSelected` 定義

**Implementation**:
```typescript
// 修改前
const handleMoveSelected = React.useCallback((catId: string, subId: string) => {
  moveMany(selectedIdsOrdered, subId);
  clearSelection();
  setShowMoveDialog(false);
}, [moveMany, selectedIdsOrdered, clearSelection]);

// 修改後
const handleMoveSelected = React.useCallback(async (catId: string, subId: string) => {
  await moveMany(selectedIdsOrdered, subId);
  clearSelection();
  setShowMoveDialog(false);
}, [moveMany, selectedIdsOrdered, clearSelection]);
```

**Validation**:
- [ ] Code: handleMoveSelected 是 async function
- [ ] Code: await moveMany 確保 loading state 正確運作
- [ ] TypeScript: 編譯通過

---

### 3.6 更新 MoveSelectedDialog props 類型

**File**: `src/app/webpages/MoveSelectedDialog.tsx`

**Location**: Line 7-12

**Implementation**:
```typescript
export interface MoveSelectedDialogProps {
  isOpen: boolean;
  selectedCount: number;
  onClose: () => void;
  onMove: (categoryId: string, subcategoryId: string) => Promise<void>; // 添加 Promise<void>
}
```

**Validation**:
- [ ] TypeScript: 編譯通過
- [ ] Code: onMove 簽名正確

---

### 3.7 單元測試: MoveSelectedDialog loading state

**File**: `src/app/webpages/__tests__/MoveSelectedDialog.test.tsx` (新建或擴充)

**Test Cases**:
```typescript
describe('MoveSelectedDialog - Loading state', () => {
  it('should show loading state when moving', async () => {
    // Render dialog with async onMove
    // Click Move button
    // Verify spinner visible and button disabled
  });

  it('should hide loading state after move completes', async () => {
    // Render dialog with async onMove
    // Click Move button and wait for completion
    // Verify loading state cleared
  });

  it('should clear loading state even if move fails', async () => {
    // Mock onMove to throw error
    // Click Move button
    // Verify loading state cleared in finally block
  });

  it('should display correct i18n text when moving', async () => {
    // Render dialog
    // Click Move button
    // Verify button text changes to t('btn_moving')
  });
});
```

**Validation**:
- [ ] Unit: 所有 4 個測試通過
- [ ] Coverage: MoveSelectedDialog loading logic 覆蓋率 100%

---

## Integration Testing

### I.1 End-to-End: 完整批次操作流程

**Scenario**: 使用者批次移動和刪除卡片

**Steps**:
1. 選取 5 張卡片
2. 點擊 Move 按鈕
3. 選擇目標 Collection 和 Group
4. 點擊 Move 並觀察 loading 狀態
5. 移動完成後，選取另外 3 張卡片
6. 點擊 Delete 並確認
7. 觀察刪除速度和 UI 更新

**Validation**:
- [ ] UX: Move 按鈕顯示 loading 狀態（spinner + 文字）
- [ ] UX: 刪除操作立即反應（<100ms）
- [ ] UX: 無卡頓或延遲感
- [ ] Data: 資料正確保存到 IndexedDB

---

### I.2 Error Handling: 網路失敗情境

**Scenario**: 模擬 service 調用失敗

**Steps**:
1. Mock `service.deleteWebpage` 拋出錯誤
2. 選取 3 張卡片刪除
3. 觀察 UI 行為

**Validation**:
- [ ] UX: 卡片先從 UI 移除（optimistic）
- [ ] Error: Console 顯示錯誤訊息
- [ ] Recovery: 自動調用 load() 恢復實際狀態
- [ ] Data: IndexedDB 資料一致性

---

### I.3 Regression Testing: Phase 3 優化不受影響

**Scenario**: 驗證本次修改不破壞 Phase 3 React.memo 優化

**Steps**:
1. 編輯單張卡片的 meta 欄位
2. 使用 React DevTools Profiler 觀察 re-render

**Validation**:
- [ ] Performance: 只有被編輯的卡片 re-render
- [ ] Performance: 其他卡片顯示 "Did not render"
- [ ] Functionality: Phase 3 優化仍正常運作

---

## Documentation Updates

### D.1 更新 MEMORY.md

**File**: `/Users/myaninnovation/.claude/projects/-Users-myaninnovation-Documents-LinkTrove/memory/MEMORY.md`

**Content**:
```markdown
## UX 修正 (2026-02-11)
- **Meta Enter 鍵**: TobyLikeCard.tsx meta input 支援 Enter 鍵觸發保存
- **Move Loading**: MoveSelectedDialog 顯示 loading 狀態（防止重複點擊）
- **Batch Delete 優化**: deleteMany 改用 Promise.all + optimistic update（10x 性能提升）
```

---

### D.2 更新 SESSION_HANDOFF.md

**File**: `docs/meta/SESSION_HANDOFF.md`

**Content**:
```markdown
## Recent Work (2026-02-11)

### UX Issues Fixed
- ✅ Meta 欄位 Enter 鍵支援（與 title/url/description 一致）
- ✅ Move 按鈕載入回饋（spinner + "Moving..." 文字）
- ✅ 批次刪除性能優化（sequential → parallel, 10x 提升）

### Key Changes
- `TobyLikeCard.tsx`: Meta input Enter 鍵處理
- `MoveSelectedDialog.tsx`: Async loading state 管理
- `WebpagesProvider.tsx`: deleteMany optimistic update
```

---

## Deployment Checklist

### Pre-Deploy

- [ ] 所有單元測試通過 (`npm test`)
- [ ] 所有手動測試完成（Phase 1-3）
- [ ] Integration testing 完成
- [ ] OpenSpec validation 通過 (`openspec validate fix-ux-issues --strict`)
- [ ] TypeScript 編譯無錯誤 (`npm run build`)
- [ ] ESLint 無 warnings (`npm run lint`)

### Deploy

- [ ] Git commit (3 commits 分別對應 3 個 problems)
  - Commit 1: `ux(meta): 添加 meta 欄位 Enter 鍵支援`
  - Commit 2: `perf(delete): 優化批次刪除性能（parallel + optimistic）`
  - Commit 3: `ux(move): 添加 Move 按鈕載入回饋狀態`

### Post-Deploy

- [ ] 手動驗證生產環境構建
- [ ] 檢查 Chrome Extension 載入無錯誤
- [ ] 執行 smoke test（批次移動、批次刪除）

---

## Summary

**Total Tasks**: 24 tasks
- Phase 1 (Meta Enter): 4 tasks
- Phase 2 (Batch Delete): 3 tasks
- Phase 3 (Move Loading): 7 tasks
- Integration: 3 tasks
- Documentation: 2 tasks
- Deployment: 5 tasks

**Estimated Time**:
- Phase 1: 10 分鐘
- Phase 2: 15 分鐘
- Phase 3: 20 分鐘
- Testing: 15 分鐘
- **Total**: ~60 分鐘

**Dependencies**:
- 所有 phases 可獨立實施
- 建議順序: Phase 1 → Phase 2 → Phase 3（按影響範圍排序）
