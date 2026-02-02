# 技術設計：Edge 瀏覽器睡眠分頁 Meta 提取修正

## Context

### 背景
Microsoft Edge 和 Google Chrome 都有節省記憶體的功能，但實作方式不同：

| 功能 | Chrome (Memory Saver) | Edge (Sleeping Tabs) |
|------|----------------------|----------------------|
| **機制** | Discard - 完全卸載分頁內容 | Sleep - 暫停（freeze）分頁 |
| **記憶體釋放** | 完全釋放（需重新載入） | 部分釋放（保留狀態） |
| **API 偵測** | ✅ `tab.discarded = true` | ❌ 無對應屬性 |
| **恢復方式** | 完整重新載入頁面 | 無縫恢復（imperceptible） |
| **擴充功能影響** | `executeScript` 正常 reject | `executeScript` Promise 卡住（hang） |

### 問題
LinkTrove 有**兩個儲存路徑**，都依賴 `tab.discarded` 屬性來判斷是否需要喚醒分頁：

#### 路徑 1: 拖曳儲存（主要問題路徑）⭐
```typescript
// src/app/webpages/WebpagesProvider.tsx:176-186
const tabInfo = await chrome.tabs.get(tid);

if (!tabInfo?.discarded) {  // ❌ Edge 睡眠分頁會進入這裡
  await waitForTabComplete(tid, 8000);  // ← timeout，因為分頁在睡眠
  await new Promise(resolve => setTimeout(resolve, 500));
}

const meta = await extractMetaForTab(tid);  // ← Promise hang（Edge bug）
```

**使用場景**：使用者在 LinkTrove 新分頁中，拖曳 Open Tabs 的分頁到 Collection/Group
- **最常用的儲存方式**
- **最容易遇到睡眠分頁**（拖曳的分頁通常已閒置一段時間）

#### 路徑 2: 右鍵選單儲存（較少問題）
```typescript
// src/background.ts:97-100
if (!tabInfo?.discarded) {
  await waitForTabComplete(tabId, 8000);
  await new Promise((resolve) => setTimeout(resolve, 500));
}
```

**使用場景**：在分頁本身右鍵點擊，選擇 "Save to LinkTrove"
- **較少使用**
- **通常不會遇到睡眠分頁**（使用者正在該分頁上操作）

#### 共同問題
Edge 的 Sleeping Tabs 不會設置 `discarded` 屬性，導致：
1. 睡眠分頁無法被偵測（`discarded = undefined`）
2. 進入等待邏輯，但睡眠分頁不會完成載入 → timeout
3. `chrome.scripting.executeScript()` 卡住（Promise hang）
4. meta 提取失敗，卡片顯示空白或缺少標題、描述、favicon

### 限制與依賴
- **Microsoft Edge Extensions Issue #134**：官方已知 bug，但尚無修復時間表
- **API 限制**：Edge 未提供 `tab.sleeping` 或類似屬性
- **Workaround 必要性**：無官方解決方案，必須採用變通方法

## Goals / Non-Goals

### Goals
- ✅ Edge 使用者儲存分頁時能正常提取 meta 資料
- ✅ 提取共用的瀏覽器偵測邏輯（DRY 原則）
- ✅ 保持 Chrome 上的現有行為不變
- ✅ 最小化效能影響

### Non-Goals
- ❌ 不嘗試偵測 Edge 睡眠狀態（技術上不可行）
- ❌ 不修改 Chrome 的行為（已正常運作）
- ❌ 不等待 Microsoft 修復官方 bug（時間不確定）

## Decisions

### Decision 1: 提取 `isEdgeBrowser()` 到共用工具模組

**選擇**: 建立 `src/utils/browser.ts` 作為瀏覽器偵測工具模組

**理由**:
1. `googleDrive.ts` 已有相同函數定義，避免重複（DRY）
2. 未來可能有更多瀏覽器相容性需求（如 Firefox、Safari）
3. 集中管理，易於維護和測試

**替代方案**:
- ❌ 在 `pageMeta.ts` 中重複定義 → 違反 DRY 原則
- ❌ 從 `googleDrive.ts` export → 不符合模組職責單一性（SRP）

