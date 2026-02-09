# Change: 修復卡片編輯儲存行為與 Meta Enrichment Race Condition

## Why

目前卡片編輯有兩個主要問題：

1. **Meta Enrichment Race Condition**: 當使用者儲存新卡片後立即編輯，背景的 meta enrichment 完成時會覆蓋使用者的編輯內容。時序如下：
   - T0: 使用者儲存新卡片（所有欄位空白）
   - T1: Meta enrichment 開始抓取（需要 8 秒）
   - T2: 使用者點編輯開啟 Modal
   - T3: Meta enrichment 完成，更新 DB（title, description, meta 都有值）
   - T4: 使用者編輯某個欄位（例如只改 title），點 Done
   - T5: ❌ 所有欄位（包括空的 meta）送出，覆蓋 meta enrichment 的資料

2. **儲存行為不一致**:
   - Description inline edit 在失焦時立即儲存
   - Modal 內按 Enter 鍵無反應（應觸發儲存）
   - 使用者需要明確的「只有按 Done 才儲存」行為

## What Changes

### 1. 修復 Meta Race Condition
- 追蹤使用者「實際編輯過」的 meta 欄位
- 儲存時使用 merge 策略：`{ ...data.meta, ...editedFields }`
- 避免覆蓋 meta enrichment 自動填充的欄位

### 2. 移除 Description Inline Edit
- 移除 `isEditing` state 和相關的 onBlur 立即儲存邏輯
- Description 改為靜態顯示，點擊卡片進入外連（現有行為）
- 強制透過 Edit 按鈕開啟 Modal 編輯

### 3. 修復 Enter 鍵行為
- 在所有 input 欄位（Title、URL、Description）加入 onKeyDown handler
- 按 Enter 時觸發 Done 按鈕的儲存邏輯
- TemplateFields 內的 input 也需要相同處理

### 4. 統一儲存行為
- **儲存**: Done 按鈕、Enter 鍵
- **不儲存**: Escape、Cancel 按鈕、點擊背景

## Impact

- Affected specs: `card-editing`（新增）
- Affected code:
  - `src/app/webpages/WebpageCard.tsx` - 主要修改
  - `src/app/webpages/TobyLikeCard.tsx` - TemplateFields 同步修改
  - `src/app/groups/GroupsView.tsx` - 可能需要調整 onSave callback
- Breaking: 移除 description inline edit 功能（但使用者反饋此功能因點擊卡片外連而無法使用）
