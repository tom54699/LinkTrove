# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LinkTrove is a Chrome browser extension for bookmark/webpage management, similar to Toby. It provides a new tab interface with three-column layout: Collections (left), saved webpage cards (center), and Open Tabs (right). Built with React 18, TypeScript, and Vite for Manifest V3.

**Key Features:**
- Organizations → Categories (Collections) → Subcategories (Groups) → Webpages (Cards) hierarchy
- Real-time Chrome tabs synchronization with multi-window support
- Import/export with Toby v3/v4 JSON and HTML bookmarks support
- Drag-and-drop card reordering with per-group order preservation
- IndexedDB storage with automatic migration from chrome.storage
- **GitHub Gist Sharing**: One-click publish sharing links via GitHub Gist

## Development Commands

```bash
# Install dependencies (requires Node.js 18+)
npm ci

# Development with hot reload
npm run dev

# Build extension for production
npm run build

# Testing
npm test

# Code quality
npm run lint
npm run format
```

## Build Process

The build creates a Chrome extension in `dist/` with:
- Multi-page setup: `popup.html`, `newtab.html`
- Background service worker: `src/background.ts` → `dist/background.js`
- React chunks optimized with manual chunking
- Post-build script: `scripts/postbuild.mjs`

After building, load the extension in Chrome from the `dist/` directory.

## GitHub Gist Sharing Setup

LinkTrove supports one-click sharing via GitHub Gist. Users need their own GitHub Personal Access Token:

