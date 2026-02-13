# 影響分析 - 右側拖曳修復與 UX 改進

## 改動摘要

### 檔案 1: `src/app/tabs/TabsPanel.tsx`

#### 新增 State

```typescript
// Line 68-69: 拖曳進行中標記（reactive）
const [isDragging, setIsDragging] = useState(false);

// Line 71-72: 追蹤拖曳中的 Group ID（視覺反饋）
const [draggingGroupId, setDraggingGroupId] = useState<number | null>(null);
```

**影響**:
- `isDragging`: 控制所有 DropIndicator 顯示/隱藏（7 處渲染條件）
- `draggingGroupId`: 控制 Group 拖曳時的淡化效果

**風險**:
- 🟡 **中風險**: 如果 state 未正確設定/清除，會導致：
  - DropIndicator 不顯示（isDragging=false 但應該顯示）
  - DropIndicator 殘留（isDragging=true 但應該隱藏）
  - Group 永久淡化（draggingGroupId 未清除）

---

#### 全域清理機制

```typescript
// Line 78-91: dragend 事件監聽（capture phase）
useEffect(() => {
  const cleanup = () => {
    setDropTarget(null);      // 清除插入位置
    setIsDragging(false);      // 清除拖曳標記
    setDraggingGroupId(null);  // 清除 Group 拖曳標記
  };

  window.addEventListener('dragend', cleanup, true);
  return () => window.removeEventListener('dragend', cleanup, true);
}, []);
```

**影響**: 所有拖曳結束場景（正常 drop、ESC 取消、拖到外面、切換視窗等）

**風險**:
- 🟢 **低風險**: dragend 是標準事件，瀏覽器保證觸發
- 🟡 **潛在問題**: 如果拖曳過程中瀏覽器崩潰或強制關閉，state 會殘留（但下次開啟會重置）

**測試重點**:
- ✅ 正常 drop 後 state 清除
- ✅ ESC 取消後 state 清除
- ✅ 拖到外面取消後 state 清除
- ✅ 跨視窗拖曳後 state 清除

---

#### handleDragOver 修改

```typescript
// Line 182: 首次檢測到拖曳時設定 isDragging=true
if (!isDragging) setIsDragging(true);
```

**影響**: 觸發 re-render，使 DropIndicator 可以顯示

**風險**:
- 🟡 **中風險**: 跨區域拖曳延遲問題
  - 從中間 CardGrid 拖到右側時，首次進入右側不會立即觸發 handleDragOver
  - 只有滑鼠移到右側某個 Tab/Group 上才觸發
  - 可能導致首次進入時 DropIndicator 不顯示

**測試重點**:
- ✅ 右側內部拖曳：DropIndicator 立即顯示
- ⚠️ 跨區域拖曳（中間→右側）：首次進入時 DropIndicator 可能延遲顯示

---

#### DropIndicator 渲染條件修改（7 處）

```typescript
// 修改前
{isDropTarget && dropTarget.position === 'top' && <DropIndicator .../>}

// 修改後
{isDragging && isDropTarget && dropTarget.position === 'top' && <DropIndicator .../>}
```

**位置**:
1. Line 434: Group top indicator
2. Line 446: Group bottom indicator
3. Line 479: Group 內 Tab top indicator
4. Line 484: Group 內 Tab bottom indicator
5. Line 503: Loose Tab top indicator
6. Line 508: Loose Tab bottom indicator
7. Line 515: Window background indicator

**影響**: 所有插入位置指示線的顯示邏輯

**風險**:
- 🟡 **中風險**: 如果 `isDragging=false` 但拖曳實際進行中，DropIndicator 不顯示
- 🔴 **高風險場景**: 跨區域拖曳首次進入右側時（見上文 handleDragOver 風險）

**測試重點**:
- ✅ 所有 7 種插入位置的 DropIndicator 都正確顯示
- ✅ 拖曳結束後所有 DropIndicator 消失

---

#### Group 拖曳視覺改進

