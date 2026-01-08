# Proposal: Minimum Count Protection

**Change ID**: `minimum-count-protection`
**Status**: Proposed
**Created**: 2026-01-08
**Author**: Claude Code

---

## Problem

目前系統對三層階層架構的刪除保護不一致，導致潛在的資料完整性問題和糟糕的使用者體驗：

### 現有狀況分析

| 層級 | 最小數量保護 | 刪除 UI | 級聯刪除 | 錯誤處理 |
|------|------------|---------|----------|----------|
| **Organization** | ❌ 無 | ❌ 無 UI | ⚠️ 重新分配 | ❌ 無 |
| **Collection** | ❌ 無 | ✅ 有 | ✅ 有 | ⚠️ 部分 |
| **Group** | ✅ 有 | ✅ 有 | ✅ 有 | ✅ 完整 |

### 具體問題

1. **Organization 層級**：
   - 無刪除 UI（邏輯存在但使用者無法觸發）
   - 無最小數量保護（可刪除到 0 個 Organization）
   - 使用 reassignment 邏輯（複雜且不直觀）

2. **Collection 層級**：
   - 無最小數量保護（可刪除 Organization 下的所有 Collection）
   - 雖有級聯刪除，但無保護機制

3. **Group 層級**：
   - ✅ 已正確實作（參考範例）
   - Toast 訊息格式可作為統一標準

### 影響

- **資料完整性風險**：可能產生空的 Organization（無 Collection）或空的 Collection（無 Group）
- **使用者體驗不佳**：誤刪後無法回復，且無警告
- **行為不一致**：三層保護機制不統一

---

## Solution

實作三層階層式最小數量保護機制，確保資料完整性並提供一致的使用者體驗。

### 核心原則

1. **三層保護**：
   - **Organization**: 全域至少保留 1 個
   - **Collection**: 每個 Organization 至少保留 1 個
   - **Group**: 每個 Collection 至少保留 1 個（已實作，需統一格式）

2. **雙重保護**：
   - **UI 層**：即時檢查並阻擋（提供 Toast 訊息）
   - **Data 層**：StorageService 中的安全檢查（防護最後一道關卡）

3. **級聯刪除**：
   - 移除 Organization reassignment 邏輯
   - 統一使用 **cascade delete** 模式：
     - 刪除 Organization → 刪除所有 Collection → 刪除所有 Group → 刪除所有 Webpages
     - 刪除 Collection → 刪除所有 Group → 刪除所有 Webpages
     - 刪除 Group → 刪除所有 Webpages

4. **錯誤處理統一**：
   - 阻擋刪除：`showToast('刪除失敗：至少需要保留一個 [層級名稱]', 'error')`
   - 操作失敗：`console.error()` + `showToast('刪除失敗', 'error')`

### 功能範圍

#### 1. Organization 層級
- ✅ 新增刪除 UI（context menu 或 edit dialog）
- ✅ 實作最小數量保護（≥1）
- ✅ 改為級聯刪除（移除 reassignment）
- ✅ 完整錯誤處理

#### 2. Collection 層級
- ✅ 實作最小數量保護（每個 Organization ≥1）
- ✅ 確保級聯刪除完整性
- ✅ 完整錯誤處理

#### 3. Group 層級
- ✅ 統一 Toast 訊息格式
- ✅ 保持現有保護機制

---

## Impact

### 正面影響

1. **資料完整性提升**：
   - 防止產生空的階層結構
   - 確保使用者始終有可用的工作區間

2. **使用者體驗改善**：
   - 明確的錯誤訊息
   - 一致的刪除行為
   - 更直觀的級聯刪除邏輯

3. **程式碼品質**：
   - 移除複雜的 reassignment 邏輯
   - 統一的保護模式
   - 更易維護

### 風險與緩解

| 風險 | 緩解措施 |
|------|----------|
| 級聯刪除誤刪大量資料 | 需要確認對話框（已存在） |
| Data 層檢查影響效能 | 僅在刪除時執行，影響可忽略 |
| 測試覆蓋不足 | 為每層保護編寫單元測試 |

---

## Related

### Capabilities

- **bookmark-management**: 核心階層架構，將新增最小數量保護 requirements

### Changes

- **auto-default-collection** (archived 2026-01-08): 自動創建預設 Collection 和 Group，與本變更互補

### Documentation

- `/docs/architecture/component-map.md`: 需更新組件關係（刪除邏輯變更）
- `/docs/specs/data-format.md`: 需註記最小數量約束

---

## Acceptance Criteria

1. ✅ Organization 刪除 UI 可見且可用
2. ✅ 無法刪除最後一個 Organization（UI 阻擋 + Data 層阻擋）
3. ✅ 無法刪除 Organization 下最後一個 Collection（UI 阻擋 + Data 層阻擋）
4. ✅ 無法刪除 Collection 下最後一個 Group（保持現有機制）
5. ✅ 刪除 Organization 會級聯刪除所有關聯資料
6. ✅ 刪除 Collection 會級聯刪除所有關聯資料
7. ✅ Toast 訊息格式統一且清晰
8. ✅ 所有刪除操作有完整錯誤處理（console.error + toast）
9. ✅ 所有保護機制有測試覆蓋

---

## Notes

- 本變更延續 `auto-default-collection` 的工作，確保階層架構的完整性
- 級聯刪除邏輯比 reassignment 更簡單、更直觀
- 參考 Group 層級的現有實作作為最佳實踐範例
