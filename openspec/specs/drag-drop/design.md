# Design: Drag and Drop

## Context
拖放操作是 LinkTrove 的核心 UX 功能，使用者期望：
- **直覺操作**：拖動卡片即可重新排序
- **即時反饋**：視覺反饋流暢，無延遲
- **跨群組移動**：可將卡片拖到不同群組
- **順序持久化**：拖放後立即儲存，重新載入後順序不變

**約束條件**：
- React 18 環境
- 需支援桌面滑鼠和觸控裝置
- 大量卡片（100+）時仍需流暢
- 符合「Simplicity First」原則（避免過度工程）

## Goals / Non-Goals

### Goals
- ✅ 流暢的拖放體驗（>30 FPS）
- ✅ 支援同群組排序和跨群組移動
- ✅ 即時持久化到 IndexedDB
- ✅ 觸控裝置相容
- ✅ 清楚的視覺反饋

### Non-Goals
- ❌ 支援拖放到外部應用程式（如檔案總管）
- ❌ 複雜的拖放動畫（保持簡單）
- ❌ 多選拖放（第一版不實作，未來可加）
- ❌ 自訂拖放手柄（整張卡片都可拖動）

## Technical Decisions

### Decision 1: 使用 @dnd-kit 而非原生 HTML5 Drag & Drop
**選擇**: 使用 `@dnd-kit/core` + `@dnd-kit/sortable` 實作拖放功能

**理由**：
1. **觸控支援**：原生 HTML5 Drag & Drop API 不支援觸控裝置
2. **靈活性**：`@dnd-kit` 提供完整的 hooks API，易於客製化
3. **效能**：使用 CSS transforms 實作動畫，效能優於操作 DOM
4. **社群支援**：活躍維護，與 React 18 相容良好

**替代方案考量**：
- ❌ **原生 HTML5 Drag & Drop**：不支援觸控，瀏覽器行為不一致
- ❌ **react-beautiful-dnd**：已停止維護，不支援 React 18 StrictMode
- ❌ **react-dnd**：過於複雜，學習曲線陡峭
- ❌ **自行實作**：需處理大量邊界情況，違反「Simplicity First」

**Trade-offs**：
- 優點：穩定、效能好、社群大
- 優點：完整的 TypeScript 支援
- 缺點：引入外部依賴（~50KB gzipped）
- 缺點：需學習 @dnd-kit 的 API

**安裝**：
```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

---

### Decision 2: 順序管理策略
**選擇**: 使用 `orders.subcategories: Record<groupId, string[]>` 集中管理順序

**理由**：
1. **一致性**：與 bookmark-management capability 的順序機制一致
2. **查詢效率**：一次讀取即可獲得完整順序資訊
3. **原子性更新**：拖放時只需更新單一或兩個順序陣列

**實作邏輯**：
```typescript
// 同群組排序
function handleSortWithinGroup(groupId: string, oldIndex: number, newIndex: number) {
  const order = orders.subcategories[groupId] || [];
  const newOrder = arrayMove(order, oldIndex, newIndex);

  // 立即更新 state（樂觀更新）
  setOrders({
    ...orders,
    subcategories: {
      ...orders.subcategories,
      [groupId]: newOrder
    }
  });

  // 異步寫入 IndexedDB
  debouncedSaveOrder(groupId, newOrder);
}

