# Change: Atomic Card Save and Code Cleanup

## Why

在拖曳儲存卡片的流程中，原本需要兩步驟：先建立卡片（無 subcategoryId），再呼叫 moveCardToGroup 補上 subcategoryId。若第二步失敗，卡片會缺少 subcategoryId，導致資料不一致。

## What Changes

- **改進 addFromTab 流程**：讓 `addWebpageFromTab` 和 `addFromTab` 接受 options 參數（categoryId、subcategoryId、beforeId），一步完成卡片建立、分類設定和排序
- **移除 addTabToGroup 函數**：此函數約 200 行，從未在生產環境使用（僅測試檔案引用）
- **移除 computeAutoMeta**：`updateCategory` 中使用的 meta 自動填充功能，對於使用者的書籍模板（bookTitle, author, serialStatus 等欄位）無實際作用
- **移除 metaAutoFill.ts**：整個檔案已不再需要
- **移除相關測試**：`metaAutoFill.test.ts`、`webpage.addTabToGroup.test.ts`、`webpage.addTabToGroup.enrich.test.ts`

## Impact

- Affected specs: drag-drop
- Affected code:
  - `src/background/webpageService.ts` - 更新 interface 和 addWebpageFromTab
  - `src/app/webpages/WebpagesProvider.tsx` - 更新 addFromTab 和 updateCategory
  - `src/app/groups/GroupsView.tsx` - 改用 atomic 流程
