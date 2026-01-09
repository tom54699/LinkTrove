# Proposal: Add Batch Operations for Card Selection

## Change ID
`add-batch-operations`

## Status
🟡 Proposed - Awaiting approval

## Summary
增加批次操作功能，允許使用者多選卡片後進行批次刪除、批次移動、批次開啟標籤頁操作。提供類似 Toby 的浮動工具列介面，提升批次管理效率。

## Motivation

### Problem
現有系統雖然支援單張卡片的操作（刪除、移動、編輯），但缺乏批次操作功能。當使用者需要：
- 清理大量過期書籤
- 將多張卡片移動到其他群組/分類
- 同時開啟多個相關網頁

必須逐一操作每張卡片，效率低且容易出錯。

### User Impact
- **頻率**：中高（整理書籤、專案切換時常用）
- **痛點**：重複操作耗時，無法快速批次管理
- **受益場景**：
  - 專案結束後批次歸檔書籤
  - 清理臨時儲存的網頁
  - 將相關資源移動到新分類

### Success Criteria
1. 使用者可以多選卡片（視覺上顯示勾選狀態）
2. 選中後顯示浮動工具列，提供 MOVE、Open tabs、DELETE 三個操作
3. MOVE 功能可選擇目標組織/分類
4. Open tabs 一鍵開啟所有選中的卡片
5. DELETE 批次刪除並確認
6. 操作完成後自動退出選擇模式

## Scope

### In Scope
- ✅ 多選卡片 UI 狀態（checkbox overlay）
- ✅ 浮動工具列（底部居中顯示）
- ✅ 批次刪除功能（含確認對話框）
- ✅ 批次移動功能（選擇目標 Space/Collection 對話框）
- ✅ 批次開啟標籤頁功能
- ✅ 選擇模式切換（Select/Cancel 按鈕）

### Out of Scope
- ❌ 批次編輯標題/描述（單獨 feature）
- ❌ 批次套用模板（未來功能）
- ❌ 鍵盤快捷鍵（Ctrl+A 全選等）
- ❌ 拖放多選卡片移動（技術複雜度高）

### Dependencies
- **依賴**：現有的 `CardGrid` 和 `TobyLikeCard` 組件
- **影響**：`bookmark-management` spec（新增批次操作需求）
- **無衝突**：不影響現有單卡片操作流程

## Design Overview

### User Flow
```
1. 使用者點擊「Select」按鈕進入選擇模式
   ↓
2. 卡片上顯示 checkbox，點擊可勾選/取消勾選
   ↓
3. 選中至少 1 張卡片後，底部顯示浮動工具列
   ↓
4. 工具列顯示：(N tabs selected) [MOVE] [Open tabs] [DELETE] [✕]
   ↓
5a. 點擊 MOVE → 開啟對話框選擇目標 Space/Collection → 確認後移動
5b. 點擊 Open tabs → 直接開啟所有選中的網頁到新標籤頁
5c. 點擊 DELETE → 確認對話框 → 刪除所有選中的卡片
5d. 點擊 ✕ 或 Cancel → 取消選擇，退出選擇模式
```

### Component Structure
```
CardGrid.tsx (修改)
├─ Select/Cancel 按鈕
├─ 浮動工具列（selectMode && selectedCount > 0）
│  ├─ 選擇計數 "(N tabs selected)"
│  ├─ MOVE 按鈕 → MoveSelectedDialog
│  ├─ Open tabs 按鈕 → handleOpenTabs()
│  ├─ DELETE 按鈕 → 確認對話框
│  └─ 關閉按鈕 ✕
└─ MoveSelectedDialog.tsx (新增)
   ├─ Space 下拉選單（組織列表）
   ├─ Collection 下拉選單（類別列表，依選中的 Space 過濾）
   ├─ Cancel 按鈕
   └─ Move 按鈕
```

### Data Flow
```
selectMode: boolean          // 是否進入選擇模式
selected: Record<id, boolean> // 記錄每張卡片的選擇狀態
selectedCount: number        // 選中的卡片數量

// 批次操作
handleOpenTabs()
  → items.filter(selected).forEach(open in new tab)

handleBatchMove(targetOrgId, targetCatId)
  → onUpdateCategory(selectedIds, targetCatId)
  → 更新 IndexedDB
  → 重新載入

handleBatchDelete()
  → onDeleteMany(selectedIds)
  → 更新 IndexedDB
  → 重新載入
```

## Technical Approach