```typescript
// Line 438: 淡化拖曳中的 Group
className={`... ${draggingGroupId === group.id ? 'opacity-20' : 'opacity-90'}`}

// Line 445-449: 設定/清除 draggingGroupId
onDragStart={(e) => {
  // ...
  setDraggingGroupId(group.id);
}}
onDragEnd={() => {
  setDragGroup(null);
  setDraggingGroupId(null);
}}
```

**影響**: Group 拖曳時的視覺反饋

**風險**:
- 🟢 **低風險**: 純視覺效果，不影響功能
- 🟡 **潛在問題**: 如果 onDragEnd 未觸發（極端情況），Group 會永久淡化

**測試重點**:
- ✅ Group 拖曳時標題淡化（opacity: 0.2）
- ✅ 拖曳結束後恢復正常（opacity: 0.9）

---

### 檔案 2: `src/app/tabs/TabItem.tsx`

#### Tab 拖曳視覺改進

```typescript
// Line 41: 降低拖曳中的透明度（與中間 CardGrid 統一）
// 修改前: opacity-50 ring-1 ring-blue-500
// 修改後: opacity-20
className={`... ${dragging ? 'opacity-20' : ''} ...`}
```

**影響**: Tab 拖曳時的視覺反饋

**風險**:
- 🟢 **低風險**: 純視覺效果，不影響功能
- 🟡 **UX 問題**: opacity: 0.2 可能太淡，用戶難以看到拖曳起點

**測試重點**:
- ✅ Tab 拖曳時淡化（opacity: 0.2）
- ✅ 拖曳結束後恢復正常
- ✅ 用戶仍能看到拖曳起點位置

---

## 📋 完整測試矩陣

### A. 右側內部拖曳（核心功能）

| 場景 | 操作 | 預期結果 | 風險等級 | 測試優先級 |
|------|------|---------|---------|-----------|
| **A1. Tab → Tab (同 Group)** | 拖曳 Group 內 Tab A 到 Tab B 之間 | 順序變為 ...B, A, C... | 🟡 中 | ⭐⭐⭐ 高 |
| **A2. Tab → Tab (跨 Group)** | 拖曳 Group1 的 Tab A 到 Group2 的 Tab B 之間 | Tab A 移至 Group2，順序正確 | 🟡 中 | ⭐⭐⭐ 高 |
| **A3. Tab → Tab (Loose)** | 拖曳 Loose Tab A 到 Loose Tab B 之間 | 順序變為 ...B, A, C... | 🟡 中 | ⭐⭐⭐ 高 |
| **A4. Tab → Group** | 拖曳 Loose Tab 到 Group 內部 | Tab 加入 Group，位置在最後 | 🟡 中 | ⭐⭐⭐ 高 |
| **A5. Group → Group** | 拖曳 Group A 到 Group B 之間 | Group 順序變為 ...B, A, C... | 🟡 中 | ⭐⭐⭐ 高 |
| **A6. Tab → Window 背景** | 拖曳 Tab（任何）到 Window 空白處 | Tab 移至該 Window 尾端，脫離 Group | 🟡 中 | ⭐⭐ 中 |

**檢查點**:
- [ ] DropIndicator 在正確位置顯示（top/bottom/inside）
- [ ] Tab/Group 淡化（opacity: 0.2）
- [ ] 拖曳預覽跟隨滑鼠
- [ ] Drop 後順序正確改變
- [ ] Drop 後 DropIndicator 消失
- [ ] Tab/Group 恢復正常透明度

---

### B. 拖曳取消場景（核心修復）

| 場景 | 操作 | 預期結果 | 風險等級 | 測試優先級 |
|------|------|---------|---------|-----------|
| **B1. ESC 取消** | 拖曳 Tab → 經過其他 Tab（看到插入線）→ 按 ESC | 插入線消失，Tab 回原位，無殘留 | 🟢 低 | ⭐⭐⭐ 高 |
| **B2. 拖到外面取消** | 拖曳 Tab → 拖到右側外（中間/左側）→ 放開 | 右側插入線消失，Tab 回原位，無殘留 | 🟢 低 | ⭐⭐⭐ 高 |
| **B3. 快速連續取消** | 連續拖曳 3 次並每次取消（ESC 或拖到外面） | 無累積殘留，state 乾淨 | 🟢 低 | ⭐⭐ 中 |
| **B4. Group 拖曳取消** | 拖曳 Group → 按 ESC | 插入線消失，Group 標題恢復正常透明度 | 🟢 低 | ⭐⭐ 中 |