// 跨群組移動
function handleMoveToAnotherGroup(
  sourceGroupId: string,
  targetGroupId: string,
  cardId: string,
  targetIndex: number
) {
  const sourceOrder = orders.subcategories[sourceGroupId] || [];
  const targetOrder = orders.subcategories[targetGroupId] || [];

  // 從來源群組移除
  const newSourceOrder = sourceOrder.filter(id => id !== cardId);

  // 插入到目標群組
  const newTargetOrder = [
    ...targetOrder.slice(0, targetIndex),
    cardId,
    ...targetOrder.slice(targetIndex)
  ];

  // 更新兩個群組的順序
  setOrders({
    ...orders,
    subcategories: {
      ...orders.subcategories,
      [sourceGroupId]: newSourceOrder,
      [targetGroupId]: newTargetOrder
    }
  });

  // 更新卡片的歸屬資訊
  updateWebpage(cardId, {
    subcategoryId: targetGroupId,
    category: targetCategoryId
  });

  // 寫入 IndexedDB
  saveOrders(sourceGroupId, newSourceOrder, targetGroupId, newTargetOrder);
}
```

**替代方案考量**：
- ❌ **卡片自帶 order 欄位**：跨群組移動時需更新多張卡片，容易產生競態條件
- ❌ **Linked List**：查詢整個列表需要 O(n) 操作

---

### Decision 3: 樂觀更新 + Debounced 持久化
**選擇**: UI 立即更新（樂觀更新），IndexedDB 寫入延遲 300ms（debounce）

**理由**：
1. **流暢體驗**：使用者不需等待資料庫寫入
2. **減少寫入次數**：連續拖放合併為一次寫入
3. **效能優化**：避免頻繁的 IndexedDB 交易

**實作**：
```typescript
import { debounce } from 'lodash-es';

// Debounced 寫入函式（300ms 延遲）
const debouncedSaveOrder = debounce(
  async (groupId: string, order: string[]) => {
    try {
      await gcService.updateOrders(groupId, order);
    } catch (error) {
      console.error('Failed to save order:', error);
      // 顯示錯誤訊息給使用者
      showError('順序儲存失敗，請重試');
      // 回滾 UI 狀態
      revertOrder(groupId);
    }
  },
  300
);
```

**錯誤處理**：
- 若 IndexedDB 寫入失敗，顯示錯誤訊息
- 提供「重試」按鈕
- 回滾 UI 狀態到寫入前的順序

**Trade-offs**：
- 優點：使用者體驗流暢
- 優點：減少資料庫負載
- 缺點：300ms 內若分頁關閉，變更可能遺失
- 緩解：可選擇立即寫入模式（設定選項）

---

### Decision 4: @dnd-kit 整合方式
**選擇**: 使用 `SortableContext` 包裹卡片列表，`useSortable` hook 處理單張卡片

**架構**：
```tsx
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// 群組組件
function GroupView({ group, webpages }: Props) {
  const webpageIds = orders.subcategories[group.id] || webpages.map(w => w.id);

  return (
    <DndContext
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={webpageIds}
        strategy={verticalListSortingStrategy}
      >
        {webpageIds.map(id => {
          const webpage = webpagesMap[id];
          return <WebpageCard key={id} webpage={webpage} />;
        })}
      </SortableContext>
    </DndContext>
  );
}

// 卡片組件
function WebpageCard({ webpage }: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: webpage.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {/* 卡片內容 */}
    </div>
  );
}
```

**事件處理**：
```typescript
function handleDragEnd(event: DragEndEvent) {
  const { active, over } = event;

  if (!over || active.id === over.id) return;

  const activeGroupId = findGroupId(active.id);
  const overGroupId = findGroupId(over.id);

  if (activeGroupId === overGroupId) {
    // 同群組排序
    handleSortWithinGroup(activeGroupId, active.id, over.id);
  } else {
    // 跨群組移動
    handleMoveToAnotherGroup(activeGroupId, overGroupId, active.id);
  }
}
```

---

### Decision 5: 視覺反饋設計
**選擇**: 簡約的視覺反饋，避免過度動畫

**視覺元素**：
1. **拖動中的卡片**：`opacity: 0.5`，保持原位置（ghost）
2. **插入指示線**：藍色虛線（2px），顯示在目標位置
3. **拖放目標高亮**：群組背景變為淺藍色（`background: rgba(59, 130, 246, 0.1)`）
4. **禁止游標**：拖到無效區域時顯示 `cursor: not-allowed`

**CSS 實作**：
```css
/* 拖動中的卡片 */
.card-dragging {
  opacity: 0.5;
  cursor: grabbing;
}

