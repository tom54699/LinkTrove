# 實作記錄：修復垂直拖曳 Ghost 位置判斷

## 時間軸

**2026-02-06**
- 10:05 - 建立 OpenSpec 提案
- 10:21 - 建立實作任務清單
- 17:26 - 完成第一階段實作（6fa9c32）
- 18:00 - 完成第二階段實作（330749a）

---

## 問題分析

### 原始問題
垂直拖曳時 ghost 位置判斷錯誤：
- 滑鼠進入行間區域時，ghost 直接跳到目標行的**最左側**
- 不考慮滑鼠的 X 座標位置
- 導致使用者體驗不一致（左右拖曳正常，上下拖曳異常）

### 根本原因
`computeGhostIndex` 函數中存在 `betweenRows` 特殊處理邏輯，強制將 ghost 放在行首。

---

## 實作方案演進

### 原始計畫（OpenSpec 提案）
**方法：** 簡單移除 `betweenRows` 特殊處理
**預期：** 統一使用 X 座標判斷邏輯

### 實際發現
問題比預期複雜，簡單移除後發現：
1. **跨行判斷不準確**：使用 index 範圍判斷容易誤判
2. **newIndex 語義模糊**：相同的 index 在不同方向有不同含義
3. **敏感度不平衡**：統一的 buffer 導致左右拖曳手感不一致

---

## 第一階段實作 (6fa9c32)

### Commit 訊息
```
wip(drag-drop): 改進垂直拖曳 ghost 位置判斷邏輯
```

### 主要改動

#### 1. 新增 Y 座標追蹤
```typescript
const dragStartYRef = React.useRef<number | null>(null);

// onDragStart
const cardCenterY = rect.top + rect.height / 2;
dragStartYRef.current = cardCenterY;
```

#### 2. 改用 Y 座標差異判斷跨行
```typescript
let isCrossingRows = false;
if (dragStartYRef.current !== null && row.length > 0) {
  const targetRowY = row[0].centerY;
  const yDiff = Math.abs(targetRowY - dragStartYRef.current);
  isCrossingRows = yDiff > 25;  // 25px 閾值
}
```

#### 3. 實作容差機制
```typescript
const TOLERANCE = isCrossingRows ? 50 : 0;

// 跨行時：50px 容差，找最接近的卡片
if (isCrossingRows && TOLERANCE > 0) {
  let closestCard = row[0];
  let minDist = Math.abs(refX - row[0].centerX);

  for (let i = 1; i < row.length; i++) {
    const dist = Math.abs(refX - row[i].centerX);
    if (dist < minDist) {
      minDist = dist;
      closestCard = row[i];
    }
  }

  if (minDist <= TOLERANCE) {
    newIndex = closestCard.idx;
    inserted = true;
  }
}
```

#### 4. 調整 Hysteresis buffer
```typescript
const buffer = 15;  // 從 20 降到 15
```

### 測試結果
- ✅ **垂直上移**：運作順利，ghost 位置正確
- ❌ **垂直下移**：ghost 偏右一格
  - 例：第三行第三張 → 預期第四行第三張，實際第四行第四張

### 問題分析
**newIndex 語義不一致：**
- 當 `closestCard.idx = 9`（第三張，posInRow=2）
- 返回 `newIndex = 9` 應該插入到第三個位置
- 但實際渲染在第四個位置（偏右一格）

**原因：** `newIndex` 在不同方向有不同的插入語義
- 往上：插入到該位置（替換）
- 往下：插入到該位置之後（新增）

---

## 第二階段實作 (330749a)

### Commit 訊息
```
fix(drag-drop): 修正垂直拖曳 ghost 位置偏移與水平拖曳敏感度
```

### 主要改動

#### 1. 新增方向判斷
```typescript
let isDraggingDown = false;
if (dragStartYRef.current !== null && row.length > 0) {
  const targetRowY = row[0].centerY;
  const yDiff = targetRowY - dragStartYRef.current;  // 移除 Math.abs
  isCrossingRows = Math.abs(yDiff) > 25;
  isDraggingDown = yDiff > 0;  // 正值 = 往下
}
```

