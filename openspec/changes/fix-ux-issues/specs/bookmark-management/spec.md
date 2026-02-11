# Spec Delta: Fix UX Issues - Bookmark Management

## MODIFIED Requirements

### Requirement: 編輯儲存觸發條件

系統必須（SHALL）在使用者編輯卡片時提供一致的保存觸發方式，包括 Enter 鍵快捷鍵。

#### Scenario: Meta 欄位支援 Enter 鍵觸發保存

- **GIVEN** 使用者開啟卡片編輯 modal
- **GIVEN** 卡片所屬 Collection 有自訂 template fields（meta 欄位）
- **WHEN** 使用者在 meta 欄位（text, number, url 類型）輸入內容
- **WHEN** 使用者按下 Enter 鍵（非 Shift+Enter）
- **THEN** 系統觸發保存操作（等同於點擊 Save 按鈕）
- **THEN** Modal 關閉
- **THEN** 變更成功保存到 IndexedDB

#### Scenario: Meta 欄位 Enter 鍵行為與其他欄位一致

- **GIVEN** 使用者開啟卡片編輯 modal
- **WHEN** 使用者在 title 欄位按 Enter 鍵
- **THEN** 系統觸發保存並關閉 modal
- **WHEN** 使用者在 URL 欄位按 Enter 鍵
- **THEN** 系統觸發保存並關閉 modal
- **WHEN** 使用者在 description 欄位按 Enter 鍵
- **THEN** 系統觸發保存並關閉 modal
- **WHEN** 使用者在 meta 欄位按 Enter 鍵
- **THEN** 系統觸發保存並關閉 modal（一致性）

#### Scenario: Shift+Enter 不觸發保存

- **GIVEN** 使用者在任何 input 欄位輸入內容
- **WHEN** 使用者按下 Shift+Enter 組合鍵
- **THEN** 系統不觸發保存操作
- **THEN** Modal 保持開啟（預留多行輸入可能性）

---

## ADDED Requirements

### Requirement: 批次操作視覺回饋

系統必須（SHALL）在執行批次操作時提供明確的視覺回饋，讓使用者知道操作正在進行中。

#### Scenario: Move 按鈕顯示 loading 狀態

- **GIVEN** 使用者選取 5 張卡片
- **GIVEN** 使用者點擊批次工具列的 Move 按鈕
- **GIVEN** Move 對話框已開啟並選擇目標 Collection 和 Group
- **WHEN** 使用者點擊 Move 對話框的 Move 按鈕
- **THEN** 按鈕立即顯示 loading 狀態（spinner icon + "Moving..." 文字）
- **THEN** 按鈕變為 disabled 狀態（防止重複點擊）
- **WHEN** 移動操作完成（所有卡片成功移動）
- **THEN** loading 狀態消失
- **THEN** 對話框自動關閉
- **THEN** 工具列消失（選取狀態清空）

#### Scenario: Move 操作失敗時清除 loading 狀態

- **GIVEN** 使用者點擊 Move 按鈕
- **GIVEN** Move 操作進行中（loading=true）
- **WHEN** 移動操作因網路錯誤或其他原因失敗
- **THEN** loading 狀態仍然清除（finally block）
- **THEN** 按鈕恢復可點擊狀態
- **THEN** 使用者可重新嘗試操作

#### Scenario: Loading 期間按鈕文字國際化

- **GIVEN** 使用者語言設定為繁體中文
- **WHEN** Move 按鈕顯示 loading 狀態
- **THEN** 按鈕文字顯示「移動中...」
- **GIVEN** 使用者語言設定為英文
- **WHEN** Move 按鈕顯示 loading 狀態
- **THEN** 按鈕文字顯示「Moving...」

---

### Requirement: 批次刪除性能優化

系統必須（SHALL）在批次刪除卡片時使用 optimistic update 和 parallel execution，確保操作流暢且性能與單張刪除一致。

#### Scenario: 批次刪除立即更新 UI（optimistic update）

- **GIVEN** 使用者選取 5 張卡片
- **WHEN** 使用者點擊 Delete 按鈕並確認刪除
- **THEN** 被選取的卡片立即從 UI 消失（<100ms）
- **THEN** 系統同時向 IndexedDB 發送刪除請求（背景執行）
- **THEN** 使用者無需等待實際刪除完成即可繼續操作

#### Scenario: 批次刪除使用 parallel execution

- **GIVEN** 使用者選取 10 張卡片
- **WHEN** 系統執行批次刪除
- **THEN** 所有刪除請求並行執行（Promise.all）
- **THEN** 不使用 sequential execution（for await loop）
- **THEN** 總執行時間 <300ms（相比 sequential 的 2000ms+）

#### Scenario: 批次刪除失敗時恢復狀態