**檢查點**:
- [ ] 插入線（DropIndicator）完全消失
- [ ] 無殘留空白卡片
- [ ] Tab/Group 恢復正常透明度（opacity: 1）
- [ ] 順序保持不變
- [ ] Console 無錯誤

**驗證 State 清理**（按 F12 檢查）:
```javascript
// 在 Console 執行（拖曳取消後）
// 應該看到元素沒有 data-dragging 屬性
document.querySelectorAll('[data-dragging="true"]').length  // 應該是 0
```

---

### C. 跨區域拖曳（重要）

| 場景 | 操作 | 預期結果 | 風險等級 | 測試優先級 |
|------|------|---------|---------|-----------|
| **C1. 右側 Tab → 中間** | 拖曳右側 Tab 到中間 CardGrid | 彈出儲存對話框或創建卡片，右側無殘留 | 🟡 中 | ⭐⭐⭐ 高 |
| **C2. 中間卡片 → 中間** | 在中間拖曳卡片 | 順序正確改變，右側完全不受影響 | 🟢 低 | ⭐⭐ 中 |
| **C3. 右側 Tab → 中間（首次進入延遲）** | 從右側拖曳 Tab，首次進入中間區域 | ⚠️ 右側 DropIndicator 可能延遲消失（預期行為） | 🟡 中 | ⭐ 低 |

**檢查點**:
- [ ] 右側拖曳到中間：右側 state 正確清理
- [ ] 中間拖曳：右側完全不受影響（無 state 變化）
- [ ] 跨區拖曳結束後：兩側 state 都正確

---

### D. 視覺反饋（UX 改進）

| 場景 | 檢查項目 | 預期效果 | 風險等級 | 測試優先級 |
|------|---------|---------|---------|-----------|
| **D1. Tab 拖曳視覺** | Tab 拖曳時的透明度 | opacity: 0.2（很淡但可見） | 🟢 低 | ⭐ 低 |
| **D2. Group 拖曳視覺** | Group 拖曳時標題淡化 | opacity: 0.2（很淡但可見） | 🟢 低 | ⭐ 低 |
| **D3. 視覺元素數量** | 拖曳時看到幾個視覺元素 | 2 個（瀏覽器預覽 + 插入線） | 🟢 低 | ⭐ 低 |
| **D4. 與中間一致性** | 比較右側 Tab 和中間卡片拖曳 | 透明度一致（都是 0.2） | 🟢 低 | ⭐ 低 |

**視覺檢查**:
- [ ] 拖曳時原項目幾乎隱藏（opacity: 0.2）
- [ ] 瀏覽器拖曳預覽清晰可見
- [ ] DropIndicator（插入線）清晰可見
- [ ] 無多餘視覺元素（總共 2 個）

---

### E. 邊界情況

| 場景 | 操作 | 預期結果 | 風險等級 | 測試優先級 |
|------|------|---------|---------|-----------|
| **E1. 跨 Window 拖曳** | 拖曳 Window1 的 Tab 到 Window2 | Tab 移至 Window2，兩側 state 正確 | 🟡 中 | ⭐⭐ 中 |
| **E2. 拖曳過程切換視窗** | 拖曳中按 Alt+Tab 切換應用 | 拖曳中斷，state 清除，無殘留 | 🟡 中 | ⭐ 低 |
| **E3. 單 Tab 的 Group** | 拖曳 Group 內唯一的 Tab | 功能正常，Group 可能變空 | 🟢 低 | ⭐ 低 |
| **E4. 空 Window** | 拖曳到沒有 Tab 的 Window 背景 | Tab 成為該 Window 的第一個 Tab | 🟢 低 | ⭐ 低 |
| **E5. 拖曳自己** | 拖曳 Tab A 到自己上方/下方 | 不顯示 DropIndicator（已有保護） | 🟢 低 | ⭐ 低 |

---

### F. State 清理驗證（開發者測試）