/* 插入指示線 */
.drop-indicator {
  height: 2px;
  background: #3b82f6;
  border-radius: 1px;
  margin: 4px 0;
}

/* 拖放目標高亮 */
.group-drop-target {
  background: rgba(59, 130, 246, 0.1);
  border: 2px dashed #3b82f6;
  transition: background 0.2s ease;
}
```

**動畫**：
- 使用 CSS transitions（簡單淡入淡出）
- 避免複雜的彈跳動畫（保持簡潔）

---

## Performance Considerations

### 大量卡片優化
**問題**: 100+ 張卡片時拖放卡頓

**解決方案**：
1. **虛擬化滾動**（未來優化）：
   - 使用 `react-window` 只渲染可見卡片
   - @dnd-kit 支援虛擬化滾動（需額外配置）

2. **減少重新渲染**：
   ```tsx
   const WebpageCard = React.memo(({ webpage }: Props) => {
     // ... 卡片內容
   }, (prev, next) => {
     // 只在 webpage 內容改變時重新渲染
     return prev.webpage.id === next.webpage.id &&
            prev.webpage.title === next.webpage.title;
   });
   ```

3. **使用 CSS transforms**：
   - @dnd-kit 預設使用 `transform: translate()` 而非修改 `top/left`
   - GPU 加速，效能更好

### IndexedDB 寫入優化
**問題**: 頻繁拖放導致大量資料庫寫入

**解決方案**：
1. **Debounce**：延遲 300ms 寫入，合併連續操作
2. **批次更新**：跨群組移動時使用單一交易更新兩個群組
3. **錯誤重試**：寫入失敗時自動重試（最多 3 次）

```typescript
async function saveOrders(
  sourceGroupId: string,
  sourceOrder: string[],
  targetGroupId?: string,
  targetOrder?: string[]
) {
  const db = await openIndexedDB();
  const tx = db.transaction('meta', 'readwrite');

  try {
    const metaStore = tx.objectStore('meta');
    const ordersData = await metaStore.get('orders');

    const newOrders = {
      ...ordersData.value,
      subcategories: {
        ...ordersData.value.subcategories,
        [sourceGroupId]: sourceOrder,
        ...(targetGroupId && { [targetGroupId]: targetOrder })
      }
    };

    await metaStore.put({ key: 'orders', value: newOrders });
    await tx.complete;
  } catch (error) {
    tx.abort();
    throw error;
  }
}
```

---

## Touch Support Strategy

### 觸控裝置偵測
```typescript
import { PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';

function GroupView() {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8  // 移動 8px 後才開始拖動（避免誤觸）
      }
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,  // 長按 250ms 後開始拖動
        tolerance: 5  // 允許 5px 容差
      }
    })
  );

  return (
    <DndContext sensors={sensors}>
      {/* ... */}
    </DndContext>
  );
}
```

### 自動滾動
**問題**: 觸控拖動時無法滾動頁面

**解決方案**: @dnd-kit 的 `AutoScroller` 組件
```tsx
import { AutoScroller } from '@dnd-kit/core';

<DndContext>
  <AutoScroller>
    {/* 當拖動到邊緣時自動滾動 */}
  </AutoScroller>
</DndContext>
```

---

## Undo/Redo Strategy (未來功能)

### 設計草案
```typescript
interface DragAction {
  type: 'move' | 'sort';
  cardId: string;
  fromGroupId: string;
  toGroupId: string;
  oldIndex: number;
  newIndex: number;
  timestamp: number;
}

class UndoManager {
  private history: DragAction[] = [];
  private maxHistory = 5;  // 最多保留 5 次操作

  push(action: DragAction) {
    this.history.push(action);
    if (this.history.length > this.maxHistory) {
      this.history.shift();  // 移除最舊的操作
    }
  }

  undo(): DragAction | null {
    return this.history.pop() || null;
  }
}

// 使用
const undoManager = new UndoManager();

