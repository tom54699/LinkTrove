# Repository Guidelines

## Project Structure & Module Organization
- Root: `manifest.json`, `vite.config.ts`, `package.json`.
- `src/`: React + TypeScript app (`components/`, `hooks/`, `stores/`, `utils/`, `types/`, `styles/`).
- `public/`: `popup.html`, `newtab.html` and static assets.
- `dist/`: Build output for the Chrome extension.
- `.kiro/specs/chrome-webpage-manager/`: Project plan — `requirements.md`, `design.md`, `tasks.md`.

## Build, Test, and Development Commands
- `npm install`: Install dependencies (Node 18+).
- `npm run dev`: Start Vite dev server with hot reload.
- `npm run build`: Build extension into `dist/`.
- `npm test`: Run unit tests (Vitest + React Testing Library).
- `npm run lint` / `npm run format`: Lint and auto-format (ESLint + Prettier).

## Workflow & Task Order (Read First)
- Source of truth: follow `.kiro/specs/chrome-webpage-manager/tasks.md` strictly in order (1 → 12, including 2.1, 2.2…). Do not skip or reorder.
- TDD for each subtask: write failing tests → implement → make tests pass.
- Definition of done (per subtask): tests green, types compile, lint/format clean, relevant docs/specs updated.
- Commit after completing each subtask. Example:
  - `feat(tasks/2.1): background service worker (refs: req 1.4, 4.2)`
 - After completion, check it off in `tasks.md` by changing `- [ ]` to `- [x]` for the exact item (keep order). Example:
   - Before: `- [ ] 2.1 建立 Background Service Worker`
   - After:  `- [x] 2.1 建立 Background Service Worker`

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
- Conventional Commits; include `tasks/<id>` and referenced requirements (from `requirements.md`).
- PRs: clear description, link spec sections, screenshots/GIFs for UI, and checklists for tests/lint/build.
- CI must pass before merge.