#### 2. 方向相關的 newIndex 計算
```typescript
if (minDist <= TOLERANCE) {
  const posInRow = row.findIndex(c => c.idx === closestCard.idx);

  if (isDraggingDown) {
    // 往下：返回後一張的 idx
    if (posInRow < row.length - 1) {
      const nextCard = row[posInRow + 1];
      newIndex = nextCard.idx;
    } else {
      newIndex = closestCard.idx + 1;
    }
  } else {
    // 往上：返回當前卡片的 idx
    newIndex = closestCard.idx;
  }

  inserted = true;
}
```

**邏輯說明：**
- 往上拖曳：直接插入到最接近的卡片位置（替換語義）
- 往下拖曳：插入到最接近卡片的**下一張**（偏移修正）

#### 3. 不對稱 Hysteresis buffer
```typescript
const bufferRight = 20;  // 往右：較大 buffer（降低敏感度）
const bufferLeft = 10;   // 往左：較小 buffer（增加敏感度）

if (card1 && newIndex > currentIndex) {
  // 向右移動
  if (refX < card1.centerX + bufferRight) {
    return currentIndex;
  }
} else if (card2 && newIndex < currentIndex) {
  // 向左移動
  if (refX > card2.centerX - bufferLeft) {
    return currentIndex;
  }
}
```

**原因：** 使用者反饋「往右很敏感，往左不敏感」

#### 4. 詳細除錯日誌
新增大量 `console.log` 以便追蹤拖曳行為：
- 跨行判斷
- X 座標計算
- 最接近卡片查找
- 方向調整
- Hysteresis 檢查

### 測試結果
- ✅ **垂直上移**：正常
- ✅ **垂直下移**：修正完成，ghost 位置正確
- ⏳ **水平左右拖曳**：需使用者測試敏感度是否平衡

---

## 技術細節

### 關鍵參數

| 參數 | 值 | 用途 |
|------|-----|------|
| `Y_THRESHOLD` | 25px | 判斷是否跨行 |
| `TOLERANCE` | 50px | 跨行時的容差範圍 |
| `bufferRight` | 20px | 右移 Hysteresis |
| `bufferLeft` | 10px | 左移 Hysteresis |

### 拖曳流程

```
onDragStart
  ↓
記錄 dragStartX, dragStartY, grabOffsetX
  ↓
onDragMove
  ↓
computeGhostIndex
  ↓
判斷跨行？(yDiff > 25px)
  ├─ YES → 跨行模式
  │    ↓
  │  找最接近卡片 (50px 容差)
  │    ↓
  │  判斷方向 (isDraggingDown)
  │    ├─ 往上 → closestCard.idx
  │    └─ 往下 → nextCard.idx
  │
  └─ NO → 同行模式
       ↓
     比較 X 座標
       ↓
     應用 Hysteresis (不對稱 buffer)
       ↓
     返回 newIndex
```

---

## 結論

### 最終方案
不是簡單的「移除特殊處理」，而是實作了更複雜的：
1. **Y 座標判斷** - 準確識別跨行
2. **方向感知** - 根據往上/往下調整 newIndex
3. **容差機制** - 跨行時寬容對齊，同行時精確跟隨
4. **不對稱 buffer** - 左右移動各自調整敏感度

### 改動規模
- **第一階段**: +81 行, -23 行
- **第二階段**: +65 行, -8 行
- **總計**: 新增 146 行邏輯

### 待完成工作
- [ ] 使用者測試四個方向的拖曳手感
- [ ] 根據測試結果微調 buffer 參數
- [ ] 移除除錯 console.log
- [ ] 更新 SESSION_HANDOFF.md

### 學習
1. **不要低估問題複雜度** - 看似簡單的「移除邏輯」實際需要精細的方向判斷
2. **方向很重要** - 往上和往下的插入語義不同，需要分別處理
3. **使用者反饋至關重要** - 敏感度問題只有實際測試才能發現
4. **詳細日誌幫助除錯** - console.log 是追蹤複雜邏輯的利器
