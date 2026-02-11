# Phase 3: React.memo 優化任務清單

---

## 準備階段：Baseline 測量 (30 分鐘)

### 1. 測量當前 re-render 行為

#### 1.1 準備測試環境
- [ ] 1.1.1 載入擴充功能到 Chrome
- [ ] 1.1.2 開啟包含 100 張卡片的 Group
- [ ] 1.1.3 開啟 React DevTools → Profiler

#### 1.2 錄製編輯操作
- [ ] 1.2.1 開始 Profiler 錄製
- [ ] 1.2.2 編輯其中一張卡片的標題
- [ ] 1.2.3 停止錄製
- [ ] 1.2.4 記錄 re-render 次數
  - [ ] 記錄總 re-render 數量
  - [ ] 記錄被編輯卡片 render 次數
  - [ ] 記錄其他卡片 render 次數

#### 1.3 記錄 Baseline 數據
- [ ] 1.3.1 更新 `proposal.md` 成功指標中的 baseline 數據
- [ ] 1.3.2 截圖保存 Profiler 結果（用於對比）

---

## 階段 1：CardRow 組件實作 (2 小時)

### 2. 創建 CardRow 組件

#### 2.1 創建文件
- [ ] 2.1.1 創建 `src/app/webpages/CardRow.tsx`

#### 2.2 定義 Props 介面
- [ ] 2.2.1 定義 `CardRowProps` 介面
  ```typescript
  interface CardRowProps {
    item: WebpageCardData;
    selected: boolean;
    ghost: boolean;

    // Stable handlers
    onToggleSelect: (id: string) => void;
    onOpen: (id: string, opts?: { ctrlKey?: boolean }) => void;
    onDelete: (id: string) => void;
    onUpdateTitle: (id: string, value: string) => void;
    onUpdateUrl: (id: string, value: string) => void;
    onUpdateDescription: (id: string, value: string) => void;
    onUpdateMeta: (id: string, meta: Record<string, string>) => void;
    onModalOpenChange: (open: boolean) => void;
    onSave: (id: string, patch: any) => void;
  }

  // 注意：drag 相關 props（dragDisabled, onDragStart, onDragEnd）
  // 不傳入 CardRow，而是在 CardGrid 的 drag wrapper 上處理
  ```

#### 2.3 實作 CardRow 組件
- [ ] 2.3.1 實作基本結構（React.memo 包裹）
- [ ] 2.3.2 添加 8 個 useCallback（綁定 item.id）
  - [ ] handleToggleSelect
  - [ ] handleOpen
  - [ ] handleDelete
  - [ ] handleUpdateTitle
  - [ ] handleUpdateUrl
  - [ ] handleUpdateDescription
  - [ ] handleUpdateMeta
  - [ ] handleSave
- [ ] 2.3.3 渲染 TobyLikeCard 並傳入穩定的 handlers（含 faviconText 計算）
- [ ] 2.3.4 添加 JSDoc 註解說明用途

---

## 階段 2：CardGrid 修改 (1.5 小時)

### 3. 修改 CardGrid 使用 CardRow

#### 3.1 添加穩定的 handler 函數
- [ ] 3.1.1 添加 `handleToggleSelect` useCallback
  ```typescript
  const handleToggleSelect = useCallback((id: string) => {
    toggleSelect(id);
  }, [toggleSelect]);
  ```
- [ ] 3.1.2 添加 `handleOpen` useCallback
  ```typescript
  const handleOpen = useCallback((id: string, opts?: { ctrlKey?: boolean }) => {
    const item = items.find(i => i.id === id);
    if (!item) return;
    try {
      const openInBackground = opts?.ctrlKey ?? false;
      if (chrome?.tabs?.create) {
        chrome.tabs.create({ url: item.url, active: !openInBackground });
      } else {
        window.open(item.url, '_blank');
      }
    } catch {}
  }, [items]);
  ```
- [ ] 3.1.3 添加 `handleDelete` useCallback
- [ ] 3.1.4 添加 `handleUpdateTitle` useCallback
- [ ] 3.1.5 添加 `handleUpdateUrl` useCallback
- [ ] 3.1.6 添加 `handleUpdateDescription` useCallback
- [ ] 3.1.7 添加 `handleUpdateMeta` useCallback
- [ ] 3.1.8 添加 `handleSave` useCallback（含 fallback 邏輯）

#### 3.2 修改渲染邏輯
- [ ] 3.2.1 導入 CardRow 組件
- [ ] 3.2.2 修改 `visibleNodes.map` 邏輯
  - [ ] 保留 ghost 卡片的直接渲染（使用 TobyLikeCard）
  - [ ] 一般卡片改用 CardRow
- [ ] 3.2.3 傳入穩定的 handlers 給 CardRow

#### 3.3 依賴項檢查
- [ ] 3.3.1 執行 `npm run lint`
- [ ] 3.3.2 修正所有 exhaustive-deps 警告
- [ ] 3.3.3 確認無閉包陷阱

---

## 階段 3：編譯與基本測試 (1 小時)

### 4. 編譯驗證

