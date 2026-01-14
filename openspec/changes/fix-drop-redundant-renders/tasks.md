# Tasks: Fix Drop Operation Redundant Renders

## 1. WebpagesProvider 修改

### 1.1 新增操作鎖定機制
- [x] 1.1.1 新增 `operationLockRef` ref（記錄最後操作時間戳）

### 1.2 新增 moveCardToGroup action
- [x] 1.2.1 在 `CtxValue` interface 新增 `moveCardToGroup` 型別定義
- [x] 1.2.2 實作 `moveCardToGroup` callback，內部使用 `service.moveCardToGroup`
- [x] 1.2.3 用 `service.moveCardToGroup` 返回值直接 `setItems`，不呼叫 `load()`
- [x] 1.2.4 將新 action 加入 context value

### 1.3 現有 action 加鎖
- [x] 1.3.1 `updateCategory` 開頭設置 `operationLockRef.current = Date.now()`
- [x] 1.3.2 `reorder` 開頭設置操作鎖定
- [x] 1.3.3 `moveToEnd` 開頭設置操作鎖定

### 1.4 修改 onChanged 監聽
- [x] 1.4.1 在 onChanged handler 中檢查 `Date.now() - operationLockRef.current < 800`
- [x] 1.4.2 如果在鎖定窗口內，跳過 load() 呼叫

## 2. GroupsView 修改

### 2.1 使用新的 moveCardToGroup action
- [x] 2.1.1 修改 `onDropExistingCard` 使用 `actions.moveCardToGroup`
- [x] 2.1.2 移除 `onDropExistingCard` 中的 `await actions.load()`
- [x] 2.1.3 修改 `handleGroupDrop` 中的 existing card drop 邏輯
- [x] 2.1.4 移除 `handleGroupDrop` 中的 `await actions.load()`

### 2.2 清理 fallback 邏輯
- [x] 2.2.1 移除不再需要的 `svc.moveCardToGroup` 檢查（因為使用 actions）
- [x] 2.2.2 移除 onDropTab 中的 fallback 邏輯，改用 moveCardToGroup

## 3. 測試驗證

### 3.1 手動測試
- [x] 3.1.1 測試同 group 內拖放排序
- [x] 3.1.2 測試跨 group 拖放移動
- [x] 3.1.3 測試拖 tab 建立新卡片
- [x] 3.1.4 確認 UI 無閃爍（優化成功）
- [x] 3.1.5 測試 HTML/Toby import 功能正常

### 3.2 跨分頁測試
- [x] 3.2.1 開兩個新分頁
- [x] 3.2.2 在分頁 A 執行拖放
- [x] 3.2.3 確認分頁 B 在 1-2 秒內同步更新

### 3.3 單元測試補強
- [x] 3.3.1 覆蓋 moveCardToGroup setItems 行為
- [x] 3.3.2 覆蓋 onChanged 鎖定窗口跳過 load

## 4. 程式碼品質
- [x] 4.1 確保 TypeScript 編譯通過
- [x] 4.2 確保 ESLint 無錯誤
- [x] 4.3 執行現有單元測試確保無 regression
