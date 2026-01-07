# Project Context

## Purpose
LinkTrove is a Chrome browser extension for bookmark and webpage management, similar to Toby. It provides a new tab interface with a three-column layout:
- **Left**: Collections (Organizations/Categories)
- **Center**: Saved webpage cards
- **Right**: Open Tabs (real-time sync)

**Key Goals:**
- Hierarchical organization: Organizations → Categories (Collections) → Subcategories (Groups) → Webpages (Cards)
- Real-time Chrome tabs synchronization with multi-window support
- Import/export compatibility with Toby v3/v4 JSON and HTML bookmarks
- GitHub Gist sharing for one-click publish sharing links
- Drag-and-drop card reordering with per-group order preservation

## Tech Stack
- **Frontend**: React 18, TypeScript (strict mode)
- **Build Tool**: Vite 5 with hot reload
- **Storage**: IndexedDB v3 (migrated from chrome.storage)
- **Extension**: Chrome Manifest V3
- **Testing**: Vitest, React Testing Library
- **Code Quality**: ESLint, Prettier
- **Runtime**: Node.js 18+

## Project Conventions

### Code Style
- TypeScript strict mode enabled
- ESLint + Prettier configuration enforced
- 2-space indentation
- Kebab-case for filenames (e.g., `drag-drop-utils.ts`)
- PascalCase for React components (e.g., `GroupsView.tsx`)
- Explicit return types for complex functions
- No auto-formatting of existing code unless part of the change

### Architecture Patterns
- **Provider-based State Management**: React Context API for global state
  - `OrganizationsProvider` → `CategoriesProvider` → `WebpagesProvider`
  - `OpenTabsProvider` (real-time Chrome tabs sync)
  - `TemplatesProvider` (card templates)
- **Data Hierarchy**: Organizations → Categories → Subcategories → Webpages
- **Modular Structure**: Feature-based directory organization
  - `src/app/groups/` - Group management UI
  - `src/app/groups/share/` - GitHub Gist sharing & HTML export
  - `src/app/groups/import/` - Import logic (Toby JSON, HTML bookmarks)
- **Service Layer**: Background scripts for Chrome API interactions
- **IndexedDB Stores**: `organizations`, `categories`, `subcategories`, `webpages`, `templates`, `meta`

### Testing Strategy
- **CRITICAL**: Never run tests automatically without explicit user consent (per AGENTS.md)
- Always ask user permission before executing `npm test`
- Unit tests with Vitest
- Component tests with React Testing Library
- Integration tests for drag-drop and import/export
- Test files located alongside source: `__tests__/` directories
- Sample fixtures in `fixtures/` for import/export testing

### Git Workflow
- **Main Branch**: `main` (used for PRs)
- **Commit Convention**: `type: description` (e.g., `docs: 更新架構文檔`)
  - Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`
- **Language**: Traditional Chinese (繁體中文) for commit messages and documentation
- No force push to main
- Feature branches for new work

## Domain Context

### Bookmark Management Concepts
- **Organization**: Top-level workspace container (supports multi-org switching)
- **Category/Collection**: Groups of related bookmarks (left sidebar)
- **Subcategory/Group**: Nested groupings within a collection
- **Webpage/Card**: Individual bookmark item with metadata (title, URL, favicon, screenshot)

### Extension-Specific Concepts
- **Service Worker**: Manifest V3 background script (no DOM access)
- **Content Scripts**: Injected into web pages for metadata extraction
- **Message Passing**: Communication between background ↔ UI via `chrome.runtime.sendMessage`
- **Chrome Tabs API**: Real-time sync of open tabs across windows

### Critical Behaviors
- **Card Ordering**: Per-group order preservation is critical for UX
- **Metadata Enrichment**: Automatic favicon, title, screenshot extraction
- **Migration**: Automatic IndexedDB migration from chrome.storage on first run

## Important Constraints

### Technical Constraints
- **Manifest V3 Limitations**:
  - Service worker has no DOM access (use message passing)
  - Limited background script lifecycle (may terminate)
  - No persistent background page
- **IndexedDB**: Asynchronous API, requires transaction management
- **Chrome Extension Permissions**: Must declare `tabs`, `storage`, `unlimitedStorage`
- **Vite Build**: Must generate separate bundles for background/content scripts

### Development Constraints
- **Read Component Map First**: Check `docs/architecture/component-map.md` before modifications to avoid "改 A 壞 B" (changing A breaks B)
- **No Auto-Tests**: Always ask user permission before running tests
- **Language**: Use Traditional Chinese (繁體中文) for all communications
- **Documentation Sync**: Update relevant docs after significant changes
- **Session Handoff**: Update `docs/meta/SESSION_HANDOFF.md` at session end

### Business Constraints
- **Toby Compatibility**: Import/export must maintain compatibility with Toby v3/v4 JSON format
- **Order Preservation**: Card ordering must be preserved during import/export

## External Dependencies

### APIs
- **GitHub Gist API**: For one-click sharing feature
  - Requires Personal Access Token with `gist` scope
  - Token stored in `chrome.storage.local`
  - Dev token: `VITE_GITHUB_TOKEN` in `.env.local`

### Chrome APIs
- `chrome.tabs`: Real-time tab synchronization
- `chrome.storage.local`: Settings and GitHub token storage
- `chrome.runtime`: Message passing between contexts
- `chrome.windows`: Multi-window tab tracking

### Build Dependencies
- Vite plugins: `@crxjs/vite-plugin` for Manifest V3 support
- TypeScript compiler: `tsc` for type checking
- ESLint/Prettier: Code quality enforcement

### Documentation System
- **Main Index**: `docs/INDEX.md`
- **Architecture**: `docs/architecture/component-map.md`
- **Features**: `docs/features/` (cloud-sync, drag-drop, sharing, importing)
- **Specs**: `docs/specs/data-format.md`
- **Meta**: `docs/meta/SESSION_HANDOFF.md`, `docs/meta/REFACTORING_SUMMARY.md`
