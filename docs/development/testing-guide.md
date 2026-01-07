# 測試指南（現況）

本文件描述**目前可用的測試指令與範圍**。  
依 AGENTS 規範：**不得自動執行測試**，需由使用者手動執行。

**最後更新：2026-01-07**

---

## 測試工具與環境

- Test Runner：Vitest
- UI 測試：React Testing Library
- DOM：jsdom
- IndexedDB：fake-indexeddb

設定檔：
- `vitest.config.ts`
- `vitest.setup.ts`

---

## 測試指令

> 請手動執行；若需我執行，請先明確允許。

- 全部測試
```bash
npm test
```

（選擇性）watch 模式（若需要互動式迭代）
```bash
npm test -- --watch
```

---

## 測試分佈（檔案級別）

### 背景層（IDB / import / service）
- `src/background/__tests__/*`
- `src/background/idb/__tests__/*`

### UI / Provider / Drag & Drop
- `src/app/webpages/__tests__/*`
- `src/app/groups/__tests__/*`
- `src/app/sidebar/__tests__/*`
- `src/app/tabs/__tests__/*`
- `src/app/dnd/__tests__/*`

### App 層
- `src/app/__tests__/*`
- `src/__tests__/*`

---

## 建議執行順序（重構時）

1. `npm test`（整體回歸）
2. 若只改 UI：先看 `src/app/**/__tests__`
3. 若只改匯入/儲存：先看 `src/background/**/__tests__`

---

## 常見測試依賴

- 多數測試依賴 `fake-indexeddb`，若你手動調整 IDB schema，請留意測試初始化。
- 拖放測試可能需要 `dragOver` / `drop` 事件完整觸發順序。

---

## 測試結果紀錄（建議）

重構時建議保存：
- 測試執行時間
- 失敗檔案與錯誤摘要

避免只記「通過／不通過」，以利回溯。
