# Design: Minimum Count Protection

**Change ID**: `minimum-count-protection`

---

## Overview

實作三層階層式最小數量保護機制，確保 Organization、Collection、Group 始終保持至少一個實例，防止產生空的階層結構。

---

## Architecture

### 雙重保護架構

```
┌─────────────────────────────────────────────────────────┐
│                    UI Layer (React)                      │
│  ┌───────────────────────────────────────────────────┐  │
│  │  ① 即時檢查 (Immediate Check)                     │  │
│  │  - 計算剩餘數量                                    │  │
│  │  - 若 ≤ 1，阻擋 + showToast                       │  │
│  │  - return early，不呼叫 data layer                │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                          ↓ (if count > 1)
┌─────────────────────────────────────────────────────────┐
│              Data Layer (StorageService)                 │
│  ┌───────────────────────────────────────────────────┐  │
│  │  ② 最後防護 (Safety Check)                        │  │
│  │  - 再次驗證數量                                    │  │
│  │  - 若違反規則，throw Error                        │  │
│  │  - 提供統一的驗證邏輯                              │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                          ↓ (if valid)
┌─────────────────────────────────────────────────────────┐
│                IndexedDB Transaction                     │
│  ┌───────────────────────────────────────────────────┐  │
│  │  ③ 級聯刪除 (Cascade Delete)                      │  │
│  │  - 原子性交易                                      │  │
│  │  - 刪除所有子層級資料                              │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### 為什麼需要雙重保護？

1. **UI Layer Protection**:
   - **目的**：提供即時回饋，改善使用者體驗
   - **優點**：無需等待 async 操作，立即顯示錯誤訊息
   - **風險**：可能與 state 不同步（極少數情況）

2. **Data Layer Protection**:
   - **目的**：最後一道防線，確保資料完整性
   - **優點**：基於 DB 真實狀態，絕對準確
   - **風險**：需要額外的 DB 查詢（但僅在刪除時）

---

## Design Decisions

### Decision 1: Cascade Delete vs Reassignment

#### 選項 A：Reassignment（現有方案）

```typescript
// 刪除 Organization 時重新分配 Categories
async remove(id: string, reassignToId?: string) {
  const target = reassignToId || findOtherOrg();
  for (const category of categories) {
    if (category.organizationId === id) {
      category.organizationId = target; // 重新分配
    }
  }
  deleteOrganization(id);
}
```

**優點**：
- 保留使用者資料
- 不會丟失 Categories

**缺點**：
- ❌ 複雜且不直觀
- ❌ 使用者意圖不明確（刪除 Org 但資料移到別處）
- ❌ 可能混淆不同 Organization 的資料
- ❌ 需要處理 target selection 邏輯
- ❌ 與 Collection/Group 的刪除行為不一致

#### 選項 B：Cascade Delete（新方案） ✅ **採用**

```typescript
// 刪除 Organization 時級聯刪除所有關聯資料
async remove(id: string) {
  // Step 1: Get all categories under this org
  const categories = await getAllCategoriesInOrg(id);

  // Step 2: For each category, cascade delete
  for (const category of categories) {
    await deleteCategory(category.id); // 已包含 groups + webpages
  }

  // Step 3: Delete organization itself
  await deleteOrganization(id);
}
```

**優點**：
- ✅ 簡單直觀，與 Collection/Group 行為一致
- ✅ 使用者意圖明確（刪除就是刪除）
- ✅ 無需複雜的 target selection
- ✅ 程式碼更易維護

**缺點**：
- ⚠️ 可能誤刪大量資料

**緩解措施**：
- 最小數量保護（防止刪除最後一個）
- 確認對話框（UI 層已存在）
- 未來可加入軟刪除（tombstone）機制

**決策理由**：
- 使用者回饋："還是乾脆全刪了就好不分配"
- 與現有 Collection/Group 刪除行為一致
- 簡化程式碼邏輯

---

### Decision 2: 最小數量閾值

| 層級 | 全域/局部 | 閾值 | 理由 |
|------|----------|------|------|
| Organization | 全域 | ≥ 1 | 至少需要一個工作區間 |
| Collection | 局部（per Org） | ≥ 1 | 每個 Org 至少需要一個 Collection |
| Group | 局部（per Collection） | ≥ 1 | 每個 Collection 至少需要一個 Group |

**為什麼是 1 而不是 0？**
- 符合 `auto-default-collection` 的設計（自動創建預設項目）
- 確保使用者始終有可用的層級可以操作
- 防止 UI 出現空狀態

---

### Decision 3: UI Layer 檢查位置

#### Organization - 新增 Context Menu

```typescript
// src/app/sidebar/OrganizationNav.tsx (概念)
const handleDelete = async (orgId: string) => {
  // ① UI Layer Check
  if (organizations.length <= 1) {
    showToast('刪除失敗：至少需要保留一個 Organization', 'error');
    return;
  }

  // Show confirmation dialog
  if (!await confirmDelete()) return;

  try {
    // ② Data Layer Check (inside actions.remove)
    await actions.remove(orgId);
    showToast('已刪除 Organization 及其所有資料', 'success');
  } catch (error) {
    console.error('Delete organization error:', error);
    showToast('刪除失敗', 'error');
  }
};
```

#### Collection - 修改現有 Delete Button

```typescript
// src/app/sidebar/sidebar.tsx:232
onClick={async () => {
  if (!editing) return;

  // ① UI Layer Check (NEW)
  const inSameOrg = categories.filter(c => c.organizationId === editing.organizationId);
  if (inSameOrg.length <= 1) {
    showToast('刪除失敗：至少需要保留一個 Collection', 'error');
    return;
  }

  try {
    // ② Data Layer Check (inside deleteCategory)
    await catActions.deleteCategory(editing.id);
    setEditing(null);
    setConfirmDelete(false);
    showToast('已刪除 Collection 及其所有資料', 'success');
  } catch (error) {
    console.error('Delete category error:', error);
    showToast('刪除失敗', 'error');
  }
}}
```

#### Group - 統一現有邏輯

```typescript
// src/app/groups/GroupsView.tsx:137 (現有，微調 toast 格式)
const remove = async (id: string) => {
  try {
    const latest = await svc.listSubcategories(categoryId);
    const others = latest.filter(g => g.id !== id);

    // ① UI Layer Check (EXISTING)
    if (others.length === 0) {
      showToast('刪除失敗：至少需要保留一個 Group', 'error'); // 統一格式
      return;
    }

    // ② Data Layer + Cascade Delete
    await svc.deleteSubcategoryAndPages(id);
    await load();
    showToast('已刪除 Group 與其書籤', 'success');
  } catch (error) {
    console.error('Delete group error:', error); // 新增
    showToast('刪除失敗', 'error');
  }
};
```

---

### Decision 4: Data Layer 實作位置

#### 在 StorageService 中新增驗證

```typescript
// src/background/idb/storage.ts (概念)

