# Implementation Tasks

## 1. 代碼修改
- [x] 1.1 修改 `src/app/sidebar/organizations.tsx:173-238` - Organization 級聯刪除改為軟刪除
  - [x] 1.1.1 所有 `getAll()` 調用後加入 `.filter(x => !x.deleted)`
  - [x] 1.1.2 將 `ws.delete(web.id)` 改為 `ws.put({ ...web, deleted: true, deletedAt: now, updatedAt: now })`
  - [x] 1.1.3 將 `ss.delete(sub.id)` 改為 `ss.put({ ...sub, deleted: true, deletedAt: now, updatedAt: now })`
  - [x] 1.1.4 將 `cs.delete(cat.id)` 改為 `cs.put({ ...cat, deleted: true, deletedAt: now, updatedAt: now })`
  - [x] 1.1.5 將 `os.delete(id)` 改為 `os.put({ ...org, deleted: true, deletedAt: now, updatedAt: now })`
- [x] 1.2 修改 `src/app/sidebar/categories.tsx:382-389` - Category 刪除改為軟刪除
  - [x] 1.2.1 獲取當前 category 資料
  - [x] 1.2.2 使用 `put()` 標記 `deleted: true, deletedAt: now, updatedAt: now`
  - [x] 1.2.3 移除 `delete(id)` 調用
- [x] 1.3 確認 `src/background/idb/storage.ts` 的 `listSubcategories()` 已過濾 deleted

## 2. 測試修正
- [x] 2.1 運行並修正 `src/app/__tests__/delete-protection.integration.test.tsx`
  - [x] 2.1.1 更新測試預期：刪除後記錄仍存在於 IDB（標記 deleted）
  - [x] 2.1.2 確認過濾邏輯正常（UI 不顯示已刪除項目）
  - [x] 2.1.3 確認級聯軟刪除正確傳播
- [x] 2.2 運行並修正 `src/app/sidebar/__tests__/organizations.delete.test.tsx`
  - [x] 2.2.1 更新測試預期（軟刪除行為）
- [x] 2.3 運行並修正 `src/app/sidebar/__tests__/categories.delete.test.tsx`
  - [x] 2.3.1 更新測試預期（軟刪除行為）
- [x] 2.4 運行並確認 `src/app/groups/__tests__/GroupsView.delete.test.tsx` 無回歸
- [x] 2.5 運行完整測試套件確認無其他回歸

## 3. 手動測試
- [x] 3.1 測試 Organization 刪除
  - [x] 3.1.1 建立測試 Organization 含多個 Categories/Groups/Webpages
  - [x] 3.1.2 執行刪除操作
  - [x] 3.1.3 確認 UI 不再顯示該 Organization
  - [x] 3.1.4 檢查 IndexedDB：確認記錄仍存在且 `deleted: true`
  - [x] 3.1.5 確認所有子項目也標記 `deleted: true`
- [x] 3.2 測試 Category 刪除
  - [x] 3.2.1 建立測試 Category 含多個 Groups/Webpages
  - [x] 3.2.2 執行刪除操作
  - [x] 3.2.3 確認 UI 不再顯示該 Category
  - [x] 3.2.4 檢查 IndexedDB：確認記錄仍存在且 `deleted: true`
- [x] 3.3 測試跨設備同步
  - [x] 3.3.1 設備 A 刪除 Organization
  - [x] 3.3.2 執行雲端同步備份
  - [x] 3.3.3 設備 B 同步恢復
  - [x] 3.3.4 確認設備 B 正確合併刪除狀態（Organization 不顯示）
- [x] 3.4 測試 GC 清理
  - [x] 3.4.1 手動觸發 GC（或等待自動 GC）
  - [x] 3.4.2 確認 30 天前的 tombstone 被清理
  - [x] 3.4.3 確認近期的 tombstone 保留

## 4. 規格更新
- [x] 4.1 更新 `openspec/changes/unify-cascade-soft-delete/specs/bookmark-management/spec.md`
  - [x] 4.1.1 MODIFIED: 「刪除卡片時從資料庫移除」改為軟刪除
  - [x] 4.1.2 MODIFIED: 「刪除組織時清理關聯資料」改為級聯軟刪除
  - [x] 4.1.3 ADDED: 軟刪除生命週期和 GC 機制
- [x] 4.2 運行 `openspec validate unify-cascade-soft-delete --strict`
- [x] 4.3 修正所有驗證錯誤

## 5. 文檔更新
- [x] 5.1 更新 `docs/meta/SESSION_HANDOFF.md` 記錄此次變更
- [x] 5.2 更新 `docs/architecture/component-map.md`（若有影響）
- [x] 5.3 在 commit message 中說明 breaking change

## 6. 提交與歸檔
- [x] 6.1 建立 Git commit（commit message 包含 breaking change 說明）
- [x] 6.2 運行完整測試套件最終確認
- [x] 6.3 準備歸檔（待部署後執行 `openspec archive unify-cascade-soft-delete`）
