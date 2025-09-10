# LinkTrove – Export/Import Recap (M1) and M2 Plan

Baseline: commit `5bd544c` (file-based JSON import, per-group orders included in export/import, DnD fixes and tests)

## M1 – Done

- Export (JSON)
  - Adds `schemaVersion: 1` at root
  - Includes: `webpages`, `categories`, `subcategories`, `templates`, `settings`
  - Includes per-group orders: `orders.subcategories = { [groupId]: string[] }`
  - Location: `src/background/idb/storage.ts#exportData`

- Import (JSON, Replace)
  - Clears the 4 stores, writes incoming data, restores `orders.subcategories`
  - Fallback: if `orders` missing, ordering falls back to write order
  - Location: `src/background/idb/storage.ts#importData`

- Settings: file-based import UI
  - Replace the textarea with a file input (`application/json,.json`)
  - Parses file, calls EI if provided or falls back to storage.importData
  - Reloads providers and shows a simple summary
  - Location: `src/app/App.tsx#Settings`

- DnD consistency (already verified)
  - Ghost preview position is honored (even when dropping on container)
  - Group-internal reorder is independent from other groups
  - Images (favicons/icons) set `draggable={false}` to avoid native image drag

- Tests
  - `src/background/__tests__/export-import.orders.test.ts`
  - `src/background/__tests__/order.pergroup.intragroup.multigroups.test.ts`
  - `src/app/webpages/__tests__/drag-ghost-stable-insert.test.tsx`

## Known/Deferred (M1)

- Import strategy is Replace-only (no Merge yet)
- No automatic pre-import backup (can be added later)
- UI wizard for third-party formats is not implemented (comes in M2)
- Lint shows warnings (non-blocking for behavior)

## M2 – Plan (HTML/Toby)

- Formats
  - HTML (Netscape Bookmarks) – browser exchange format
  - JSON (Toby v3) – third-party import

- Parsers → to intermediate bundle
  - HTML
    - `<H3>` top-level → category; nested `<H3>` (v1) → group or default group
    - `<A>` → { title: text, url, description?: `<DD>` if present }
    - Preserve order per folder/group
  - Toby JSON v3
    - `list.title` → category
    - `card.customTitle || card.title` → title
    - `card.customDescription` → description (note)
    - `card.url` → url
    - Preserve order per list

- Import mapping
  - Create category/group if missing, default to a `group` when not provided
  - Append items in source order to per-group orders
  - Dedup by URL (scope: same category+group). Default action: skip
  - (Optional later) Template mapping from external fields to template fields

- UI (settings)
  - Import wizard for third-party: file → preview → options (Merge/Replace, dedup) → import → summary

- Tests
  - Parsers for Toby/HTML edge cases
  - Round-trip expectations for order per group
  - Dedup strategies

## How to run

- Export JSON: Settings → Export JSON (downloads `linktrove-export.json`)
- Import JSON: Settings → select JSON file → Import JSON
- Tests: `npm test` (see new tests under `src/background/__tests__` and `src/app/webpages/__tests__`)

## Notes

- Webpages `description` in UI maps to storage `note`
- Per-group order is stored in meta keys: `order.subcat.<groupId>`