**實作**:
```typescript
// src/utils/browser.ts
/**
 * 偵測是否在 Microsoft Edge 瀏覽器中執行
 * @returns {boolean} 若為 Edge 瀏覽器則返回 true
 */
export function isEdgeBrowser(): boolean {
  return typeof navigator !== 'undefined' && navigator.userAgent.includes('Edg/');
}
```

### Decision 2: 在兩個儲存路徑都加入 Edge 主動喚醒邏輯

**選擇**: 在 `WebpagesProvider.tsx` 和 `pageMeta.ts` 都加入 Edge 主動 reload 邏輯

**理由**:
1. **WebpagesProvider.tsx** 是主要問題路徑（拖曳儲存，最常用）
2. **pageMeta.ts** 是共用的 meta 提取邏輯（被兩個路徑使用）
3. 兩處都需要修改，確保完整覆蓋所有場景
4. Edge 無 API 偵測睡眠狀態，無法判斷是否需要喚醒
5. 主動 reload 可確保分頁處於活躍狀態，避免 `executeScript` 卡住

**優先級**:
- ⭐ **高優先級**: `WebpagesProvider.tsx:176-186`（拖曳儲存，最常遇到睡眠分頁）
- 🔧 **中優先級**: `pageMeta.ts:373`（共用邏輯，防禦性修改）
- 📝 **低優先級**: `background.ts:97-100`（右鍵選單，幾乎不會遇到睡眠分頁，僅為一致性）

**替代方案考慮**:

| 方案 | 優點 | 缺點 | 決策 |
|------|------|------|------|
| **A. 主動 reload** | 確保成功，邏輯簡單 | Edge 上多 1-2 秒延遲 | ✅ 採用 |
| B. 先嘗試提取，失敗時 reload | 活躍分頁無延遲 | 複雜度高，需處理逾時 | ❌ 未來優化選項 |
| C. 使用輪詢檢查待提取佇列 | 不影響儲存流程 | 增加背景資源消耗 | ❌ 過度工程 |
| D. 設置 `autoDiscardable: false` | 防止睡眠 | 增加記憶體使用 | ❌ 侵入性太強 |

**實作邏輯 A - WebpagesProvider（主要修改）**:
```typescript
// src/app/webpages/WebpagesProvider.tsx:176-186
const tabInfo = await chrome.tabs.get(tid);

// 🆕 Edge 睡眠分頁或 Chrome discarded 分頁都需要先 reload
if ((tabInfo as any)?.discarded || isEdgeBrowser()) {
  const reason = isEdgeBrowser() ? 'Edge (proactive reload)' : 'Chrome discarded';
  console.log(`[WebpagesProvider] Reloading tab ${tid} - ${reason}`);

  await new Promise<void>((resolve, reject) => {
    chrome.tabs.reload(tid, {}, () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve();
      }
    });
  });
}

// 等待分頁載入完成（reload 後或本來就活躍）
await waitForTabComplete(tid, 8000);
await new Promise(resolve => setTimeout(resolve, 500));
```

**實作邏輯 B - pageMeta（共用邏輯）**:
```typescript
// src/background/pageMeta.ts:373
if ((tabInfo as any).discarded || isEdgeBrowser()) {
  const reason = isEdgeBrowser() ? 'Edge browser' : 'Chrome discarded tab';
  console.log(`[pageMeta] Waking up tab ${tabId} - Reason: ${reason}`);
  await chrome.tabs.reload(tabId, {});
  await waitForTabComplete(tabId, 8000);
}
```

### Decision 3: 保留診斷日誌

**選擇**: 在 Edge 專用路徑加入 console.log，記錄喚醒操作

**理由**:
1. Edge Sleeping Tabs 是已知 bug，未來可能有變化
2. 方便使用者回報問題時提供診斷資訊
3. 開發時可追蹤 Edge 特定邏輯的執行

**實作**:
```typescript
if (isEdgeBrowser()) {
  console.log(`[pageMeta] Edge browser detected, proactive reload for tab ${tabId}`);
}
```

## Risks / Trade-offs