### Implementation Strategy
1. **增強 CardGrid**：新增浮動工具列 UI
2. **新增 MoveSelectedDialog**：組織/分類選擇對話框
3. **批次操作邏輯**：
   - `handleOpenTabs`: 迭代選中的卡片，使用 `window.open(url, '_blank')`
   - `handleBatchMove`: 呼叫 `onUpdateCategory`（批次版本）
   - `handleBatchDelete`: 已存在（`onDeleteMany`）
4. **狀態管理**：在 CardGrid 內部管理 `selectMode` 和 `selected` 狀態

### Key Files Modified
- `src/app/webpages/CardGrid.tsx` - 新增浮動工具列和批次操作邏輯
- `src/app/webpages/MoveSelectedDialog.tsx` - 新增移動對話框組件（新檔案）
- `openspec/specs/bookmark-management/spec.md` - 新增批次操作需求

### Testing Strategy
- **單元測試**：測試 `handleOpenTabs`, `handleBatchMove` 邏輯
- **整合測試**：
  - 多選 3 張卡片 → 批次移動到另一分類 → 驗證位置正確
  - 多選 5 張卡片 → 批次刪除 → 驗證資料庫已刪除
  - 多選 2 張卡片 → Open tabs → 驗證開啟 2 個新標籤頁
- **手動測試**：
  - 選擇模式切換流暢
  - 工具列顯示/隱藏正確
  - 對話框操作流暢

## Risks and Mitigations

### Risk: 批次操作誤刪大量資料
**Severity**: 🔴 High
**Mitigation**:
- 刪除前必須顯示確認對話框
- 對話框明確顯示「將刪除 N 張卡片」
- 提供 Cancel 按鈕

### Risk: 移動操作後卡片順序錯亂
**Severity**: 🟡 Medium
**Mitigation**:
- 批次移動時，保持卡片在來源群組的相對順序
- 移動到目標群組時，統一加到末尾（或指定位置）

### Risk: 開啟大量標籤頁導致瀏覽器卡頓
**Severity**: 🟡 Medium
**Mitigation**:
- 選中超過 10 張卡片時，顯示警告提示
- 建議分批開啟或提供「確定要開啟 N 個標籤頁嗎？」確認

## Alternatives Considered

### Alternative 1: 右鍵選單批次操作
**Description**: 在卡片上右鍵顯示「批次選擇」選項
**Pros**: 不需要額外的 Select 按鈕
**Cons**: 操作不夠直觀，使用者發現成本高
**Decision**: ❌ 不採用

### Alternative 2: Shift+Click 範圍選擇
**Description**: 按住 Shift 點擊可選擇範圍內所有卡片
**Pros**: 快速選擇連續卡片
**Cons**: 需要額外實作範圍選擇邏輯，與拖放操作可能衝突
**Decision**: ⏸️ 未來考慮（v2 功能）

## Open Questions
1. ✅ **已解決**：Move 對話框是否需要顯示 Subcategory（Group）選項？
   - **答案**：先不支援，僅選擇到 Category 層級，統一加到該分類的第一個 Group

2. ✅ **已解決**：批次移動時，如果目標分類沒有 Group，是否自動創建？
   - **答案**：Collection 一定會有 Group（系統保證），不需要處理此情況

3. ✅ **已解決**：Open tabs 超過多少張時需要警告？
   - **答案**：10 張以上顯示確認提示

4. ✅ **已解決**：是否需要 Shift+Click 範圍選擇、Ctrl+A 全選、拖放多選？
   - **答案**：暫時都不需要，保持簡單實作

## Related Work
- **參考設計**：Toby 的批次操作工具列（使用者提供的 HTML 範例）
- **相關 Spec**：`bookmark-management`（需要新增批次操作需求）
- **相關 Change**：無衝突

## Timeline Estimate
- **設計**: ✅ 已完成（本提案）
- **實作**: 預估 1 個開發階段
  - CardGrid 增強: ~30 分鐘
  - MoveSelectedDialog: ~20 分鐘
  - 批次操作邏輯: ~20 分鐘
  - 測試與調整: ~30 分鐘
- **測試**: 與實作同步進行
- **文檔**: 更新 CLAUDE.md 與 SESSION_HANDOFF.md

## Approval
- [ ] Product Owner (使用者)
- [ ] Technical Lead (Claude Code)
- [ ] Architecture Review (Claude Code)

---

**Next Steps**: 待使用者批准後，進入實作階段（Stage 2: Implementing Changes）
