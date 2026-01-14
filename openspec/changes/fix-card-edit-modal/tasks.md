# Tasks: fix-card-edit-modal

## 1. 修復 Note 輸入欄位消失
- [x] 1.1 在 `TobyLikeCard.tsx` 編輯 Modal 中加入 Note 輸入欄位
- [x] 1.2 位置：URL 輸入欄位之後、TemplateFields 之前
- [x] 1.3 綁定 `descValue` state 和 `triggerAutoSave()`

## 2. 修復輸入回朔問題
- [x] 2.1 在 `TobyLikeCard.tsx` 新增 `prevShowModalRef` 用於追蹤 Modal 上次狀態
- [x] 2.2 修改 useEffect 邏輯：只在 Modal 從 `false` 變 `true` 時初始化表單
- [x] 2.3 確保 Modal 關閉後再開啟時能正確載入最新 props

## 3. 修復自動儲存失效 (額外發現)
- [x] 3.1 使用 `performAutoSaveRef` 解決 stale closure 問題
- [x] 3.2 `triggerAutoSave` 改用 ref 調用最新的 callback

## 4. 修復選取文字時意外關閉 Modal (額外發現)
- [x] 4.1 新增 `mouseDownInsideRef` 追蹤 mousedown 位置
- [x] 4.2 dialog 的 onMouseDown 加上 `e.stopPropagation()` 阻止冒泡
- [x] 4.3 只有 mousedown 也在 overlay 上時才關閉 Modal

## 5. 測試
- [x] 5.1 新增測試：編輯 Modal 應顯示 Note 輸入欄位
- [x] 5.2 新增測試：自動儲存後不應覆蓋用戶正在輸入的值
- [x] 5.3 新增測試：關閉再開啟 Modal 應載入最新 props
- [x] 5.4 執行 `npm test` 確認所有測試通過

## 6. 手動驗證
- [x] 6.1 開啟編輯 Modal，確認 Note 欄位存在
- [x] 6.2 編輯時快速輸入，確認不會回朔
- [x] 6.3 儲存後關閉再開啟，確認載入最新值
- [x] 6.4 自動儲存正常運作（500ms 後顯示 Toast）
- [x] 6.5 選取文字拖到外面放開，Modal 不關閉
- [x] 6.6 點擊 overlay 可正常關閉 Modal
