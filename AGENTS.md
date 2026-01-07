# Repository Guidelines

## Agent 行為設定

- **回覆語言**：預設使用「繁體中文」進行所有溝通與文件撰寫（除非使用者明確要求其他語言）。
- **測試執行**：不得自行執行任何測試命令（例如：`npm test`、`npm test --silent`）。如需測試，請先通知並提供指令給使用者，由使用者決定是否執行。
- **輸出節制**：避免一次輸出過多內容或完整長檔案；優先提供摘要與必要段落，若需要大量內容，先徵詢使用者同意。

## Project Structure & Module Organization

- **Root**: `manifest.json`, `vite.config.ts`, `package.json`, `CLAUDE.md` (主要開發指引)
- **src/**: React + TypeScript app
  - `app/`: UI 組件與 Providers
  - `background/`: 背景服務與 IndexedDB 操作
  - `utils/`: 工具函數
- **public/**: `popup.html`, `newtab.html` 與靜態資源
- **dist/**: 建置輸出（Chrome 擴充功能）
- **docs/**: 完整文檔系統（詳見 `docs/INDEX.md`）
  - `architecture/`: 系統架構與組件關係圖
  - `features/`: 功能文檔
  - `specs/`: 規格文檔
  - `development/`: 開發指南
  - `meta/`: 元文檔（重構總結、Session 交接等）

## Build, Test, and Development Commands

- `npm ci`: 安裝依賴（需 Node.js 18+）
- `npm run dev`: 啟動 Vite 開發伺服器（熱重載）
- `npm run build`: 建置擴充功能到 `dist/`
- `npm test`: 執行測試（**需用戶同意**）
- `npm run lint` / `npm run format`: 程式碼檢查與格式化

## Development Workflow

- **修改前必讀**：查看 `docs/architecture/component-map.md` 了解組件依賴關係，避免「改 A 壞 B」
- **開發流程**：
  1. 閱讀相關文檔了解現有架構
  2. 修改代碼（保持職責單一）
  3. 執行建置測試（`npm run build`）
  4. 更新相關文檔
  5. 提交變更（使用 Conventional Commits）
- **Definition of Done**: 建置通過、TypeScript 編譯通過、相關文檔已更新
- **Session 結束時**：更新 `docs/meta/SESSION_HANDOFF.md` 記錄進度

## Coding Style & Naming Conventions

- Indentation: 2 spaces; TypeScript strict mode.
- Filenames: `kebab-case.ts` / `kebab-case.tsx`; components export `PascalCase`.
- State: keep actions/selectors in co-located stores; one responsibility per module.
- Enforce via ESLint + Prettier (`npm run lint && npm run format`).

## Testing Guidelines

- Frameworks: Vitest + React Testing Library.
- Location: co-locate as `*.test.ts(x)` or under `src/**/__tests__`.
- Coverage: aim ≥80% statements; add tests for edge cases (drag/drop, storage, error states).
- Quick runs: `npm test -- --watch`.

## Commit & Pull Request Guidelines

- **Commit 格式**：使用 Conventional Commits（詳見 `docs/development/commit-conventions.md`）
  - 格式：`<type>(<scope>): <subject>`
  - 範例：`feat(groups): add share dialog`、`refactor(webpages): extract card logic`
- **Pull Requests**：
  - 清楚的描述與變更摘要
  - UI 變更附上截圖或 GIF
  - 確保建置與測試通過
  - 更新相關文檔

## Important References

- **主要開發指引**：`CLAUDE.md`
- **文檔索引**：`docs/INDEX.md`
- **組件關係圖**：`docs/architecture/component-map.md`（修改前必看）
- **Session 交接**：`docs/meta/SESSION_HANDOFF.md`
- **測試指南**：`docs/development/testing-guide.md`
- **提交規範**：`docs/development/commit-conventions.md`