| 檢查項目 | 驗證方式 | 預期結果 |
|---------|---------|---------|
| **isDragging 清理** | Console: 拖曳後檢查 React DevTools | `isDragging: false` |
| **draggingGroupId 清理** | Console: Group 拖曳後檢查 | `draggingGroupId: null` |
| **dropTarget 清理** | Console: 拖曳後檢查 | `dropTarget: null` |
| **DOM 清理** | Console: `document.querySelectorAll('[data-dragging="true"]')` | 長度為 0 |

---

## 🎯 測試優先級建議

### 第一輪（核心功能，15 分鐘）

**必測場景**（失敗即阻斷）:
1. ⭐⭐⭐ **A1-A5**: 右側內部拖曳（5 項）
2. ⭐⭐⭐ **B1-B2**: ESC 取消 + 拖到外面取消（2 項）
3. ⭐⭐⭐ **C1**: 右側 Tab → 中間（1 項）

**判定標準**:
- ✅ 全部通過 → 進入第二輪
- ❌ 任一失敗 → 立即停止，回報問題

---

### 第二輪（邊界情況，10 分鐘）

**重要場景**:
1. ⭐⭐ **A6**: Tab → Window 背景
2. ⭐⭐ **B3-B4**: 快速連續取消 + Group 取消
3. ⭐⭐ **C2**: 中間卡片拖曳不受影響
4. ⭐⭐ **E1**: 跨 Window 拖曳

**判定標準**:
- ✅ 全部通過 → 進入第三輪
- ❌ 有失敗 → 記錄但不阻斷（可後續修復）

---

### 第三輪（視覺與邊界，5 分鐘）

**可選場景**:
1. ⭐ **D1-D4**: 視覺反饋檢查
2. ⭐ **E2-E5**: 極端邊界情況

---

## 📊 風險矩陣

| 風險等級 | 場景數量 | 測試優先級 | 影響範圍 |
|---------|---------|-----------|---------|
| 🔴 **高風險** | 0 | - | - |
| 🟡 **中風險** | 14 | ⭐⭐⭐ / ⭐⭐ | 核心功能 + 跨區域 |
| 🟢 **低風險** | 11 | ⭐ | 視覺反饋 + 邊界 |

---

## 🚨 已知潛在問題

### 1. 跨區域拖曳首次進入延遲

**場景**: 從中間 CardGrid 拖曳卡片，首次進入右側時

**問題**:
- `isDragging` 在 `handleDragOver` 時才設為 true
- 首次進入右側但未觸發 handleDragOver（滑鼠在空白處）
- DropIndicator 不會顯示，直到滑鼠移到某個 Tab/Group 上

**影響**: 🟡 中等（UX 略差，但不影響功能）

**解決方案**（如需要）:
- 在 TabsPanel 最外層 `onDragEnter` 時就設 `isDragging=true`
- 或監聽 dragContext 的變化（需改為 React Context）

---

### 2. opacity: 0.2 可能太淡

**場景**: Tab/Group 拖曳時

**問題**:
- 原項目淡化至 opacity: 0.2
- 用戶可能難以看到拖曳起點

**影響**: 🟢 低（純 UX，不影響功能）

**解決方案**（如需要）:
- 調整為 opacity: 0.3 或 0.4
- 或保留原版 opacity: 0.5

---

## ✅ 測試完成檢查表

### 基本功能
- [ ] 所有拖曳操作正常（A1-A6）
- [ ] 拖曳取消無殘留（B1-B4）
- [ ] 跨區域不干擾（C1-C2）

### 視覺效果
- [ ] Tab 拖曳淡化（D1）
- [ ] Group 拖曳淡化（D2）
- [ ] 視覺元素簡化（D3）

### 邊界情況
- [ ] 跨 Window 正常（E1）
- [ ] 極端情況處理（E2-E5）

### State 清理
- [ ] isDragging 正確清理
- [ ] draggingGroupId 正確清理
- [ ] dropTarget 正確清理

### Console 檢查
- [ ] 無紅色錯誤
- [ ] 無異常警告

---

**測試負責人**: _______________
**測試日期**: _______________
**Build 版本**: fix-tabs-panel-drop-indicator-cleanup (已移除 pointer-events-none)
