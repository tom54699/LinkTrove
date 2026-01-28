# Technical Design: 統一級聯刪除為軟刪除機制

## Context

LinkTrove 當前使用**混合刪除策略**：
- **Webpages**：軟刪除（標記 `deleted: true`）
- **Organizations/Categories/Subcategories**：硬刪除（直接從 IndexedDB 刪除）

此設計最初是為了保持 UI 清潔，但隨著雲端同步功能的引入，硬刪除導致無法產生 tombstone，跨設備同步時會出現衝突。

### 現有架構

```
┌─────────────────────────────────────────┐
│ 數據層 (IndexedDB v3)                   │
├─────────────────────────────────────────┤
│ organizations  → 硬刪除 (delete)        │
│ categories     → 硬刪除 (delete)        │
│ subcategories  → 硬刪除 (delete)        │
│ webpages       → 軟刪除 (deleted=true)  │
│ templates      → 軟刪除 (deleted=true)  │
│ meta           → order 清理             │
└─────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────┐
│ 同步層 (syncService + mergeService)     │
├─────────────────────────────────────────┤
│ LWW 合併策略：                          │
│ - 比較 updatedAt 和 deletedAt          │
│ - 支援 tombstone（僅 webpages 有效）   │
│ - 過濾 deleted=true 的項目             │
└─────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────┐
│ GC 層 (gcService)                       │
├─────────────────────────────────────────┤
│ - 保留期限：30 天                       │
│ - 自動觸發：每 7 天                     │
│ - 清理條件：deletedAt < cutoff         │
└─────────────────────────────────────────┘
```

### 當前問題

1. **同步衝突**：
   ```
   設備 A: 刪除 Organization → 硬刪除，無 tombstone
   設備 B: 同步時無法知道該 Organization 被刪除
   結果: 設備 B 保留該 Organization，兩邊不一致
   ```

2. **級聯邏輯錯誤**：
   ```typescript
   // src/app/sidebar/organizations.tsx:188
   const catList = await getAll('categories');  // ❌ 包含已軟刪除的
   const catsInOrg = catList.filter(c => c.organizationId === id);
   // 可能嘗試刪除已標記 deleted 的項目
   ```

3. **無法恢復**：
   - 使用者誤刪 Organization → 所有資料永久丟失
   - 即使雲端有備份，本地刪除會覆蓋遠端（無 tombstone 判斷）

## Goals / Non-Goals

### Goals
- ✅ 統一所有實體使用軟刪除機制
- ✅ 修正級聯刪除邏輯，正確過濾已刪除項目
- ✅ 確保跨設備同步正確處理刪除狀態
- ✅ 保持現有 GC 機制運作正常
- ✅ 最小化代碼改動範圍（降低風險）

### Non-Goals
- ❌ 不實作回收站 UI（未來可選功能）
- ❌ 不改變 GC 保留期限（30 天已足夠）
- ❌ 不修改匯出格式（已支援 `deleted` 欄位）
- ❌ 不改變使用者可見行為（刪除後仍然看不到項目）

## Decisions

### Decision 1: 統一使用軟刪除

**選擇**：所有實體（Organizations, Categories, Subcategories, Webpages）統一使用軟刪除

**理由**：
- ✅ 同步機制已完整支援 tombstone（mergeService.ts 的 LWW 邏輯）
- ✅ GC 機制已可處理所有實體（gcService.ts 的自動清理）
- ✅ 代碼邏輯統一，降低維護成本
- ✅ 支援未來的回收站功能（可選）

**替代方案考慮**：
- ❌ **方案 A**：保持混合策略，修正同步邏輯
  - 問題：需要為硬刪除設計特殊的同步機制（複雜）
  - 問題：無法支援恢復功能
- ❌ **方案 B**：所有實體使用硬刪除
  - 問題：無法支援跨設備同步（tombstone 必要）
  - 問題：無法支援回收站

### Decision 2: 級聯軟刪除實作

**選擇**：刪除父項目時，級聯標記所有子項目為 `deleted: true`

