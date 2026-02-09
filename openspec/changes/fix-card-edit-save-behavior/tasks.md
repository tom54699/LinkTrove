# Implementation Tasks

## 1. 追蹤編輯過的 Meta 欄位

- [x] 1.1 在 WebpageCard 加入 `editedMetaKeys: Set<string>` state
- [x] 1.2 修改 TemplateFields 的 onChange callback，記錄被編輯的欄位
- [x] 1.3 在 showModal 開啟時重置 editedMetaKeys
- [x] 1.4 在 Done 按鈕點擊時使用 merge 策略：`{ ...data.meta, ...editedFields }`

## 2. 移除 Description Inline Edit

- [x] 2.1 移除 WebpageCard 的 `isEditing` state
- [x] 2.2 移除 `textareaRef` ref
- [x] 2.3 移除第 183-208 行的 textarea 和編輯邏輯
- [x] 2.4 將 description 改為靜態顯示
- [x] 2.5 移除 onEditDescription callback 的 inline edit 觸發（保留 Modal 內的使用）

## 3. 修復 Enter 鍵行為

- [x] 3.1 抽取 Done 按鈕的儲存邏輯為獨立函數 `handleSave`
- [x] 3.2 在 Title input 加入 onKeyDown handler（Enter 觸發 handleSave）
- [x] 3.3 在 URL input 加入 onKeyDown handler（Enter 觸發 handleSave）
- [x] 3.4 在 Description input 加入 onKeyDown handler（Enter 觸發 handleSave）
- [x] 3.5 TemplateFields 的 input 使用元件內部的 onChange，無需額外修改
- [x] 3.6 簡化 Modal container 的 onKeyDown（只保留 Escape）

## 4. 統一儲存行為驗證

- [x] 4.1 確認 Done 按鈕儲存並關閉
- [x] 4.2 確認 Enter 鍵儲存並關閉
- [x] 4.3 確認 Cancel 按鈕不儲存直接關閉（已存在）
- [x] 4.4 確認 Escape 鍵不儲存直接關閉（已存在）
- [x] 4.5 確認點擊背景不儲存直接關閉（已存在）

## 5. TobyLikeCard 同步修改

- [x] 5.1 檢查 TobyLikeCard.tsx 是否有相同問題（有）
- [x] 5.2 同步套用 editedMetaKeys 和 merge 策略修改

## 6. 測試

- [ ] 6.1 新增測試：驗證 meta race condition 修復
- [ ] 6.2 新增測試：驗證 Enter 鍵儲存行為
- [ ] 6.3 新增測試：驗證 Escape/Cancel/背景點擊不儲存
- [ ] 6.4 手動測試：建立新卡片 → 立即編輯 → 驗證 meta enrichment 不被覆蓋