- **GIVEN** 使用者選取 3 張卡片刪除
- **GIVEN** 系統已執行 optimistic update（卡片從 UI 移除）
- **WHEN** IndexedDB 刪除操作失敗（例如網路錯誤、權限問題）
- **THEN** 系統捕捉錯誤並記錄到 console
- **THEN** 系統調用 load() 重新載入實際資料
- **THEN** UI 恢復到實際狀態（未成功刪除的卡片重新顯示）

#### Scenario: 批次刪除與單張刪除行為一致

- **GIVEN** 系統已實現單張刪除的 optimistic update
- **WHEN** 使用者刪除單張卡片
- **THEN** 卡片立即從 UI 消失
- **WHEN** 使用者批次刪除多張卡片
- **THEN** 所有卡片立即從 UI 消失（相同體驗）
- **THEN** 無視覺延遲或卡頓感

#### Scenario: 批次刪除後記錄 order snapshot

- **GIVEN** 使用者選取 [card-1, card-3, card-5] 刪除
- **GIVEN** 當前 items = [card-1, card-2, card-3, card-4, card-5]
- **WHEN** 系統執行 optimistic update
- **THEN** 系統過濾出新的 items = [card-2, card-4]
- **THEN** 系統調用 logOrderSnapshot('deleteMany', [card-2, card-4])
- **THEN** Order snapshot 正確記錄剩餘卡片順序

---

### Requirement: 批次操作錯誤處理

系統必須（SHALL）在批次操作失敗時提供適當的錯誤處理和恢復機制。

#### Scenario: 批次移動失敗時關閉 loading 狀態

- **GIVEN** 使用者點擊 Move 按鈕
- **GIVEN** Move 操作進行中（loading=true）
- **WHEN** moveMany 函數拋出錯誤
- **THEN** loading 狀態在 finally block 中清除
- **THEN** Move 對話框保持開啟（讓使用者重試）
- **THEN** 錯誤訊息記錄到 console

#### Scenario: 批次刪除部分失敗時的行為

- **GIVEN** 使用者選取 5 張卡片刪除
- **WHEN** 其中 2 張卡片刪除成功，3 張失敗
- **THEN** 系統調用 load() 重新載入
- **THEN** UI 顯示實際狀態（成功刪除的 2 張消失，失敗的 3 張保留）
- **THEN** console 顯示錯誤訊息

---

## REMOVED Requirements

None. 本次修改為新增和修改現有需求，無移除需求。

---

## Cross-Capability Dependencies

### Dependency: drag-drop

批次刪除的 optimistic update 不影響拖曳排序功能：

- **GIVEN** 使用者批次刪除部分卡片
- **WHEN** 系統執行 optimistic update 更新 items
- **THEN** 拖曳排序仍正常運作（items 狀態一致）

### Dependency: templates

Meta 欄位 Enter 鍵支援依賴 template fields 定義：

- **GIVEN** Collection 有自訂 template（包含 text, number, url fields）
- **WHEN** 使用者編輯這些 meta 欄位
- **THEN** Enter 鍵行為正確運作

---

## Testing Requirements

### Unit Testing

系統必須（SHALL）為所有新增和修改的行為提供單元測試覆蓋：

- TobyLikeCard: Meta input Enter 鍵行為（4 tests）
- WebpagesProvider: deleteMany optimistic + parallel（4 tests）
- MoveSelectedDialog: loading state 管理（4 tests）

### Integration Testing

系統必須（SHALL）通過以下 integration tests：

- End-to-end 批次操作流程（移動 + 刪除）
- 網路失敗情境的錯誤處理
- Phase 3 React.memo 優化不受影響（regression test）

### Performance Testing

系統必須（SHALL）滿足以下性能指標：

- 批次刪除 10 張卡片: UI 更新 <100ms
- 批次刪除 10 張卡片: IndexedDB 操作 <300ms
- Move loading 狀態: 立即顯示（<50ms）

---

## Implementation Notes

### Technical Constraints

1. **DOM Query Limitation**:
   - Meta Enter 鍵使用 `document.querySelector('[data-save-btn]')` 觸發保存
   - 短期可接受，未來可重構為 ref callback

2. **Async Props**:
   - `MoveSelectedDialog.onMove` 改為 async 函數
   - 需確保 `CardGrid.handleMoveSelected` 也是 async

3. **Error Boundary**:
   - 批次刪除錯誤透過 try/catch 處理
   - 使用 load() 恢復狀態（非 error boundary）

### Backward Compatibility

所有修改向後兼容：

- Meta Enter 鍵: 新增行為，不影響現有功能
- Move loading: UI 改善，不改變邏輯
- Batch delete: 性能優化，行為一致

---

## References

- **Related Change**: `optimize-phase3-react-memo`
- **Related Files**:
  - `src/app/webpages/TobyLikeCard.tsx`
  - `src/app/webpages/MoveSelectedDialog.tsx`
  - `src/app/webpages/WebpagesProvider.tsx`
  - `src/app/webpages/CardGrid.tsx`
