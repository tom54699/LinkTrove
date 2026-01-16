## 1. Implementation
- [x] 1.1 CategoriesProvider：以 ref 讀取 selectedId，補 hasOrgProvider 依賴
- [x] 1.2 OpenTabsProvider：以 ref 穩定 actions 供 listener 使用
- [x] 1.3 TemplatesProvider：persist 改為 useCallback，actions 依賴補 persist
- [x] 1.4 WebpagesProvider：addFromTab 依賴補 load，移除 selectedId
- [x] 1.5 測試：新增/更新單元測試驗證行為不變（TDD）
