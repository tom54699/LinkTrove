# Toby 卡片拖曳排序邏輯參考（toby.bundle.js）

> 用途：整理 Toby（toby.bundle.js）卡片拖曳手感與排序邏輯，提供未來 AI/工程實作「類 Toby 卡片拖曳」的參考依據
> 來源：`/Users/myaninnovation/Documents/LinkTrove/toby.bundle.js`（反編譯/壓縮版）
> 狀態：僅作參考，請勿視為原始碼授權或可直接重用

**⚠️ 重要提醒：**
- 本文檔提到的所有函式名稱（如 `ZPe`, `hu`, `iOe`, `sd` 等）都是**壓縮後的變數名稱**，原始程式碼的命名可能完全不同
- 這些名稱僅作為「參考標記」使用，請以**行為邏輯**而非**名稱**對照實作
- 文檔中的策略名稱（如 `rectIntersection`, `closestCenter`）是對**行為特徵的描述**，而非實際的函式名稱

---

## 1. 高層結構概覽

Toby 的拖曳以 dnd-kit 為核心，實際流程如下：

1. Pointer/Keyboard 感應器啟動拖曳
2. Collision Detection 判斷「卡片吸附到哪」
3. Sortable Context + Strategy 控制其他卡片位移與空位
4. onDragOver 先做 optimistic reorder（即時 UI 反應）
5. onDragEnd 以 position + Delta 寫回持久化排序

---

## 2. ID 前綴與拖曳類型

`toby.bundle.js` 有明確前綴用於區分 DnD 類型：

- `Cc = "CARDID-"` 卡片
- `Pc = "LISTID-"` 清單
- `Tc = "LISTS_SECTION"` 清單區域
- `Ic = "LISTS_SECTION_GRID-"` 清單區域（Grid 列）
- `Ac = "TAB_DND_TYPE"` Tab 拖曳
- `Dc = "TABID-"` Tab ID
- `Mc = "SPACE_DND_TYPE"` Space
- `Lc = "SPACEID-"` Space ID
- `Rc = "MY_COLLECTIONS-"` 收藏區
- `Fc = "SPACES_SECTION"` Space 區域
- `Bc = "OPEN_TABS_SECTION"` Open Tabs 區域
- `jc = "OPEN_TABS_DND_SECTION_TYPE"` Open Tabs DnD 類型
- `zc = "OPEN_TABS_SECTION_SEPARATOR-"` Open Tabs 分隔
- `Nc = "ORG_ID_SEPARATOR-"` Org
- `Uc = "NEXT_ID_SEPARATOR-"` / `Vc = "NEXT_SORTABLE_CONTAINER-"` Next 邏輯
- `Gc = "TAB_GHOST_ID_SEPARATOR-"` Ghost 卡片
- `qc = "TAB_GROUP_DND_TYPE-SEPARATOR-"` / `$c = "TAB_GROUP_DND_TYPE"` Tab Group

常用 decode：

- `iu(e)` 移除 `CARDID-`
- `au(e)` 移除 `LISTID-`
- `su(e)` 移除 `TABID-` 後轉 `Number(...)`
- `lu(e)` 移除 `SPACEID-`
- `cu(e)` 移除 `OPEN_TABS_SECTION_SEPARATOR-`
- `fu(...)` 解析 containerId，依前綴回傳真實 id

---

## 3. DnD Context 與啟動手感

DndContext 建立於 `ZPe`：

- Sensors 為自訂 PointerSensor + KeyboardSensor
- Activation Constraint 使用 `{ distance: 5 }`
- PointerSensor 額外排除 `input` 元素，以免輸入時被拖走
- DragOverlay 使用 portal 到 `document.body`
- dropAnimation 為 `{ duration: 250, easing: "ease", dragSourceOpacity: 0.5 }`

建議仿真參數：

- `activationConstraint.distance = 5`
- `dropAnimation` 同上
- DragOverlay `zIndex` 高於所有 UI（Toby 用 `1e5`）

---

## 4. Collision Detection（吸附邏輯）

Toby 的 collision detection 是自訂函式 `hu(e)`，會依拖曳類型切換策略。

> **📌 重要說明：** Toby 使用**自訂的 collision detection 實作**，並非直接使用 dnd-kit 的標準策略函式。以下提到的 `rectIntersection` / `closestCenter` / `pointerWithin` 等名稱，僅用於描述其**行為特徵**，而非實際的函式名稱。實際實作中可能使用完全不同的演算法來達成類似效果。

