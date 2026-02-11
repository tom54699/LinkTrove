# Change: 更新卡片編輯規格（移除 inline edit / 取消自動儲存）

## Why
前幾次 OpenSpec 變更已移除卡片描述 inline edit 與 auto-save 行為，但目前產品規格未同步，導致測試與文件仍期待舊行為。

## What Changes
- 明確規範卡片標題/備註只能透過「編輯 Modal」修改
- 明確規範僅在使用者明確觸發儲存（Done / Enter）時寫入
- 明確規範取消、ESC、點背景不儲存

## Impact
- Affected specs: `bookmark-management`
- Affected code: 不要求修改程式碼（此變更僅同步規格）
- Affected tests: 需回顧與「inline edit / auto-save」相關測試是否仍有效