### Risk 1: Edge 上多一次 reload 影響使用者體驗
- **風險**: 使用者儲存分頁時會看到分頁重新載入（1-2 秒）
- **緩解**:
  - Reload 不切換焦點（使用者停留在新分頁）
  - 僅在儲存分頁時觸發（低頻率操作）
  - 與失敗提取 meta（空白卡片）相比，重新載入是可接受的權衡
- **監控**: 收集使用者回饋，評估是否需要更精細的邏輯（方案 B）

### Risk 2: Microsoft 未來可能修改 Sleeping Tabs 行為
- **風險**: Edge 未來可能新增 `tab.sleeping` 屬性或修改 API 行為
- **緩解**:
  - 保留 `tab.discarded` 檢查，與官方行為相容
  - 監控 [Microsoft Edge Extensions Issue #134](https://github.com/microsoft/MicrosoftEdge-Extensions/issues/134)
  - 如有官方解決方案，移除 workaround
- **回滾計畫**: 簡單移除 `|| isEdgeBrowser()` 條件即可

### Trade-off: 簡單性 vs 效能最佳化
- **選擇**: 優先簡單性（方案 A）
- **理由**:
  - 方案 B（先嘗試後 reload）需要處理逾時、Promise 取消等複雜邏輯
  - Edge 上儲存分頁是低頻操作，效能影響不顯著
  - 可作為未來優化方向（若使用者反饋延遲問題）

## Migration Plan

### 實作步驟
1. 建立 `src/utils/browser.ts` 並定義 `isEdgeBrowser()`
2. 重構 `googleDrive.ts` 使用共用函數（確保雲端同步不受影響）
3. 修改 `pageMeta.ts` 的分頁檢查邏輯
4. 在 Chrome 和 Edge 上測試完整流程

### 測試策略
1. **Chrome 測試**:
   - 儲存 discarded 分頁 → 應正常提取 meta
   - 儲存正常分頁 → 不應 reload
2. **Edge 測試**:
   - 儲存睡眠分頁（閒置 2+ 小時）→ 應 reload 並提取 meta
   - 儲存正常分頁 → 會 reload（已知權衡）
   - Google Drive 同步 → 應正常運作（驗證重構未破壞功能）

### 回滾計畫
若發現問題：
1. 簡單回滾：移除 `|| isEdgeBrowser()` 條件
2. 完整回滾：恢復 `googleDrive.ts` 的內部 `isEdgeBrowser()` 定義
3. 刪除 `src/utils/browser.ts`（若無其他使用者）

## Open Questions

### Q1: 是否需要針對 Edge 設定更長的等待時間？
- **現況**: `waitForTabComplete(tabId, 8000)` 設定為 8 秒
- **考慮**: Edge reload 可能比 Chrome 慢？
- **決策**: 先使用相同的 8 秒，根據測試結果調整

### Q2: 未來是否需要支援其他瀏覽器（Firefox、Safari）？
- **現況**: Firefox 使用 WebExtensions API，Safari 有不同限制
- **決策**: 暫不處理，等待實際需求再擴展 `browser.ts` 工具模組

### Q3: 是否在活躍分頁上也執行 reload？
- **考慮**: 可以檢查 `tab.status === 'complete'` 來避免不必要的 reload
- **決策**: 先採用簡單邏輯（一律 reload），若使用者回報延遲問題再優化

## References
- [Microsoft Edge Extensions Issue #134](https://github.com/microsoft/MicrosoftEdge-Extensions/issues/134) - Critical bug in chrome.tabs.sendMessage for Sleeping tabs
- [Edge Sleeping Tabs FAQ](https://techcommunity.microsoft.com/discussions/edgeinsiderannouncements/sleeping-tabs-faq/1705434) - 官方說明文件
- [Chrome Tabs API](https://developer.chrome.com/docs/extensions/reference/api/tabs) - `discarded` 屬性文件
- `src/background/pageMeta.ts:373-391` - 現有的 discarded tabs 處理邏輯
- `src/app/data/cloud/googleDrive.ts:11-13, 75-78` - 現有的 Edge 偵測邏輯