**實作方式**：
```typescript
// src/app/sidebar/organizations.tsx
async remove(id: string) {
  const now = Date.now();

  await tx(['categories', 'subcategories', 'webpages', 'organizations'], 'readwrite', async (t) => {
    const os = t.objectStore('organizations');
    const cs = t.objectStore('categories');
    const ss = t.objectStore('subcategories');
    const ws = t.objectStore('webpages');

    // 1. 過濾已刪除的項目（重要！）
    const catList = (await getAll('categories')).filter(c => !c.deleted);
    const catsInOrg = catList.filter(c => c.organizationId === id);

    for (const cat of catsInOrg) {
      const subList = (await getAll('subcategories')).filter(s => !s.deleted);
      const subsInCat = subList.filter(s => s.categoryId === cat.id);

      for (const sub of subsInCat) {
        const webList = (await getAll('webpages')).filter(w => !w.deleted);
        const websInSub = webList.filter(w => w.subcategoryId === sub.id);

        // 2. 軟刪除 webpages
        for (const web of websInSub) {
          await ws.put({ ...web, deleted: true, deletedAt: now, updatedAt: now });
        }

        // 3. 軟刪除 subcategory
        await ss.put({ ...sub, deleted: true, deletedAt: now, updatedAt: now });
      }

      // 4. 軟刪除 category
      await cs.put({ ...cat, deleted: true, deletedAt: now, updatedAt: now });
    }

    // 5. 軟刪除 organization
    const org = await os.get(id);
    await os.put({ ...org, deleted: true, deletedAt: now, updatedAt: now });
  });
}
```

**理由**：
- ✅ 保持級聯刪除的原子性（單一 IndexedDB 交易）
- ✅ 所有子項目使用相同的 `deletedAt` 時間戳（便於追蹤）
- ✅ 過濾邏輯防止重複處理已刪除項目

**替代方案考慮**：
- ❌ **方案 A**：只軟刪除父項目，依賴查詢時過濾
  - 問題：查詢效率低（需要遞迴查找父項目狀態）
  - 問題：恢復邏輯複雜（需要遞迴恢復）
- ❌ **方案 B**：非原子操作，分步驟軟刪除
  - 問題：可能導致部分刪除（交易中斷時）

### Decision 3: Order Metadata 清理策略

**選擇**：軟刪除時**保留** order metadata，由 GC 統一清理

**當前行為**：
```typescript
// src/background/webpageService.ts:309-317
async function deleteWebpage(id: string) {
  // ... 標記 deleted ...
  const gid = victim?.subcategoryId;
  if (gid) {
    const order = await getGroupOrder(gid);
    const pruned = order.filter(x => x !== id);  // ❌ 立即清理
    await setGroupOrder(gid, pruned);
  }
}
```

**建議修改**：
```typescript
async function deleteWebpage(id: string) {
  // ... 標記 deleted ...
  // ✅ 不清理 order，由 GC 服務統一處理
  // 載入時自動過濾 deleted 項目即可
}
```

**理由**：
- ✅ 支援恢復後保持原順序
- ✅ 統一清理邏輯（GC 時一併清理 order）
- ✅ 減少刪除操作的複雜度

**影響**：
- ⚠️ Order metadata 可能包含已刪除項目的 ID（不影響功能，僅佔用少量存儲）
- ✅ 載入時自動過濾：`webpages.filter(w => !w.deleted)` 後再應用順序

**替代方案考慮**：
- ❌ **方案 A**：維持當前行為（刪除時立即清理 order）
  - 問題：恢復時順序丟失
  - 問題：刪除邏輯複雜化
- ✅ **方案 B**（當前選擇）：延遲清理至 GC
  - 優勢：恢復時保持順序
  - 優勢：簡化刪除邏輯

### Decision 4: 測試策略

**選擇**：修正現有測試，不新增大量測試

**需修正的測試**：
- `delete-protection.integration.test.tsx` - 更新預期（記錄仍存在但標記 deleted）
- `organizations.delete.test.tsx` - 更新預期（軟刪除）
- `categories.delete.test.tsx` - 更新預期（軟刪除）

**需確認的測試**：
- `mergeService.tombstone.test.ts` - 已有完整覆蓋（無需修改）
- `gcService.test.ts` - 已有完整覆蓋（無需修改）

**理由**：
- ✅ 現有測試已覆蓋核心邏輯（LWW 合併、GC）
- ✅ 只需調整預期行為（硬刪除 → 軟刪除）
- ✅ 避免過度測試（降低維護成本）

