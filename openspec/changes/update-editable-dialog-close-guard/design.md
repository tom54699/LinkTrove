## Context
目前不同彈窗對「點擊遮罩關閉」的判定不一致。部分對話框使用單純 `onClick={onClose}`，在文字選取拖曳時容易誤關閉。既有 `TobyLikeCard` 已採用 `mousedown` 守門方式，證明可行。

本次變更是跨模組 UI 互動一致性調整，涵蓋 App、Sidebar、Webpage、Share 等多處對話框。

## Goals / Non-Goals
- Goals:
  - 統一可編輯彈窗外點關閉判定。
  - 避免「在欄位內開始拖曳、在遮罩放開」造成誤關閉。
  - 保留 ESC、Cancel、明確關閉按鈕行為。
- Non-Goals:
  - 不調整 SettingsModal 與其 TemplatesManager 互動。
  - 不改動資料層、儲存策略、API。

## Proposed Approach
1. 新增 shared hook（名稱暫定 `useEditableDialogCloseGuard`），輸出：
   - `overlayProps`: 需要掛到 overlay（含 `onMouseDown`、`onClick`）
   - `dialogProps`: 需要掛到 dialog 容器（含 `onMouseDown`、`onClick` stopPropagation）
2. 判定規則：
   - 若 `mousedown` 發生於 dialog 內，標記為「內部開始互動」。
   - overlay `click` 時，僅在「本次互動非內部開始」且事件 target 為 overlay 本體時觸發 `onClose`。
3. 先套用非 Settings 的可編輯彈窗，確保範圍可控。

## Trade-offs
- 優點：
  - 行為一致，降低回歸與未來重複修 bug 成本。
  - hook 集中管理，後續擴充到其他彈窗成本低。
- 代價：
  - 需要調整多個元件的事件綁定方式。
  - 既有測試需補上 drag-select-to-overlay 互動案例。

## Risks and Mitigations
- 風險：`onBlur` 自動提交欄位與關閉判定交互
  - 緩解：不改 blur 邏輯，只調整 overlay close gate，並補互動測試。
- 風險：色盤、下拉等原生控制項事件序差異
  - 緩解：以 component-level test 覆蓋關鍵彈窗。
- 風險：套用範圍過大導致一次回歸面過寬
  - 緩解：先明確排除 SettingsModal，後續再分案擴充。

## Rollout Plan
- Phase 1: 非 Settings 可編輯彈窗全部導入 shared hook。
- Phase 2: 驗證穩定後，再評估是否納入 SettingsModal（另提變更）。
