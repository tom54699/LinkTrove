# Local Storage Migration to IndexedDB (SPEC)

## Background & Goals

- Move large, frequently-changing data to local IndexedDB for capacity and performance.
- Keep small, infrequently-changed user settings in `chrome.storage` (primarily `local`).
- Preserve current UI and flows; only change storage backend.

## In Scope

- Migrate bookmarks (webpages), categories, and templates from `chrome.storage` to IndexedDB.
- Keep settings (e.g., `selectedCategoryId`, theme) in `chrome.storage.local`.
- Keep export/import JSON, now powered by IndexedDB.

## Out of Scope

- Cloud/cross-device sync via `chrome.storage.sync` for main data.
- Any SQLite/OPFS usage.

## Data Model (unchanged)

- WebpageData: `{ id, title, url, favicon, note, category, meta, createdAt, updatedAt }`
- CategoryData: `{ id, name, color, order, defaultTemplateId? }`
- TemplateData: `{ id, name, fields[] }` where field: `{ key, label, type, required?, defaultValue?, options? }`

## Storage Strategy

- IndexedDB database: `linktrove` (v1)
  - objectStores:
    - `webpages` keyPath `id`; indexes: `category`, `url`, `updatedAt`
    - `categories` keyPath `id`; index: `order`
    - `templates` keyPath `id`
    - `meta` keyPath `key` (flags like `migratedToIdb`)
- `chrome.storage.local` (small settings):
  - `selectedCategoryId`, `theme`, other small prefs

## Public API Compatibility

- Keep `createStorageService()` signature. Internally backed by IndexedDB.
  - saveToLocal/loadFromLocal -> `webpages`
  - saveToSync/loadFromSync -> `categories` (name kept for compatibility)
  - saveTemplates/loadTemplates -> `templates`
  - exportData/importData -> read/write all IDB stores

## Migration

- On first run (when `meta.migratedToIdb` is not true):
  - Read `chrome.storage.local.webpages`, `chrome.storage.sync.categories`, `chrome.storage.sync.templates`.
  - If any has data, write them into IndexedDB.
  - Set `meta.migratedToIdb = true`.
  - Do not delete old storage (optional clean-up later).

## Error Handling

- IDB open/transaction errors surface toast and suggest retry.
- Import JSON format validation retained.

## Tests

- Use Vitest + jsdom; add `fake-indexeddb` for Node.
- Unit tests for stores (CRUD, indices), storage service compatibility, migration, and export/import.

## Rollback

- Keep export/import as safety. A temporary dev-only toggle can switch back if needed (not exposed to users).