#### 4.1 TypeScript 編譯
- [ ] 4.1.1 執行 `npm run build`
- [ ] 4.1.2 修正所有 TypeScript 錯誤
- [ ] 4.1.3 確認 dist/ 產出正常

#### 4.2 載入擴充功能
- [ ] 4.2.1 chrome://extensions 載入 dist/
- [ ] 4.2.2 確認無 Console 錯誤
- [ ] 4.2.3 確認 UI 正常顯示

### 5. 手動功能測試

#### 5.1 卡片互動功能
- [ ] 5.1.1 測試選取/取消選取卡片
- [ ] 5.1.2 測試開啟卡片（一般點擊）
- [ ] 5.1.3 測試開啟卡片（Ctrl+點擊背景開啟）
- [ ] 5.1.4 測試刪除卡片
- [ ] 5.1.5 測試編輯標題
- [ ] 5.1.6 測試編輯 URL
- [ ] 5.1.7 測試編輯描述
- [ ] 5.1.8 測試編輯 meta（自定義欄位）
- [ ] 5.1.9 測試儲存變更

#### 5.2 Modal 與拖曳
- [ ] 5.2.1 測試編輯 modal 開啟/關閉
- [ ] 5.2.2 測試 modal 開啟時拖曳禁用
- [ ] 5.2.3 測試 modal 關閉後拖曳恢復

---

## 階段 4：React DevTools Profiler 驗證 (30 分鐘)

### 6. 效能驗證

#### 6.1 錄製優化後的 re-render 行為
- [ ] 6.1.1 開啟 React DevTools → Profiler
- [ ] 6.1.2 開始錄製
- [ ] 6.1.3 編輯其中一張卡片的標題
- [ ] 6.1.4 停止錄製

#### 6.2 分析 Profiler 結果
- [ ] 6.2.1 驗證被編輯卡片 re-render（預期 1 次）
- [ ] 6.2.2 驗證其他卡片顯示 "Did not render"（預期 99 張）
- [ ] 6.2.3 截圖保存結果

#### 6.3 對比 Baseline
- [ ] 6.3.1 對比 re-render 次數差異
- [ ] 6.3.2 計算改善百分比
- [ ] 6.3.3 記錄實際效益數據

---

## 階段 5：單元測試（可選，1 小時）

### 7. 撰寫單元測試

#### 7.1 CardRow 測試
- [ ] 7.1.1 創建 `src/app/webpages/__tests__/CardRow.test.tsx`
- [ ] 7.1.2 測試 React.memo 包裹
  ```typescript
  it('should be wrapped with React.memo', () => {
    expect(CardRow.type).toBe('react.memo');
  });
  ```
- [ ] 7.1.3 測試 props 未變時不 re-render
  ```typescript
  it('should not re-render when props are stable', () => {
    // 使用 render spy 驗證
  });
  ```
- [ ] 7.1.4 測試 item 變化時 re-render
  ```typescript
  it('should re-render when item changes', () => {
    // 驗證 item 變化時重新渲染
  });
  ```

#### 7.2 CardGrid 測試
- [ ] 7.2.1 創建 `src/app/webpages/__tests__/CardGrid.phase3.test.tsx`
- [ ] 7.2.2 測試 handlers memoization
  ```typescript
  it('should keep stable handler references on re-render', () => {
    // 驗證 handlers 引用穩定
  });
  ```
- [ ] 7.2.3 測試 handlers 功能正確性
  ```typescript
  it('should call correct handler with correct arguments', () => {
    // 驗證 handleToggleSelect(id) 正確調用 toggleSelect
  });
  ```

#### 7.3 執行測試
- [ ] 7.3.1 執行 `npm test -- CardRow.test.tsx`
- [ ] 7.3.2 執行 `npm test -- CardGrid.phase3.test.tsx`
- [ ] 7.3.3 確認所有測試通過

---

## 階段 6：文檔更新 (30 分鐘)

### 8. 更新記憶文檔

#### 8.1 更新 MEMORY.md
- [ ] 8.1.1 記錄 Phase 3 優化內容
  - [ ] CardRow 組件說明
  - [ ] useCallback 穩定化 handlers
  - [ ] React.memo 生效驗證
- [ ] 8.1.2 記錄實際效益數據
  - [ ] Baseline re-render 次數
  - [ ] 優化後 re-render 次數
  - [ ] 改善百分比
- [ ] 8.1.3 記錄已知限制
  - [ ] Ghost 卡片仍使用 TobyLikeCard（不影響效能）
  - [ ] 依賴項需持續維護（eslint 檢查）

#### 8.2 更新 OpenSpec 文檔
- [ ] 8.2.1 更新 `proposal.md` 成功指標
- [ ] 8.2.2 標記狀態為 "Implemented"
- [ ] 8.2.3 記錄實施日期

---

## 階段 7：Code Review 與最終驗證 (30 分鐘)

### 9. 靜態檢查

#### 9.1 Lint 與格式化
- [ ] 9.1.1 執行 `npm run lint` 確認無警告
- [ ] 9.1.2 執行 `npm run format` 格式化代碼
- [ ] 9.1.3 檢查 Console 無錯誤訊息