### 4.1 拖卡片（`Cc`）

流程摘要：

1. 先過濾 droppable containers，剔除 `LISTS_SECTION` / `TABID-` 等無關容器
2. 優先使用 `ul`
3. `ul` 以「交疊面積比例」排序（**行為類似** rectIntersection 的效果）
4. 若 `ul` 無結果，fallback 到「距離最近」
5. 距離計算使用 `rl(ll(...), ...)`，**行為類似** closestCenter 的效果

手感影響：

- 交疊優先會讓卡片「靠近時就吸住」
- 距離 fallback 讓空隙也能吸附，避免拖曳失焦

### 4.2 拖清單（`Pc`）

改用 `pl`：

- `pl` **行為類似** pointerWithin
- 指標進入容器 rect 即可被視為碰撞候選

---

## 5. Sortable Context 與位移策略

卡片列表使用 `SortableContext`（`ud`）包覆。

### 5.1 items 來源

- `items = V`
- `V` 來源於 `cards` 清單
- 一般卡片會轉成 `Yc(id)`（`CARDID-` 前綴）
- ghost 卡片保留 `Gc` 前綴（`TAB_GHOST_ID_SEPARATOR-`）

### 5.2 Strategy

- List View 使用 `sd`（垂直列表位移策略）
- Grid View 使用 `() => null`（不做 transform）

### 5.3 `sd` 行為

- `sd` 根據 `activeIndex` / `overIndex` 計算卡片位移
- 被拖動卡片只產生 y 位移
- 其他卡片依 over 位置產生上下偏移
- 效果是拖動時卡片會「被推開」形成空位

這是 Toby 列表拖曳時最主要的視覺手感來源。

---

## 6. Ghost 卡片插入邏輯（Tab → List）

Ghost 卡片只在「拖 Tab 進清單」時出現。

### 6.1 產生 ghost id

- `Gc = "TAB_GHOST_ID_SEPARATOR-"`
- `Jc(tabId)` 會將 tabId 轉成 ghost id

### 6.2 判斷 ghost 是否已存在

- `wN(active, over, listsLookup)`：確認 ghost 是否已存在於目標 list
- `xN(active, over, listsLookup)`：取回 ghost 對應的 card

### 6.3 插入 ghost（`EN(activeDnd, over, listsLookup)`）

邏輯概要：

1. 只在 activeDnd 有 `dragOverlay` 時執行
2. 依 `over` 判斷插入位置
3. 透過 `SN` 轉成 Card 物件
4. 位置以 `qu({ higherPos, lowerPos })` 計算

插入位置判斷：

- over 是卡片 → 插入到該卡位置
- over 是清單容器 → 插入到末尾

### 6.4 Ghost card 在 UI 上的樣式

- `isOverlay` 判斷：`id.includes(Gc)`
- `Roe` 會對 ghost 卡片套用 `opacity: 0.5`

---

## 7. 拖曳中排序（optimistic reorder）

### 7.1 `CN(active, over, listsLookup)`：卡片拖到卡片

- 找來源清單 `u` 與目標清單 `f`
- 若跨清單：先從來源移除
- 依 over index 插入
- 使用 `td`（類似 arrayMove）調整陣列順序
- 依 `qu({ higherPos, lowerPos })` 計算新 position

### 7.2 `ON(active, over, listsLookup)`：卡片拖到清單容器

- 若拖到同一清單 → 不變
- 否則移除來源卡片並 append 到目標清單尾端
- position = `last.position + 100` 或預設 `100`

### 7.3 `qu({ higherPos, lowerPos })` 位置公式

- `higherPos` 與 `lowerPos` 都有 → `(higherPos + lowerPos) / 2`
- 只有 `higherPos` → `higherPos / 2`
- 只有 `lowerPos` → `lowerPos + Pu`
- 都沒有 → `Pu`

這是典型「稀疏位置」策略，避免每次重新排序整列。

---

## 8. 拖曳結束排序（持久化）

`onDragEnd` 會呼叫 `ej.card.reorder.useMutation()`。

### 8.1 單一卡片

流程：

1. 從更新後的 state 找到移動卡片 `b`
2. 透過 `Yu` 取得上下鄰居
3. 以 `$u({ currPosition, higher, lower })` 計算 `Delta`
4. 組成 payload

Payload 形態：

- `ObjectID: [cardId]`
- `ObjectOrder: [newPosition]`
- `Delta: computed`
- `destGroupID: listId`

特殊情況：

