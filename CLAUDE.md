<!-- OPENSPEC:START -->
# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:
- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:
- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

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
- **Batch Operations**: Multi-select cards for batch delete, move, and open tabs

**Tech Stack:** React 18, TypeScript, Vite 5, IndexedDB, Chrome Manifest V3

---

## Quick Start

```bash
# Install dependencies (requires Node.js 18+)
npm ci

# Development with hot reload
npm run dev

# Build extension for production
npm run build

# Testing (ask user first!)
npm test

# Code quality
npm run lint
npm run format
```

**Load Extension:** After building, load from `dist/` directory in Chrome (chrome://extensions → Developer mode → Load unpacked)

---

## 📚 Complete Documentation Index

**👉 Main Index: [docs/INDEX.md](docs/INDEX.md)**

### Quick Links

- 🏗️ [System Architecture](docs/architecture/component-map.md) - Component relationships and dependencies
- 📦 [Feature Docs](docs/features/) - Cloud sync, drag-drop, sharing, importing
- 🔧 [Development Guide](docs/development/openspec-installation.md) - OpenSpec integration
- 📋 [Data Format](docs/specs/data-format.md) - JSON structure specification
- 🔄 [Session Handoff](docs/meta/SESSION_HANDOFF.md) - AI tool session continuity

### Recent Work

- ✅ **GroupsView Refactored** (1,622 → 468 lines, -71%) - See [REFACTORING_SUMMARY.md](docs/meta/REFACTORING_SUMMARY.md)
- ✅ **Project Cleanup** - Removed 9 outdated files, streamlined structure
- ✅ **Documentation System** - Established indexed documentation architecture

---

## Architecture Summary

### Core Patterns

**Provider-based State Management:**
- `OrganizationsProvider` → `CategoriesProvider` → `WebpagesProvider`
- `OpenTabsProvider` (real-time Chrome tabs sync)
- `TemplatesProvider` (card templates)

**Data Hierarchy:**
```
Organizations → Categories (Collections) → Subcategories (Groups) → Webpages (Cards)
```

**Storage:** IndexedDB v3 (migrated from chrome.storage)
- stores: `organizations`, `categories`, `subcategories`, `webpages`, `templates`, `meta`

**Modular Architecture (Recent Refactor):**
- `src/app/groups/GroupsView.tsx` (468 lines) - Main group management UI
- `src/app/groups/share/` - GitHub Gist sharing & HTML export
- `src/app/groups/import/` - Toby JSON & HTML bookmarks import

For detailed architecture, see [component-map.md](docs/architecture/component-map.md).

---

## Development Guidelines

### Language & Communication
- **Primary Language**: 繁體中文 (Traditional Chinese) for all communications
- **Test Execution**: Never run tests automatically without user consent (per AGENTS.md)

### Before Modifying Code

1. **Read Component Map** - Check [component-map.md](docs/architecture/component-map.md) to understand dependencies
2. **Assess Impact** - Determine if changes affect other modules
3. **Test After Changes** - Run build and test affected features
4. **Update Docs** - Update relevant documentation after significant changes
5. **Update Session Handoff** - Update [SESSION_HANDOFF.md](docs/meta/SESSION_HANDOFF.md) at session end

### Code Style
- TypeScript strict mode enabled
- ESLint + Prettier configuration in place
- 2-space indentation
- Kebab-case filenames, PascalCase components

### Extension-Specific
- Manifest V3 service worker limitations (no DOM access)
- Use message passing for background ↔ UI communication
- Chrome tabs API permissions required for open tabs sync

---

## Common Tasks

### GitHub Gist Sharing Setup

**For Users:**
1. Get GitHub Personal Access Token at [GitHub Settings > Tokens](https://github.com/settings/tokens)
2. Select **"gist"** permission only
3. Enter token in first-time setup dialog
4. Token stored securely in chrome.storage.local

**For Developers:**
- Set `VITE_GITHUB_TOKEN=your_token_here` in `.env.local`

### Using Batch Operations

**Multi-Select Cards:**
1. **Hover over a card** → checkbox appears on the card icon
2. **Click checkbox** to select/deselect the card
3. Once you select at least one card, a **floating toolbar** appears at the bottom with:
   - **MOVE**: Move selected cards to another Space/Collection
   - **Open tabs**: Open all selected URLs in new tabs
   - **DELETE**: Delete all selected cards (with confirmation)
4. Click **✕** on the toolbar to clear all selections

**Features:**
- **Hover to select**: No need to enter "select mode" first
- **Persistent checkbox**: Selected cards keep checkbox visible
- **Open tabs warning**: Shows confirmation if selecting 10+ cards
- **Batch move**: Choose target organization and category via dialog
- **Success feedback**: Toast notifications for all operations

**Files:**
- `src/app/webpages/CardGrid.tsx` - Main batch operations logic
- `src/app/webpages/MoveSelectedDialog.tsx` - Move dialog component
- `src/styles/toby-like.css` - Checkbox hover styles

### Modifying Import/Export
1. Update importers in `src/background/importers/`
2. Test with sample files in `fixtures/`
3. Verify order preservation in tests
4. Update [data-format.md](docs/specs/data-format.md) if schema changes

### Debugging Extension
- **New Tab UI**: F12 in new tab page
- **Background Script**: chrome://extensions → Service worker → Inspect
- **IndexedDB**: Chrome DevTools → Application → Storage → IndexedDB → linktrove

---

## Important Reminders

- **Check Component Map First** - Avoid "改 A 壞 B" (changing A breaks B)
- **Preserve Card Ordering** - Per-group ordering is critical for user experience
- **Never Auto-run Tests** - Always ask user permission (per AGENTS.md)
- **Update Session Handoff** - Keep [SESSION_HANDOFF.md](docs/meta/SESSION_HANDOFF.md) current
- **Keep Docs in Sync** - Update documentation when making significant changes

---

**For complete information, see [docs/INDEX.md](docs/INDEX.md)**