#### 9.2 完整測試套件
- [ ] 9.2.1 執行 `npm test` 執行所有測試
- [ ] 9.2.2 確認所有測試通過（包含 Phase 2 測試）
- [ ] 9.2.3 記錄測試覆蓋率

### 10. 回歸測試

#### 10.1 Phase 2 優化驗證
- [ ] 10.1.1 驗證 GroupsView useMemo 仍運作
- [ ] 10.1.2 驗證 RAF 節流仍運作
- [ ] 10.1.3 驗證 selected 計算 memo 仍運作

#### 10.2 整體功能驗證
- [ ] 10.2.1 測試大量卡片場景（500 張）
- [ ] 10.2.2 測試拖曳操作流暢度
- [ ] 10.2.3 測試批次操作功能

---

## 階段 8：Commit 與收尾 (15 分鐘)

### 11. 準備 Commit

#### 11.1 檢查修改文件
- [ ] 11.1.1 執行 `git status` 檢查修改
- [ ] 11.1.2 確認只包含相關文件
  - [ ] src/app/webpages/CardRow.tsx（新增）
  - [ ] src/app/webpages/CardGrid.tsx（修改）
  - [ ] openspec/changes/optimize-phase3-react-memo/（文檔）
  - [ ] .claude/projects/.../memory/MEMORY.md（記憶更新）

#### 11.2 撰寫 Commit Message
- [ ] 11.2.1 使用格式化的 commit message
  ```
  perf(CardGrid): 修正 React.memo 失效問題，使用 CardRow 穩定化 callbacks

  Phase 3 優化：透過 CardRow 組件穩定化傳給 TobyLikeCard 的 callbacks，使 React.memo 生效。

  Before:
  - 編輯單張卡片時，100 張卡片全部 re-render
  - 每次產生 800 個新函數引用（100 卡 × 8 callbacks）

  After:
  - 編輯單張卡片時，只有被編輯的卡片 re-render
  - 其他卡片顯示 "Did not render"（React DevTools 驗證）

  Baseline: [記錄實際數據]
  Improvement: [記錄實際改善百分比]

  Test:
  - 39 tests passing (Phase 2)
  - [X] tests passing (Phase 3)
  - React DevTools Profiler 驗證通過

  Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
  ```

#### 11.3 執行 Commit
- [ ] 11.3.1 執行 `git add` 添加相關文件
- [ ] 11.3.2 執行 `git commit` 提交變更
- [ ] 11.3.3 執行 `git log` 驗證 commit 記錄

---

## 總計時間預估

| 階段 | 任務 | 預估時間 |
|------|------|----------|
| 準備 | Baseline 測量 | 0.5 小時 |
| 階段 1 | CardRow 實作 | 2 小時 |
| 階段 2 | CardGrid 修改 | 1.5 小時 |
| 階段 3 | 編譯與基本測試 | 1 小時 |
| 階段 4 | Profiler 驗證 | 0.5 小時 |
| 階段 5 | 單元測試（可選）| 1 小時 |
| 階段 6 | 文檔更新 | 0.5 小時 |
| 階段 7 | Code Review | 0.5 小時 |
| 階段 8 | Commit | 0.25 小時 |
| **總計** | | **7.75 小時** |

---

## 檢查點

### ✅ 準備階段完成檢查點
- [ ] Baseline 數據已記錄（re-render 次數、響應時間）
- [ ] Profiler 截圖已保存
- [ ] proposal.md 已更新 baseline 數據

### ✅ 實作階段完成檢查點
- [ ] CardRow.tsx 創建完成
- [ ] CardGrid.tsx 修改完成
- [ ] 編譯通過無錯誤
- [ ] 所有卡片互動功能正常
- [ ] eslint 無依賴項警告

### ✅ 驗證階段完成檢查點
- [ ] React DevTools Profiler 驗證 re-render 減少
- [ ] 其他卡片顯示 "Did not render"
- [ ] 實際改善數據已記錄
- [ ] 對比截圖已保存

### ✅ 測試階段完成檢查點（可選）
- [ ] 單元測試通過
- [ ] 測試覆蓋率達標
- [ ] 無 regression（Phase 2 測試仍通過）

### ✅ 最終完成檢查點
- [ ] 所有測試通過
- [ ] 編譯無錯誤和警告
- [ ] Console 無錯誤訊息
- [ ] 文檔已更新
- [ ] Commit 已完成
- [ ] 效能改善達到預期

---

## 風險緩解

### 依賴項管理
- **風險**: useCallback 依賴項錯誤導致閉包陷阱
- **緩解**:
  - 使用 eslint-plugin-react-hooks 自動檢查
  - 每次添加 useCallback 後立即執行 lint
  - 手動測試功能確保邏輯正確

### 功能退化
- **風險**: 修改後某些功能失效
- **緩解**:
  - 執行完整的手動功能測試
  - 保留 Phase 2 測試確保無 regression
  - 測試所有邊緣情況（modal、拖曳、批次操作）

### 效能改善不如預期
- **風險**: 實際改善小於預期
- **緩解**:
  - 使用 Baseline 測量作為基準
  - React DevTools Profiler 提供客觀數據
  - 記錄實際數據而非估計值