- 若 `position === 0`，會額外取下一張卡位置，調整 `ObjectID/ObjectOrder/Delta` 避免 0 位置造成排序不穩

### 8.2 多選卡片

若使用多選（`selectedEntities`）：

- 先取得清單最後位置 `IN(list)`
- 依序插入：`last + 100 * index`
- `Delta = 100`

此策略等於「把選取卡片批次移到尾端」。

> **補充：** toby.bundle.js 中也大量使用 `batch` 相關的實作來處理批次操作，多選功能可能同時涉及 `selectedEntities` 狀態管理與 `batch` API 呼叫。

---

## 9. Drag Overlay 視覺與疊影

DragOverlay 由 `iOe` 產生：

- 單一卡片：直接渲染 `_he`（Card component）
- 多選卡片：疊影 + 「+N」數字泡泡
- 多選清單 / 多選 Tab 也有相同疊影處理

Overlay 使用 `wc`：

- `dragSourceOpacity = 0.5`
- `transform` 由 dnd-kit 內部運算
- `transition` 為 250ms ease

---

## 10. 卡片 Wrapper（`Roe`）的視覺提示

`Roe` 是卡片最外層的 sortable wrapper，行為：

- 使用 `useSortable` 提供 transform/transition/isDragging
- 預設樣式：`cursor: grab`、`borderRadius: 5px`
- `opacity = 0.5` 條件：`isDragging || isOverlay`
- 會依「有效 drop target」決定邊框
- 預設邊框色 `#F65077`
- 若傳入 `dndStrokeColor` / `dndBackgroundColor` 則覆蓋

重點：

- 這些視覺提示會強化「可以放下」的感覺
- 搭配 collision detection 可讓使用者更容易對齊目標

---

## 11. 實作仿真建議（簡明清單）

如果要在現有專案中模擬 Toby 的手感，建議至少做到以下幾點（✅ 標記為已驗證參數）：

1. ✅ 使用 PointerSensor，`activationConstraint.distance = 5`
2. Collision detection 先交疊再距離（交疊面積優先 + 距離 fallback）
3. ✅ List View 使用垂直 sortable strategy（類 `sd` 的 y 軸位移邏輯）
4. ✅ DragOverlay 使用 Portal + `250ms ease` dropAnimation
5. ✅ 卡片拖曳中 `opacity = 0.5`
6. 支援 ghost card 插入（Tab → List）
7. ✅ 使用 position 中間值策略：`(higherPos + lowerPos) / 2`
8. onDragOver 先做 optimistic reorder（即時 UI 反應）
9. onDragEnd 以 position + Delta 寫回持久化儲存

**關鍵視覺參數：**
- ✅ `cursor: "grab"` / `borderRadius: 5px`
- ✅ 預設 drop target 邊框色：`#F65077`
- ✅ DragOverlay `zIndex: 1e5` (100000)
- ✅ 支援自訂 `dndStrokeColor` / `dndBackgroundColor`

---

## 12. 對照 Toby 的關鍵函式索引

- DnD Context：`ZPe`
- Collision detection：`hu`
- Drag overlay：`iOe` + `wc`
- Sortable strategy：`sd`
- Optimistic reorder：`CN` / `ON`
- Ghost 插入：`EN` / `wN` / `xN`
- 位置計算：`qu` / `td`
- Drop reorder payload：`Yu` / `$u`

---

## 13. 附註與驗證狀態

此文件僅針對 `toby.bundle.js` 的觀察結果整理，因為是壓縮輸出，命名可能非原始作者命名，請以「行為」而非「名字」對照實作。

**已驗證的核心參數（準確度高）：**
- ✅ ID 前綴系統（`CARDID-`, `LISTID-`, `TAB_GHOST_ID_SEPARATOR-` 等）
- ✅ `activationConstraint.distance = 5`
- ✅ `dropAnimation.duration = 250`, `dragSourceOpacity = 0.5`
- ✅ `zIndex = 1e5` (100000)
- ✅ 位置計算公式 `(higherPos + lowerPos) / 2`
- ✅ `borderRadius = 5px`, `cursor = "grab"`, 預設邊框色 `#F65077`
- ✅ `td` (arrayMove), `sd` (垂直策略), `Yu` / `$u` (位置計算函式)

**行為描述（邏輯準確但函式名可能不同）：**
- 📋 Collision detection 策略（自訂實作，非標準 dnd-kit 函式）
- 📋 多選功能實作細節

**最後更新：** 2026-02-04（基於 toby.bundle.js 反編譯分析）