function handleDragEnd(event: DragEndEvent) {
  // ... 執行拖放邏輯

  // 記錄操作到 undo history
  undoManager.push({
    type: 'sort',
    cardId: active.id,
    fromGroupId: groupId,
    toGroupId: groupId,
    oldIndex,
    newIndex,
    timestamp: Date.now()
  });
}

function handleUndo() {
  const action = undoManager.undo();
  if (!action) return;

  // 回滾操作
  if (action.type === 'sort') {
    handleSortWithinGroup(action.fromGroupId, action.newIndex, action.oldIndex);
  } else if (action.type === 'move') {
    handleMoveToAnotherGroup(action.toGroupId, action.fromGroupId, action.cardId);
  }
}
```

---

## Testing Strategy

### 單元測試
```typescript
describe('Drag and Drop', () => {
  it('should reorder cards within group', () => {
    const initialOrder = ['card1', 'card2', 'card3'];
    const result = handleSort(initialOrder, 0, 2);
    expect(result).toEqual(['card2', 'card3', 'card1']);
  });

  it('should move card to another group', () => {
    const sourceOrder = ['cardA', 'cardB'];
    const targetOrder = ['card1', 'card2'];

    const { newSource, newTarget } = handleMove(
      sourceOrder,
      targetOrder,
      'cardA',
      1
    );

    expect(newSource).toEqual(['cardB']);
    expect(newTarget).toEqual(['card1', 'cardA', 'card2']);
  });
});
```

### 整合測試
測試檔案：`src/app/__tests__/drag_integration.test.tsx`

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { DndContext } from '@dnd-kit/core';

describe('Drag Integration', () => {
  it('should persist order after drag', async () => {
    render(<GroupView group={mockGroup} />);

    const card1 = screen.getByTestId('card-1');
    const card3 = screen.getByTestId('card-3');

    // 模擬拖放
    fireEvent.dragStart(card1);
    fireEvent.dragOver(card3);
    fireEvent.drop(card3);

    // 驗證順序更新
    await waitFor(() => {
      expect(mockSaveOrder).toHaveBeenCalledWith('group-id', ['card2', 'card3', 'card1']);
    });
  });
});
```

### 手動測試清單
- [ ] 同群組內拖放排序
- [ ] 跨群組拖放移動
- [ ] 拖到無效區域時取消
- [ ] 觸控裝置長按拖動
- [ ] 拖放 100+ 張卡片的群組（效能測試）
- [ ] 快速連續拖放（debounce 測試）
- [ ] 離線拖放（IndexedDB 持久化測試）

---

## Migration Path

### 從無拖放功能 → 完整拖放系統
1. ✅ 安裝 @dnd-kit 依賴
2. ✅ 實作同群組排序
3. ✅ 實作跨群組移動
4. ✅ 整合 IndexedDB 持久化
5. ✅ 新增視覺反饋（插入線、高亮）
6. 🔄 觸控裝置支援（進行中）
7. 📋 撤銷/重做功能（計畫中）
8. 📋 多選拖放（計畫中）

---

## Known Issues & Limitations

### 目前限制
1. **不支援多選拖放**：第一版只能單張卡片拖動
2. **虛擬化未實作**：100+ 卡片時可能略微卡頓
3. **撤銷功能未實作**：誤操作無法撤銷

### 已知問題
- **Safari 觸控支援**：部分 iOS Safari 版本長按會觸發右鍵選單（需禁用）
- **拖放過快時順序錯亂**：極端快速拖放可能觸發競態條件（debounce 緩解）

---

## References
- **需求規格**: `spec.md`
- **@dnd-kit 文檔**: https://docs.dndkit.com/
- **實作位置**:
  - `src/app/groups/GroupsView.tsx` - 主要拖放邏輯
  - `src/app/webpages/WebpageCard.tsx` - 可拖動卡片組件
- **測試案例**: `src/app/__tests__/drag_integration.test.tsx`
- **相關文檔**: `/docs/features/drag-drop-storage-display.md`
