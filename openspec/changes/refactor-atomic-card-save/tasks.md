# Tasks

## 1. Implementation

- [x] 1.1 更新 WebpageService interface 型別簽名，addWebpageFromTab 新增 options 參數
- [x] 1.2 修改 webpageService.ts 的 addWebpageFromTab 實作，支援傳入 category、subcategoryId、beforeId
- [x] 1.3 修改 WebpagesProvider.tsx 的 addFromTab 接受 options 參數
- [x] 1.4 更新 GroupsView.tsx 改用 atomic 流程（一步完成而非兩步）
- [x] 1.5 移除 webpageService.ts 中的 addTabToGroup 函數（約 200 行）
- [x] 1.6 移除 WebpagesProvider.tsx 中 updateCategory 的 computeAutoMeta 使用
- [x] 1.7 刪除 metaAutoFill.ts 檔案
- [x] 1.8 刪除相關測試檔案：
  - `src/app/webpages/__tests__/metaAutoFill.test.ts`
  - `src/background/__tests__/webpage.addTabToGroup.test.ts`
  - `src/background/__tests__/webpage.addTabToGroup.enrich.test.ts`

## 2. Testing

- [x] 2.1 驗證 build 成功
- [ ] 2.2 手動測試拖曳卡片儲存功能
- [ ] 2.3 驗證卡片排序正確，無抖動現象