### For Users:
1. **Get GitHub Personal Access Token**:
   - Visit [GitHub Settings > Tokens](https://github.com/settings/tokens)
   - Click "Generate new token (classic)"
   - Select **"gist"** permission only
   - Copy the generated token

2. **First-time Setup**:
   - Click "分享此群組" → "發布分享連結"
   - Enter your token in the setup dialog
   - Token is securely stored in chrome.storage.local (secure extension storage)

3. **Usage**:
   - After setup, sharing is one-click
   - Get instant shareable URL: `https://htmlpreview.github.io/?[gist-raw-url]`
   - All shared Gists appear in your GitHub account

### For Developers:
- Set `VITE_GITHUB_TOKEN=your_token_here` in `.env.local` for development
- Users will use their own tokens in production

## Architecture Overview

### Core Structure
- **Background Service Worker** (`src/background.ts`): Manages Chrome tabs API, broadcasts tab events to UI
- **React App** (`src/app/`): Main new tab interface with provider architecture
- **Storage Layer** (`src/background/storageService.ts`, `src/background/idb/`): IndexedDB-based persistence
- **Import/Export** (`src/background/importers/`): Supports Toby JSON and HTML bookmarks

### Key Architectural Patterns

**Provider-based State Management:**
- `OrganizationsProvider`: Top-level workspace organization
- `CategoriesProvider`: Collections within organizations
- `WebpagesProvider`: Saved webpage cards
- `OpenTabsProvider`: Real-time Chrome tabs sync
- `TemplatesProvider`: Card templates

**Multi-level Data Hierarchy:**
```
Organizations → Categories (Collections) → Subcategories (Groups) → Webpages (Cards)
```

**Three-Column Layout** (`src/app/layout/ThreeColumn.tsx`):
- Left: Sidebar with organizations/categories
- Center: Webpage cards grouped by subcategories
- Right: Live Chrome tabs panel

### Background Communication
- Service worker connects to UI via `chrome.runtime.onConnect`
- Real-time tab events broadcast to connected ports
- Window focus/create/remove events synced

### Data Management
- **Primary Storage**: IndexedDB (database: `linktrove`, current version: v3)
  - `organizations` store (keyPath: `id`, index: `order`)
  - `categories` store (keyPath: `id`, indexes: `by_organizationId`, `by_organizationId_order`)
  - `subcategories` store (groups within categories)
  - `webpages` store (keyPath: `id`, indexes: `category`, `url`, `updatedAt`, `category_subcategory`)
  - `templates` store (keyPath: `id`)
  - `meta` store (migration flags and per-group ordering: `order.subcat.<groupId>`)
- **Migration System**: Automatic migration from chrome.storage to IndexedDB
- **Import Sources**:
  - Toby v3 JSON (lists → groups, cards → webpages)
  - Toby v4 JSON (with organizations support)
  - Netscape HTML bookmarks (H3 folders → groups)
- **Export**: Full project JSON with schema version and per-group orders

### Testing Structure
- **Framework**: Vitest + React Testing Library + jsdom
- **Coverage**: Text, summary, lcov, HTML reports
- **Key Test Areas**:
  - Import/export with order preservation
  - Cross-group webpage reordering
  - Database CRUD operations
  - Component rendering and interactions

## Development Guidelines

### Task-Driven Development
- **Task Tracking**: Follow `.kiro/specs/chrome-webpage-manager/tasks.md` for structured development
- **Commit Convention**: Use `feat(tasks/X.Y):` format with requirement references
- **Definition of Done**: Tests pass, types compile, lint clean, relevant docs updated
- **Progress Tracking**: Mark completed tasks with `[x]` in tasks.md

### Language & Communication
- **Primary Language**: 繁體中文 (Traditional Chinese) for all communications
- **Test Execution**: Never run tests automatically without user consent
- **Documentation**: Focus on essential architecture, avoid obvious instructions

### When Adding Features
1. Follow the provider pattern for state management
2. Use IndexedDB storage service for persistence
3. Add comprehensive tests for data operations
4. Test Chrome extension APIs carefully (tabs, storage, runtime)
5. Support drag-and-drop operations for card reordering
6. Preserve per-group card ordering in all operations

### Code Style
- TypeScript strict mode enabled
- ESLint + Prettier configuration in place
- 2-space indentation
- Kebab-case filenames, PascalCase components

### Extension-Specific Considerations
- Manifest V3 service worker limitations (no DOM access)
- Chrome tabs API permissions required for open tabs sync
- Content security policy restrictions
- Background script lifecycle management

### Testing Chrome Extensions
- Use fake-indexeddb for storage testing
- Mock Chrome APIs in test environment
- Test provider context hierarchies
- Verify drag-and-drop operations

## Common Development Tasks

### Adding a New Card Template
1. Update `src/app/templates/TemplatesProvider.tsx`
2. Add template UI in `src/app/templates/TemplatesManager.tsx`
3. Test template CRUD operations
4. Update IndexedDB `templates` store schema if needed

### Modifying Import/Export
1. Update importers in `src/background/importers/` (HTML: `html.ts`, Toby: `toby.ts`)
2. Add migration logic in `src/background/idb/storage.ts` if schema changes
3. Test import with sample files in `fixtures/`
4. Verify order preservation in tests (especially `export-import.orders.test.ts`)
5. Update `docs/data-format.md` for JSON schema changes

### Working with Organizations/Categories
1. Organizations are the top-level workspace containers
2. Categories belong to organizations (`organizationId` field required)
3. Use scoped providers: `OrganizationsProvider` → `CategoriesProvider`
4. Ensure backwards compatibility when importing older JSON without organizations

### Debugging Extension
- **New Tab UI**: F12 in new tab page
- **Background Script**: chrome://extensions → Service worker → Inspect
- **Storage**: Use Chrome DevTools Application tab or extension's export feature
- **IndexedDB**: Chrome DevTools → Application → Storage → IndexedDB → linktrove

## Important Notes
- **Testing Protocol**: Never run tests automatically without user consent (per AGENTS.md)
- **Language**: Use Traditional Chinese for communications unless specified otherwise
- **Architecture Constraints**: Background service worker has no DOM/UI access - all UI operations go through message passing
- **Data Integrity**: Card ordering is critical - always test reorder operations and per-group order preservation
- **Import Features**: Import operations support progress tracking and cancellation via AbortController
- **Migration Status**: Project has migrated from chrome.storage to IndexedDB (v3) with automatic migration
- **Commit References**: Recent work follows tasks/14.x pattern for Organizations feature (completed)
- **Export Schema**: Current export includes `schemaVersion: 1`, organizations, and per-group orders