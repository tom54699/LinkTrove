# Change: 模板欄位鍵格式限制

## Why
目前模板欄位鍵未限制格式，可能導致自動填入（meta enrich）與欄位對應失效，且使用者容易輸入難以維護的鍵名。

## What Changes
- 在新增/編輯模板欄位時，對「欄位鍵」進行格式驗證與提示。
- 規範欄位鍵僅允許英數與底線（可選是否允許破折號），並避免以數字開頭。
- 欄位鍵驗證失敗時阻止儲存並顯示明確錯誤訊息。

## Impact
- Affected specs: templates
- Affected code: src/app/templates/TemplatesManager.tsx, src/app/templates/TemplatesProvider.tsx (validation), tests