async deleteOrganization(id: string, options?: { reassignTo?: string }) {
  // ① Data Layer Check
  const allOrgs = await getAll('organizations');
  if (allOrgs.length <= 1) {
    throw new Error('Cannot delete last organization');
  }

  // ② Cascade Delete
  await tx(['organizations', 'categories', 'subcategories', 'webpages'], 'readwrite', async (t) => {
    const orgStore = t.objectStore('organizations');
    const catStore = t.objectStore('categories');
    const subStore = t.objectStore('subcategories');
    const webStore = t.objectStore('webpages');

    // Get all categories in this org
    const allCats = await getAllFromStore(catStore);
    const catsInOrg = allCats.filter(c => c.organizationId === id);

    // For each category, delete its groups and webpages
    for (const cat of catsInOrg) {
      const allSubs = await getAllFromStore(subStore);
      const subsInCat = allSubs.filter(s => s.categoryId === cat.id);

      // Delete all webpages in these groups
      for (const sub of subsInCat) {
        const allWebs = await getAllFromStore(webStore);
        const websInSub = allWebs.filter(w => w.subcategoryId === sub.id);
        for (const web of websInSub) {
          webStore.delete(web.id);
        }
        subStore.delete(sub.id);
      }

      catStore.delete(cat.id);
    }

    // Finally delete organization
    orgStore.delete(id);
  });
}
```

**類似邏輯應用於**：
- `deleteCategory` - 檢查 per-org count
- `deleteSubcategory` - 檢查 per-category count（已有）

---

## Error Handling Pattern

### 統一的錯誤處理模式

```typescript
try {
  // 1. UI Layer Check (optional but recommended)
  if (shouldBlock()) {
    showToast('刪除失敗：[具體原因]', 'error');
    return;
  }

  // 2. Perform async operation
  await dataLayerOperation();

  // 3. Success feedback
  showToast('已刪除 [項目] 及其[關聯資料]', 'success');

} catch (error) {
  // 4. Error logging + user feedback
  console.error('[Operation] error:', error);
  showToast('刪除失敗', 'error');
}
```

### Toast 訊息格式規範

| 情境 | 格式 | 範例 |
|------|------|------|
| 阻擋（最小數量） | `刪除失敗：至少需要保留一個 [層級]` | `刪除失敗：至少需要保留一個 Group` |
| 成功（級聯刪除） | `已刪除 [項目] 及其[關聯]` | `已刪除 Organization 及其所有資料` |
| 失敗（一般錯誤） | `刪除失敗` | `刪除失敗` |

---

## Implementation Strategy

### Phase 1: Data Layer Protection

1. 修改 `StorageService.deleteOrganization`
   - 新增最小數量檢查
   - 改為級聯刪除（移除 reassignment）

2. 修改 `StorageService.deleteCategory` (via `categories.tsx`)
   - 新增最小數量檢查（per org）
   - 確保級聯刪除完整

3. 確認 `StorageService.deleteSubcategoryAndPages` 正確（已存在）

### Phase 2: UI Layer Protection

4. 新增 Organization 刪除 UI
   - 在 OrganizationNav 或 Switcher 中新增 context menu
   - 包含重新命名和刪除選項

5. 修改 Collection 刪除 UI
   - 在 `sidebar.tsx:232` 的 Delete button 中新增檢查

6. 統一 Group 刪除訊息
   - 微調 `GroupsView.tsx:144` 的 toast 格式
   - 新增 console.error

### Phase 3: Testing

7. 撰寫單元測試
   - 測試每層的最小數量保護
   - 測試級聯刪除的完整性

8. 手動測試
   - 驗證 UI 阻擋正確
   - 驗證 toast 訊息清晰
   - 驗證資料完整性

---

## Testing Strategy

### Unit Tests

```typescript
// src/app/sidebar/__tests__/organizations.delete.test.tsx
describe('Organization minimum count protection', () => {
  it('should block delete when only 1 organization exists', async () => {
    // Arrange: Only 1 org in DB
    // Act: Try to delete it
    // Assert: Should throw error / show toast
  });

  it('should cascade delete all categories/groups/webpages', async () => {
    // Arrange: Org with 2 categories, 3 groups, 10 webpages
    // Act: Delete organization
    // Assert: All related data deleted
  });
});

