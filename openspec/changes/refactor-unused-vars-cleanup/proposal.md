# Change: 清理未使用變數警告

## Why
目前 ESLint 在多個正式程式檔案回報未使用變數警告，會造成雜訊並降低真實問題的辨識效率。

## What Changes
- 移除未使用的 import、變數、state 與 setter。
- 將未使用的參數改為底線前綴以符合規則。

## Impact
- Affected specs: code-quality
- Affected code: src/app/App.tsx, src/app/data/mergeService.ts, src/app/groups/GroupsView.tsx, src/app/sidebar/OrganizationNav.tsx, src/app/sidebar/sidebar.tsx, src/app/templates/TemplatesManager.tsx, src/app/ui/SettingsModal.tsx, src/app/webpages/CardGrid.tsx, src/app/webpages/WebpagesProvider.tsx, src/background/idb/db.ts, src/background/idb/storage.ts, src/background/pageMeta.ts