## Risks / Trade-offs

### Risk 1: 測試回歸

**風險**：修改級聯刪除邏輯可能導致多個測試失敗

**緩解措施**：
- ✅ 逐步運行測試，修正預期行為
- ✅ 手動測試級聯刪除流程
- ✅ Git 提交前確認所有測試通過

**影響等級**：🟡 中（有測試保護網，可快速發現問題）

### Risk 2: UI 顯示異常

**風險**：若過濾邏輯遺漏，已刪除項目可能在 UI 顯示

**緩解措施**：
- ✅ Storage layer 已有完整過濾（`loadFromLocal/Sync/Templates`）
- ✅ 手動測試 UI 各層級的顯示
- ✅ 檢查 SearchBox、GroupsView 等關鍵組件

**影響等級**：🟢 低（底層過濾機制完善）

### Risk 3: Tombstone 累積

**風險**：軟刪除會增加 tombstone 數量，佔用存儲空間

**緩解措施**：
- ✅ GC 機制已可自動清理（30 天保留期）
- ✅ 使用者可手動觸發 GC（設置頁面）
- ✅ Tombstone 數據量相對較小（僅元資料）

**影響等級**：🟢 低（GC 機制完善）

### Trade-off 1: 儲存空間 vs 恢復能力

**取捨**：
- 增加：少量存儲空間（tombstone metadata）
- 獲得：跨設備同步正確性 + 未來可支援恢復功能

**評估**：✅ 值得（同步正確性是核心需求）

### Trade-off 2: Order Metadata 保留 vs 立即清理

**取捨**：
- 增加：Order metadata 可能包含已刪除項目 ID
- 獲得：恢復時保持原順序 + 簡化刪除邏輯

**評估**：✅ 值得（使用者體驗優先）

## Migration Plan

### Phase 1: 代碼修改（1 天）
1. 修改 `organizations.tsx` 和 `categories.tsx`
2. 加入過濾邏輯
3. Code review 確認邏輯正確

### Phase 2: 測試驗證（半天）
1. 運行所有刪除相關測試
2. 修正測試預期
3. 手動測試關鍵流程

### Phase 3: 部署（即時）
1. 提交代碼
2. 建立 Git tag（標記 breaking change）
3. 無需資料遷移（向後兼容）

### Rollback Plan
若發現問題：
1. Git revert 提交
2. 測試保護網可快速偵測
3. 資料無損（只是標記方式不同）

## Open Questions

### Q1: 是否需要實作回收站 UI？
**狀態**：⏸️ 延後決定
**理由**：先統一刪除機制，觀察使用者反饋後再決定

### Q2: GC 保留期限是否需要調整？
**狀態**：✅ 維持 30 天
**理由**：與雲端同步週期配合，已足夠

### Q3: Order metadata 清理策略是否需要優化？
**狀態**：⏸️ 延後決定
**理由**：先觀察 tombstone 累積情況，若無問題則無需優化

## Implementation Notes

### 關鍵代碼位置

1. **Organizations 刪除**：`src/app/sidebar/organizations.tsx:173-238`
2. **Categories 刪除**：`src/app/sidebar/categories.tsx:382-389`
3. **Storage 過濾**：`src/background/idb/storage.ts:488-510`（已有保護）
4. **LWW 合併**：`src/app/data/mergeService.ts:66-175`（已支援 tombstone）
5. **GC 清理**：`src/app/data/gcService.ts:109-174`（已支援所有實體）

### 驗證檢查清單

- [ ] 刪除後記錄仍存在於 IDB（標記 `deleted: true`）
- [ ] UI 不顯示已刪除項目（過濾機制正常）
- [ ] 級聯軟刪除正確傳播到所有子項目
- [ ] 同步合併正確處理 tombstone
- [ ] GC 自動清理 30 天前的 tombstone
- [ ] 所有測試通過

## References

- **影響分析報告**：詳見 session context（全面影響分析）
- **當前實作**：`src/background/webpageService.ts:292-318`（webpages 軟刪除範例）
- **LWW 測試**：`src/app/data/__tests__/mergeService.tombstone.test.ts`
- **GC 測試**：`src/app/data/__tests__/gcService.test.ts`