// src/app/sidebar/__tests__/categories.delete.test.tsx
describe('Category minimum count protection', () => {
  it('should block delete when org has only 1 category', async () => {
    // Arrange: Org with 1 category
    // Act: Try to delete it
    // Assert: Should block
  });

  it('should allow delete when org has 2+ categories', async () => {
    // Arrange: Org with 2 categories
    // Act: Delete one
    // Assert: Should succeed
  });
});
```

### Integration Tests

- 測試 UI + Data layer 的協同工作
- 測試確認對話框流程
- 測試錯誤訊息顯示

---

## Migration Considerations

### 現有使用者資料

- **無需資料遷移**：此變更僅影響刪除邏輯，不改變資料結構
- **向後相容**：現有資料結構完全相容

### 行為變更警告

如果未來要發佈此變更，需要在 Release Notes 中說明：

> **Breaking Change**: Organization 刪除行為變更
> - **舊版本**：刪除 Organization 會將 Categories 重新分配到其他 Organization
> - **新版本**：刪除 Organization 會**完全刪除**所有關聯的 Categories、Groups 和 Webpages
> - **最小數量保護**：無法刪除最後一個 Organization/Collection/Group

---

## Performance Considerations

### 級聯刪除效能

```typescript
// Worst case: Delete Organization with lots of data
// - 1 Organization
// - 10 Categories
// - 100 Groups
// - 1000 Webpages

// Operations:
// - 1 org delete
// - 10 category deletes
// - 100 group deletes
// - 1000 webpage deletes
// Total: ~1111 IDB operations in one transaction

// IndexedDB transaction overhead: ~10-50ms
// Expected total time: < 200ms (acceptable)
```

### 最小數量檢查效能

```typescript
// Each delete requires 1 additional getAll() call
// - getAll('organizations'): ~1-5ms (< 100 records expected)
// - getAll('categories'): ~1-10ms (< 1000 records expected)
// - getAll('subcategories'): ~1-10ms (< 10000 records expected)

// Impact: Negligible (< 20ms overhead per delete)
```

---

## Future Enhancements

### 可能的後續改進

1. **軟刪除（Tombstone）**：
   - 新增 `deleted` flag 而非真正刪除
   - 支援資料恢復
   - 配合未來的 cloud sync 需求

2. **批量刪除確認**：
   - 當級聯刪除會影響 > N 個項目時，顯示詳細確認
   - 例如：「此操作將刪除 3 個 Collections、12 個 Groups 和 145 個 Webpages」

3. **刪除歷史記錄**：
   - 記錄刪除操作
   - 提供 undo 功能

4. **進階保護設定**：
   - 讓使用者選擇是否要級聯刪除或阻擋
   - 在 Settings 中可調整最小數量閾值

---

## References

- **Existing Implementation**: `src/app/groups/GroupsView.tsx:137-170` (Group delete with protection)
- **OpenSpec Change**: `auto-default-collection` (archived) - 建立預設層級的互補功能
- **IndexedDB Transaction API**: https://developer.mozilla.org/en-US/docs/Web/API/IDBTransaction
